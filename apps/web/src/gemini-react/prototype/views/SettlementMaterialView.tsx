import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileText, X } from 'lucide-react';

export function SettlementMaterialView() {
  const [items, setItems] = useState([
    { id: 'SET-2026-001', order: 'ORD-2026-001', supplier: '上海净美服务', status: '待审核材料' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  const approve = (id: string) => {
    if (confirm('确认审核通过结算材料？')) {
      setItems(items.map(i => i.id === id ? { ...i, status: '审核通过' } : i));
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="w-6 h-6 text-[#006666]" />结算材料</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">结算编号</th>
                <th className="px-6 py-4">关联订单</th>
                <th className="px-6 py-4">供应商</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.order}</td>
                  <td className="px-6 py-4">{item.supplier}</td>
                  <td className="px-6 py-4">{item.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>材料审核</button>
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
            <h3 className="font-semibold text-lg mb-4">材料审核</h3>
            <div className="mb-6 space-y-2">
              <p>结算编号：{selected.id}</p>
              <p>发票：已上传</p>
              <p>验收单：已上传</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
              {selected.status === '待审核材料' && (
                <Button className="bg-[#006666] text-white" onClick={() => approve(selected.id)}>审核通过</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
