import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { TrendingUp, X } from 'lucide-react';

export function QuoteProgressView() {
  const [items, setItems] = useState([
    { id: 'PROJ-2026-001', name: '2026年度客房耗材', count: 3, total: 5, status: '报价中' },
    { id: 'PROJ-2026-002', name: '大堂家具更新', count: 5, total: 5, status: '报价结束' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-[#006666]" />报价进度</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">项目编号</th>
                <th className="px-6 py-4">项目名称</th>
                <th className="px-6 py-4">已报价/邀请数</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4">{item.count} / {item.total}</td>
                  <td className="px-6 py-4">{item.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>明细</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">报价进度明细: {selected.name}</h3>
            <div className="p-4 bg-slate-50 border rounded text-sm text-slate-700">
               目前已有 {selected.count} 家供应商提交报价。<br/>
               剩余 {selected.total - selected.count} 家未提交。
            </div>
            <div className="flex gap-3 justify-end mt-4">
               {selected.status === '报价中' && <Button onClick={() => alert('催办提醒已发送给未报价供应商')} className="bg-[#006666] text-white">发送催办</Button>}
               <Button variant="outline" onClick={() => setSelected(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
