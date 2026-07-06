import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileBadge, X } from 'lucide-react';

export function RegistrationMaterialView() {
  const [items, setItems] = useState([
    { id: 'REG-001', supplier: '江苏布草织造有限公司', project: 'PROJ-2026-001', status: '待审核', date: '2026-07-04' },
    { id: 'REG-002', supplier: '南通家纺集采', project: 'PROJ-2026-001', status: '已通过', date: '2026-07-03' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  const handleAudit = (id: string, action: string) => {
    if (confirm(`确认${action}该供应商的报名资料？`)) {
      setItems(items.map(i => i.id === id ? { ...i, status: action === '通过' ? '已通过' : '已退回' } : i));
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileBadge className="w-6 h-6 text-[#006666]" />
            报名资料
          </h2>
          <p className="text-sm text-slate-500 mt-1">审核供应商提交的报名材料与资质</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">报名编号</th>
                <th className="px-6 py-4">供应商名称</th>
                <th className="px-6 py-4">关联项目</th>
                <th className="px-6 py-4">提交日期</th>
                <th className="px-6 py-4">审核状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.supplier}</td>
                  <td className="px-6 py-4 text-slate-600">{item.project}</td>
                  <td className="px-6 py-4 text-slate-600">{item.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${item.status === '待审核' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs font-medium opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>审核/详情</button>
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
            <h3 className="font-semibold text-lg mb-4">资料审核: {selected.supplier}</h3>
            <div className="space-y-4 mb-6">
              <div><span className="text-slate-500">项目：</span>{selected.project}</div>
              <div><span className="text-slate-500">营业执照：</span><a href="#" className="text-blue-500">点击查看PDF</a></div>
            </div>
            {selected.status === '待审核' ? (
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => handleAudit(selected.id, '退回')}>退回</Button>
                <Button className="bg-[#006666] text-white" onClick={() => handleAudit(selected.id, '通过')}>审核通过</Button>
              </div>
            ) : (
              <div className="flex justify-end"><Button variant="outline" onClick={() => setSelected(null)}>关闭</Button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
