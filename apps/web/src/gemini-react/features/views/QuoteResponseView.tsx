import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { FileText, Save, Send, Upload } from 'lucide-react';
import { apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from '../../../api/http';
import { cn } from '../../shared/lib/utils';
import { formatCurrency, formatDateTime, humanizeStatus, statusBadgeVariant } from './project-workbench-data';

interface ProjectLineItem {
  id: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
}

interface ProjectRecord {
  id: string;
  code?: string;
  name?: string;
  displayName?: string;
  buyer?: string;
  quoteDeadlineAt?: string | null;
  beforeDeadline?: boolean;
  category?: string;
  orgName?: string;
  type?: string;
  sourceLineItems?: ProjectLineItem[];
  quoteRequirements?: string[];
  deliveryRequirements?: string[];
  clarificationRecords?: Array<{
    id: string;
    question: string;
    answer?: string;
    status?: string;
  }>;
}

interface RegistrationRecord {
  id: string;
  projectId: string;
  status: string;
  submittedAt?: string;
  qualifiedAt?: string;
  qualificationReason?: string;
  materialMetadata?: UploadedFileMetadata[];
}

interface BidLineItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
}

interface BidRecord {
  id: string;
  supplierId: string;
  status: string;
  amount?: number;
  taxRate?: number | null;
  taxInclusive?: boolean;
  deliveryDays?: number;
  responseSummary?: string;
  serviceCommitment?: string;
  fileName?: string;
  submittedAt?: string | null;
  lockedAt?: string | null;
  responseFileMetadata?: UploadedFileMetadata[];
  lineItems?: BidLineItem[];
}

function projectDisplayName(project?: ProjectRecord | null) {
  if (!project) return '当前项目';
  const value = project.displayName ?? project.name ?? project.id;
  const codePrefix = project.code ? `${project.code} / ` : '';
  return codePrefix && value.startsWith(codePrefix) ? value.slice(codePrefix.length) : value;
}

function buildRequirementText(project: ProjectRecord) {
  const header = [
    `项目编号：${project.code ?? project.id}`,
    `项目名称：${projectDisplayName(project)}`,
    `采购组织：${project.orgName ?? '-'}`,
    `采购方式：${project.type ?? '-'}`,
    ''
  ];
  const items = (project.sourceLineItems ?? []).map((item, index) => {
    return `${index + 1}. ${item.itemName} | ${item.specification ?? '-'} | ${item.quantity}${item.unit} | 预算 ${formatCurrency(item.budgetAmount ?? item.estimatedUnitPrice ?? 0)}`;
  });
  return [...header, '采购明细：', ...items].join('\n');
}

function initialAmountForProject(project: ProjectRecord | null) {
  if (!project?.sourceLineItems?.length) return 0;
  return project.sourceLineItems.reduce((sum, item) => {
    if (typeof item.budgetAmount === 'number') return sum + item.budgetAmount;
    if (typeof item.estimatedUnitPrice === 'number') return sum + item.estimatedUnitPrice * item.quantity;
    return sum;
  }, 0);
}

export function QuoteResponseView() {
  const { currentUser, currentProjectId } = useApp();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId ?? '');
  const [selectedBidId, setSelectedBidId] = useState('');
  const [amount, setAmount] = useState('0');
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [responseSummary, setResponseSummary] = useState('');
  const [serviceCommitment, setServiceCommitment] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<'saving' | 'submitting' | null>(null);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const selectedRegistration = useMemo(
    () => registrations.find((item) => item.projectId === selectedProjectId) ?? null,
    [registrations, selectedProjectId]
  );
  const selectedBid = useMemo(
    () => bids.find((item) => item.id === selectedBidId) ?? bids[0] ?? null,
    [bids, selectedBidId]
  );

  const lineRows = useMemo(() => {
    const bidLineByName = new Map((selectedBid?.lineItems ?? []).map((item) => [item.itemName, item]));
    return (selectedProject?.sourceLineItems ?? []).map((item) => {
      const bidLine = bidLineByName.get(item.itemName);
      return {
        ...item,
        bidUnitPrice: bidLine?.unitPrice,
        bidTotalPrice: bidLine?.totalPrice
      };
    });
  }, [selectedBid, selectedProject]);

  const canSaveDraft = Boolean(
    selectedProject &&
      selectedProject.beforeDeadline &&
      selectedRegistration?.status === 'qualified' &&
      (!selectedBid || ['draft', 'saved', 'withdrawn', 'rejected'].includes(selectedBid.status))
  );
  const canSubmit = Boolean(
    selectedProject &&
      selectedProject.beforeDeadline &&
      selectedRegistration?.status === 'qualified' &&
      (!selectedBid || ['draft', 'saved', 'withdrawn', 'rejected'].includes(selectedBid.status))
  );

  const refreshBids = async (projectId = selectedProjectId) => {
    if (!currentUser || !projectId) {
      setBids([]);
      setSelectedBidId('');
      return;
    }
    const summary = await apiGet<{ bids?: BidRecord[] }>(`/api/projects/${projectId}/bids/summary`, currentUser.id).catch(() => ({ bids: [] }));
    const nextBids = summary.bids ?? [];
    setBids(nextBids);
    setSelectedBidId((previous) => (nextBids.some((bid) => bid.id === previous) ? previous : nextBids[0]?.id ?? ''));
  };

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    Promise.all([
      apiGet<{ projects: ProjectRecord[] }>('/api/projects', currentUser.id),
      apiGet<{ registrations?: RegistrationRecord[] }>('/api/registrations', currentUser.id).catch(() => ({ registrations: [] }))
    ])
      .then(([projectData, registrationData]) => {
        if (!active) return;
        const ownRegistrations = registrationData.registrations ?? [];
        const eligibleProjectIds = new Set(ownRegistrations.map((item) => item.projectId));
        const projectRows = (projectData.projects ?? []).filter((item) => !item.id.startsWith('p-ext') && eligibleProjectIds.has(item.id));
        setProjects(projectRows);
        setRegistrations(ownRegistrations);
        const preferredProjectId =
          currentProjectId && projectRows.some((item) => item.id === currentProjectId)
            ? currentProjectId
            : projectRows[0]?.id ?? '';
        setSelectedProjectId(preferredProjectId);
        void refreshBids(preferredProjectId);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : '报价页面加载失败');
      });

    return () => {
      active = false;
    };
  }, [currentProjectId, currentUser?.id]);

  useEffect(() => {
    if (!currentProjectId || !projects.some((item) => item.id === currentProjectId) || currentProjectId === selectedProjectId) return;
    setSelectedProjectId(currentProjectId);
    void refreshBids(currentProjectId);
  }, [currentProjectId, projects, selectedProjectId]);

  useEffect(() => {
    if (selectedBid) {
      setAmount(String(selectedBid.amount ?? 0));
      setDeliveryDays(String(selectedBid.deliveryDays ?? 7));
      setResponseSummary(selectedBid.responseSummary ?? '');
      setServiceCommitment(selectedBid.serviceCommitment ?? '');
      setResponseFile(null);
      return;
    }
    setAmount(String(initialAmountForProject(selectedProject)));
    setDeliveryDays('7');
    setResponseSummary('');
    setServiceCommitment('');
    setResponseFile(null);
  }, [selectedBid, selectedProject]);

  const buildBidPayload = async () => {
    const payload: Record<string, unknown> = {
      amount: Number(amount || 0),
      deliveryDays: Number(deliveryDays || 0),
      responseSummary,
      serviceCommitment
    };

    if (responseFile && selectedProjectId) {
      const uploaded = await uploadFile(
        responseFile,
        {
          attachmentKind: 'bid_response_file',
          objectType: 'bid',
          objectId: selectedBidId || `${selectedProjectId}-draft-bid`,
          projectId: selectedProjectId
        },
        currentUser?.id
      );
      payload.responseFileMetadata = [uploaded.file];
    }
    return payload;
  };

  const saveDraft = async () => {
    if (!currentUser || !selectedProjectId) return;
    setBusyAction('saving');
    setError('');
    setMessage('');
    try {
      const payload = await buildBidPayload();
      if (selectedBidId && selectedBid?.status === 'draft') {
        await apiPatch(`/api/bids/${selectedBidId}`, payload, currentUser.id);
      } else {
        await apiPost(`/api/projects/${selectedProjectId}/bids`, payload, currentUser.id);
      }
      await refreshBids(selectedProjectId);
      setMessage('报价草稿已保存。');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '报价草稿保存失败');
    } finally {
      setBusyAction(null);
    }
  };

  const submitBid = async () => {
    if (!currentUser || !selectedProjectId) return;
    setBusyAction('submitting');
    setError('');
    setMessage('');
    try {
      let bidId = selectedBidId;
      if (!bidId || !selectedBid || ['withdrawn', 'rejected'].includes(selectedBid.status)) {
        const draft = await apiPost<{ bid?: BidRecord }>(`/api/projects/${selectedProjectId}/bids`, await buildBidPayload(), currentUser.id);
        bidId = draft.bid?.id ?? '';
      } else if (selectedBid.status === 'draft') {
        await apiPatch(`/api/bids/${bidId}`, await buildBidPayload(), currentUser.id);
      }
      if (!bidId) throw new Error('未生成可提交的报价单。');
      await apiPost(`/api/bids/${bidId}/submit`, {}, currentUser.id);
      await refreshBids(selectedProjectId);
      setMessage('报价已提交。');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '报价提交失败');
    } finally {
      setBusyAction(null);
    }
  };

  const statusText = selectedBid ? humanizeStatus(selectedBid.status) : '未报价';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            报价响应
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedProject?.code ?? '-'} / {projectDisplayName(selectedProject)} | 报价截止：{formatDateTime(selectedProject?.quoteDeadlineAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge variant={statusBadgeVariant(selectedRegistration?.status)}>{selectedRegistration ? `报名状态：${humanizeStatus(selectedRegistration.status)}` : '未报名'}</Badge>
          <Badge variant={statusBadgeVariant(selectedBid?.status)}>{`报价状态：${statusText}`}</Badge>
        </div>
      </div>

      {(message || error) && (
        <div className={cn('rounded-md border px-4 py-3 text-sm', error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {error || message}
        </div>
      )}

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm text-slate-600 md:col-span-2">
            选择报价项目
            <select
              value={selectedProjectId}
              onChange={(event) => {
                setSelectedProjectId(event.target.value);
                void refreshBids(event.target.value);
              }}
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              <option value="">暂无可报价项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ?? project.id} / {projectDisplayName(project)}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm text-slate-600">
            <div className="font-medium text-slate-900">资格审核</div>
            <div className="mt-1">{selectedRegistration ? humanizeStatus(selectedRegistration.status) : '未提交报名资料'}</div>
            <div className="text-xs text-slate-500 mt-1">{selectedRegistration?.qualificationReason ?? '当前项目没有报名审核意见。'}</div>
          </div>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前没有可报价项目。请先到“报名资料”查看采购方已发布的公告并提交报名；采购经办审核资格通过后，项目才会出现在报价响应中。
        </div>
      ) : selectedRegistration && selectedRegistration.status !== 'qualified' ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前项目的报名资格状态为“{humanizeStatus(selectedRegistration.status)}”。资格审核通过前可以查看项目，但不能正式提交报价。
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card>
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800">采购需求与报价基础</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500">采购组织</div>
                <div className="font-medium text-slate-900 mt-1">{selectedProject?.orgName ?? '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">采购经办</div>
                <div className="font-medium text-slate-900 mt-1">{selectedProject?.buyer ?? '-'}</div>
              </div>
              <div>
                <div className="text-slate-500">是否允许继续报价</div>
                <div className="font-medium text-slate-900 mt-1">{selectedProject?.beforeDeadline ? '是' : '否，已过截止时间'}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">物资名称</th>
                    <th className="px-4 py-3 text-left font-medium">规格/型号</th>
                    <th className="px-4 py-3 text-left font-medium">数量</th>
                    <th className="px-4 py-3 text-left font-medium">预算金额</th>
                    <th className="px-4 py-3 text-left font-medium">报价单价</th>
                    <th className="px-4 py-3 text-left font-medium">报价金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineRows.length ? (
                    lineRows.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.itemName}</td>
                        <td className="px-4 py-3 text-slate-600">{item.specification ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-slate-600">{formatCurrency(item.budgetAmount ?? item.estimatedUnitPrice ?? 0)}</td>
                        <td className="px-4 py-3 text-slate-600">{typeof item.bidUnitPrice === 'number' ? formatCurrency(item.bidUnitPrice) : '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{typeof item.bidTotalPrice === 'number' ? formatCurrency(item.bidTotalPrice) : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">当前项目没有可展示的采购明细。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div>
                <div className="font-medium text-slate-900 mb-2">报价要求</div>
                <ul className="space-y-2 text-slate-600">
                  {(selectedProject?.quoteRequirements?.length ? selectedProject.quoteRequirements : ['当前项目未维护额外报价要求。']).map((item) => (
                    <li key={item} className="leading-6">• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium text-slate-900 mb-2">交付要求</div>
                <ul className="space-y-2 text-slate-600">
                  {(selectedProject?.deliveryRequirements?.length ? selectedProject.deliveryRequirements : ['当前项目未维护额外交付要求。']).map((item) => (
                    <li key={item} className="leading-6">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {selectedProject && (
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const text = buildRequirementText(selectedProject);
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${selectedProject.code ?? selectedProject.id}-采购需求.txt`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(url);
                }}>
                  <Upload className="w-4 h-4 mr-2" />
                  导出采购需求
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#006666]/15">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800">我的报价单</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <label className="text-sm text-slate-600">
                总报价金额
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={!canSaveDraft && !canSubmit}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="text-sm text-slate-600">
                承诺交付天数
                <input
                  type="number"
                  value={deliveryDays}
                  onChange={(event) => setDeliveryDays(event.target.value)}
                  disabled={!canSaveDraft && !canSubmit}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="text-sm text-slate-600">
                响应说明
                <textarea
                  value={responseSummary}
                  onChange={(event) => setResponseSummary(event.target.value)}
                  disabled={!canSaveDraft && !canSubmit}
                  rows={4}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="text-sm text-slate-600">
                服务承诺
                <textarea
                  value={serviceCommitment}
                  onChange={(event) => setServiceCommitment(event.target.value)}
                  disabled={!canSaveDraft && !canSubmit}
                  rows={4}
                  className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="text-sm text-slate-600">
                上传响应文件
                <input
                  type="file"
                  onChange={(event) => setResponseFile(event.target.files?.[0] ?? null)}
                  disabled={!canSaveDraft && !canSubmit}
                  className="mt-1 block w-full text-sm text-slate-600 disabled:opacity-60"
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-medium text-slate-900 mb-1">当前记录</div>
              <div>报价单状态：{statusText}</div>
              <div>提交时间：{formatDateTime(selectedBid?.submittedAt)}</div>
              <div>锁定时间：{formatDateTime(selectedBid?.lockedAt)}</div>
              <div>响应文件：{responseFile?.name ?? selectedBid?.fileName ?? selectedBid?.responseFileMetadata?.[0]?.fileName ?? '未上传'}</div>
            </div>

            {!selectedProject?.beforeDeadline ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                当前项目已过报价截止时间，页面切换为只读查看模式。
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                className="min-w-[132px]"
                disabled={busyAction !== null || !canSaveDraft}
                onClick={() => void saveDraft()}
              >
                <Save className="w-4 h-4 mr-2" />
                {busyAction === 'saving' ? '保存中...' : '保存草稿'}
              </Button>
              <Button
                data-ui-check="quote-submit-bid"
                className="min-w-[152px]"
                disabled={busyAction !== null || !canSubmit}
                onClick={() => void submitBid()}
              >
                <Send className="w-4 h-4 mr-2" />
                {busyAction === 'submitting' ? '提交中...' : '提交报价'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
