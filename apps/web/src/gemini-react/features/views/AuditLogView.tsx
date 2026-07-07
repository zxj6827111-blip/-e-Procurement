import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Search, Filter, Archive, CheckCircle2, AlertCircle } from 'lucide-react';

export function AuditLogView() {
  const archives = [
    { id: 'PROJ-2026-001', name: '客房一次性用品采购项目', completeness: '100%', missing: '无', status: '已归档', time: '2026-07-01' },
    { id: 'PROJ-2026-002', name: '大堂家具更新项目', completeness: '85%', missing: '供应商履约评价', status: '待补齐', time: '2026-07-02' },
    { id: 'PROJ-2026-003', name: '安保外包服务', completeness: '60%', missing: '合同原件扫描件, 定标决议', status: '风险', time: '2026-07-05' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Archive className="w-6 h-6 text-[#006666]" />
            项目档案审计
          </h2>
          <p className="text-sm text-slate-500 mt-1">项目归档完整度审查与材料补充追踪</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 筛选条件
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
                placeholder="搜索项目编号或名称..."
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
                  <th className="px-6 py-4 border-b border-slate-200">项目编号</th>
                  <th className="px-6 py-4 border-b border-slate-200">项目名称</th>
                  <th className="px-6 py-4 border-b border-slate-200">归档完整度</th>
                  <th className="px-6 py-4 border-b border-slate-200">缺失材料</th>
                  <th className="px-6 py-4 border-b border-slate-200">审计状态</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archives.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{a.id}</td>
                    <td className="px-6 py-4 text-slate-600">{a.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${a.completeness === '100%' ? 'bg-emerald-500' : (a.completeness === '85%' ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: a.completeness }}></div>
                        </div>
                        <span className="text-xs">{a.completeness}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {a.missing === '无' ? <span className="text-slate-400">-</span> : <span className="text-amber-600 truncate max-w-[200px] block" title={a.missing}>{a.missing}</span>}
                    </td>
                    <td className="px-6 py-4">
                      {a.status === '已归档' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> 已归档</span>}
                      {a.status === '待补齐' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">待补齐</span>}
                      {a.status === '风险' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200"><AlertCircle className="w-3 h-3 mr-1" /> 审计风险</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-[#006666] hover:text-[#005252] text-xs font-medium">查看档案</button>
                        {a.status !== '已归档' && <button className="text-amber-600 hover:text-amber-700 text-xs font-medium">催办补充</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
