import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Activity, Search, Filter, AlertTriangle, ShieldAlert, FileText, Clock, ChevronRight } from 'lucide-react';

export function AuditSupervisionView() {
  const [showDrawer, setShowDrawer] = useState(false);

  const risks = [
    { id: 'RSK-001', project: 'PROJ-2026-009 弱电改造项目', type: '流程异常', desc: '需求审批跳过财务节点', level: '高', date: '2026-07-05', status: '待整改' },
    { id: 'RSK-002', project: 'PROJ-2026-012 食材年度招标', type: '文件缺失', desc: '招标文件缺少合规性审查记录', level: '中', date: '2026-07-04', status: '整改中' },
    { id: 'RSK-003', project: 'PROJ-2026-015 客房布草采购', type: '权限越界', desc: '非项目组成员违规下载报价单', level: '高', date: '2026-07-03', status: '已闭环' }
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#006666]" />
            采购监督
          </h2>
          <p className="text-sm text-slate-500 mt-1">对采购流程合规性的审计监督与风险预警</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 风险过滤
          </Button>
          <Button className="bg-[#006666] hover:bg-[#005252] text-white">
            <ShieldAlert className="w-4 h-4 mr-2" /> 发起专项审计
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-rose-50 border-rose-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rose-800">高风险预警</p>
                <h3 className="text-3xl font-bold text-rose-600 mt-1">3</h3>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">待整改事项</p>
                <h3 className="text-3xl font-bold text-amber-600 mt-1">12</h3>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">本月已闭环</p>
                <h3 className="text-3xl font-bold text-slate-700 mt-1">45</h3>
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">实时风险清单</CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索项目编号或风险描述..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200">预警编号/时间</th>
                <th className="px-6 py-4 border-b border-slate-200">关联项目</th>
                <th className="px-6 py-4 border-b border-slate-200">风险类型/描述</th>
                <th className="px-6 py-4 border-b border-slate-200">等级</th>
                <th className="px-6 py-4 border-b border-slate-200">状态</th>
                <th className="px-6 py-4 border-b border-slate-200">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{r.id}</div>
                    <div className="text-xs text-slate-500">{r.date}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.project}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{r.type}</div>
                    <div className="text-xs text-slate-500">{r.desc}</div>
                  </td>
                  <td className="px-6 py-4">
                    {r.level === '高' && <span className="text-rose-600 font-medium">高风险</span>}
                    {r.level === '中' && <span className="text-amber-600 font-medium">中风险</span>}
                  </td>
                  <td className="px-6 py-4">
                    {r.status === '待整改' && <span className="text-rose-600">待发函</span>}
                    {r.status === '整改中' && <span className="text-amber-600">整改中</span>}
                    {r.status === '已闭环' && <span className="text-emerald-600">已归档</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-[#006666] hover:underline font-medium text-xs"
                      onClick={() => setShowDrawer(true)}
                    >
                      查看证据及时间轴
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
          <div className="relative w-[400px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                风险详情调查
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowDrawer(false)}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">风险摘要</h4>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded text-sm text-rose-800 leading-relaxed">
                  系统检测到项目 PROJ-2026-009 在需求审批环节，跳过了法定的“财务预算审核”节点，直接进入了采购发包阶段。
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">关键证据链</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText className="w-4 h-4 text-slate-400" /> 审批流转日志.json
                    </div>
                    <button className="text-[#006666] hover:underline">查看报文</button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText className="w-4 h-4 text-slate-400" /> 系统节点配置快照.json
                    </div>
                    <button className="text-[#006666] hover:underline">查看报文</button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">操作时间轴</h4>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-slate-200">
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center shrink-0 border-2 border-white mt-0.5"></div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">07-05 10:00</div>
                      <div className="text-sm font-medium text-slate-900">需求申请提交</div>
                      <div className="text-xs text-slate-500">操作人: 客房部 李主管</div>
                    </div>
                  </div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shrink-0 border-2 border-white mt-0.5"></div>
                    <div>
                      <div className="text-xs text-rose-500 mb-1">07-05 10:05 (异常)</div>
                      <div className="text-sm font-medium text-rose-700">跳过财务节点</div>
                      <div className="text-xs text-slate-500">系统路由直接流转至采购中心</div>
                    </div>
                  </div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center shrink-0 border-2 border-white mt-0.5"></div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">07-05 11:30</div>
                      <div className="text-sm font-medium text-slate-900">采购中心接收</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white">下发整改通知</Button>
              <Button variant="outline" className="flex-1 bg-white" onClick={() => setShowDrawer(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
