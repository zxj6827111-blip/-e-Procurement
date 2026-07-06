import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileCheck, Search, Filter, AlertCircle, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function RequestApproveView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const requests = [
    { id: 'REQ-2026-001', hotel: '北京朝阳大酒店', dept: '客房部', budget: '¥150,000', category: '客房易耗品', priority: '高', status: '待审批', date: '2026-07-05' },
    { id: 'REQ-2026-002', hotel: '上海浦东分店', dept: '工程部', budget: '¥800,000', category: '电梯维保', priority: '中', status: '待审批', date: '2026-07-04' },
    { id: 'REQ-2026-003', hotel: '广州天河店', dept: '餐饮部', budget: '¥35,000', category: '后厨生鲜', priority: '紧急', status: '待审批', date: '2026-07-05' }
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
            需求审批
          </h2>
          <p className="text-sm text-slate-500 mt-1">采购需求审核与立项批复</p>
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
                  placeholder="搜索需求单号或申请部门..." 
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">单号/日期</th>
                  <th className="px-6 py-4 border-b border-slate-200">申请单位</th>
                  <th className="px-6 py-4 border-b border-slate-200">采购类别/预算</th>
                  <th className="px-6 py-4 border-b border-slate-200">状态</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(r => {
                  const currentStatus = statusMap[r.id] || r.status;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{r.id}</div>
                        <div className="text-xs text-slate-500">{r.date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{r.hotel}</div>
                        <div className="text-xs text-slate-500">{r.dept}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{r.category}</div>
                        <div className="text-[#006666] font-medium">{r.budget}</div>
                      </td>
                      <td className="px-6 py-4">
                        {currentStatus === '待审批' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200"><Clock className="w-3 h-3 mr-1" />待审批</span>}
                        {currentStatus === '已通过' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />已通过</span>}
                        {currentStatus === '已驳回' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200"><XCircle className="w-3 h-3 mr-1" />已驳回</span>}
                        {currentStatus === '退回补充' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><AlertCircle className="w-3 h-3 mr-1" />退回补充</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          className="text-[#006666] hover:underline font-medium text-xs"
                          onClick={() => setSelectedId(r.id)}
                        >
                          审核详情
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 详情与审批侧边栏 */}
        <Card className="lg:col-span-1 bg-slate-50/50 h-fit">
          <CardHeader className="py-4 border-b border-slate-100 bg-white">
            <CardTitle className="text-base font-medium">审批操作区</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedId ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">附件清单</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileText className="w-4 h-4 text-[#006666]" /> 需求申请表.pdf
                      </div>
                      <a href="#" className="text-[#006666] hover:underline">查看</a>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileText className="w-4 h-4 text-[#006666]" /> 预算批复凭证.jpg
                      </div>
                      <a href="#" className="text-[#006666] hover:underline">查看</a>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">审批节点</h4>
                  <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-slate-200">
                    <div className="flex gap-3 relative z-10">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 border-2 border-white">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-900">部门主管审核</div>
                        <div className="text-xs text-slate-500">张主管 (已同意)</div>
                      </div>
                    </div>
                    <div className="flex gap-3 relative z-10">
                      <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 border-2 border-white">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-amber-600">采购中心审核</div>
                        <div className="text-xs text-slate-500">当前节点</div>
                      </div>
                    </div>
                  </div>
                </div>

                {(!statusMap[selectedId] || statusMap[selectedId] === '待审批') ? (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-2">审批意见</h4>
                    <textarea 
                      className="w-full border border-slate-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666] mb-3" 
                      rows={3}
                      placeholder="请输入审批意见..."
                      defaultValue="预算合理，资料齐全，同意立项。"
                    ></textarea>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1" onClick={() => handleApprove(selectedId, '已通过')}>通过</Button>
                      <Button variant="outline" className="text-slate-600 text-xs py-1" onClick={() => handleApprove(selectedId, '退回补充')}>退回补充</Button>
                      <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-1" onClick={() => handleApprove(selectedId, '已驳回')}>驳回</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md">
                    <p className="text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 您已完成该单据审批
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileCheck className="w-12 h-12 mb-3 text-slate-200" />
                <p className="text-sm">点击左侧列表查看审批详情</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
