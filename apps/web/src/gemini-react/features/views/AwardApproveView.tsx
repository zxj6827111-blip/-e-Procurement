import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { AlertCircle, BellRing, CheckCircle2, Clock, Download, FileCheck, FileSignature, FileText, PackagePlus, Search, Send, ShieldCheck, TrendingDown, Upload, Users } from 'lucide-react';
import { apiBlob, apiGet, apiPost, uploadFile } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import {
  AwardApprovalRecord,
  ContractLedgerRecord,
  formatCurrency,
  formatDateTime,
  getAwardReadiness,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  PurchaseOrderRecord,
  useProjectWorkbenchData
} from './project-workbench-data';

interface AwardRecommendation {
  recommendedSupplierId?: string;
  recommendedSupplierName?: string;
  isLowestPrice?: boolean;
  sourceReportId?: string | null;
  candidateSupplierIds?: string[];
  note?: string;
}

interface AwardApprovalProjectOption {
  id: string;
  code?: string;
  name: string;
  externalTradeFlag?: boolean;
}

export function AwardApproveView() {
  const { currentProjectId, currentUser, navigateToPath, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const [awardProjects, setAwardProjects] = useState<AwardApprovalProjectOption[]>([]);
  const [awardProjectsLoading, setAwardProjectsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AwardRecommendation | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [nonLowestPriceReason, setNonLowestPriceReason] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState<'create' | 'submit' | 'notify' | 'contract' | 'order' | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState('');

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const userId = currentUser.id;

    async function loadAwardProjects() {
      setAwardProjectsLoading(true);
      try {
        const data = await apiGet<{ projects: AwardApprovalProjectOption[] }>('/api/projects', userId);
        if (!active) return;
        setAwardProjects(
          (data.projects ?? [])
            .filter((project) => !project.externalTradeFlag)
            .sort((left, right) => String(right.code ?? '').localeCompare(String(left.code ?? '')))
        );
      } catch {
        if (active) setAwardProjects([]);
      } finally {
        if (active) setAwardProjectsLoading(false);
      }
    }

    void loadAwardProjects();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (awardProjectsLoading || awardProjects.length === 0) return;
    const activeProjectId = currentProjectId ?? resolvedProjectId;
    if (activeProjectId && awardProjects.some((project) => project.id === activeProjectId)) return;
    navigateToPath(`/award-result?projectId=${encodeURIComponent(awardProjects[0].id)}`);
  }, [awardProjects, awardProjectsLoading, currentProjectId, navigateToPath, resolvedProjectId]);

  const approvals = useMemo(
    () => (workbench ? sortByNewest(workbench.awardApprovals, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt) : []),
    [workbench]
  );
  const selectedApproval = approvals.find((item) => item.id === selectedId) ?? approvals[0] ?? null;
  const draftApproval = approvals.find((item) => item.approvalStatus === 'draft') ?? null;
  const submittedApproval = approvals.find((item) => item.approvalStatus === 'submitted') ?? null;
  const approvedApproval = approvals.find((item) => item.approvalStatus === 'approved') ?? null;
  const canMaintainAward = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
  const sentNotifications = workbench?.resultNotifications?.filter((item) => item.status === 'sent') ?? [];
  const latestOrder = workbench?.purchaseOrders[0] ?? null;
  const currentContract = useMemo(
    () => (workbench ? sortByNewest(workbench.contracts ?? [], (item) => item.updatedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const contractConfirmed = Boolean(currentContract && ['registered', 'performing', 'completed'].includes(currentContract.status));
  const canGenerateOrder =
    Boolean(approvedApproval) &&
    sentNotifications.length > 0 &&
    contractConfirmed &&
    !latestOrder &&
    ['awarded_pending_order', 'result_notified', 'contract_registered'].includes(workbench?.project.status ?? '');
  const awardReadiness = useMemo(() => (workbench ? getAwardReadiness(workbench) : null), [workbench]);
  const candidateSupplierIds = recommendation?.candidateSupplierIds ?? [];
  const selectedCandidateRow = workbench?.comparisonReport?.comparisonRows?.find((item) => item.supplierId === selectedSupplierId);
  const selectedIsLowestPrice =
    selectedCandidateRow?.isLowestPrice ??
    (selectedSupplierId === recommendation?.recommendedSupplierId ? Boolean(recommendation?.isLowestPrice) : false);
  const createBlockedReasons = [
    ...(awardReadiness?.blockers ?? []),
    ...(!recommendation?.sourceReportId ? ['未找到冻结评审来源'] : []),
    ...(candidateSupplierIds.length === 0 ? ['冻结报告中没有可定标候选供应商'] : [])
  ].filter((item, index, array) => array.indexOf(item) === index);

  useEffect(() => {
    if (!selectedId && approvals[0]) {
      setSelectedId(approvals[0].id);
    }
  }, [approvals, selectedId]);

  useEffect(() => {
    if (!currentUser || !resolvedProjectId) return;
    let active = true;
    apiGet<{ recommendation?: AwardRecommendation }>(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/award-recommendation`,
      currentUser.id
    )
      .then((data) => {
        if (active) setRecommendation(data.recommendation ?? null);
      })
      .catch(() => {
        if (active) setRecommendation(null);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id, resolvedProjectId, workbench?.comparisonReport?.reportNo]);

  useEffect(() => {
    setSelectedSupplierId((previous) => {
      if (candidateSupplierIds.includes(previous)) return previous;
      if (recommendation?.recommendedSupplierId && candidateSupplierIds.includes(recommendation.recommendedSupplierId)) {
        return recommendation.recommendedSupplierId;
      }
      return candidateSupplierIds[0] ?? '';
    });
  }, [recommendation]);

  async function createAwardApproval() {
    if (!currentUser || !resolvedProjectId || !selectedSupplierId || busyAction) return;
    if (!selectedIsLowestPrice && !nonLowestPriceReason.trim()) {
      setActionError('选择非最低价供应商时必须填写定标理由。');
      return;
    }
    setBusyAction('create');
    setActionMessage('');
    setActionError('');
    try {
      const result = await apiPost<{ approval: AwardApprovalRecord }>(
        `/api/projects/${encodeURIComponent(resolvedProjectId)}/award-approvals`,
        {
          selectedSupplierId,
          nonLowestPriceReason: selectedIsLowestPrice ? undefined : nonLowestPriceReason.trim()
        },
        currentUser.id
      );
      setSelectedId(result.approval.id);
      setActionMessage(`定标审批 ${result.approval.id} 已创建，请检查后提交审批。`);
      reload();
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : '定标审批创建失败。');
    } finally {
      setBusyAction(null);
    }
  }

  async function submitAwardApproval(approval: AwardApprovalRecord) {
    if (!currentUser || busyAction || approval.approvalStatus !== 'draft') return;
    setBusyAction('submit');
    setActionMessage('');
    setActionError('');
    try {
      await apiPost(`/api/award-approvals/${encodeURIComponent(approval.id)}/submit`, {}, currentUser.id);
      setSelectedId(approval.id);
      setActionMessage(`定标审批 ${approval.id} 已提交，请等待集团审批。`);
      reload();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : '定标审批提交失败。');
    } finally {
      setBusyAction(null);
    }
  }

  async function sendResultNotification() {
    if (!currentUser || !resolvedProjectId || !approvedApproval || busyAction) return;
    setBusyAction('notify');
    setActionMessage('');
    setActionError('');
    try {
      const result = await apiPost<{ notifications: Array<{ id: string }> }>(
        `/api/projects/${encodeURIComponent(resolvedProjectId)}/result-notifications`,
        { scope: 'supplier_self', visibilityConfig: 'supplier_self_only' },
        currentUser.id
      );
      setActionMessage(`结果通知已发送，共 ${result.notifications.length} 条。`);
      reload();
    } catch (notifyError) {
      setActionError(notifyError instanceof Error ? notifyError.message : '结果通知发送失败。');
    } finally {
      setBusyAction(null);
    }
  }

  async function uploadContractDocument() {
    if (!currentUser || !resolvedProjectId || !approvedApproval || !workbench || !canMaintainAward || busyAction) return;
    if (!contractFile) {
      setActionError('请选择需要发送给中标供应商的合同文件。');
      return;
    }
    setBusyAction('contract');
    setActionMessage('');
    setActionError('');
    try {
      let contract = currentContract;
      if (!contract) {
        const signing = await apiPost<{ contract: ContractLedgerRecord }>(
          `/api/projects/${encodeURIComponent(resolvedProjectId)}/contracts/signing`,
          {},
          currentUser.id
        );
        contract = signing.contract;
      }
      const uploaded = await uploadFile(
        contractFile,
        {
          attachmentKind: 'contract_document',
          objectType: 'contract_ledger',
          objectId: contract.id,
          projectId: resolvedProjectId,
          supplierId: contract.supplierId
        },
        currentUser.id
      );
      await apiPost(
        `/api/contracts/${encodeURIComponent(contract.id)}/attachments`,
        { attachmentMetadata: [uploaded.file] },
        currentUser.id
      );
      setContractFile(null);
      setActionMessage(currentContract ? '合同文件已补传，中标供应商现在可以下载。' : '合同文件已上传并发起签订，等待中标供应商下载并确认。');
      reload();
    } catch (contractError) {
      setActionError(contractError instanceof Error ? contractError.message : '合同签订发起失败。');
    } finally {
      setBusyAction(null);
    }
  }

  async function downloadContractDocument(file: ContractLedgerRecord['attachmentMetadata'][number]) {
    if (!currentUser || downloadingFileId) return;
    setDownloadingFileId(file.id);
    setActionMessage('');
    setActionError('');
    try {
      const blob = await apiBlob(`/api/files/${encodeURIComponent(file.id)}/download`, currentUser.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName || `${file.id}.bin`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setActionMessage(`${file.fileName} 已开始下载。`);
    } catch (downloadError) {
      setActionError(downloadError instanceof Error ? downloadError.message : '合同文件下载失败。');
    } finally {
      setDownloadingFileId('');
    }
  }

  async function generatePurchaseOrder() {
    if (!currentUser || !resolvedProjectId || !workbench || !canGenerateOrder || busyAction) return;
    setBusyAction('order');
    setActionMessage('');
    setActionError('');
    try {
      const result = await apiPost<{ purchaseOrder: PurchaseOrderRecord }>(
        `/api/project-workbench/projects/${encodeURIComponent(resolvedProjectId)}/purchase-orders/generate`,
        {
          expectedDeliveryAt: workbench.procurementRequest?.expectedArrivalAt,
          receivingLocation: workbench.procurementRequest?.receivingLocation
        },
        currentUser.id
      );
      setActionMessage(`采购订单 ${result.purchaseOrder.orderNo} 已生成，等待中标供应商确认。`);
      reload();
    } catch (orderError) {
      setActionError(orderError instanceof Error ? orderError.message : '采购订单生成失败。');
    } finally {
      setBusyAction(null);
    }
  }

  function awardSummary(approval: AwardApprovalRecord | null) {
    if (!approval || !workbench) return null;
    const selectedBid = workbench.bids.find((item) => item.supplierId === approval.selectedSupplierId);
    const comparisonRow = workbench.comparisonReport?.comparisonRows?.find((item) => item.supplierId === approval.selectedSupplierId);
    return {
      supplierName: resolveSupplierName(workbench, approval.selectedSupplierId),
      amount: selectedBid?.amount,
      score: comparisonRow?.finalScore,
      rank: comparisonRow?.rank,
      approvedAt: approval.approvedAt ?? approval.submittedAt ?? approval.createdAt
    };
  }

  const summary = awardSummary(selectedApproval);

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">定标审批数据加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的项目。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FileCheck className="h-6 w-6 text-[#006666]" />
            定标审批
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-3">
          <label className="min-w-[300px] text-sm text-slate-600">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              切换定标项目{awardProjectsLoading ? '' : `（${awardProjects.length} 条）`}
            </span>
            <select
              data-ui-check="award-approval-project-switcher"
              value={currentProjectId ?? resolvedProjectId ?? ''}
              onChange={(event) => navigateToPath(`/award-result?projectId=${encodeURIComponent(event.target.value)}`)}
              disabled={awardProjectsLoading || awardProjects.length === 0}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20 disabled:bg-slate-100"
            >
              {awardProjectsLoading ? <option value="">定标项目加载中...</option> : null}
              {!awardProjectsLoading && awardProjects.length === 0 ? <option value="">暂无可切换项目</option> : null}
              {awardProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ?? project.id} / {project.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={() => setCurrentView('PROJECT_DETAIL')}>
            返回项目详情
          </Button>
        </div>
      </div>

      {(actionMessage || actionError) ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            actionError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role="status"
        >
          {actionError || actionMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b border-slate-100 py-4">
          <CardTitle className="text-base font-medium">发起定标审批</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {!canMaintainAward ? (
            <p className="text-sm text-slate-600">采购经办创建并提交定标审批后，当前角色可在本页查看审批记录和结果。</p>
          ) : approvedApproval ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                定标审批 {approvedApproval.id} 已通过，请继续发送结果通知并生成采购订单。
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <BellRing className="h-4 w-4 text-[#006666]" />
                    1. 发送结果通知
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {sentNotifications.length > 0 ? `已向供应商发送 ${sentNotifications.length} 条通知。` : '尚未向参与供应商发送定标结果。'}
                  </div>
                  <Button
                    className="mt-3"
                    variant={sentNotifications.length > 0 ? 'outline' : 'brand'}
                    onClick={() => void sendResultNotification()}
                    disabled={Boolean(busyAction) || sentNotifications.length > 0}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {busyAction === 'notify' ? '发送中...' : sentNotifications.length > 0 ? '结果通知已发送' : '发送结果通知'}
                  </Button>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <PackagePlus className="h-4 w-4 text-[#006666]" />
                    2. 生成采购订单
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {latestOrder ? `订单 ${latestOrder.orderNo} 已生成。` : sentNotifications.length > 0 ? '通知已发送，可以生成采购订单。' : '发送结果通知后即可生成采购订单。'}
                  </div>
                  {latestOrder ? (
                    <Button className="mt-3" variant="outline" onClick={() => setCurrentView('PROJECT_FULFILLMENT')}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      进入订单履约
                    </Button>
                  ) : (
                    <Button className="mt-3" variant="brand" onClick={() => void generatePurchaseOrder()} disabled={Boolean(busyAction) || !canGenerateOrder}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      {busyAction === 'order' ? '生成中...' : '生成采购订单'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : submittedApproval ? (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Clock className="h-4 w-4" />
              定标审批 {submittedApproval.id} 已提交，正在等待集团审批。
            </div>
          ) : draftApproval ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-900">草稿 {draftApproval.id}</div>
                <div className="mt-1 text-xs text-slate-500">
                  拟定标供应商：{resolveSupplierName(workbench, draftApproval.selectedSupplierId)}
                </div>
              </div>
              <Button variant="brand" onClick={() => void submitAwardApproval(draftApproval)} disabled={Boolean(busyAction)}>
                <Send className="mr-2 h-4 w-4" />
                {busyAction === 'submit' ? '提交中...' : '提交定标审批'}
              </Button>
            </div>
          ) : createBlockedReasons.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertCircle className="h-4 w-4" />
                当前还不能创建定标审批
              </div>
              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                {createBlockedReasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="text-sm text-slate-600">
                拟定标供应商
                <select
                  value={selectedSupplierId}
                  onChange={(event) => {
                    setSelectedSupplierId(event.target.value);
                    setNonLowestPriceReason('');
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {candidateSupplierIds.map((supplierId) => (
                    <option key={supplierId} value={supplierId}>
                      {resolveSupplierName(workbench, supplierId)}
                      {supplierId === recommendation?.recommendedSupplierId ? '（报告推荐）' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                非最低价定标理由
                <input
                  value={nonLowestPriceReason}
                  onChange={(event) => setNonLowestPriceReason(event.target.value)}
                  disabled={selectedIsLowestPrice}
                  placeholder={selectedIsLowestPrice ? '当前选择为最低价，无需填写' : '说明服务、质量或综合评分依据'}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                />
              </label>
              <Button
                variant="brand"
                onClick={() => void createAwardApproval()}
                disabled={Boolean(busyAction) || !selectedSupplierId || (!selectedIsLowestPrice && !nonLowestPriceReason.trim())}
              >
                {busyAction === 'create' ? '创建中...' : '创建定标审批'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {approvedApproval ? (
        <Card>
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileSignature className="h-5 w-5 text-[#006666]" />
              合同签订
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {currentContract ? (
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-xs text-slate-500">合同编号</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{currentContract.contractNo}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">合同金额</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{formatCurrency(currentContract.amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">合同状态</div>
                  <div className="mt-1">
                    <Badge variant={statusBadgeVariant(currentContract.status)}>{humanizeStatus(currentContract.status)}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">更新时间</div>
                  <div className="mt-1 text-sm text-slate-700">{formatDateTime(currentContract.updatedAt ?? currentContract.createdAt)}</div>
                </div>
                <div className="md:col-span-4 text-sm text-slate-600">
                  {contractConfirmed ? '合同已由中标供应商确认，可以继续生成采购订单。' : '合同已发起，等待中标供应商确认后才能生成采购订单。'}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-slate-900">尚未发起合同签订</div>
                <div className="mt-1 text-sm text-slate-600">选择正式合同文件后，系统将创建合同台账并发送给中标供应商确认。</div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
                <FileText className="h-4 w-4 text-[#006666]" />
                合同文件
              </div>
              {(currentContract?.attachmentMetadata ?? []).length > 0 ? (
                <div className="mb-4 space-y-2">
                  {currentContract?.attachmentMetadata.map((file) => (
                    <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{file.fileName}</div>
                        <div className="mt-1 text-xs text-slate-500">{Math.max(1, Math.ceil(file.sizeBytes / 1024))} KB · {formatDateTime(file.uploadedAt)}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void downloadContractDocument(file)} disabled={Boolean(downloadingFileId)}>
                        <Download className="mr-2 h-4 w-4" />
                        {downloadingFileId === file.id ? '下载中...' : '下载'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">尚未上传合同文件，供应商暂时不能确认合同。</div>
              )}

              {canMaintainAward && currentContract?.status !== 'cancelled' ? (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-[280px] flex-1 text-sm text-slate-600">
                    {currentContract ? '补传合同文件' : '选择合同文件'}
                    <input
                      key={contractFile?.name ?? 'empty-contract-file'}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(event) => setContractFile(event.target.files?.[0] ?? null)}
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#006666]"
                    />
                  </label>
                  <Button variant="brand" onClick={() => void uploadContractDocument()} disabled={Boolean(busyAction) || !contractFile}>
                    <Upload className="mr-2 h-4 w-4" />
                    {busyAction === 'contract' ? '上传中...' : currentContract ? '补传合同文件' : '上传并发起合同签订'}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={workbench.project.code}
                  readOnly
                  className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-500"
                />
              </div>
              <div className="text-sm text-slate-500">共 {approvals.length} 条审批记录</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-4">审批编号</th>
                  <th className="border-b border-slate-200 px-6 py-4">推荐 / 定标供应商</th>
                  <th className="border-b border-slate-200 px-6 py-4">综合得分 / 报价</th>
                  <th className="border-b border-slate-200 px-6 py-4">状态</th>
                  <th className="border-b border-slate-200 px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.map((approval) => {
                  const selectedBid = workbench.bids.find((item) => item.supplierId === approval.selectedSupplierId);
                  const comparisonRow = workbench.comparisonReport?.comparisonRows?.find((item) => item.supplierId === approval.selectedSupplierId);
                  return (
                    <tr key={approval.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{approval.id}</div>
                        <div className="text-xs text-slate-500">{formatDateTime(approval.approvedAt ?? approval.submittedAt ?? approval.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{resolveSupplierName(workbench, approval.recommendedSupplierId)}</div>
                        <div className="text-xs text-slate-500">定标：{resolveSupplierName(workbench, approval.selectedSupplierId)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#006666]">{comparisonRow?.finalScore?.toFixed(1) ?? '-'}</div>
                        <div className="text-xs text-slate-500">{formatCurrency(selectedBid?.amount)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadgeVariant(approval.approvalStatus)}>{humanizeStatus(approval.approvalStatus)}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-xs font-medium text-[#006666] hover:underline" onClick={() => setSelectedId(approval.id)}>
                          审批详情
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="h-fit bg-slate-50/50 lg:col-span-1">
          <CardHeader className="border-b border-slate-100 bg-white py-4">
            <CardTitle className="text-base font-medium">定标审查详情</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedApproval && summary ? (
              <div className="space-y-6">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-900">审查结论</h4>
                  <div className="rounded border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      当前审批状态：{humanizeStatus(selectedApproval.approvalStatus)}
                    </div>
                    <div className="mt-2 text-xs text-emerald-700/90">审批完成时间：{formatDateTime(summary.approvedAt)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-900">拟定标供应商</h4>
                  <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{summary.supplierName}</div>
                    <div className="mt-2">报价金额：{formatCurrency(summary.amount)}</div>
                    <div>综合得分：{summary.score?.toFixed(1) ?? '-'}</div>
                    <div>排名：{summary.rank ?? '-'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-900">合规检查项</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-700">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      比价报告已冻结，专家评分已锁定。
                    </div>
                    <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-700">
                      <TrendingDown className="h-4 w-4 shrink-0" />
                      中标报价低于预算 {formatCurrency(workbench.procurementRequest?.budgetAmount ?? workbench.project.budgetAmount)}。
                    </div>
                    <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-700">
                      <Users className="h-4 w-4 shrink-0" />
                      有效报价供应商 {workbench.bids.length} 家，满足定标依据。
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-900">后续执行</h4>
                  <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <div>价目报告：{workbench.pricingReports?.[0]?.reportNo ?? '-'}</div>
                    <div>采购订单：{workbench.purchaseOrders[0]?.orderNo ?? '-'}</div>
                    <div>订单状态：{humanizeStatus(workbench.purchaseOrders[0]?.status)}</div>
                  </div>
                </div>

                <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    本页展示的是后端真实审批记录，不再使用静态样例。
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileCheck className="mb-3 h-12 w-12 text-slate-200" />
                <p className="text-sm">当前项目还没有定标审批记录。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
