import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileCheck, Search, Filter, AlertCircle, CheckCircle2, XCircle, Clock, ShieldCheck, TrendingDown, Users } from 'lucide-react';

export function AwardApproveView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const projects = [
    { id: 'PROJ-2026-002', name: '大堂家具更新项目', winner: '上海阳光家具有限公司', score: '92.5', quote: '¥480,000', status: '待审批', date: '2026-07-06' },
    { id: 'PROJ-2026-004', name: '安保外包服务采购', winner: '深圳市安防科技有限公司', score: '88.0', quote: '¥210,000', status: '待审批', date: '2026-07-05' }
  ];

  const handleApprove = (id: string, result: string) => {
    setStatusMap(prev => ({ ...prev, [id]: result }));
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#006666]" />
            定标审批
          </h2>
          <p className="text-sm text-slate-500 mt-1">项目中标结果的复核与最终定标审批</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 筛选条件
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">项目编号/名称</th>
                  <th className="px-6 py-4 border-b border-slate-200">推荐中标人</th>
                  <th className="px-6 py-4 border-b border-slate-200">综合得分/报价</th>
                  <th className="px-6 py-4 border-b border-slate-200">状态</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map(p => {
                  const currentStatus = statusMap[p.id] || p.status;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{p.id}</div>
                        <div className="text-xs text-slate-500">{p.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{p.winner}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[#006666] font-medium">{p.score}分</div>
                        <div className="text-xs text-slate-500">{p.quote}</div>
                      </td>
                      <td className="px-6 py-4">
                        {currentStatus === '待审批' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200"><Clock className="w-3 h-3 mr-1" />待审批</span>}
                        {currentStatus === '已定标' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />已定标</span>}
                        {currentStatus === '退回复核' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><AlertCircle className="w-3 h-3 mr-1" />退回复核</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          className="text-[#006666] hover:underline font-medium text-xs"
                          onClick={() => setSelectedId(p.id)}
                        >
                          定标审查
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 定标审查侧边栏 */}
        <Card className="lg:col-span-1 bg-slate-50/50 h-fit">
          <CardHeader className="py-4 border-b border-slate-100 bg-white">
            <CardTitle className="text-base font-medium">定标合规审查</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedId ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">合规检查项</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      专家评分偏离度正常 (最大极差 2.5分)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
                      <TrendingDown className="w-4 h-4 shrink-0" />
                      中标价低于预算金额 (结余率 4.0%)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
                      <Users className="w-4 h-4 shrink-0" />
                      满足有效投标人数 (已参与: 4家)
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">专家组定标建议</h4>
                  <div className="p-3 bg-white border border-slate-200 rounded text-sm text-slate-600 leading-relaxed">
                    综合排名第一的供应商在技术响应与售后服务承诺上表现突出，报价合理，建议选定其为中标单位。
                  </div>
                </div>

                {(!statusMap[selectedId] || statusMap[selectedId] === '待审批') ? (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-2">定标决议</h4>
                    <textarea 
                      className="w-full border border-slate-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666] mb-3" 
                      rows={3}
                      placeholder="请输入定标意见..."
                      defaultValue="流程合规，同意定标。"
                    ></textarea>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2" onClick={() => handleApprove(selectedId, '已定标')}>同意定标</Button>
                      <Button variant="outline" className="text-slate-600 text-sm py-2" onClick={() => handleApprove(selectedId, '退回复核')}>退回复核</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md">
                    <p className="text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 审批完成，定标结果已记录
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileCheck className="w-12 h-12 mb-3 text-slate-200" />
                <p className="text-sm">点击左侧列表查看合规审查详情</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
