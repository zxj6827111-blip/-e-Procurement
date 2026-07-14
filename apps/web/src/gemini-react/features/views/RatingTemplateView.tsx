import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import {
  Copy,
  FileText,
  Filter,
  PenTool,
  Plus,
  Save,
  Search,
  ToggleRight,
  X
} from 'lucide-react';
import { categoryLabel, statusLabel, statusTone } from '../../../pages/scoring-templates/display';
import type {
  ScoringCategory,
  ScoringItem,
  ScoringTemplate,
  TemplateMutationResponse,
  TemplateStatus
} from '../../../pages/scoring-templates/types';

interface FormState {
  id?: string;
  templateCode: string;
  templateName: string;
  status: TemplateStatus;
  items: ScoringItem[];
}

const defaultItems = (): ScoringItem[] => [
  {
    id: 'technical_quality',
    category: 'technical',
    categoryLabel: categoryLabel('technical'),
    label: '技术响应与质量保障',
    reference: '规格、参数、样品与技术承诺',
    evidence: '响应文件、样品、检测报告',
    maxScore: 40
  },
  {
    id: 'service_capacity',
    category: 'service',
    categoryLabel: categoryLabel('service'),
    label: '服务与履约保障',
    reference: '交付周期、售后、服务能力',
    evidence: '实施方案、服务承诺、履约案例',
    maxScore: 30
  },
  {
    id: 'price_reasonableness',
    category: 'price',
    categoryLabel: categoryLabel('price'),
    label: '价格合理性',
    reference: '总价、分项报价与偏离说明',
    evidence: '报价清单、分项报价、澄清材料',
    maxScore: 30
  }
];

function toFormState(template?: ScoringTemplate | null): FormState {
  if (!template) {
    return {
      templateCode: '',
      templateName: '',
      status: 'draft',
      items: defaultItems()
    };
  }
  return {
    id: template.id,
    templateCode: template.templateCode,
    templateName: template.templateName,
    status: template.status,
    items: template.items.map((item) => ({ ...item }))
  };
}

function totalScore(items: ScoringItem[]) {
  return Number(items.reduce((sum, item) => sum + Number(item.maxScore || 0), 0).toFixed(2));
}

function Drawer({
  canMaintain,
  busy,
  form,
  onClose,
  onChange,
  onSave
}: {
  canMaintain: boolean;
  busy: boolean;
  form: FormState;
  onClose: () => void;
  onChange: (next: FormState) => void;
  onSave: () => void;
}) {
  const updateItem = (index: number, patch: Partial<ScoringItem>) => {
    onChange({
      ...form,
      items: form.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch, categoryLabel: categoryLabel((patch.category ?? item.category) as ScoringCategory) } : item
      )
    });
  };

  const addItem = () => {
    onChange({
      ...form,
      items: [
        ...form.items,
        {
          id: `item_${form.items.length + 1}`,
          category: 'technical',
          categoryLabel: categoryLabel('technical'),
          label: '',
          reference: '',
          evidence: '',
          maxScore: 10
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...form,
      items: form.items.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-[720px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
          <div>
            <h3 className="font-semibold text-slate-900">{form.id ? '编辑评分模板' : '新增评分模板'}</h3>
            <p className="mt-1 text-xs text-slate-500">这里保存的是后端真实评审模板，不再写入本地假状态。</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-700">模板编码</span>
              <input
                value={form.templateCode}
                onChange={(event) => onChange({ ...form, templateCode: event.target.value })}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              />
            </label>
            <label className="col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-700">状态</span>
              <select
                value={form.status}
                onChange={(event) => onChange({ ...form, status: event.target.value as TemplateStatus })}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              >
                <option value="draft">草稿</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <label className="col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">模板名称</span>
              <input
                value={form.templateName}
                onChange={(event) => onChange({ ...form, templateName: event.target.value })}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">评分项</h4>
                <p className="mt-1 text-sm text-slate-500">当前总分：{totalScore(form.items)}</p>
              </div>
              {canMaintain ? (
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  添加评分项
                </Button>
              ) : null}
            </div>
            <div className="space-y-4">
              {form.items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-4">
                  <div className="grid grid-cols-[160px_120px_1fr_auto] gap-3">
                    <input
                      value={item.id}
                      onChange={(event) => updateItem(index, { id: event.target.value })}
                      className="h-9 rounded border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                      placeholder="评分项 ID"
                      disabled={!canMaintain}
                    />
                    <select
                      value={item.category}
                      onChange={(event) => updateItem(index, { category: event.target.value as ScoringCategory })}
                      className="h-9 rounded border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                      disabled={!canMaintain}
                    >
                      <option value="technical">技术</option>
                      <option value="service">服务</option>
                      <option value="price">价格</option>
                    </select>
                    <input
                      value={item.label}
                      onChange={(event) => updateItem(index, { label: event.target.value })}
                      className="h-9 rounded border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                      placeholder="评分项名称"
                      disabled={!canMaintain}
                    />
                    <input
                      type="number"
                      value={item.maxScore}
                      onChange={(event) => updateItem(index, { maxScore: Number(event.target.value) || 0 })}
                      className="h-9 w-24 rounded border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                      disabled={!canMaintain}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={item.reference}
                    onChange={(event) => updateItem(index, { reference: event.target.value })}
                    className="rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                    placeholder="评分参考"
                    disabled={!canMaintain}
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <textarea
                      rows={2}
                      value={item.evidence}
                      onChange={(event) => updateItem(index, { evidence: event.target.value })}
                      className="rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                      placeholder="需查看的证据材料"
                      disabled={!canMaintain}
                    />
                    {canMaintain ? (
                      <Button variant="outline" className="self-start border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => removeItem(index)}>
                        删除
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          {canMaintain ? (
            <Button onClick={onSave} disabled={busy}>
              <Save className="mr-2 h-4 w-4" />
              {busy ? '保存中...' : '保存模板'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RatingTemplateView() {
  const { currentUser } = useApp();
  const [templates, setTemplates] = useState<ScoringTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ScoringTemplate | null>(null);
  const [editingForm, setEditingForm] = useState<FormState | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TemplateStatus>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canMaintain = currentUser?.role === 'GROUP_PROCUREMENT_MANAGER' || currentUser?.role === 'PLATFORM_OPERATIONS';

  const load = async () => {
    if (!currentUser?.id) {
      setTemplates([]);
      setSelectedTemplate(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await apiGet<{ scoringTemplates: ScoringTemplate[] }>('/api/scoring-templates', currentUser.id);
      setTemplates(result.scoringTemplates);
      setSelectedTemplate((current) => result.scoringTemplates.find((item) => item.id === current?.id) ?? result.scoringTemplates[0] ?? null);
    } catch (err) {
      setTemplates([]);
      setSelectedTemplate(null);
      setError(err instanceof Error ? err.message : '评分模板加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.id]);

  const filteredTemplates = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
      const matchesKeyword =
        !text ||
        [template.templateCode, template.templateName, template.items.map((item) => item.label).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(text);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, statusFilter, templates]);

  const saveForm = async () => {
    if (!editingForm || !currentUser?.id) return;
    setBusy(true);
    setError('');
    setMessage('');
    const payload = {
      templateCode: editingForm.templateCode.trim(),
      templateName: editingForm.templateName.trim(),
      status: editingForm.status,
      items: editingForm.items.map((item) => ({
        ...item,
        categoryLabel: categoryLabel(item.category),
        label: item.label.trim(),
        reference: item.reference.trim(),
        evidence: item.evidence.trim(),
        maxScore: Number(item.maxScore)
      }))
    };
    try {
      const result = editingForm.id
        ? await apiPatch<TemplateMutationResponse>(`/api/scoring-templates/${editingForm.id}`, payload, currentUser.id)
        : await apiPost<TemplateMutationResponse>('/api/scoring-templates', payload, currentUser.id);
      setMessage(`模板已保存，审计记录 ${result.auditLogId ?? '-'}`);
      setEditingForm(null);
      await load();
      setSelectedTemplate(result.scoringTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : '评分模板保存失败');
    } finally {
      setBusy(false);
    }
  };

  const cloneTemplate = async (template: ScoringTemplate) => {
    if (!currentUser?.id) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiPost<TemplateMutationResponse>(
        `/api/scoring-templates/${template.id}/clone`,
        {
          templateCode: `${template.templateCode}-copy`,
          templateName: `${template.templateName} 副本`,
          status: 'draft'
        },
        currentUser.id
      );
      setMessage(`模板已克隆，审计记录 ${result.auditLogId ?? '-'}`);
      await load();
      setSelectedTemplate(result.scoringTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : '模板克隆失败');
    } finally {
      setBusy(false);
    }
  };

  const enableTemplate = async (template: ScoringTemplate) => {
    if (!currentUser?.id) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiPost<TemplateMutationResponse>(`/api/scoring-templates/${template.id}/enable`, {}, currentUser.id);
      setMessage(`模板已启用，审计记录 ${result.auditLogId ?? '-'}`);
      await load();
      setSelectedTemplate(result.scoringTemplate);
    } catch (err) {
      setError(err instanceof Error ? err.message : '模板启用失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <PenTool className="h-6 w-6 text-[#006666]" />
            评分模板
          </h2>
          <p className="mt-1 text-sm text-slate-500">这里展示并维护后端真实评分模板。</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            刷新
          </Button>
          {canMaintain ? (
            <Button className="bg-[#006666] text-white hover:bg-[#005252]" onClick={() => setEditingForm(toFormState(null))}>
              <Plus className="mr-2 h-4 w-4" />
              新增模板
            </Button>
          ) : null}
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card>
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="输入编码、名称、评分项搜索"
                className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | TemplateStatus)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#006666]"
              >
                <option value="all">全部状态</option>
                <option value="draft">草稿</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 font-medium text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-4">模板</th>
                  <th className="border-b border-slate-200 px-6 py-4">总分</th>
                  <th className="border-b border-slate-200 px-6 py-4">评分项</th>
                  <th className="border-b border-slate-200 px-6 py-4">版本</th>
                  <th className="border-b border-slate-200 px-6 py-4">状态</th>
                  <th className="border-b border-slate-200 px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      正在加载模板...
                    </td>
                  </tr>
                ) : filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <FileText className="mx-auto mb-3 h-8 w-8 opacity-20" />
                      暂无评分模板
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((template) => (
                    <tr key={template.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{template.templateName}</div>
                        <div className="mt-1 text-slate-500">{template.templateCode}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{template.totalScore}</td>
                      <td className="px-6 py-4 text-slate-600">{template.items.length}</td>
                      <td className="px-6 py-4 text-slate-600">V{template.versionNo}</td>
                      <td className="px-6 py-4">
                        <Badge variant={statusTone(template.status) === 'success' ? 'success' : statusTone(template.status) === 'warning' ? 'warning' : 'outline'}>
                          {statusLabel(template.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button className="text-xs font-medium text-[#006666] hover:text-[#005252]" onClick={() => setSelectedTemplate(template)}>
                            查看
                          </button>
                          {canMaintain ? (
                            <>
                              <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700" onClick={() => setEditingForm(toFormState(template))}>
                                编辑
                              </button>
                              <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700" onClick={() => void cloneTemplate(template)} disabled={busy}>
                                <Copy className="h-3 w-3" />
                                克隆
                              </button>
                              {template.status !== 'enabled' ? (
                                <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700" onClick={() => void enableTemplate(template)} disabled={busy}>
                                  <ToggleRight className="h-3 w-3" />
                                  启用
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>共 {filteredTemplates.length} 条模板记录</div>
        <div>当前展示全部结果</div>
      </div>

      {selectedTemplate ? (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{selectedTemplate.templateName}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedTemplate.templateCode} / V{selectedTemplate.versionNo}
                </p>
              </div>
              <Badge variant={statusTone(selectedTemplate.status) === 'success' ? 'success' : statusTone(selectedTemplate.status) === 'warning' ? 'warning' : 'outline'}>
                {statusLabel(selectedTemplate.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-500">总分</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{selectedTemplate.totalScore}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-500">评分项</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{selectedTemplate.items.length}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-500">已使用评分表</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{selectedTemplate.sheetCount}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-500">是否在用</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{selectedTemplate.inUse ? '是' : '否'}</div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">评分项</th>
                    <th className="px-4 py-3">分值</th>
                    <th className="px-4 py-3">评分参考</th>
                    <th className="px-4 py-3">证据材料</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTemplate.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-slate-600">{categoryLabel(item.category)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                      <td className="px-4 py-3 text-slate-600">{item.maxScore}</td>
                      <td className="px-4 py-3 text-slate-600">{item.reference || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.evidence || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editingForm ? (
        <Drawer
          canMaintain={canMaintain}
          busy={busy}
          form={editingForm}
          onChange={setEditingForm}
          onClose={() => setEditingForm(null)}
          onSave={() => void saveForm()}
        />
      ) : null}
    </div>
  );
}
