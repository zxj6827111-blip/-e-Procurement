import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const spendData = [
  { name: '1月', 实际支出: 4000, 预算金额: 4500 },
  { name: '2月', 实际支出: 3000, 预算金额: 3200 },
  { name: '3月', 实际支出: 2000, 预算金额: 2800 },
  { name: '4月', 实际支出: 2780, 预算金额: 2900 },
  { name: '5月', 实际支出: 1890, 预算金额: 2100 },
  { name: '6月', 实际支出: 2390, 预算金额: 2500 },
  { name: '7月', 实际支出: 3490, 预算金额: 3600 },
];

const categoryData = [
  { name: '酒店布草', amount: 4500 },
  { name: '客房易耗品', amount: 3200 },
  { name: '餐饮食材', amount: 2800 },
  { name: '工程五金', amount: 2100 },
  { name: 'IT设备', amount: 1900 },
];

export function ProcurementAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Spend vs Budget Chart */}
      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold">年度采购资金消耗趋势 (万元)</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006666" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#006666" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="预算金额" stroke="#cbd5e1" fillOpacity={0} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="实际支出" stroke="#006666" fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Spend by Category Chart */}
      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold">各品类采购金额占比 (TOP 5)</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155' }} width={80} />
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#006666" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
