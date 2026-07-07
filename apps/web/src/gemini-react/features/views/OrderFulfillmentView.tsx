import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { ShoppingCart, X } from 'lucide-react';

export function OrderFulfillmentView() {
  const [items, setItems] = useState([
    { id: 'ORD-2026-001', supplier: '上海净美服务', project: '客房保洁外包', status: '履约中', amount: '¥1,200,000' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  const confirmReceipt = (id: string) => {
    if (confirm('确认商品/服务已验收？')) {
      setItems(items.map(i => i.id === id ? { ...i, status: '已完成' } : i));
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-[#006666]" />订单履约</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">订单编号</th>
                <th className="px-6 py-4">供应商</th>
                <th className="px-6 py-4">项目</th>
                <th className="px-6 py-4">总金额</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.supplier}</td>
                  <td className="px-6 py-4">{item.project}</td>
                  <td className="px-6 py-4">{item.amount}</td>
                  <td className="px-6 py-4">{item.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>订单验收</button>
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
            <h3 className="font-semibold text-lg mb-4">订单验收: {selected.id}</h3>
            <div className="mb-6 space-y-2">
              <p>供应商：{selected.supplier}</p>
              <p>项目：{selected.project}</p>
              <p>状态：{selected.status}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
              {selected.status === '履约中' && (
                <Button className="bg-[#006666] text-white" onClick={() => confirmReceipt(selected.id)}>确认验收</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
