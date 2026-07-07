import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { CheckSquare, Search, Filter, AlertTriangle, ShieldAlert, FileText, ChevronRight, TrendingDown } from 'lucide-react';

export function AwardSupervisionView() {
  const [showDrawer, setShowDrawer] = useState(false);

  const records = [
    { id: 'AW-2026-001', project: 'PROJ-2026-002 大堂家具更新', avoid: '无回避', deviation: '正常(1.2分)', reason: '充分', objection: '无异议', status: '监督通过' },
    { id: 'AW-2026-002', project: 'PROJ-2026-005 电梯维保服务', avoid: '1人回避', deviation: '偏大(4.5分)', reason: '需补充', objection: '有异议(处理中)', status: '重点关注' },
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#006666]" />
            定标监督
          </h2>
          <p className="text-sm text-slate-500 mt-1">对定标结果公平性的审查监督与异议处理</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 状态筛选
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">定标审查记录</CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索项目..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200">项目编号/名称</th>
                <th className="px-6 py-4 border-b border-slate-200">专家回避情况</th>
                <th className="px-6 py-4 border-b border-slate-200">评分偏离度</th>
                <th className="px-6 py-4 border-b border-slate-200">中标理由</th>
                <th className="px-6 py-4 border-b border-slate-200">公示/异议</th>
                <th className="px-6 py-4 border-b border-slate-200">监督结论</th>
                <th className="px-6 py-4 border-b border-slate-200">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{r.id}</div>
                    <div className="text-xs text-slate-500">{r.project}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.avoid}</td>
                  <td className="px-6 py-4">
                    {r.deviation.includes('偏大') ? <span className="text-amber-600">{r.deviation}</span> : <span className="text-emerald-600">{r.deviation}</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.reason}</td>
                  <td className="px-6 py-4">
                    {r.objection.includes('有异议') ? <span className="text-rose-600">{r.objection}</span> : <span className="text-slate-600">{r.objection}</span>}
                  </td>
                  <td className="px-6 py-4">
                    {r.status === '监督通过' && <span className="text-emerald-600 font-medium">通过</span>}
                    {r.status === '重点关注' && <span className="text-amber-600 font-medium">需核查</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-[#006666] hover:underline font-medium text-xs"
                      onClick={() => setShowDrawer(true)}
                    >
                      出具意见
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 侧边抽屉 */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowDrawer(false)}></div>
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                定标监督审查
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowDrawer(false)}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">评分异常分析</h4>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded text-sm text-amber-800 leading-relaxed mb-2">
                  专家 A 针对供应商“上海XX实业”的技术标打分（60分）与其他两名专家（85分, 88分）存在显著偏离。
                </div>
                <button className="text-xs text-[#006666] hover:underline flex items-center gap-1"><TrendingDown className="w-3 h-3" /> 查看明细分差对比</button>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">定标会议材料</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText className="w-4 h-4 text-slate-400" /> 定标决议书.pdf
                    </div>
                    <button className="text-[#006666] hover:underline">查看</button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText className="w-4 h-4 text-slate-400" /> 专家偏离度说明函.pdf
                    </div>
                    <button className="text-[#006666] hover:underline">查看</button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">监督意见反馈</h4>
                <textarea
                  className="w-full border border-slate-200 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666] min-h-[120px]"
                  placeholder="请输入您的监督意见，如需发函质询请注明..."
                  defaultValue="要求专家 A 提交书面说明，解释极低分的具体判分依据，暂缓发布中标通知书。"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">发送质询函</Button>
              <Button className="flex-1 bg-[#006666] hover:bg-[#005252] text-white" onClick={() => setShowDrawer(false)}>无异常，通过</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
