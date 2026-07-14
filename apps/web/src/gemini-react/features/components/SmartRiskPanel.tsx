import React from 'react';
import { Activity, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { Badge } from '../../shared/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import type { ViewState } from '../../shared/types';

export interface SmartRiskItem {
  id: string;
  type: string;
  description: string;
  level: 'high' | 'medium' | 'info';
  time: string;
  nextView?: ViewState;
}

function riskIcon(risk: SmartRiskItem) {
  if (risk.type.includes('供应商')) return <Users className="w-4 h-4 text-rose-500" />;
  if (risk.level === 'high') return <ShieldAlert className="w-4 h-4 text-rose-500" />;
  if (risk.level === 'medium') return <TrendingUp className="w-4 h-4 text-amber-500" />;
  return <Activity className="w-4 h-4 text-blue-500" />;
}

function riskBadgeVariant(risks: SmartRiskItem[]) {
  if (risks.some((risk) => risk.level === 'high')) return 'danger';
  if (risks.some((risk) => risk.level === 'medium')) return 'warning';
  return 'outline';
}

export function SmartRiskPanel({ risks, onOpenRisk }: { risks: SmartRiskItem[]; onOpenRisk?: (risk: SmartRiskItem) => void }) {
  const attentionLabel = risks.some((risk) => risk.level === 'high') ? '高优关注' : '角色关注';

  return (
    <Card data-ui-check="surface risk-panel" className="h-full border-rose-100/50 bg-gradient-to-br from-white to-rose-50/20">
      <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 text-rose-600 rounded">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <CardTitle className="text-base font-semibold">角色关注风险</CardTitle>
        </div>
        <Badge variant={riskBadgeVariant(risks)}>{risks.length}项{attentionLabel}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {risks.length ? risks.map((risk) => (
            <div key={risk.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  {riskIcon(risk)}
                  <span className="font-medium text-sm text-slate-800">{risk.type}</span>
                </div>
                <span className="text-xs text-slate-400">{risk.time}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2 pl-6">{risk.description}</p>
              <div className="pl-6 mt-3 flex gap-2">
                <button className="text-xs text-[#006666] hover:underline" onClick={() => onOpenRisk?.(risk)}>查看业务记录</button>
              </div>
            </div>
          )) : (
            <div className="p-6 text-sm text-slate-500">当前角色范围内暂无高优风险；待办、供应商、订单或审计记录变化后会自动更新。</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
