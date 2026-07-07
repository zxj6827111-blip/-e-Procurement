import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Shield, Search, Filter, FileText, ChevronLeft, ChevronRight, X } from 'lucide-react';

export function OperationLogView() {
  const [logs] = useState([
    { id: 1, user: '张三', role: '酒店采购', action: '提交采购申请', target: 'REQ-202607-091', time: '2026-07-05 10:00:00', ip: '192.168.1.100', detail: '{"amount": 50000, "items": ["客房毛巾", "浴巾"]}' },
    { id: 2, user: '李四', role: '采购经办人', action: '发布采购公告', target: 'PROJ-2026-004', time: '2026-07-05 09:30:00', ip: '10.0.0.50', detail: '{"publishChannels": ["集团官网", "招采平台"]}' },
    { id: 3, user: '王五', role: '系统管理员', action: '修改审批规则', target: 'RULE-005', time: '2026-07-04 15:20:00', ip: '172.16.0.10', detail: '{"threshold": 100000}' }
  ]);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#006666]" />
            操作日志
          </h2>
          <p className="text-sm text-slate-500 mt-1">系统用户操作行为审计与跟踪记录</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 更多筛选
          </Button>
          <Button className="bg-[#006666] hover:bg-[#005252] text-white" onClick={() => alert('日志导出任务已提交')}>
            <FileText className="w-4 h-4 mr-2" /> 导出日志
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索操作人或操作目标..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">操作人(角色)</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作动作</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作目标</th>
                  <th className="px-6 py-4 border-b border-slate-200">时间</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{log.user} <span className="text-slate-500 font-normal">({log.role})</span></td>
                    <td className="px-6 py-4 text-slate-600">{log.action}</td>
                    <td className="px-6 py-4 text-slate-600">{log.target}</td>
                    <td className="px-6 py-4 text-slate-600">{log.time}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => setSelectedLog(log)}>查看报文</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>共 3 条记录</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-slate-100">1</Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/20" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">操作报文详情</h3>
              <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setSelectedLog(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-slate-600">
                <div><span className="font-medium text-slate-800">操作人：</span>{selectedLog.user}</div>
                <div><span className="font-medium text-slate-800">IP地址：</span>{selectedLog.ip}</div>
                <div><span className="font-medium text-slate-800">动作：</span>{selectedLog.action}</div>
                <div><span className="font-medium text-slate-800">目标：</span>{selectedLog.target}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(JSON.parse(selectedLog.detail), null, 2)}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
