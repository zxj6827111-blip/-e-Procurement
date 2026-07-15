import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { AlertCircle, ArrowLeft, Archive, ArrowRight, CheckCircle2, Clock, FileText, ListChecks, LockKeyhole, PackageCheck, Scissors, ShieldAlert, Trophy, Truck, Users } from 'lucide-react';
import { apiPost } from '../../../api/http';
import { cn } from '../../shared/lib/utils';
import {
  calculateArchiveCompleteness,
  downloadTextFile,
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  projectStageLabel,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

export type ProjectDetailTab = 'OVERVIEW' | 'DOCUMENT' | 'BIDDING' | 'REVIEW' | 'AWARD' | 'ARCHIVE';

const tabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'OVERVIEW', label: '项目概览' },
  { id: 'DOCUMENT', label: '采购文件' },
  { id: 'BIDDING', label: '报名与报价' },
  { id: 'REVIEW', label: '专家评审' },
  { id: 'AWARD', label: '定标与结果' },
  { id: 'ARCHIVE', label: '档案与日志' }
];

function projectNextAction(status: string, hasOrder: boolean) {
  if (hasOrder || ['contract_registered', 'performing', 'evaluated', 'archived'].includes(status)) {
    return { view: 'PROJECT_FULFILLMENT' as const, label: '进入履约处理' };
  }
  if (['project_created', 'document_preparing'].includes(status)) {
    return { view: 'PROCUREMENT_DOCUMENT' as const, label: '处理采购文件' };
  }
  if (status === 'document_published') {
    return { view: 'ANNOUNCEMENT' as const, label: '发布公告/邀请供应商' };
  }
  if (status === 'registration_open') {
    return { view: 'REGISTRATION' as const, label: '查看报名与资格审核' };
  }
  if (status === 'bidding_open') {
    return { view: 'QUOTE_PROGRESS' as const, label: '查看报价进度' };
  }
  if (['bidding_locked', 'expert_reviewing'].includes(status)) {
    return { view: 'REVIEW_AWARD' as const, label: '组织评审' };
  }
  if (['review_report_frozen', 'award_approving'].includes(status)) {
    return { view: 'AWARD_APPROVE' as const, label: '创建/查看定标审批' };
  }
  if (['awarded_pending_order', 'result_notified'].includes(status)) {
    return { view: 'AWARD_RESULT' as const, label: '查看定标结果' };
  }
  return { view: 'PROJECT_SOURCING' as const, label: '查看招采执行' };
}

interface ProjectDetailViewProps {
  initialTab?: ProjectDetailTab;
}

export function ProjectDetailView({ initialTab = 'OVERVIEW' }: ProjectDetailViewProps) {
  const { currentProjectId, currentUser, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>(initialTab);
  const [bidAction, setBidAction] = useState<'cutoff' | 'lock' | null>(null);
  const [bidActionMessage, setBidActionMessage] = useState('');
  const [bidActionError, setBidActionError] = useState('');
  const [cutoffReason, setCutoffReason] = useState('');
  const [registrationReviewAction, setRegistrationReviewAction] = useState<{
    registrationId: string;
    status: 'qualified' | 'rejected';
  } | null>(null);
  const [registrationReviewMessage, setRegistrationReviewMessage] = useState('');
  const [registrationReviewError, setRegistrationReviewError] = useState('');
  const [archiveAction, setArchiveAction] = useState<string | null>(null);
  const [archiveActionMessage, setArchiveActionMessage] = useState('');
  const [archiveActionError, setArchiveActionError] = useState('');
  const [archiveCheckResult, setArchiveCheckResult] = useState<{ status: string; missingItems: Array<{ id: string; itemName: string }> } | null>(null);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const archivePercent = calculateArchiveCompleteness(workbench);
  const canMaintainArchive = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
  const canCheckArchive = ['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS', 'DISCIPLINARY_AUDIT'].includes(String(currentUser?.role));
  const archiveSealed = Boolean(workbench?.archiveItems.length) && workbench!.archiveItems.every((item) => item.sealed || item.status === 'sealed');
  const activeProcurementDocuments = useMemo(
    () => (workbench?.procurementDocuments ?? []).filter((document) => document.status !== 'voided'),
    [workbench?.procurementDocuments]
  );

  const latestAward = useMemo(
    () => (workbench ? sortByNewest(workbench.awardApprovals, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const latestOrder = useMemo(
    () => (workbench ? sortByNewest(workbench.purchaseOrders, (item) => item.expectedDeliveryAt)[0] ?? null : null),
    [workbench]
  );
  const latestPricingReport = useMemo(
    () => (workbench ? sortByNewest(workbench.pricingReports ?? [], (item) => item.approvedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const recentAuditLogs = useMemo(
    () => (workbench ? sortByNewest(workbench.auditLogs, (item) => item.createdAt).slice(0, 6) : []),
    [workbench]
  );

  const supplierRows = useMemo(() => {
    if (!workbench) return [];
    const supplierIds = new Set<string>();
    workbench.suppliers.forEach((item) => supplierIds.add(item.id));
    workbench.registrations.forEach((item) => supplierIds.add(item.supplierId));
    workbench.bids.forEach((item) => supplierIds.add(item.supplierId));

    return [...supplierIds].map((supplierId) => {
      const supplier = workbench.suppliers.find((item) => item.id === supplierId);
      const registration = workbench.registrations.find((item) => item.supplierId === supplierId);
      const bid = sortByNewest(
        workbench.bids.filter((item) => item.supplierId === supplierId),
        (item) => item.lockedAt ?? item.submittedAt
      )[0];
      const scoreSheet = sortByNewest(
        workbench.scoringSheets.filter((item) => item.supplierId === supplierId),
        (item) => item.lockedAt ?? item.submittedAt
      )[0];
      const comparisonRow = workbench.comparisonReport?.comparisonRows?.find((item) => item.supplierId === supplierId);
      return {
        supplierId,
        supplierName: supplier?.name ?? bid?.supplierName ?? supplierId,
        contact: [supplier?.contactName, supplier?.contactPhone].filter(Boolean).join(' / ') || supplier?.contactEmail || '-',
        qualification: supplier?.qualification || '-',
        registration,
        bid,
        scoreSheet,
        comparisonRow
      };
    });
  }, [workbench]);

  const exportArchiveChecklist = () => {
    if (!workbench) return;
    const content = [
      `项目编号：${workbench.project.code}`,
      `项目名称：${workbench.project.name}`,
      `业务阶段：${projectStageLabel(workbench.project)}`,
      `采购申请：${workbench.procurementRequest?.code ?? '-'}`,
      `采购文件：${activeProcurementDocuments.length} 份`,
      `公告邀请：${workbench.announcements.length} 条 / ${workbench.invitations.length} 条`,
      `报名与报价：${workbench.registrations.length} 家报名 / ${workbench.bids.length} 家报价`,
      `专家评审：${workbench.scoringSheets.length} 份评分 / ${workbench.reviewReports?.length ?? 0} 份报告`,
      `定标审批：${workbench.awardApprovals.length} 条`,
      `履约结算：${workbench.purchaseOrders.length} 张订单 / ${workbench.settlementMaterials.length} 份结算材料`,
      `档案完整度：${archivePercent}%`
    ].join('\n');
    downloadTextFile(`${workbench.project.code}-archive-checklist.txt`, content);
  };

  const runArchiveAction = async (key: string, action: () => Promise<unknown>, success: string) => {
    if (!currentUser || !resolvedProjectId || archiveAction) return;
    setArchiveAction(key);
    setArchiveActionMessage('');
    setArchiveActionError('');
    try {
      await action();
      setArchiveActionMessage(success);
      reload();
    } catch (archiveFailure) {
      setArchiveActionError(archiveFailure instanceof Error ? archiveFailure.message : '档案操作失败，请稍后重试。');
    } finally {
      setArchiveAction(null);
    }
  };

  const createArchiveSnapshot = () => runArchiveAction(
    'snapshot',
    () => apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId!)}/archive-snapshot`, {}, currentUser?.id),
    '档案快照已生成，归集清单已刷新。'
  );

  const checkArchiveCompleteness = async () => {
    if (!currentUser || !resolvedProjectId || archiveAction) return;
    setArchiveAction('check');
    setArchiveActionMessage('');
    setArchiveActionError('');
    try {
      const result = await apiPost<{ status: string; missingItems: Array<{ id: string; itemName: string }> }>(
        `/api/projects/${encodeURIComponent(resolvedProjectId)}/archive-check`,
        {},
        currentUser.id
      );
      setArchiveCheckResult(result);
      setArchiveActionMessage(result.missingItems.length ? `完整性检查完成，仍缺少 ${result.missingItems.length} 项必传档案。` : '完整性检查通过，已具备档案完整条件。');
      reload();
    } catch (archiveFailure) {
      setArchiveActionError(archiveFailure instanceof Error ? archiveFailure.message : '档案完整性检查失败。');
    } finally {
      setArchiveAction(null);
    }
  };

  const updateArchiveItem = (itemId: string, collectedFlag: boolean) => runArchiveAction(
    `item:${itemId}`,
    () => apiPost(`/api/project-workbench/archive-items/${encodeURIComponent(itemId)}/update`, { collectedFlag }, currentUser?.id),
    collectedFlag ? '档案项已标记为归集完成。' : '档案项已恢复为待归集。'
  );

  const sealArchive = () => {
    if (!window.confirm('确认封存当前项目档案吗？封存后业务记录不能直接修改。')) return;
    return runArchiveAction(
      'seal',
      () => apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId!)}/archive-seal`, {}, currentUser?.id),
      '项目档案已封存。'
    );
  };

  const runBidControlAction = async (action: 'cutoff' | 'lock') => {
    if (!currentUser || !workbench || !resolvedProjectId || bidAction) return;
    const submittedCount = workbench.bids.filter((bid) => bid.status === 'submitted').length;
    const draftCount = workbench.bids.filter((bid) => bid.status === 'draft').length;
    if (action === 'cutoff' && !cutoffReason.trim()) {
      setBidActionError('请先填写提前截标原因。');
      return;
    }
    const confirmed = window.confirm(
      action === 'cutoff'
        ? `确认提前截标吗？当前 ${submittedCount} 家已提交、${draftCount} 家仍为草稿。截标原因：${cutoffReason.trim()}。截标后供应商将无法继续提交或修改报价。`
        : `确认锁定 ${submittedCount} 家已提交报价吗？锁定后项目将进入专家评审阶段，报价不可再修改。`
    );
    if (!confirmed) return;

    setBidAction(action);
    setBidActionMessage('');
    setBidActionError('');
    try {
      if (action === 'cutoff') {
        await apiPost(
          `/api/projects/${encodeURIComponent(resolvedProjectId)}/bids/cutoff`,
          { action: 'early_cutoff', reason: cutoffReason.trim() },
          currentUser.id
        );
        setBidActionMessage('提前截标已完成。请核对报价数量后执行“锁定报价”。');
      } else {
        const result = await apiPost<{ lockedCount: number }>(
          `/api/projects/${encodeURIComponent(resolvedProjectId)}/bids/lock`,
          {},
          currentUser.id
        );
        setBidActionMessage(`已锁定 ${result.lockedCount} 家供应商报价，项目现可进入专家评审。`);
      }
      reload();
    } catch (actionError) {
      setBidActionError(actionError instanceof Error ? actionError.message : '截标操作失败，请稍后重试。');
    } finally {
      setBidAction(null);
    }
  };

  const runRegistrationReview = async (registrationId: string, status: 'qualified' | 'rejected') => {
    if (!currentUser || registrationReviewAction) return;

    const reason = status === 'qualified'
      ? '报名材料符合当前项目要求。'
      : window.prompt('请输入退回补正原因：', '报名材料需要补正后重新审核。')?.trim();
    if (status === 'rejected' && !reason) return;

    setRegistrationReviewAction({ registrationId, status });
    setRegistrationReviewMessage('');
    setRegistrationReviewError('');
    try {
      await apiPost(
        `/api/registrations/${encodeURIComponent(registrationId)}/qualify`,
        { status, reason },
        currentUser.id
      );
      setRegistrationReviewMessage(status === 'qualified' ? '供应商资格审核已通过。' : '报名资料已退回补正。');
      reload();
    } catch (actionError) {
      setRegistrationReviewError(actionError instanceof Error ? actionError.message : '资格审核失败，请稍后重试。');
    } finally {
      setRegistrationReviewAction(null);
    }
  };

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">项目工作台加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的项目。</div>;
  }

  const request = workbench.procurementRequest;
  const stageLabel = projectStageLabel(workbench.project);
  const hasOrder = workbench.purchaseOrders.length > 0;
  const nextAction = projectNextAction(workbench.project.status, hasOrder);
  const recommendedSupplierId = workbench.comparisonReport?.recommendedSupplierId ?? latestAward?.selectedSupplierId;
  const recommendedSupplierName = resolveSupplierName(workbench, recommendedSupplierId);
  const canMaintainBidControl = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
  const canReviewRegistrations = ['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
  const submittedBidCount = workbench.bids.filter((bid) => bid.status === 'submitted').length;
  const draftBidCount = workbench.bids.filter((bid) => bid.status === 'draft').length;
  const lockedBidCount = workbench.bids.filter((bid) => bid.status === 'locked').length;
  const beforeDeadline = Boolean(workbench.project.beforeDeadline);
  const biddingOpen = workbench.project.status === 'bidding_open';
  const biddingLocked = [
    'bidding_locked',
    'expert_reviewing',
    'review_report_frozen',
    'award_approving',
    'awarded_pending_order',
    'result_notified',
    'contract_registered',
    'performing',
    'evaluated',
    'archived'
  ].includes(workbench.project.status);

  return (
    <div className="space-y-6">
      <button
        onClick={() => setCurrentView('PROJECTS')}
        className="flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        返回列表
      </button>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{workbench.project.name}</h1>
              <Badge variant={statusBadgeVariant(workbench.project.status)}>{stageLabel}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">{workbench.project.code}</span>
              <span>申请单号: {request?.code ?? '-'}</span>
              <span>组织: {workbench.project.orgName ?? '-'}</span>
              <span>经办: {workbench.project.buyer}</span>
              <span>方式: {workbench.project.type}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={exportArchiveChecklist}>
              导出档案清单
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCurrentProjectId(resolvedProjectId);
                setCurrentView(nextAction.view);
              }}
            >
              {nextAction.label}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
            <div className="mb-1 text-xs text-slate-500">当前业务阶段</div>
            <div className="flex items-center gap-2 text-lg font-semibold text-blue-700">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              {stageLabel}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
            <div className="mb-1 text-xs text-slate-500">报价截止</div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Clock className="h-4 w-4 text-slate-400" />
              {formatDateTime(workbench.project.quoteDeadlineAt)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
            <div className="mb-1 text-xs text-slate-500">中标供应商</div>
            <div className="text-sm font-medium text-slate-900">{recommendedSupplierName}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
            <div className="mb-1 text-xs text-slate-500">档案完整度</div>
            <div className="text-sm font-medium text-emerald-600">{archivePercent}%</div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex overflow-x-auto border-b border-slate-200 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[420px] p-6">
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-4 text-base font-medium text-slate-900">申请基本信息</div>
                      <div className="grid gap-4 text-sm md:grid-cols-2">
                        <div>
                          <div className="text-slate-500">采购标题</div>
                          <div className="mt-1 font-medium text-slate-900">{request?.title ?? workbench.project.name}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">提报部门</div>
                          <div className="mt-1 font-medium text-slate-900">{request?.requestDepartment ?? workbench.project.requestDepartment ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">申请人</div>
                          <div className="mt-1 font-medium text-slate-900">{request?.requesterName ?? workbench.project.requesterName ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">预算金额</div>
                          <div className="mt-1 font-medium text-rose-600">{formatCurrency(request?.budgetAmount ?? workbench.project.budgetAmount)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">需求日期</div>
                          <div className="mt-1 font-medium text-slate-900">{formatDateTime(request?.expectedArrivalAt ?? workbench.project.expectedArrivalAt, false)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">收货地点</div>
                          <div className="mt-1 font-medium text-slate-900">{request?.receivingLocation ?? workbench.project.receivingLocation ?? '-'}</div>
                        </div>
                      </div>
                      {request?.purpose ? (
                        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{request.purpose}</div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-4 text-base font-medium text-slate-900">项目推进摘要</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          { label: '采购文件', value: `${activeProcurementDocuments.length} 份` },
                          { label: '公告邀请', value: `${workbench.announcements.length} 条 / ${workbench.invitations.length} 家` },
                          { label: '供应商报名', value: `${workbench.registrations.length} 家` },
                          { label: '有效报价', value: `${workbench.bids.length} 家` },
                          { label: '专家评分', value: `${workbench.scoringSheets.length} 份` },
                          { label: '采购订单', value: `${workbench.purchaseOrders.length} 张` }
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                            <div className="text-xs text-slate-500">{item.label}</div>
                            <div className="mt-2 text-lg font-semibold text-slate-900">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-5">
                    <div className="mb-4 text-base font-medium text-slate-900">采购物资明细</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-3">物资名称</th>
                            <th className="px-4 py-3">规格 / 型号</th>
                            <th className="px-4 py-3">数量</th>
                            <th className="px-4 py-3">单位</th>
                            <th className="px-4 py-3">预算单价</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(request?.lineItems ?? []).map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-medium text-slate-900">{item.itemName}</td>
                              <td className="px-4 py-3 text-slate-600">{item.specification}</td>
                              <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                              <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                              <td className="px-4 py-3 text-slate-600">{formatCurrency(item.estimatedUnitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'DOCUMENT' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-900">采购文件与公告记录</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentProjectId(resolvedProjectId);
                        setCurrentView('PROCUREMENT_DOCUMENT');
                      }}
                    >
                      处理采购文件
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {activeProcurementDocuments.map((document) => (
                      <div key={document.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-slate-900">{document.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {document.id} · V{document.versionNo} · 更新时间 {formatDateTime(document.updatedAt)}
                            </div>
                            {document.contentSummary ? <div className="mt-3 text-sm text-slate-700">{document.contentSummary}</div> : null}
                          </div>
                          <Badge variant={statusBadgeVariant(document.status)}>{humanizeStatus(document.status)}</Badge>
                        </div>
                      </div>
                    ))}

                    {workbench.announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-slate-900">{announcement.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {announcement.id} · 公告状态 {humanizeStatus(announcement.status)} · 发布于 {formatDateTime(announcement.publishedAt ?? announcement.updatedAt)}
                            </div>
                            <div className="mt-3 text-sm text-slate-700">
                              报名截止 {formatDateTime(announcement.registrationDeadlineAt)}，报价截止 {formatDateTime(announcement.quoteDeadlineAt)}
                            </div>
                          </div>
                          <Badge variant={statusBadgeVariant(announcement.status)}>{humanizeStatus(announcement.status)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'BIDDING' && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <LockKeyhole className="h-5 w-5 text-[#006666]" />
                          <h3 className="font-medium text-slate-900">截标与报价锁定</h3>
                          <Badge variant={biddingLocked ? 'success' : beforeDeadline ? 'warning' : 'info'}>
                            {biddingLocked ? '已完成锁定' : beforeDeadline ? '报价期内' : '待锁定'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {biddingLocked
                            ? `当前已锁定 ${lockedBidCount} 家供应商报价，可以进入专家评审。`
                            : beforeDeadline
                              ? `报价截止时间为 ${formatDateTime(workbench.project.quoteDeadlineAt)}。截止前报价内容保持保密。`
                              : submittedBidCount > 0
                                ? `报价已截止，当前有 ${submittedBidCount} 家供应商报价待采购方统一锁定。`
                                : '报价已截止，当前没有可锁定的已提交报价。'}
                        </p>
                        {canMaintainBidControl && biddingOpen && beforeDeadline ? (
                          <label className="mt-4 block max-w-xl text-sm text-slate-700">
                            提前截标原因
                            <input
                              value={cutoffReason}
                              onChange={(event) => setCutoffReason(event.target.value)}
                              placeholder={`请填写业务原因；当前另有 ${draftBidCount} 家草稿报价`}
                              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/20"
                            />
                          </label>
                        ) : null}
                      </div>

                      {canMaintainBidControl && biddingOpen ? (
                        <div className="flex shrink-0 flex-wrap gap-3">
                          <Button
                            variant="outline"
                            disabled={!beforeDeadline || submittedBidCount === 0 || !cutoffReason.trim() || bidAction !== null}
                            title={
                              submittedBidCount === 0
                                ? '至少需要一份已提交报价'
                                : !cutoffReason.trim()
                                  ? '请先填写提前截标原因'
                                  : beforeDeadline
                                    ? '将报价截止时间调整为当前时间'
                                    : '报价已经截止'
                            }
                            onClick={() => void runBidControlAction('cutoff')}
                          >
                            <Scissors className="mr-2 h-4 w-4" />
                            {bidAction === 'cutoff' ? '截标处理中...' : '提前截标'}
                          </Button>
                          <Button
                            variant="brand"
                            disabled={beforeDeadline || submittedBidCount === 0 || bidAction !== null}
                            title={beforeDeadline ? '请等待报价截止，或先执行提前截标' : submittedBidCount === 0 ? '没有可锁定的已提交报价' : '锁定全部已提交报价'}
                            onClick={() => void runBidControlAction('lock')}
                          >
                            <LockKeyhole className="mr-2 h-4 w-4" />
                            {bidAction === 'lock' ? '锁定处理中...' : '锁定报价'}
                          </Button>
                        </div>
                      ) : biddingLocked ? (
                        <Button
                          variant="brand"
                          onClick={() => {
                            setCurrentProjectId(resolvedProjectId);
                            setCurrentView('REVIEW_AWARD');
                          }}
                        >
                          进入专家评审
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="text-sm text-slate-500">当前角色仅可查看报价进度。</div>
                      )}
                    </div>

                    {bidActionMessage ? (
                      <div className="mt-4 flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{bidActionMessage}</span>
                      </div>
                    ) : null}
                    {bidActionError ? (
                      <div className="mt-4 flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{bidActionError}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">已邀请供应商</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{workbench.invitations.length} 家</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">资格通过</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">
                        {workbench.registrations.filter((item) => item.status === 'qualified').length} 家
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">已提交报价</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{submittedBidCount} 家</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">已锁定报价</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{lockedBidCount} 家</div>
                    </div>
                  </div>

                  {registrationReviewMessage ? (
                    <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{registrationReviewMessage}</span>
                    </div>
                  ) : null}
                  {registrationReviewError ? (
                    <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{registrationReviewError}</span>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">供应商</th>
                          <th className="px-4 py-3">联系方式</th>
                          <th className="px-4 py-3">报名状态</th>
                          <th className="px-4 py-3">报价状态</th>
                          <th className="px-4 py-3">报价金额</th>
                          <th className="px-4 py-3">最终得分</th>
                          <th className="px-4 py-3">排名</th>
                          {canReviewRegistrations ? <th className="px-4 py-3">资格审核</th> : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplierRows.map((row) => (
                          <tr key={row.supplierId}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{row.supplierName}</div>
                              <div className="mt-1 text-xs text-slate-500">{row.qualification}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.contact}</td>
                            <td className="px-4 py-3">
                              <Badge variant={statusBadgeVariant(row.registration?.status)}>{humanizeStatus(row.registration?.status)}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={statusBadgeVariant(row.bid?.status)}>{humanizeStatus(row.bid?.status)}</Badge>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(row.bid?.amount)}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {typeof row.comparisonRow?.finalScore === 'number'
                                ? row.comparisonRow.finalScore.toFixed(1)
                                : typeof row.scoreSheet?.total === 'number'
                                  ? row.scoreSheet.total.toFixed(1)
                                  : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.comparisonRow?.rank ?? '-'}</td>
                            {canReviewRegistrations ? (
                              <td className="px-4 py-3">
                                {row.registration?.status === 'submitted' ? (
                                  <div className="flex min-w-max gap-2">
                                    <Button
                                      size="sm"
                                      variant="brand"
                                      disabled={registrationReviewAction !== null}
                                      onClick={() => void runRegistrationReview(row.registration!.id, 'qualified')}
                                    >
                                      <CheckCircle2 className="mr-1 h-4 w-4" />
                                      {registrationReviewAction?.registrationId === row.registration.id && registrationReviewAction.status === 'qualified'
                                        ? '审核中...'
                                        : '资格通过'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={registrationReviewAction !== null}
                                      onClick={() => void runRegistrationReview(row.registration!.id, 'rejected')}
                                    >
                                      <ShieldAlert className="mr-1 h-4 w-4" />
                                      {registrationReviewAction?.registrationId === row.registration.id && registrationReviewAction.status === 'rejected'
                                        ? '处理中...'
                                        : '退回补正'}
                                    </Button>
                                  </div>
                                ) : row.registration ? (
                                  <span className="text-slate-500" title={row.registration.qualificationReason}>已处理</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'REVIEW' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">评分表</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{workbench.scoringSheets.length} 份</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">比价报告</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{workbench.comparisonReport?.reportNo ?? '-'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">推荐供应商</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{recommendedSupplierName}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">供应商</th>
                          <th className="px-4 py-3">专家</th>
                          <th className="px-4 py-3">技术</th>
                          <th className="px-4 py-3">服务</th>
                          <th className="px-4 py-3">价格</th>
                          <th className="px-4 py-3">总分</th>
                          <th className="px-4 py-3">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workbench.scoringSheets.map((sheet) => (
                          <tr key={sheet.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{sheet.supplierName ?? resolveSupplierName(workbench, sheet.supplierId)}</td>
                            <td className="px-4 py-3 text-slate-600">{sheet.expertName ?? sheet.expertId}</td>
                            <td className="px-4 py-3 text-slate-600">{sheet.technical}</td>
                            <td className="px-4 py-3 text-slate-600">{sheet.service}</td>
                            <td className="px-4 py-3 text-slate-600">{sheet.price}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{sheet.total}</td>
                            <td className="px-4 py-3">
                              <Badge variant={statusBadgeVariant(sheet.status)}>{humanizeStatus(sheet.status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'AWARD' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-900">定标审批与执行结果</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentProjectId(resolvedProjectId);
                        setCurrentView('AWARD_APPROVE');
                      }}
                    >
                      查看定标审批
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-2 text-sm text-slate-500">最终中标供应商</div>
                      <div className="text-xl font-semibold text-slate-900">{resolveSupplierName(workbench, latestAward?.selectedSupplierId)}</div>
                      <div className="mt-3 text-sm text-slate-600">
                        审批状态：{humanizeStatus(latestAward?.approvalStatus)}，审批时间 {formatDateTime(latestAward?.approvedAt ?? latestAward?.submittedAt)}
                      </div>
                      {latestAward?.nonLowestPriceReason ? (
                        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{latestAward.nonLowestPriceReason}</div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-2 text-sm text-slate-500">执行落地</div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div>价目报告：{latestPricingReport?.reportNo ?? '-'}</div>
                        <div>采购订单：{latestOrder?.orderNo ?? '-'}</div>
                        <div>订单状态：{humanizeStatus(latestOrder?.status)}</div>
                        <div>订单金额：{formatCurrency(latestOrder?.totalAmount)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">审批编号</th>
                          <th className="px-4 py-3">推荐供应商</th>
                          <th className="px-4 py-3">最终定标</th>
                          <th className="px-4 py-3">审批状态</th>
                          <th className="px-4 py-3">审批时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workbench.awardApprovals.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{item.id}</td>
                            <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, item.recommendedSupplierId)}</td>
                            <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, item.selectedSupplierId)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={statusBadgeVariant(item.approvalStatus)}>{humanizeStatus(item.approvalStatus)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatDateTime(item.approvedAt ?? item.submittedAt ?? item.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'ARCHIVE' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <div className="font-medium text-slate-900">档案完整度 {archivePercent}%</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {archiveSealed ? '当前项目档案已封存。' : `必传档案待归集 ${workbench.archiveItems.filter((item) => item.requiredFlag && !item.collectedFlag).length} 项。`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canMaintainArchive && !archiveSealed ? (
                        <Button size="sm" variant="outline" disabled={Boolean(archiveAction)} onClick={() => void createArchiveSnapshot()}>
                          <Archive className="mr-1 h-4 w-4" />
                          {archiveAction === 'snapshot' ? '生成中...' : '生成档案快照'}
                        </Button>
                      ) : null}
                      {canCheckArchive ? (
                        <Button size="sm" variant="outline" disabled={Boolean(archiveAction)} onClick={() => void checkArchiveCompleteness()}>
                          <ListChecks className="mr-1 h-4 w-4" />
                          {archiveAction === 'check' ? '检查中...' : '完整性检查'}
                        </Button>
                      ) : null}
                      {canMaintainArchive && !archiveSealed ? (
                        <Button size="sm" variant="brand" disabled={Boolean(archiveAction) || archivePercent < 100} onClick={() => void sealArchive()}>
                          <PackageCheck className="mr-1 h-4 w-4" />
                          {archiveAction === 'seal' ? '封存中...' : '封存档案'}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {archiveActionMessage || archiveActionError ? (
                    <div className={`rounded-md border px-4 py-3 text-sm ${archiveActionError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">
                      {archiveActionError || archiveActionMessage}
                    </div>
                  ) : null}

                  {archiveCheckResult?.missingItems.length ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="font-medium">本次检查缺少：{archiveCheckResult.missingItems.map((item) => item.itemName).join('、')}</div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-4 text-base font-medium text-slate-900">档案归集清单</div>
                      <div className="space-y-3">
                        {workbench.archiveItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                            <div>
                              <div className="font-medium text-slate-900">{item.itemName}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.requiredFlag ? '必传档案' : '选传档案'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={item.collectedFlag ? 'success' : 'warning'}>{item.collectedFlag ? '已归集' : humanizeStatus(item.status)}</Badge>
                              {canMaintainArchive && !archiveSealed ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={Boolean(archiveAction)}
                                  onClick={() => void updateArchiveItem(item.id, !item.collectedFlag)}
                                >
                                  {archiveAction === `item:${item.id}` ? '保存中...' : item.collectedFlag ? '撤销' : '标记归集'}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-4 text-base font-medium text-slate-900">最近业务日志</div>
                      <div className="space-y-3">
                        {recentAuditLogs.map((item) => (
                          <div key={item.id} className="rounded-lg bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="font-medium text-slate-900">{item.action}</div>
                              <Badge variant={item.result === 'recorded' ? 'success' : 'danger'}>{item.result === 'recorded' ? '已记录' : '已拦截'}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
                            {item.reason ? <div className="mt-2 text-sm text-slate-700">{item.reason}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0 space-y-6">
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-slate-500" />
                审计跟踪与风险
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded border border-slate-200 bg-white p-3 text-sm">
                <span className="mb-1 block text-xs text-slate-500">合规校验</span>
                <span className="flex items-center font-medium text-emerald-600">
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  流程节点已落地真实记录
                </span>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 text-sm">
                <span className="mb-1 block text-xs text-slate-500">关键业务记录</span>
                <div className="space-y-2 text-slate-700">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    采购文件 {activeProcurementDocuments.length} 份
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    报名供应商 {workbench.registrations.length} 家
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-slate-400" />
                    定标审批 {workbench.awardApprovals.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-400" />
                    采购订单 {workbench.purchaseOrders.length} 张
                  </div>
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-slate-400" />
                    档案归集 {archivePercent}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
