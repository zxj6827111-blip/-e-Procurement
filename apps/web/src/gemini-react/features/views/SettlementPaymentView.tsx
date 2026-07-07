import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { DollarSign, X } from 'lucide-react';

export function SettlementPaymentView() {
  const [items, setItems] = useState([
    { id: 'PAY-2026-001', settlementId: 'SET-2026-001', supplier: '上海净美服务', amount: '¥1,200,000', status: '待付款' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  const confirmPayment = (id: string) => {
    if (confirm('确认已完成付款操作？')) {
      setItems(items.map(i => i.id === id ? { ...i, status: '已付款' } : i));
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><DollarSign className="w-6 h-6 text-[#006666]" />结算付款</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">付款编号</th>
                <th className="px-6 py-4">结算编号</th>
                <th className="px-6 py-4">供应商</th>
                <th className="px-6 py-4">金额</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.settlementId}</td>
                  <td className="px-6 py-4">{item.supplier}</td>
                  <td className="px-6 py-4">{item.amount}</td>
                  <td className="px-6 py-4">{item.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>确认付款</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">付款确认</h3>
            <div className="mb-6 space-y-2">
              <p>付款编号：{selected.id}</p>
              <p>金额：<span className="text-red-500 font-medium">{selected.amount}</span></p>
              <p>收款方：{selected.supplier}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
              {selected.status === '待付款' && (
                <Button className="bg-[#006666] text-white" onClick={() => confirmPayment(selected.id)}>确认已付款</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
