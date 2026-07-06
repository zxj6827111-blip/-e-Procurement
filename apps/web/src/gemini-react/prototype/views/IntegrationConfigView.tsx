import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Settings, Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export function IntegrationConfigView() {
  const integrations = [
    { id: 'INT-001', name: '集团OA系统', type: '审批同步', lastSync: '2026-07-05 15:30', status: '正常' },
    { id: 'INT-002', name: 'ERP财务系统', type: '结算凭证对接', lastSync: '2026-07-05 12:00', status: '正常' },
    { id: 'INT-003', name: '企查查数据', type: '供应商资信核验', lastSync: '2026-07-01 00:00', status: '异常' },
    { id: 'INT-004', name: '电子签章平台', type: '合同签署', lastSync: '2026-07-05 15:40', status: '正常' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#006666]" />
            集成配置与监控
          </h2>
          <p className="text-sm text-slate-500 mt-1">外部业务系统(OA、ERP、企查查)的对接状态与同步监控</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#006666] hover:bg-[#005252] text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> 全局刷新状态
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200">系统名称</th>
                <th className="px-6 py-4 border-b border-slate-200">对接业务类型</th>
                <th className="px-6 py-4 border-b border-slate-200">最近同步时间</th>
                <th className="px-6 py-4 border-b border-slate-200">当前状态</th>
                <th className="px-6 py-4 border-b border-slate-200">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {integrations.map(i => (
                <tr key={i.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{i.name}</td>
                  <td className="px-6 py-4 text-slate-600">{i.type}</td>
                  <td className="px-6 py-4 text-slate-600">{i.lastSync}</td>
                  <td className="px-6 py-4">
                    {i.status === '正常' ? (
                      <span className="text-emerald-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> 已连接</span>
                    ) : (
                      <span className="text-rose-600 flex items-center"><XCircle className="w-4 h-4 mr-1" /> 连接异常</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] hover:underline">测试连接</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
