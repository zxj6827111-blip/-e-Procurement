import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Search, Filter, Megaphone, ChevronLeft, ChevronRight, X } from 'lucide-react';

export function AnnouncementInvitationView() {
  const [items, setItems] = useState([
    { id: 'ANN-001', project: 'PROJ-2026-001', type: '招标公告', title: '2026年度客房耗材供应商入围招标公告', status: '发布中', date: '2026-07-01' },
    { id: 'ANN-002', project: 'PROJ-2026-002', type: '询价邀请', title: '大堂家具更新采购询价邀请函', status: '待发布', date: '2026-07-05' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  const handlePublish = (id: string) => {
    if (confirm('确认发布该公告/邀请？')) {
      setItems(items.map(i => i.id === id ? { ...i, status: '发布中' } : i));
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#006666]" />
            公告邀请
          </h2>
          <p className="text-sm text-slate-500 mt-1">发布与管理采购公告和邀请函</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#006666] hover:bg-[#005252] text-white">起草公告</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">编号/类型</th>
                  <th className="px-6 py-4">公告标题</th>
                  <th className="px-6 py-4">关联项目</th>
                  <th className="px-6 py-4">日期</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 group">
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.id}</div>
                      <div className="text-xs text-slate-500">{item.type}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                    <td className="px-6 py-4 text-slate-600">{item.project}</td>
                    <td className="px-6 py-4 text-slate-600">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${item.status === '发布中' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100">
                        <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => setSelected(item)}>详情</button>
                        {item.status === '待发布' && (
                          <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => handlePublish(item.id)}>发布</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelected(null)}></div>
          <div className="relative w-[400px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-4 border-b flex justify-between bg-slate-50">
              <h3 className="font-medium flex items-center gap-2"><Megaphone className="w-5 h-5" />详情</h3>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
               <div><span className="text-slate-500">标题：</span>{selected.title}</div>
               <div><span className="text-slate-500">类型：</span>{selected.type}</div>
               <div><span className="text-slate-500">状态：</span>{selected.status}</div>
            </div>
            <div className="p-4 border-t mt-auto"><Button className="w-full" variant="outline" onClick={() => setSelected(null)}>关闭</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
