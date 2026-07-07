import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useApp, type RatingTemplate, type RatingTemplateItem } from '../../core/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  PenTool,
  Plus,
  Save,
  Search,
  X
} from 'lucide-react';

const defaultItems: RatingTemplateItem[] = [
  { name: '价格合理性', score: 30, note: '报价与预算、历史采购价、市场价对比' },
  { name: '技术或服务响应', score: 30, note: '参数、方案、样品、服务能力与采购文件响应情况' },
  { name: '履约保障能力', score: 25, note: '交付周期、售后、应急响应和质量保障' },
  { name: '供应商合规记录', score: 15, note: '历史履约、投诉、审计、廉洁和风险记录' }
];

function TemplateDrawer({
  onClose,
  onSave
}: {
  onClose: () => void;
  onSave: (template: Omit<RatingTemplate, 'id' | 'itemCount'>) => void;
}) {
  const [name, setName] = useState('酒店采购综合评标法');
  const [category, setCategory] = useState('货物类');
  const [total, setTotal] = useState(100);
  const [techRatio, setTechRatio] = useState(50);
  const [businessRatio, setBusinessRatio] = useState(50);
  const [status, setStatus] = useState('启用');
  const [items, setItems] = useState<RatingTemplateItem[]>(defaultItems);

  const updateItem = (index: number, key: keyof RatingTemplateItem, value: string) => {
    setItems((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: key === 'score' ? Number(value) || 0 : value
            }
          : row
      )
    );
  };

  const save = () => {
    onSave({
      name: name.trim() || '未命名评分模板',
      category,
      total,
      techRatio: `${techRatio}% / ${businessRatio}%`,
      status,
      items
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[620px] bg-white h-full shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900">新增评分模板</h3>
            <p className="text-xs text-slate-500 mt-1">用于专家评审、定标复核和供应商比选。</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2">
              <span className="block text-sm font-medium text-slate-700 mb-2">模板名称</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]" />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-700 mb-2">适用采购分类</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]">
                <option>货物类</option>
                <option>服务类</option>
                <option>工程类</option>
                <option>综合类</option>
              </select>
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-700 mb-2">启用状态</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]">
                <option>启用</option>
                <option>停用</option>
              </select>
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-700 mb-2">总分</span>
              <input type="number" value={total} onChange={(event) => setTotal(Number(event.target.value) || 0)} className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="block text-sm font-medium text-slate-700 mb-2">技术占比</span>
                <input type="number" value={techRatio} onChange={(event) => setTechRatio(Number(event.target.value) || 0)} className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]" />
              </label>
              <label>
                <span className="block text-sm font-medium text-slate-700 mb-2">商务占比</span>
                <input type="number" value={businessRatio} onChange={(event) => setBusinessRatio(Number(event.target.value) || 0)} className="w-full h-10 border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]" />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">评分项</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((rows) => [...rows, { name: '新增评分项', score: 0, note: '请输入评分说明' }])}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加评分项
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3 grid grid-cols-[1fr_88px] gap-3">
                  <input
                    value={item.name}
                    onChange={(event) => updateItem(index, 'name', event.target.value)}
                    className="h-9 border border-slate-200 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                  />
                  <input
                    type="number"
                    value={item.score}
                    onChange={(event) => updateItem(index, 'score', event.target.value)}
                    className="h-9 border border-slate-200 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                  />
                  <textarea
                    value={item.note}
                    onChange={(event) => updateItem(index, 'note', event.target.value)}
                    className="col-span-2 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="brand" onClick={save}>
            <Save className="w-4 h-4 mr-2" />
            保存模板
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RatingTemplateView() {
  const { ratingTemplates, addRatingTemplate, cloneRatingTemplate } = useApp();
  const [previewTemplate, setPreviewTemplate] = useState<RatingTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部状态');

  const filteredTemplates = ratingTemplates.filter((template) => {
    const matchedKeyword = !keyword.trim() || [template.name, template.category].join(' ').includes(keyword.trim());
    const matchedStatus = statusFilter === '全部状态' || template.status === statusFilter;
    return matchedKeyword && matchedStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <PenTool className="w-6 h-6 text-[#006666]" />
            评分模板
          </h2>
          <p className="text-sm text-slate-500 mt-1">专家评审打分维度的标准化模板管理</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 更多筛选
          </Button>
          <Button className="bg-[#006666] hover:bg-[#005252] text-white" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> 新增模板
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="输入关键字搜索..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span>状态筛选:</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="border border-slate-200 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#006666]"
              >
                <option>全部状态</option>
                <option>启用</option>
                <option>停用</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">模板名称</th>
                  <th className="px-6 py-4 border-b border-slate-200">适用采购分类</th>
                  <th className="px-6 py-4 border-b border-slate-200">总分</th>
                  <th className="px-6 py-4 border-b border-slate-200">评分项数量</th>
                  <th className="px-6 py-4 border-b border-slate-200">技术/商务比重</th>
                  <th className="px-6 py-4 border-b border-slate-200">启用状态</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{template.name}</td>
                    <td className="px-6 py-4 text-slate-600">{template.category}</td>
                    <td className="px-6 py-4 text-slate-600">{template.total}</td>
                    <td className="px-6 py-4 text-slate-600">{template.itemCount}</td>
                    <td className="px-6 py-4 text-slate-600">{template.techRatio}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {template.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => setPreviewTemplate(template)}>
                          预览打分表
                        </button>
                        <button className="text-slate-500 hover:text-slate-700 text-xs font-medium inline-flex items-center gap-1" onClick={() => cloneRatingTemplate(template.id)}>
                          <Copy className="w-3 h-3" />
                          克隆模板
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTemplates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      暂无相关数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>共 {filteredTemplates.length} 条记录</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-slate-100">1</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">2</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">3</Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {creating && <TemplateDrawer onClose={() => setCreating(false)} onSave={addRatingTemplate} />}

      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)} />
          <div className="relative w-[520px] bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-900">预览打分表</h3>
                <p className="text-xs text-slate-500 mt-1">{previewTemplate.name}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setPreviewTemplate(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">总分</p>
                  <p className="text-2xl font-bold text-slate-900">{previewTemplate.total}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">评分项</p>
                  <p className="text-2xl font-bold text-slate-900">{previewTemplate.itemCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">技术/商务</p>
                  <p className="text-lg font-bold text-slate-900">{previewTemplate.techRatio}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">评分项</th>
                    <th className="px-3 py-2 text-left">分值</th>
                    <th className="px-3 py-2 text-left">评分说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewTemplate.items.map((item) => (
                    <tr key={item.name}>
                      <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-3 text-slate-700">{item.score}</td>
                      <td className="px-3 py-3 text-slate-500">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
