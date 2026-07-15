import { useMemo, useState } from 'react';
import { Copy, KeyRound, Pencil, Plus, Power, RotateCcw, Search, UserMinus, X } from 'lucide-react';
import { apiPatch, apiPost } from '../../../api/http';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import type { SystemOrganizationRow, SystemRoleRow, SystemUserRow } from './system-admin-runtime';

interface AccountManagementPanelProps {
  users: SystemUserRow[];
  roles: SystemRoleRow[];
  organizations: SystemOrganizationRow[];
  currentUserId?: string;
  onReload: () => Promise<void>;
}

interface AccountFormState {
  username: string;
  name: string;
  roleId: string;
  orgId: string;
  orgScope: string;
  departmentId: string;
  position: string;
  supplierId: string;
}

interface AccountMutationResult {
  user: SystemUserRow;
  temporaryPassword?: string;
  auditLogId?: string;
}

export interface TemporaryCredential {
  title: string;
  username: string;
  password: string;
}

const supplierRoles = new Set(['supplier', 'supplier_admin', 'supplier_quotation']);

function statusLabel(status: string) {
  return ({ active: '正常', disabled: '已停用', suspended: '已暂停', offboarded: '已离职' } as Record<string, string>)[status] ?? status;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'outline' {
  if (status === 'active') return 'success';
  if (status === 'offboarded') return 'danger';
  if (status === 'disabled' || status === 'suspended') return 'warning';
  return 'outline';
}

function emptyForm(organizations: SystemOrganizationRow[], roles: SystemRoleRow[]): AccountFormState {
  const orgId = organizations.find((item) => (item.status ?? 'active') === 'active')?.id ?? '';
  return {
    username: '',
    name: '',
    roleId: roles.find((item) => item.id !== 'system')?.id ?? '',
    orgId,
    orgScope: orgId,
    departmentId: '',
    position: '',
    supplierId: ''
  };
}

function editForm(user: SystemUserRow): AccountFormState {
  return {
    username: user.username ?? user.id,
    name: user.name,
    roleId: user.roleId,
    orgId: user.orgId,
    orgScope: (user.orgScope?.length ? user.orgScope : [user.orgId]).join(', '),
    departmentId: user.departmentId ?? '',
    position: user.position ?? '',
    supplierId: user.supplierId ?? ''
  };
}

function splitScope(value: string) {
  return value
    .split(/[,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function AccountFormDialog({
  form,
  editing,
  roles,
  organizations,
  saving,
  error,
  onChange,
  onClose,
  onSubmit
}: {
  form: AccountFormState;
  editing: boolean;
  roles: SystemRoleRow[];
  organizations: SystemOrganizationRow[];
  saving: boolean;
  error: string;
  onChange: (next: AccountFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const fieldClass =
    'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/15 disabled:bg-slate-100';
  const activeOrganizations = organizations.filter((item) => (item.status ?? 'active') === 'active');
  const organizationOptions = activeOrganizations.some((item) => item.id === form.orgId)
    ? activeOrganizations
    : [{ id: form.orgId, name: `${form.orgId}（当前组织）`, status: 'active' }, ...activeOrganizations];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={editing ? '编辑账号' : '新增账号'}>
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="关闭账号表单" disabled={saving} onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{editing ? '编辑账号' : '新增账号'}</h3>
            <p className="mt-1 text-sm text-slate-500">内部用户编号创建后保持不变，登录账号可以后续调整。</p>
          </div>
          <button type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" disabled={saving} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              登录账号 <span className="text-rose-600">*</span>
              <input value={form.username} onChange={(event) => onChange({ ...form, username: event.target.value })} className={fieldClass} autoFocus />
            </label>
            <label className="text-sm font-medium text-slate-700">
              姓名 <span className="text-rose-600">*</span>
              <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              角色 <span className="text-rose-600">*</span>
              <select value={form.roleId} onChange={(event) => onChange({ ...form, roleId: event.target.value, supplierId: supplierRoles.has(event.target.value) ? form.supplierId : '' })} className={fieldClass}>
                {roles.filter((item) => item.id !== 'system').map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              所属组织 <span className="text-rose-600">*</span>
              <select value={form.orgId} onChange={(event) => onChange({ ...form, orgId: event.target.value, orgScope: form.orgScope || event.target.value })} className={fieldClass}>
                {organizationOptions.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              组织权限范围 <span className="text-rose-600">*</span>
              <input value={form.orgScope} onChange={(event) => onChange({ ...form, orgScope: event.target.value })} className={fieldClass} placeholder="多个组织编号用逗号分隔" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              部门
              <input value={form.departmentId} onChange={(event) => onChange({ ...form, departmentId: event.target.value })} className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              职位
              <input value={form.position} onChange={(event) => onChange({ ...form, position: event.target.value })} className={fieldClass} />
            </label>
            {supplierRoles.has(form.roleId) ? (
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                供应商编号 <span className="text-rose-600">*</span>
                <input value={form.supplierId} onChange={(event) => onChange({ ...form, supplierId: event.target.value })} className={fieldClass} placeholder="例如 sup-1" />
              </label>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button variant="outline" disabled={saving} onClick={onClose}>取消</Button>
          <Button variant="brand" disabled={saving || !form.username.trim() || !form.name.trim() || !form.roleId || !form.orgId} onClick={onSubmit}>
            {saving ? '保存中...' : editing ? '保存修改' : '创建账号'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TemporaryCredentialDialog({ credential, onClose }: { credential: TemporaryCredential; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`账号：${credential.username}\n临时密码：${credential.password}`);
    setCopied(true);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="临时密码">
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{credential.title}</h3>
        <p className="mt-2 text-sm text-slate-600">该临时密码关闭后不会再次显示。用户首次登录后必须立即修改密码。</p>
        <div className="mt-5 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 font-mono text-sm text-slate-900">
          <div><span className="mr-3 font-sans text-slate-500">账号</span>{credential.username}</div>
          <div className="break-all"><span className="mr-3 font-sans text-slate-500">临时密码</span>{credential.password}</div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="gap-2" onClick={() => void copy()}><Copy className="h-4 w-4" />{copied ? '已复制' : '复制凭据'}</Button>
          <Button variant="brand" onClick={onClose}>我已妥善保存</Button>
        </div>
      </div>
    </div>
  );
}

export function AccountManagementPanel({ users, roles, organizations, currentUserId, onReload }: AccountManagementPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(() => emptyForm(organizations, roles));
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [credential, setCredential] = useState<TemporaryCredential | null>(null);

  const filteredUsers = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return users;
    return users.filter((user) => [user.username, user.name, user.id, user.roleId, user.orgId, user.departmentId, user.position].filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [keyword, users]);

  const roleName = (roleId: string) => roles.find((item) => item.id === roleId)?.name ?? roleId;
  const organizationName = (orgId: string) => organizations.find((item) => item.id === orgId)?.name ?? orgId;

  function openCreate() {
    setEditingUserId(null);
    setForm(emptyForm(organizations, roles));
    setError('');
    setFormOpen(true);
  }

  function openEdit(user: SystemUserRow) {
    setEditingUserId(user.id);
    setForm(editForm(user));
    setError('');
    setFormOpen(true);
  }

  async function saveAccount() {
    if (saving) return;
    setSaving(true);
    setError('');
    const payload = {
      username: form.username.trim(),
      name: form.name.trim(),
      roleId: form.roleId,
      orgId: form.orgId,
      orgScope: splitScope(form.orgScope),
      departmentId: form.departmentId.trim(),
      position: form.position.trim(),
      supplierId: form.supplierId.trim()
    };
    try {
      const result = editingUserId
        ? await apiPatch<AccountMutationResult>(`/api/users/${encodeURIComponent(editingUserId)}`, payload, currentUserId)
        : await apiPost<AccountMutationResult>('/api/users', payload, currentUserId);
      setFormOpen(false);
      setMessage(`${result.user.name} 的账号已${editingUserId ? '更新' : '创建'}。`);
      if (result.temporaryPassword) setCredential({ title: '账号创建成功', username: result.user.username ?? result.user.id, password: result.temporaryPassword });
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '账号保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(user: SystemUserRow, status: 'active' | 'disabled' | 'offboarded') {
    if (busyUserId) return;
    if (status === 'offboarded' && !window.confirm(`确认将“${user.name}”设为离职？离职状态不可恢复。`)) return;
    setBusyUserId(user.id);
    setError('');
    try {
      await apiPatch<AccountMutationResult>(`/api/users/${encodeURIComponent(user.id)}`, { status }, currentUserId);
      setMessage(`${user.name} 已${status === 'active' ? '恢复' : status === 'offboarded' ? '设为离职' : '停用'}。`);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '账号状态更新失败');
    } finally {
      setBusyUserId(null);
    }
  }

  async function resetPassword(user: SystemUserRow) {
    if (busyUserId || !window.confirm(`确认重置“${user.name}”的登录密码？现有会话将立即失效。`)) return;
    setBusyUserId(user.id);
    setError('');
    try {
      const result = await apiPost<AccountMutationResult>(`/api/users/${encodeURIComponent(user.id)}/reset-password`, undefined, currentUserId);
      if (result.temporaryPassword) setCredential({ title: '密码重置成功', username: result.user.username ?? result.user.id, password: result.temporaryPassword });
      setMessage(`${user.name} 的密码已重置。`);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码重置失败');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <>
      <Card data-ui-check="account-management-panel">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>账号管理</CardTitle>
              <p className="mt-1 text-sm text-slate-500">维护登录账号、人员信息、角色、组织和账号生命周期。</p>
            </div>
            <Button variant="brand" className="gap-2" data-ui-check="account-create" onClick={openCreate}><Plus className="h-4 w-4" />新增账号</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/15" placeholder="搜索账号、姓名、角色或组织" />
            </div>
          </div>
          {message ? <div className="mx-4 mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {error && !formOpen ? <div className="mx-4 mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-medium">账号 / 姓名</th>
                  <th className="px-5 py-4 font-medium">角色</th>
                  <th className="px-5 py-4 font-medium">组织</th>
                  <th className="px-5 py-4 font-medium">部门 / 职位</th>
                  <th className="px-5 py-4 font-medium">状态</th>
                  <th className="px-5 py-4 font-medium">登录</th>
                  <th className="px-5 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const status = user.accountStatus ?? user.status ?? 'active';
                  const busy = busyUserId === user.id;
                  return (
                    <tr key={user.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4"><div className="font-medium text-slate-900">{user.username ?? user.id}</div><div className="mt-1 text-xs text-slate-500">{user.name} · {user.id}</div></td>
                      <td className="px-5 py-4 text-slate-700">{roleName(user.roleId)}</td>
                      <td className="px-5 py-4 text-slate-700">{organizationName(user.orgId)}</td>
                      <td className="px-5 py-4 text-slate-600">{[user.departmentId, user.position].filter(Boolean).join(' / ') || '-'}</td>
                      <td className="px-5 py-4"><Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>{user.passwordChangeRequired ? <div className="mt-2 text-xs text-amber-700">待修改临时密码</div> : null}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <Button variant="ghost" size="sm" className="gap-1" disabled={Boolean(busyUserId) || status === 'offboarded'} onClick={() => openEdit(user)}><Pencil className="h-3.5 w-3.5" />编辑</Button>
                          <Button variant="ghost" size="sm" className="gap-1" disabled={Boolean(busyUserId) || status === 'offboarded'} onClick={() => void resetPassword(user)}><KeyRound className="h-3.5 w-3.5" />重置密码</Button>
                          {status === 'active' ? (
                            <Button variant="ghost" size="sm" className="gap-1 text-amber-700 hover:bg-amber-50" disabled={Boolean(busyUserId)} onClick={() => void updateStatus(user, 'disabled')}><Power className="h-3.5 w-3.5" />停用</Button>
                          ) : status !== 'offboarded' ? (
                            <Button variant="ghost" size="sm" className="gap-1 text-[#006666]" disabled={Boolean(busyUserId)} onClick={() => void updateStatus(user, 'active')}><RotateCcw className="h-3.5 w-3.5" />恢复</Button>
                          ) : null}
                          {status !== 'offboarded' ? <Button variant="ghost" size="sm" className="gap-1 text-rose-700 hover:bg-rose-50" disabled={Boolean(busyUserId)} onClick={() => void updateStatus(user, 'offboarded')}><UserMinus className="h-3.5 w-3.5" />离职</Button> : null}
                          {busy ? <span className="px-2 text-xs text-slate-400">处理中...</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">没有匹配的账号。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {formOpen ? <AccountFormDialog form={form} editing={Boolean(editingUserId)} roles={roles} organizations={organizations} saving={saving} error={error} onChange={setForm} onClose={() => setFormOpen(false)} onSubmit={() => void saveAccount()} /> : null}
      {credential ? <TemporaryCredentialDialog credential={credential} onClose={() => setCredential(null)} /> : null}
    </>
  );
}
