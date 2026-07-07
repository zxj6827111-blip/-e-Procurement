import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Trophy, X } from 'lucide-react';

export function AwardResultView() {
  const [items] = useState([
    { id: 'PROJ-2026-003', name: '客房保洁外包', winner: '上海净美服务', amount: '¥1,200,000', status: '已发通知书' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Trophy className="w-6 h-6 text-[#006666]" />中标结果</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">项目编号</th>
                <th className="px-6 py-4">项目名称</th>
                <th className="px-6 py-4">中标单位</th>
                <th className="px-6 py-4">中标金额</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4 font-medium text-[#006666]">{item.winner}</td>
                  <td className="px-6 py-4">{item.amount}</td>
                  <td className="px-6 py-4">{item.status}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>查看通知书</button>
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
            <h3 className="font-semibold text-lg mb-4">中标通知书预览</h3>
            <div className="p-8 border border-slate-200 text-center space-y-4">
               <h4 className="text-xl font-bold">中标通知书</h4>
               <p className="text-left">致：{selected.winner}</p>
               <p className="text-left indent-8">在 {selected.name} 项目中，经评审委员会评定，确定贵单位为中标人。中标金额为 {selected.amount}。</p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={() => alert('通知书已下载')} variant="outline">下载PDF</Button>
              <Button className="bg-[#006666] text-white" onClick={() => setSelected(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
