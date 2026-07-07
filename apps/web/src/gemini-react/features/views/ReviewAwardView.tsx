import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Gavel, X } from 'lucide-react';

export function ReviewAwardView() {
  const [items, setItems] = useState([
    { id: 'PROJ-2026-002', name: '大堂家具更新', count: 5, status: '待评审' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Gavel className="w-6 h-6 text-[#006666]" />评审定标</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">项目编号</th>
                <th className="px-6 py-4">项目名称</th>
                <th className="px-6 py-4">有效报价数</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4">{item.count}</td>
                  <td className="px-6 py-4">{item.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>组织评审</button>
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
            <h3 className="font-semibold text-lg mb-4">组织评审: {selected.name}</h3>
            <div className="p-4 bg-slate-50 border rounded text-sm text-slate-700 mb-4">
               共收到 {selected.count} 份有效报价，请启动评审流程，生成定标建议书。
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
              <Button className="bg-[#006666] text-white" onClick={() => { alert('评审建议书已生成并提交流转'); setSelected(null); setItems(items.map(i => i.id === selected.id ? {...i, status: '已定标'} : i)); }}>确认定标</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
