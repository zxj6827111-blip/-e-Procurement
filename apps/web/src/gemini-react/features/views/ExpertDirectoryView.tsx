import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  UserCog,
  X
} from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import type { Expert } from '../../../pages/expert-review/types';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { TemporaryCredentialDialog, type TemporaryCredential } from './AccountManagementPanel';

const reviewScopeOptions = ['技术评审', '商务评审', '财务评审', '供应链评审', '业务部门评审'];

type ExpertFormMode = 'create' | 'edit';

interface ExpertFormState {
  ownerOrgId: string;
  branchOrgId: string;
  accountMode: 'create' | 'bind';
  accountUserIds: string;
  accountUsername: string;
  accountOrgId: string;
  accountDepartmentId: string;
  accountPosition: string;
  name: string;
  category: string;
  status: string;
  reviewScopes: string[];
  supplierAssessmentScopes: string[];
  sharedAccount: boolean;
  active: boolean;
  maintenanceLog: string;
}

interface ExpertMutationResult {
  expert: Expert;
  account?: {
    userId: string;
    username: string;
    temporaryPassword: string;
    passwordChangeRequired: boolean;
  };
  auditLogId?: string;
}

function createDefaultForm(): ExpertFormState {
  return {
    ownerOrgId: 'org-group',
    branchOrgId: 'org-group',
    accountMode: 'create',
    accountUserIds: '',
    accountUsername: '',
    accountOrgId: 'org-group',
    accountDepartmentId: '',
    accountPosition: '',
    name: '',
    category: '综合评审',
    status: '可抽取',
    reviewScopes: ['技术评审', '商务评审'],
    supplierAssessmentScopes: [...reviewScopeOptions],
    sharedAccount: false,
    active: true,
    maintenanceLog: ''
  };
}

function createEditForm(expert: Expert): ExpertFormState {
  return {
    ownerOrgId: expert.ownerOrgId ?? 'org-group',
    branchOrgId: expert.branchOrgId ?? expert.ownerOrgId ?? 'org-group',
    accountMode: 'bind',
    accountUserIds: (expert.accountUserIds ?? []).join(', '),
    accountUsername: '',
    accountOrgId: expert.ownerOrgId ?? 'org-group',
    accountDepartmentId: '',
    accountPosition: '',
    name: expert.name,
    category: expert.category,
    status: expert.status,
    reviewScopes: [...(expert.reviewScopes ?? [])],
    supplierAssessmentScopes: [...(expert.supplierAssessmentScopes ?? [])],
    sharedAccount: Boolean(expert.sharedAccount),
    active: expert.active !== false,
    maintenanceLog: expert.maintenanceLog ?? ''
  };
}

function normalizedStatus(expert: Expert) {
  return expert.active === false ? '停用' : expert.status || '可抽取';
}

function statusVariant(expert: Expert): 'success' | 'warning' | 'danger' | 'default' {
  const status = normalizedStatus(expert);
  if (status.includes('停用') || status.includes('禁用') || status.includes('回避')) return 'danger';
  if (status.includes('可') || status.includes('启用')) return 'success';
  if (status.includes('待')) return 'warning';
  return 'default';
}

function splitAccountIds(value: string) {
  return value
    .split(/[,，;；、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ScopeSelector({
  label,
  value,
  onChange
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-2 text-sm font-medium text-slate-700">{label}</legend>
      <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
        {reviewScopeOptions.map((scope) => {
          const checked = value.includes(scope);
          return (
            <label key={scope} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((item) => item !== scope) : [...value, scope])}
                className="h-4 w-4 rounded border-slate-300 text-[#006666] focus:ring-[#006666]"
              />
              {scope}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ExpertFormDialog({
  mode,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit
}: {
  mode: ExpertFormMode;
  form: ExpertFormState;
  saving: boolean;
  error: string;
  onChange: (next: ExpertFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, saving]);

  const inputClass =
    'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/15 disabled:bg-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={mode === 'edit' ? '编辑专家' : '新增专家'} data-ui-check="expert-directory-dialog">
      <button type="button" className="absolute inset-0 bg-slate-950/30" aria-label="关闭专家表单" disabled={saving} onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{mode === 'edit' ? '编辑专家' : '新增专家'}</h3>
            <p className="mt-1 text-sm text-slate-500">维护专家账号、组织归属、评审范围和可用状态。</p>
          </div>
          <button type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" disabled={saving} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-5 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              专家姓名 <span className="text-rose-600">*</span>
              <input
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className={inputClass}
                placeholder="请输入专家姓名"
                autoFocus
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              专业 / 分类
              <input value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} className={inputClass} placeholder="例如：综合评审" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              归属组织 <span className="text-rose-600">*</span>
              <input value={form.ownerOrgId} onChange={(event) => onChange({ ...form, ownerOrgId: event.target.value })} className={inputClass} placeholder="例如：org-group" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              所属分店 <span className="text-rose-600">*</span>
              <input value={form.branchOrgId} onChange={(event) => onChange({ ...form, branchOrgId: event.target.value })} className={inputClass} placeholder="例如：org-group" />
            </label>
            {mode === 'create' ? (
              <fieldset className="md:col-span-2">
                <legend className="mb-2 text-sm font-medium text-slate-700">专家登录账号</legend>
                <div className="inline-flex rounded-md border border-slate-300 bg-slate-50 p-1">
                  <button type="button" className={`rounded px-4 py-2 text-sm ${form.accountMode === 'create' ? 'bg-white font-medium text-[#006666] shadow-sm' : 'text-slate-600'}`} onClick={() => onChange({ ...form, accountMode: 'create' })}>创建新账号</button>
                  <button type="button" className={`rounded px-4 py-2 text-sm ${form.accountMode === 'bind' ? 'bg-white font-medium text-[#006666] shadow-sm' : 'text-slate-600'}`} onClick={() => onChange({ ...form, accountMode: 'bind' })}>绑定已有账号</button>
                </div>
              </fieldset>
            ) : null}
            {mode === 'edit' || form.accountMode === 'bind' ? (
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                绑定专家账号
                <input
                  value={form.accountUserIds}
                  onChange={(event) => onChange({ ...form, accountUserIds: event.target.value })}
                  className={inputClass}
                  placeholder="例如：u4"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">只能绑定已存在、正常使用的专家角色账号；一个账号只能绑定一位专家。</span>
              </label>
            ) : (
              <>
                <label className="text-sm font-medium text-slate-700">
                  新登录账号 <span className="text-rose-600">*</span>
                  <input value={form.accountUsername} onChange={(event) => onChange({ ...form, accountUsername: event.target.value })} className={inputClass} placeholder="例如：expert.zhang" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  账号所属组织 <span className="text-rose-600">*</span>
                  <input value={form.accountOrgId} onChange={(event) => onChange({ ...form, accountOrgId: event.target.value })} className={inputClass} placeholder="例如：org-group" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  账号部门
                  <input value={form.accountDepartmentId} onChange={(event) => onChange({ ...form, accountDepartmentId: event.target.value })} className={inputClass} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  账号职位
                  <input value={form.accountPosition} onChange={(event) => onChange({ ...form, accountPosition: event.target.value })} className={inputClass} />
                </label>
              </>
            )}
            <label className="text-sm font-medium text-slate-700">
              专家状态
              <select
                value={form.status}
                onChange={(event) => {
                  const status = event.target.value;
                  onChange({ ...form, status, active: status !== '停用' });
                }}
                className={inputClass}
              >
                <option value="可抽取">可抽取</option>
                <option value="回避">回避</option>
                <option value="停用">停用</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              是否激活
              <select
                value={form.active ? 'true' : 'false'}
                onChange={(event) => {
                  const active = event.target.value === 'true';
                  onChange({ ...form, active, status: active && form.status === '停用' ? '可抽取' : !active ? '停用' : form.status });
                }}
                className={inputClass}
              >
                <option value="true">已激活</option>
                <option value="false">已停用</option>
              </select>
            </label>
            <ScopeSelector label="评标范围" value={form.reviewScopes} onChange={(reviewScopes) => onChange({ ...form, reviewScopes })} />
            <ScopeSelector
              label="供应商考核范围"
              value={form.supplierAssessmentScopes}
              onChange={(supplierAssessmentScopes) => onChange({ ...form, supplierAssessmentScopes })}
            />
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.sharedAccount}
                onChange={(event) => onChange({ ...form, sharedAccount: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#006666] focus:ring-[#006666]"
              />
              该专家使用共用账号
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              维护说明
              <textarea
                value={form.maintenanceLog}
                onChange={(event) => onChange({ ...form, maintenanceLog: event.target.value })}
                className={`${inputClass} min-h-24 resize-y`}
                placeholder="例如：新增专家、调整范围或停用原因"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button variant="outline" disabled={saving} onClick={onClose}>取消</Button>
          <Button
            variant="brand"
            className="gap-2"
            data-ui-check="expert-directory-save"
            disabled={
              saving ||
              !form.name.trim() ||
              !form.ownerOrgId.trim() ||
              !form.branchOrgId.trim() ||
              (mode === 'create' && form.accountMode === 'create' && (!form.accountUsername.trim() || !form.accountOrgId.trim())) ||
              (mode === 'create' && form.accountMode === 'bind' && splitAccountIds(form.accountUserIds).length !== 1)
            }
            onClick={onSubmit}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? '保存中...' : mode === 'edit' ? '保存专家' : '新增专家'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExpertDirectoryView() {
  const { currentUser } = useApp();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyExpertId, setBusyExpertId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ExpertFormMode>('create');
  const [editingExpertId, setEditingExpertId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpertFormState>(() => createDefaultForm());
  const [credential, setCredential] = useState<TemporaryCredential | null>(null);

  const canMaintain = currentUser?.role === 'GROUP_PROCUREMENT_MANAGER';

  const loadExperts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGet<{ experts: Expert[] }>('/api/experts', currentUser?.id);
      setExperts(result.experts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '专家库数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadExperts();
  }, [loadExperts]);

  const filteredExperts = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return experts;
    return experts.filter((expert) =>
      [
        expert.id,
        expert.name,
        expert.category,
        expert.ownerOrgId,
        expert.branchOrgId,
        ...(expert.accountUserIds ?? []),
        ...(expert.reviewScopes ?? []),
        ...(expert.supplierAssessmentScopes ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text)
    );
  }, [experts, keyword]);

  function openCreateForm() {
    if (!canMaintain) return;
    setFormMode('create');
    setEditingExpertId(null);
    setForm(createDefaultForm());
    setError('');
    setMessage('');
    setFormOpen(true);
  }

  function openEditForm(expert: Expert) {
    if (!canMaintain) return;
    setFormMode('edit');
    setEditingExpertId(expert.id);
    setForm(createEditForm(expert));
    setError('');
    setMessage('');
    setFormOpen(true);
  }

  async function saveExpert() {
    if (!canMaintain || saving) return;
    const accountUserIds = splitAccountIds(form.accountUserIds);
    const payload: Record<string, unknown> = {
      ownerOrgId: form.ownerOrgId.trim(),
      branchOrgId: form.branchOrgId.trim(),
      accountUserIds,
      name: form.name.trim(),
      category: form.category.trim(),
      status: form.active ? form.status : '停用',
      reviewScopes: form.reviewScopes,
      supplierAssessmentScopes: form.supplierAssessmentScopes,
      sharedAccount: form.sharedAccount,
      active: form.active,
      maintenanceLog: form.maintenanceLog.trim()
    };
    if (formMode === 'create') {
      payload.accountProvisioning =
        form.accountMode === 'create'
          ? {
              mode: 'create',
              username: form.accountUsername.trim(),
              name: form.name.trim(),
              orgId: form.accountOrgId.trim(),
              departmentId: form.accountDepartmentId.trim(),
              position: form.accountPosition.trim()
            }
          : { mode: 'bind', userId: accountUserIds[0] };
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result =
        formMode === 'edit' && editingExpertId
          ? await apiPatch<ExpertMutationResult>(`/api/experts/${encodeURIComponent(editingExpertId)}`, payload, currentUser?.id)
          : await apiPost<ExpertMutationResult>('/api/experts', payload, currentUser?.id);
      setMessage(`${result.expert.name}已${formMode === 'edit' ? '保存' : '加入专家库'}${result.auditLogId ? `，审计编号：${result.auditLogId}` : ''}。`);
      setFormOpen(false);
      if (result.account?.temporaryPassword) {
        setCredential({ title: '专家账号创建成功', username: result.account.username, password: result.account.temporaryPassword });
      }
      await loadExperts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '专家保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpertStatus(expert: Expert) {
    if (!canMaintain || busyExpertId) return;
    const nextActive = expert.active === false;
    setBusyExpertId(expert.id);
    setError('');
    setMessage('');
    try {
      const result = await apiPatch<ExpertMutationResult>(
        `/api/experts/${encodeURIComponent(expert.id)}`,
        {
          active: nextActive,
          status: nextActive ? '可抽取' : '停用',
          maintenanceLog: nextActive ? '集团专家库管理恢复启用' : '集团专家库管理停用'
        },
        currentUser?.id
      );
      setMessage(`${result.expert.name}已${nextActive ? '启用' : '停用'}${result.auditLogId ? `，审计编号：${result.auditLogId}` : ''}。`);
      await loadExperts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '专家状态更新失败');
    } finally {
      setBusyExpertId(null);
    }
  }

  const activeCount = experts.filter((expert) => expert.active !== false).length;
  const drawableCount = experts.filter((expert) => expert.active !== false && normalizedStatus(expert).includes('可')).length;
  const disabledCount = experts.filter((expert) => expert.active === false).length;

  return (
    <div className="space-y-6" data-ui-check="expert-directory-view">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <UserCog className="h-6 w-6 text-[#006666]" />
            专家库管理
          </h2>
          <p className="mt-1 text-sm text-slate-500">统一维护专家账号、评审范围和启停状态，专家抽取仅使用符合条件的有效记录。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={loading} onClick={() => void loadExperts()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {canMaintain ? (
            <Button variant="brand" className="gap-2" data-ui-check="expert-directory-create" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              新增专家
            </Button>
          ) : null}
        </div>
      </div>

      {!canMaintain ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前账号仅可查看专家库；新增、编辑、启停和账号绑定由集团采购管理人维护。
        </div>
      ) : null}
      {message ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['专家总数', experts.length, '当前角色可见'],
          ['已激活 / 可抽取', `${activeCount} / ${drawableCount}`, '可参与后续专家抽取'],
          ['已停用', disabledCount, '不会进入抽取候选']
        ].map(([label, value, meta]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <div className="mb-4 h-1 w-10 rounded-full bg-[#006666]" />
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索姓名、编号、组织、账号或评审范围"
              className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/20"
            />
          </div>
          <div className="text-sm text-slate-500">共 {filteredExperts.length} 位专家</div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm" data-ui-check="expert-directory-table">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-medium">专家</th>
                  <th className="px-5 py-4 font-medium">归属组织 / 分店</th>
                  <th className="px-5 py-4 font-medium">绑定账号</th>
                  <th className="px-5 py-4 font-medium">评标范围</th>
                  <th className="px-5 py-4 font-medium">供应商考核范围</th>
                  <th className="px-5 py-4 font-medium">共用账号</th>
                  <th className="px-5 py-4 font-medium">状态</th>
                  <th className="px-5 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-[#006666]" />
                      专家库数据加载中...
                    </td>
                  </tr>
                ) : filteredExperts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">{keyword.trim() ? '未找到匹配专家' : '暂无专家记录'}</td>
                  </tr>
                ) : (
                  filteredExperts.map((expert) => {
                    const busy = busyExpertId === expert.id;
                    return (
                      <tr key={expert.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{expert.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{expert.id} / {expert.category || '-'}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          <div>{expert.ownerOrgId || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500">{expert.branchOrgId || '-'}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{expert.accountUserIds?.length ? expert.accountUserIds.join('、') : '-'}</td>
                        <td className="max-w-[220px] px-5 py-4 text-slate-600">{expert.reviewScopes?.length ? expert.reviewScopes.join('、') : '-'}</td>
                        <td className="max-w-[250px] px-5 py-4 text-slate-600">{expert.supplierAssessmentScopes?.length ? expert.supplierAssessmentScopes.join('、') : '-'}</td>
                        <td className="px-5 py-4 text-slate-600">{expert.sharedAccount ? '是' : '否'}</td>
                        <td className="px-5 py-4"><Badge variant={statusVariant(expert)}>{normalizedStatus(expert)}</Badge></td>
                        <td className="px-5 py-4">
                          {canMaintain ? (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="gap-1.5" disabled={Boolean(busyExpertId)} onClick={() => openEditForm(expert)}>
                                <Pencil className="h-3.5 w-3.5" />
                                编辑
                              </Button>
                              <Button
                                variant={expert.active === false ? 'outline' : 'ghost'}
                                size="sm"
                                className={`gap-1.5 ${expert.active === false ? 'text-[#006666]' : 'text-rose-700 hover:bg-rose-50'}`}
                                disabled={Boolean(busyExpertId)}
                                onClick={() => void toggleExpertStatus(expert)}
                              >
                                {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                                {busy ? '处理中' : expert.active === false ? '启用' : '停用'}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">只读</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {formOpen ? (
        <ExpertFormDialog
          mode={formMode}
          form={form}
          saving={saving}
          error={error}
          onChange={setForm}
          onClose={() => setFormOpen(false)}
          onSubmit={() => void saveExpert()}
        />
      ) : null}
      {credential ? <TemporaryCredentialDialog credential={credential} onClose={() => setCredential(null)} /> : null}
    </div>
  );
}
