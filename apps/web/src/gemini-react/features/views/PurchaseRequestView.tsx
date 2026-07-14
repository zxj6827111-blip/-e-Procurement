import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, FileText, Filter, Plus, Search, Send } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { apiGet, apiPost } from '../../../api/http';
import { formatDateTime, labelStatus } from '../../../utils/status-labels';

interface ApiProcurementRequestLineItem {
  id: string;
  itemName: string;
  category?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

interface ApiProcurementRequest {
  id: string;
  code?: string;
  title: string;
  orgId: string;
  requestDepartment?: string;
  requesterName?: string;
  category?: string;
  description?: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  methodSuggestion?: string;
  externalTradeFlag?: boolean;
  status?: string;
  approvalStatus?: string;
  approvalOpinion?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: ApiProcurementRequestLineItem[];
}

type LoadState = 'idle' | 'loading' | 'submitting';

function money(value?: number) {
  if (value === undefined || Number.isNaN(Number(value))) return '-';
  return `CNY ${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function requestDate(value?: string) {
  if (!value) return '-';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function statusTone(status?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'approved' || status === 'project_created' || status === 'method_decided') return 'success';
  if (status === 'submitted' || status === 'in_review') return 'warning';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  if (status === 'draft') return 'default';
  return 'info';
}

function displayStatus(request: ApiProcurementRequest) {
  return request.approvalStatus ?? request.status ?? 'draft';
}

function canSubmit(request: ApiProcurementRequest) {
  return (request.status ?? 'draft') === 'draft' && (request.approvalStatus ?? 'draft') === 'draft';
}

export function PurchaseRequestView() {
  const { currentUser, setCurrentView } = useApp();
  const [requests, setRequests] = useState<ApiProcurementRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApiProcurementRequest | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState('');

  const canCreate = currentUser?.role === 'HOTEL_PROCUREMENT';

  const loadRequests = useCallback(async () => {
    setLoadState('loading');
    setError('');
    try {
      const data = await apiGet<{ procurementRequests: ApiProcurementRequest[] }>('/api/procurement-requests', currentUser?.id);
      setRequests(data.procurementRequests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '采购申请加载失败');
    } finally {
      setLoadState('idle');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return requests.filter((request) => {
      const status = displayStatus(request);
      const keywordMatched =
        !keyword ||
        [request.code, request.id, request.title, request.requestDepartment, request.requesterName, request.category]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(keyword));
      const statusMatched = statusFilter === 'all' || status === statusFilter;
      return keywordMatched && statusMatched;
    });
  }, [requests, searchText, statusFilter]);

  async function submitRequest(request: ApiProcurementRequest) {
    setLoadState('submitting');
    setError('');
    try {
      await apiPost(`/api/procurement-requests/${encodeURIComponent(request.id)}/submit`, {}, currentUser?.id);
      await loadRequests();
      if (selectedRequest?.id === request.id) {
        const refreshed = await apiGet<{ procurementRequest: ApiProcurementRequest }>(`/api/procurement-requests/${encodeURIComponent(request.id)}`, currentUser?.id);
        setSelectedRequest(refreshed.procurementRequest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '采购申请提交失败');
    } finally {
      setLoadState('idle');
    }
  }

  if (selectedRequest) {
    const status = displayStatus(selectedRequest);
    return (
      <div data-ui-check="procurement-request-detail" className="h-full flex flex-col space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2 hover:bg-slate-100" onClick={() => setSelectedRequest(null)}>
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#006666]" />
              采购申请详情
            </h2>
            <p className="text-sm text-slate-500 mt-1">单据编号: {selectedRequest.code ?? selectedRequest.id}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant={statusTone(status)} className="text-sm px-3 py-1">
              状态：{labelStatus(status)}
            </Badge>
            {canCreate && canSubmit(selectedRequest) && (
              <Button data-ui-check="procurement-request-submit-detail" variant="brand" size="sm" className="gap-2" disabled={loadState === 'submitting'} onClick={() => void submitRequest(selectedRequest)}>
                <Send className="w-4 h-4" />
                提交审批
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
            <CardTitle className="text-base font-semibold text-slate-800">申请单基本信息</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">采购标题</p>
                <p className="text-base font-medium text-slate-900">{selectedRequest.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">提报部门</p>
                <p className="text-base font-medium text-slate-900">{selectedRequest.requestDepartment || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">申请人</p>
                <p className="text-base font-medium text-slate-900">{selectedRequest.requesterName || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">预算金额</p>
                <p className="text-base font-medium text-rose-600">{money(selectedRequest.budgetAmount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">需求日期</p>
                <p className="text-base font-medium text-slate-900">{requestDate(selectedRequest.expectedArrivalAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">创建时间</p>
                <p className="text-base font-medium text-slate-900">{formatDateTime(selectedRequest.createdAt)}</p>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">采购物资明细</h3>
              <table className="w-full text-sm text-left border border-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 border-b border-slate-200">物资名称</th>
                    <th className="px-4 py-2 border-b border-slate-200">规格/型号</th>
                    <th className="px-4 py-2 border-b border-slate-200">数量</th>
                    <th className="px-4 py-2 border-b border-slate-200">单位</th>
                    <th className="px-4 py-2 border-b border-slate-200 text-right">预算金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(selectedRequest.lineItems ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>暂无明细</td>
                    </tr>
                  ) : (
                    selectedRequest.lineItems?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">{item.itemName || '-'}</td>
                        <td className="px-4 py-3">{item.specification || '-'}</td>
                        <td className="px-4 py-3">{item.quantity ?? '-'}</td>
                        <td className="px-4 py-3">{item.unit || '-'}</td>
                        <td className="px-4 py-3 text-right">{money(item.budgetAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium text-slate-500 mb-2">申请理由与说明</p>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-sm leading-relaxed">
                {selectedRequest.purpose || selectedRequest.description || '未填写'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-ui-check="procurement-request-list" className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            采购申请单管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">集中管理本角色权限范围内的采购需求及审批状态。</p>
        </div>
        {canCreate && (
          <Button data-ui-check="procurement-request-create-entry" variant="primary" className="gap-2" onClick={() => setCurrentView('PROCUREMENT_REQUEST_CREATE')}>
            <Plus className="w-4 h-4" />
            新建采购申请
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="flex-1 relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-ui-check="procurement-request-search"
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="搜索单号、标题、提报部门"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>
          <div className="flex gap-2">
            <select
              data-ui-check="procurement-request-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border border-slate-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#006666]"
            >
              <option value="all">所有状态</option>
              <option value="draft">草稿</option>
              <option value="submitted">已提交</option>
              <option value="in_review">审批中</option>
              <option value="approved">已批准</option>
              <option value="rejected">已驳回</option>
            </select>
            <Button variant="outline" className="gap-2" onClick={() => { setSearchText(''); setStatusFilter('all'); }}>
              <Filter className="w-4 h-4" />
              重置筛选
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-3">申请单号</th>
                <th className="px-6 py-3">采购标题</th>
                <th className="px-6 py-3">需求部门</th>
                <th className="px-6 py-3 text-right">预计金额</th>
                <th className="px-6 py-3 text-center">当前状态</th>
                <th className="px-6 py-3">提报日期</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loadState === 'loading' ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>正在加载采购申请...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>暂无符合条件的采购申请</td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const status = displayStatus(request);
                  return (
                    <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{request.code ?? request.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{request.title}</td>
                      <td className="px-6 py-4 text-slate-600">{request.requestDepartment || '-'}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">{money(request.budgetAmount)}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusTone(status)}>
                          {status === 'submitted' || status === 'in_review' ? <Clock className="w-3 h-3 mr-1 inline" /> : null}
                          {status === 'approved' ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : null}
                          {labelStatus(status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{requestDate(request.createdAt)}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button data-ui-check="procurement-request-detail-entry" variant="ghost" size="sm" className="text-[#006666]" onClick={() => setSelectedRequest(request)}>查看详情</Button>
                        {canCreate && canSubmit(request) && (
                          <Button data-ui-check="procurement-request-submit-row" variant="outline" size="sm" disabled={loadState === 'submitting'} onClick={() => void submitRequest(request)}>
                            提交审批
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-sm text-slate-500">
          <div>共找到 {filteredRequests.length} 条记录</div>
          <Button variant="outline" size="sm" onClick={() => void loadRequests()}>刷新</Button>
        </div>
      </Card>
    </div>
  );
}
