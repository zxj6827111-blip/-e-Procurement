import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { ShieldAlert, TrendingUp, Users, Activity } from 'lucide-react';

export function SmartRiskPanel() {
  const risks = [
    {
      id: 'RSK-001',
      type: '价格偏离异常',
      description: '客房洗漱用品标段，【江苏优选酒店用品】报价低于历史均价 35%，存在低价冲标风险。',
      level: 'high',
      icon: <TrendingUp className="w-4 h-4 text-rose-500" />,
      time: '10分钟前'
    },
    {
      id: 'RSK-002',
      type: '供应商关联预警',
      description: '【北京宏利达】与【北京鑫鑫科技】存在潜在企业图谱交叉持股关联。',
      level: 'high',
      icon: <Users className="w-4 h-4 text-rose-500" />,
      time: '1小时前'
    },
    {
      id: 'RSK-003',
      type: '履约逾期风险',
      description: '【项目 PROJ-2026-002】已超期未提交结算材料，且历史履约有延迟记录。',
      level: 'medium',
      icon: <Activity className="w-4 h-4 text-amber-500" />,
      time: '3小时前'
    }
  ];

  return (
    <Card data-ui-check="surface risk-panel" className="h-full border-rose-100/50 bg-gradient-to-br from-white to-rose-50/20">
      <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 text-rose-600 rounded">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <CardTitle className="text-base font-semibold">AI 智能风控预警 (Mock)</CardTitle>
        </div>
        <Badge variant="danger">3项高优风险</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {risks.map(risk => (
            <div key={risk.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  {risk.icon}
                  <span className="font-medium text-sm text-slate-800">{risk.type}</span>
                </div>
                <span className="text-xs text-slate-400">{risk.time}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2 pl-6">
                {risk.description}
              </p>
              <div className="pl-6 mt-3 flex gap-2">
                <button className="text-xs text-[#006666] hover:underline">查看分析报告</button>
                <button className="text-xs text-slate-400 hover:text-slate-600">忽略此项</button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
