import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { apiGet, apiPatch } from '../../../api/http';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Filter, RefreshCw, Save, Search, Settings2, ShieldCheck, X } from 'lucide-react';
import {
  formatR8DateTime,
  r8ActionLabels,
  r8BusinessTypeLabels,
  r8RoleLabels,
  toR8ApprovalRuleView,
  type R8ApprovalBusinessType,
  type R8ApprovalRuleDto,
  type R8ApprovalRuleView,
  type R8RoleId
} from '../../../../../api/src/workflow-ui-contract';

interface AuthSessionResponse {
  user?: {
    id: string;
    supplierId?: string;
    expertId?: string;
  };
  roleId: string;
  orgScope: string[];
}

interface RuleEditorState {
  ruleName: string;
  amountMin: string;
  amountMax: string;
  methodTypes: string;
  nodeRoleIds: string;
  actions: string;
  orgScope: string;
  hotelScope: string;
  approvalOrder: string;
  defaultStrategy: NonNullable<R8ApprovalRuleDto['defaultStrategy']>;
  status: R8ApprovalRuleDto['status'];
}

const editableWorkflowRoles: R8RoleId[] = ['group_manager', 'buyer', 'supplier', 'expert'];

function emptyEditorState(): RuleEditorState {
  return {
    ruleName: '',
    amountMin: '',
    amountMax: '',
    methodTypes: '',
    nodeRoleIds: '',
    actions: '',
    orgScope: '',
    hotelScope: '',
    approvalOrder: '',
    defaultStrategy: 'manual_review_required',
    status: 'enabled'
  };
}

function listToText(values?: string[]) {
  return (values ?? []).join(', ');
}

function splitList(value: string) {
  return value
    .split(/[\n,，、/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function roleList(value: string) {
  const valid = new Set<R8RoleId>(editableWorkflowRoles);
  return splitList(value).filter((item): item is R8RoleId => valid.has(item as R8RoleId));
}

function numberOrKeep(value: string, fallback?: number) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function badgeVariantForRuleStatus(status: string): 'success' | 'danger' | 'outline' {
  if (status === 'enabled') return 'success';
  if (status === 'disabled') return 'danger';
  return 'outline';
}

export function ApprovalRuleView() {
  const { currentUser } = useApp();
  const [sessionInfo, setSessionInfo] = useState<AuthSessionResponse | null>(null);
  const [rules, setRules] = useState<R8ApprovalRuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRule, setSelectedRule] = useState<R8ApprovalRuleView | null>(null);
  const [editor, setEditor] = useState<RuleEditorState>(emptyEditorState);
  const [query, setQuery] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<'all' | R8ApprovalBusinessType>('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canMaintainRules = sessionInfo?.roleId === 'admin';

  const readonlyReason = useMemo(() => {
    if (sessionInfo?.roleId === 'admin') return '';
    if (sessionInfo?.roleId === 'auditor') return '审计角色仅可查看规则状态与版本，不可编辑或保存。';
    return '当前角色仅可查看已授权的审批规则，不具备规则维护权限。';
  }, [sessionInfo?.roleId]);

  const businessTypeOptions = useMemo(() => {
    const values = [...new Set(rules.map((rule) => rule.businessType))];
    return values.map((value) => ({
      value,
      label: r8BusinessTypeLabels[value] ?? value
    }));
  }, [rules]);

  const filteredRules = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (businessTypeFilter !== 'all' && rule.businessType !== businessTypeFilter) return false;
      if (!keyword) return true;
      return [
        rule.ruleCode,
        rule.ruleName,
        rule.businessTypeLabel,
        rule.nodeRoleLabels,
        rule.actionLabels,
        rule.statusLabel
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [businessTypeFilter, query, rules]);

  const summary = useMemo(
    () => [
      { label: '规则总数', value: rules.length, meta: '正式审批规则' },
      { label: '启用规则', value: rules.filter((rule) => rule.status === 'enabled').length, meta: '当前可生效' },
      { label: '停用规则', value: rules.filter((rule) => rule.status === 'disabled').length, meta: '保留版本' },
      { label: '当前权限', value: canMaintainRules ? '可维护' : '只读', meta: sessionInfo?.roleId || '-' }
    ],
    [canMaintainRules, rules, sessionInfo?.roleId]
  );

  const syncEditor = (rule: R8ApprovalRuleView) => {
    setSelectedRule(rule);
    setEditor({
      ruleName: rule.ruleName,
      amountMin: rule.amountMin === undefined ? '' : String(rule.amountMin),
      amountMax: rule.amountMax === undefined ? '' : String(rule.amountMax),
      methodTypes: listToText(rule.methodTypes),
      nodeRoleIds: listToText(rule.nodeRoleIds),
      actions: listToText(rule.actions),
      orgScope: listToText(rule.orgScope),
      hotelScope: listToText(rule.hotelScope),
      approvalOrder: listToText(rule.approvalOrder),
      defaultStrategy: rule.defaultStrategy ?? 'manual_review_required',
      status: rule.status
    });
  };

  const closeEditor = () => {
    setSelectedRule(null);
    setEditor(emptyEditorState());
  };

  const loadRules = async () => {
    if (!currentUser?.id) {
      setRules([]);
      setSessionInfo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [authData, ruleData] = await Promise.all([
        apiGet<AuthSessionResponse>('/api/auth/session', currentUser.id),
        apiGet<{ approvalRules: R8ApprovalRuleDto[] }>('/api/workflow/approval-rules', currentUser.id)
      ]);
      setSessionInfo(authData);
      setRules(ruleData.approvalRules.map(toR8ApprovalRuleView));
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批规则加载失败');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, [currentUser?.id]);

  const saveRule = async () => {
    if (!selectedRule || !currentUser?.id || !canMaintainRules) return;
    const ruleName = editor.ruleName.trim();
    if (!ruleName) {
      setError('规则名称不能为空。');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await apiPatch<{ approvalRule: R8ApprovalRuleDto; auditLogId?: string }>(
        `/api/workflow/approval-rules/${encodeURIComponent(selectedRule.id)}`,
        {
          ruleName,
          amountMin: numberOrKeep(editor.amountMin, selectedRule.amountMin),
          amountMax: numberOrKeep(editor.amountMax, selectedRule.amountMax),
          methodTypes: splitList(editor.methodTypes),
          nodeRoleIds: roleList(editor.nodeRoleIds),
          actions: splitList(editor.actions),
          orgScope: splitList(editor.orgScope),
          hotelScope: splitList(editor.hotelScope),
          approvalOrder: roleList(editor.approvalOrder),
          defaultStrategy: editor.defaultStrategy,
          status: editor.status
        },
        currentUser.id
      );
      setMessage(`审批规则 ${response.approvalRule.ruleCode} 已保存。`);
      closeEditor();
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批规则保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-[#006666]" />
            审批规则配置
          </h2>
          <p className="mt-1 text-sm text-slate-500">对接正式工作流规则源，支持按业务类型筛选并在允许角色下维护规则配置。</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={canMaintainRules ? 'success' : 'warning'}>{canMaintainRules ? '可维护' : '只读'}</Badge>
          <Button variant="outline" className="gap-2" onClick={() => void loadRules()} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</div>
              <div className="mt-1 text-xs text-slate-400">{item.meta}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索规则编号、名称、业务类型或审批链路"
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={businessTypeFilter}
                onChange={(event) => setBusinessTypeFilter(event.target.value as 'all' | R8ApprovalBusinessType)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="all">全部业务类型</option>
                {businessTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {readonlyReason ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{readonlyReason}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">审批规则台账</CardTitle>
          <div className="text-sm text-slate-500">共 {filteredRules.length} 条</div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">规则编号</th>
                  <th className="px-4 py-3">规则名称</th>
                  <th className="px-4 py-3">业务类型</th>
                  <th className="px-4 py-3">金额范围</th>
                  <th className="px-4 py-3">审批链路</th>
                  <th className="px-4 py-3">动作</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">更新时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                      正在加载真实审批规则...
                    </td>
                  </tr>
                ) : filteredRules.length ? (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{rule.ruleCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{rule.ruleName}</div>
                        <div className="mt-1 text-xs text-slate-500">版本 {rule.versionNo}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rule.businessTypeLabel}</td>
                      <td className="px-4 py-3 text-slate-600">{rule.amountRangeLabel}</td>
                      <td className="px-4 py-3 text-slate-600">{rule.nodeRoleLabels}</td>
                      <td className="px-4 py-3 text-slate-600">{rule.actionLabels}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={badgeVariantForRuleStatus(rule.status)}>{rule.statusLabel}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatR8DateTime(rule.updatedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" onClick={() => syncEditor(rule)}>
                          {canMaintainRules ? '编辑' : '查看'}
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                      当前筛选条件下没有审批规则。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedRule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={closeEditor}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{canMaintainRules ? '编辑审批规则' : '审批规则详情'}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRule.ruleCode} / {selectedRule.businessTypeLabel} / 版本 {selectedRule.versionNo}
                </p>
              </div>
              <button className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={closeEditor} aria-label="关闭">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>规则名称</span>
                <input
                  type="text"
                  value={editor.ruleName}
                  onChange={(event) => setEditor((current) => ({ ...current, ruleName: event.target.value }))}
                  disabled={!canMaintainRules}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm text-slate-700">
                  <span>金额下限</span>
                  <input
                    type="number"
                    value={editor.amountMin}
                    onChange={(event) => setEditor((current) => ({ ...current, amountMin: event.target.value }))}
                    disabled={!canMaintainRules}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                  <span>金额上限</span>
                  <input
                    type="number"
                    value={editor.amountMax}
                    onChange={(event) => setEditor((current) => ({ ...current, amountMax: event.target.value }))}
                    disabled={!canMaintainRules}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span>适用采购方式</span>
                <input
                  type="text"
                  value={editor.methodTypes}
                  onChange={(event) => setEditor((current) => ({ ...current, methodTypes: event.target.value }))}
                  disabled={!canMaintainRules}
                  placeholder="例如：open_tender, direct_purchase"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>审批节点角色</span>
                <textarea
                  value={editor.nodeRoleIds}
                  onChange={(event) => setEditor((current) => ({ ...current, nodeRoleIds: event.target.value }))}
                  disabled={!canMaintainRules}
                  rows={3}
                  placeholder={editableWorkflowRoles.join(', ')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
                <div className="text-xs text-slate-400">
                  可用角色：{editableWorkflowRoles.map((roleId) => r8RoleLabels[roleId] ?? roleId).join('、')}
                </div>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>允许动作</span>
                <textarea
                  value={editor.actions}
                  onChange={(event) => setEditor((current) => ({ ...current, actions: event.target.value }))}
                  disabled={!canMaintainRules}
                  rows={3}
                  placeholder={Object.keys(r8ActionLabels).join(', ')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
                <div className="text-xs text-slate-400">
                  已知动作：{Object.entries(r8ActionLabels).map(([key, label]) => `${key}(${label})`).join('、')}
                </div>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>集团组织范围</span>
                <textarea
                  value={editor.orgScope}
                  onChange={(event) => setEditor((current) => ({ ...current, orgScope: event.target.value }))}
                  disabled={!canMaintainRules}
                  rows={3}
                  placeholder="org-group, org-hotel"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>酒店范围</span>
                <textarea
                  value={editor.hotelScope}
                  onChange={(event) => setEditor((current) => ({ ...current, hotelScope: event.target.value }))}
                  disabled={!canMaintainRules}
                  rows={3}
                  placeholder="hotel-001, hotel-002"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>审批顺序</span>
                <textarea
                  value={editor.approvalOrder}
                  onChange={(event) => setEditor((current) => ({ ...current, approvalOrder: event.target.value }))}
                  disabled={!canMaintainRules}
                  rows={3}
                  placeholder={editableWorkflowRoles.join(', ')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>默认策略</span>
                <select
                  value={editor.defaultStrategy}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      defaultStrategy: event.target.value as NonNullable<R8ApprovalRuleDto['defaultStrategy']>
                    }))
                  }
                  disabled={!canMaintainRules}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                >
                  <option value="manual_review_required">无规则时人工复核</option>
                  <option value="reject_without_rule">无规则时拒绝</option>
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span>规则状态</span>
                <select
                  value={editor.status}
                  onChange={(event) => setEditor((current) => ({ ...current, status: event.target.value as R8ApprovalRuleDto['status'] }))}
                  disabled={!canMaintainRules}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                >
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <Button variant="outline" onClick={closeEditor}>
                关闭
              </Button>
              {canMaintainRules ? (
                <Button
                  data-ui-check="approval-rule-save"
                  variant="brand"
                  className="gap-2"
                  onClick={() => void saveRule()}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  {saving ? '保存中...' : '保存规则'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
