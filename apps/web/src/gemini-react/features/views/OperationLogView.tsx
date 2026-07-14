import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Eye, Search, Shield, X } from 'lucide-react';
import { apiGet } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { formatDateTime, labelAuditAction, labelAuditReason, labelObjectType, labelStatus } from '../../../utils/status-labels';

interface AuditLogRecord {
  id: string;
  actorId: string;
  roleId: string;
  orgId: string;
  projectId?: string;
  action: string;
  objectType: string;
  objectId: string;
  result: 'allowed' | 'denied' | 'recorded';
  reason?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  auditor: '纪检审计',
  buyer: '采购经办',
  expert: '专家',
  finance_reviewer: '财务审核',
  group_manager: '集团采购管理',
  hotel_buyer: '酒店采购',
  hotel_finance: '酒店财务',
  platform_operator: '平台运营',
  supplier: '供应商',
  supplier_admin: '供应商管理员',
  supplier_quotation: '供应商报价员',
  system: '系统账号'
};

function resultVariant(result: AuditLogRecord['result']) {
  if (result === 'allowed') return 'success';
  if (result === 'denied') return 'danger';
  return 'info';
}

function roleLabel(roleId: string) {
  return roleLabels[roleId] ?? roleId;
}

function csvField(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function OperationLogView() {
  const { currentUser } = useApp();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [keyword, setKeyword] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | AuditLogRecord['result']>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet<{ auditLogs: AuditLogRecord[] }>('/api/audit-logs', currentUser?.id);
        if (!cancelled) {
          const sorted = [...(data.auditLogs ?? [])].sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          );
          setLogs(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '操作日志加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const filteredLogs = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return logs.filter((item) => {
      const resultMatched = resultFilter === 'all' || item.result === resultFilter;
      if (!resultMatched) return false;
      if (!query) return true;
      const haystack = [
        item.id,
        item.actorId,
        roleLabel(item.roleId),
        item.orgId,
        item.projectId,
        labelAuditAction(item.action),
        labelObjectType(item.objectType),
        item.objectId,
        labelStatus(item.result),
        labelAuditReason(item.reason)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [keyword, logs, resultFilter]);

  const summary = useMemo(
    () => ({
      total: logs.length,
      denied: logs.filter((item) => item.result === 'denied').length,
      objects: new Set(logs.map((item) => item.objectType)).size,
      current: filteredLogs.length
    }),
    [filteredLogs.length, logs]
  );

  function exportLogs() {
    const headers = ['id', 'actorId', 'role', 'orgId', 'projectId', 'action', 'objectType', 'objectId', 'result', 'reason', 'createdAt', 'ip'];
    const lines = filteredLogs.map((item) =>
      [
        item.id,
        item.actorId,
        roleLabel(item.roleId),
        item.orgId,
        item.projectId ?? '',
        labelAuditAction(item.action),
        labelObjectType(item.objectType),
        item.objectId,
        labelStatus(item.result),
        labelAuditReason(item.reason),
        item.createdAt,
        item.ip ?? ''
      ]
        .map(csvField)
        .join(',')
    );
    const blob = new Blob([`\uFEFF${headers.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `operation-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage(`已导出 ${filteredLogs.length} 条操作日志。`);
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#006666]" />
            操作日志
          </h2>
          <p className="text-sm text-slate-500 mt-1">基于后端真实审计日志，按角色范围查看系统操作留痕。</p>
        </div>
        <Button
          data-ui-check="operation-log-export"
          className="bg-[#006666] hover:bg-[#005252] text-white"
          disabled={filteredLogs.length === 0}
          onClick={exportLogs}
        >
          <Download className="w-4 h-4 mr-2" />
          导出日志
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ['近期流水', summary.total, '当前角色可见'],
          ['拒绝记录', summary.denied, '越权或校验失败'],
          ['审计对象', summary.objects, '对象类型数'],
          ['当前筛选', summary.current, '命中记录']
        ].map(([label, value, meta]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <div className="h-1 w-10 rounded-full bg-[#006666] mb-4" />
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-3xl font-semibold text-slate-950 mt-2">{value}</p>
              <p className="text-xs text-slate-500 mt-2">{meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索动作、对象、账号、原因"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
            <select
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value as 'all' | AuditLogRecord['result'])}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="all">全部结果</option>
              <option value="allowed">允许</option>
              <option value="denied">拒绝</option>
              <option value="recorded">记录</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">操作人</th>
                  <th className="px-6 py-4 border-b border-slate-200">审计动作</th>
                  <th className="px-6 py-4 border-b border-slate-200">业务对象</th>
                  <th className="px-6 py-4 border-b border-slate-200">结果</th>
                  <th className="px-6 py-4 border-b border-slate-200">时间</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">操作日志加载中...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">当前筛选下暂无日志。</td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.actorId}</div>
                        <div className="text-xs text-slate-500 mt-1">{roleLabel(item.roleId)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{labelAuditAction(item.action)}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{labelObjectType(item.objectType)}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.objectId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={resultVariant(item.result)}>{labelStatus(item.result)}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(item.createdAt)}</td>
                      <td className="px-6 py-4">
                        <button
                          className="text-[#006666] hover:underline font-medium text-xs inline-flex items-center gap-1"
                          onClick={() => setSelectedLog(item)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/20" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">操作日志详情</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedLog.id}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setSelectedLog(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div><span className="font-medium text-slate-800">操作人：</span>{selectedLog.actorId}</div>
                <div><span className="font-medium text-slate-800">角色：</span>{roleLabel(selectedLog.roleId)}</div>
                <div><span className="font-medium text-slate-800">组织：</span>{selectedLog.orgId}</div>
                <div><span className="font-medium text-slate-800">项目：</span>{selectedLog.projectId || '-'}</div>
                <div><span className="font-medium text-slate-800">对象：</span>{labelObjectType(selectedLog.objectType)}</div>
                <div><span className="font-medium text-slate-800">对象编号：</span>{selectedLog.objectId}</div>
                <div><span className="font-medium text-slate-800">结果：</span>{labelStatus(selectedLog.result)}</div>
                <div><span className="font-medium text-slate-800">IP：</span>{selectedLog.ip || '-'}</div>
                <div className="col-span-2"><span className="font-medium text-slate-800">动作：</span>{labelAuditAction(selectedLog.action)}</div>
                <div className="col-span-2"><span className="font-medium text-slate-800">原因：</span>{labelAuditReason(selectedLog.reason)}</div>
                <div className="col-span-2"><span className="font-medium text-slate-800">时间：</span>{formatDateTime(selectedLog.createdAt)}</div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>关闭</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
