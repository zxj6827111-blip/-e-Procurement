import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { UserCircle, X } from 'lucide-react';

export function SupplierProfileView() {
  const [items] = useState([
    { id: 'SUP-001', name: '江苏布草织造', contact: '张三', phone: '13800138000', score: 95 }
  ]);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><UserCircle className="w-6 h-6 text-[#006666]" />供应商档案</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">供应商编号</th>
                <th className="px-6 py-4">企业名称</th>
                <th className="px-6 py-4">联系人</th>
                <th className="px-6 py-4">联系电话</th>
                <th className="px-6 py-4">绩效评分</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4">{item.contact}</td>
                  <td className="px-6 py-4">{item.phone}</td>
                  <td className="px-6 py-4">{item.score}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>查看详细档案</button>
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
            <h3 className="font-semibold text-lg mb-4">企业档案: {selected.name}</h3>
            <div className="mb-6 space-y-4 text-sm text-slate-700 p-4 border rounded bg-slate-50">
              <p><span className="text-slate-500 w-24 inline-block">联系人：</span>{selected.contact}</p>
              <p><span className="text-slate-500 w-24 inline-block">联系电话：</span>{selected.phone}</p>
              <p><span className="text-slate-500 w-24 inline-block">综合评分：</span>{selected.score} 分</p>
              <p><span className="text-slate-500 w-24 inline-block">主营业务：</span>酒店客房布草、毛巾、浴巾</p>
              <p><span className="text-slate-500 w-24 inline-block">企业规模：</span>500-1000人</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>关闭档案</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
