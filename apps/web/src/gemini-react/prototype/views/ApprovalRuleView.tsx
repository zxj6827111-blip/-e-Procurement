import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Settings, X } from 'lucide-react';

export function ApprovalRuleView() {
  const [items] = useState([
    { id: 'RUL-001', name: '大额采购审批', condition: '金额 > 10万', approvers: '部门经理, 财务总监' },
    { id: 'RUL-002', name: '日常耗材审批', condition: '金额 <= 10万', approvers: '部门经理' }
  ]);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Settings className="w-6 h-6 text-[#006666]" />审批规则</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">规则编号</th>
                <th className="px-6 py-4">规则名称</th>
                <th className="px-6 py-4">触发条件</th>
                <th className="px-6 py-4">审批人节点</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">{item.id}</td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4">{item.condition}</td>
                  <td className="px-6 py-4">{item.approvers}</td>
                  <td className="px-6 py-4">
                    <button className="text-[#006666] text-xs opacity-0 group-hover:opacity-100" onClick={() => setSelected(item)}>配置</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">配置审批规则</h3>
            <div className="space-y-4 mb-6">
              <div><label className="text-slate-500 text-sm">名称</label><input type="text" defaultValue={selected.name} className="w-full border p-2 mt-1 rounded" /></div>
              <div><label className="text-slate-500 text-sm">节点配置 (以逗号分隔)</label><input type="text" defaultValue={selected.approvers} className="w-full border p-2 mt-1 rounded" /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
              <Button className="bg-[#006666] text-white" onClick={() => { alert('规则已保存'); setSelected(null); }}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
