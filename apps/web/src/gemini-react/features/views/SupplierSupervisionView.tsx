import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Building, Search, Filter, AlertTriangle, ShieldAlert, FileText, ChevronRight, XCircle } from 'lucide-react';

export function SupplierSupervisionView() {
  const [showDrawer, setShowDrawer] = useState(false);

  const suppliers = [
    { id: 'SUP-2026-003', name: '深圳市安防科技有限公司', risk: '严重违约', cert: '正常', complain: '2次', blackist: '灰名单', perf: '履约迟延', status: '整改中' },
    { id: 'SUP-2026-008', name: '北京绿源洗涤用品厂', risk: '资质临期', cert: '剩余15天', complain: '无', blackist: '正常', perf: '良好', status: '预警提示' },
    { id: 'SUP-2026-012', name: '上海阳光家具有限公司', risk: '无异常', cert: '正常', complain: '无', blackist: '正常', perf: '优秀', status: '正常' }
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-[#006666]" />
            供应商监督
          </h2>
          <p className="text-sm text-slate-500 mt-1">对供应商行为规范、资质合规与履约表现的监督</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 风险供应商筛选
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">供应商风险台账</CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索供应商名称..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200">供应商名称</th>
                <th className="px-6 py-4 border-b border-slate-200">风险标签</th>
                <th className="px-6 py-4 border-b border-slate-200">资质状态</th>
                <th className="px-6 py-4 border-b border-slate-200">投诉/处罚</th>
                <th className="px-6 py-4 border-b border-slate-200">黑灰名单</th>
                <th className="px-6 py-4 border-b border-slate-200">履约表现</th>
                <th className="px-6 py-4 border-b border-slate-200">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    {s.risk.includes('严重') ? <span className="text-rose-600 font-medium">{s.risk}</span> : (s.risk.includes('临期') ? <span className="text-amber-600">{s.risk}</span> : <span className="text-slate-600">{s.risk}</span>)}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{s.cert}</td>
                  <td className="px-6 py-4 text-slate-700">{s.complain}</td>
                  <td className="px-6 py-4">
                    {s.blackist === '灰名单' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200"><ShieldAlert className="w-3 h-3 mr-1" />灰名单</span>}
                    {s.blackist === '正常' && <span className="text-slate-600">正常</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{s.perf}</td>
                  <td className="px-6 py-4">
                    <button
                      className="text-[#006666] hover:underline font-medium text-xs"
                      onClick={() => setShowDrawer(true)}
                    >
                      跟踪处置
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
                <Building className="w-5 h-5 text-[#006666]" />
                供应商处置跟踪
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowDrawer(false)}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">处罚与投诉记录</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded text-sm text-rose-800">
                    <div className="flex items-center gap-2 font-medium mb-1"><XCircle className="w-4 h-4" /> 严重违约 (PROJ-2026-004)</div>
                    供应商在定标后无正当理由拒签合同，导致项目延期。已记录不良行为，当前状态为灰名单考察中。
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">整改跟踪详情</h4>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-slate-200">
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center shrink-0 border-2 border-white mt-0.5"></div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">07-01</div>
                      <div className="text-sm font-medium text-slate-900">下发警告函与整改通知</div>
                    </div>
                  </div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0 border-2 border-white mt-0.5"></div>
                    <div>
                      <div className="text-xs text-amber-600 mb-1">当前进度</div>
                      <div className="text-sm font-medium text-slate-900">等待供应商提交《履约保证书》</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">监督操作</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-rose-600 hover:bg-rose-50 border-rose-200">
                    <ShieldAlert className="w-4 h-4 mr-2" /> 移入黑名单 (终止合作)
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-slate-700">
                    <FileText className="w-4 h-4 mr-2" /> 延长灰名单考察期
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-emerald-600 hover:bg-emerald-50 border-emerald-200">
                    <Building className="w-4 h-4 mr-2" /> 恢复正常供应商状态
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setShowDrawer(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
