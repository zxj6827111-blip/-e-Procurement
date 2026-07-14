import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardCheck, FileCheck, RefreshCw, Send, UserPlus, Users } from 'lucide-react';
import { apiGet, apiPost } from '../../../api/http';
import type { Assignment, Expert, ReviewRecordDetail, ReviewReport } from '../../../pages/expert-review/types';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { formatDateTime, humanizeStatus, projectStageLabel, statusBadgeVariant, useProjectWorkbenchData } from './project-workbench-data';

type ReviewAction = 'draw' | 'appoint' | 'comparison' | 'comparison-freeze' | 'report' | 'freeze';

function assignmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    assigned: '待专家确认',
    confirmed: '已确认参加',
    scoring: '评分中',
    completed: '已完成',
    replaced: '已替换'
  };
  return labels[status] ?? humanizeStatus(status);
}

function isDrawableExpert(expert: Expert) {
  return expert.active !== false && (expert.accountUserIds?.length ?? 0) > 0 && (expert.status.includes('可') || expert.status === 'available');
}

export function ReviewAwardView() {
  const { currentProjectId, currentUser, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reviewDetail, setReviewDetail] = useState<ReviewRecordDetail | null>(null);
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('按采购项目品类、专业范围和回避规则组织评审');
  const [drawCount, setDrawCount] = useState(1);
  const [reportNote, setReportNote] = useState('专家评分完成后，系统汇总供应商得分、排名与评审意见。');
  const [busyAction, setBusyAction] = useState<ReviewAction | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) setCurrentProjectId(resolvedProjectId);
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  useEffect(() => {
    const userId = currentUser?.id ?? '';
    const projectId = resolvedProjectId ?? '';
    if (!userId || !projectId) return;
    let active = true;

    async function loadReviewData() {
      setReviewLoading(true);
      setActionError('');
      try {
        const [expertData, assignmentData, reportData, detailData] = await Promise.all([
          apiGet<{ experts: Expert[] }>('/api/experts', userId),
          apiGet<{ assignments: Assignment[] }>(
            `/api/projects/${encodeURIComponent(projectId)}/expert-assignments`,
            userId
          ),
          apiGet<{ reports: ReviewReport[] }>(
            `/api/projects/${encodeURIComponent(projectId)}/review-report`,
            userId
          ),
          apiGet<{ detail: ReviewRecordDetail }>(
            `/api/projects/${encodeURIComponent(projectId)}/review-record-detail`,
            userId
          )
        ]);
        if (!active) return;
        setExperts(expertData.experts ?? []);
        setAssignments(assignmentData.assignments ?? []);
        setReports(reportData.reports ?? []);
        setReviewDetail(detailData.detail);
      } catch (loadError) {
        if (!active) return;
        setActionError(loadError instanceof Error ? loadError.message : '专家评审数据加载失败。');
      } finally {
        if (active) setReviewLoading(false);
      }
    }

    void loadReviewData();
    return () => {
      active = false;
    };
  }, [currentUser?.id, resolvedProjectId, refreshToken]);

  const assignedExpertIds = useMemo(() => new Set(assignments.filter((item) => item.status !== 'replaced').map((item) => item.expertId)), [assignments]);
  const availableExperts = useMemo(
    () => experts.filter((expert) => isDrawableExpert(expert) && !assignedExpertIds.has(expert.id)),
    [assignedExpertIds, experts]
  );
  const availableExpertKey = availableExperts.map((expert) => expert.id).join('|');

  useEffect(() => {
    if (!availableExperts.some((expert) => expert.id === selectedExpertId)) {
      setSelectedExpertId(availableExperts[0]?.id ?? '');
    }
  }, [availableExpertKey, selectedExpertId]);

  async function runReviewAction(action: ReviewAction, request: () => Promise<unknown>, successMessage: string) {
    if (busyAction) return;
    setBusyAction(action);
    setActionMessage('');
    setActionError('');
    try {
      await request();
      setActionMessage(successMessage);
      setRefreshToken((value) => value + 1);
      reload();
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : '专家评审操作失败。');
    } finally {
      setBusyAction(null);
    }
  }

  async function drawExperts() {
    if (!currentUser || !resolvedProjectId || !assignmentReason.trim() || drawCount < 1) return;
    if (availableExperts.length < drawCount) {
      setActionError(`当前仅有 ${availableExperts.length} 名可抽取专家，请调整抽取人数。`);
      return;
    }
    await runReviewAction(
      'draw',
      async () => {
        const result = await apiPost<{ assignments: Assignment[] }>(
          `/api/projects/${encodeURIComponent(resolvedProjectId)}/expert-assignments/draw`,
          { count: drawCount, reason: assignmentReason.trim(), reviewScopes: ['技术评审'] },
          currentUser.id
        );
        if (!result.assignments.length) throw new Error('没有符合当前项目品类和回避条件的可抽取专家。');
      },
      `已抽取 ${drawCount} 名专家，等待专家确认回避、纪律与保密要求。`
    );
  }

  async function appointExpert() {
    if (!currentUser || !resolvedProjectId || !selectedExpertId || !assignmentReason.trim()) return;
    await runReviewAction(
      'appoint',
      () =>
        apiPost(
          `/api/projects/${encodeURIComponent(resolvedProjectId)}/expert-assignments/appoint`,
          { expertId: selectedExpertId, reason: assignmentReason.trim() },
          currentUser.id
        ),
      '专家已指定，等待专家确认回避、纪律与保密要求。'
    );
  }

  async function generateReviewReport() {
    if (!currentUser || !resolvedProjectId) return;
    await runReviewAction(
      'report',
      () => apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId)}/review-report`, { note: reportNote.trim() }, currentUser.id),
      '评审报告已生成，请核对汇总结果后执行冻结。'
    );
  }

  async function generateComparisonReport() {
    if (!currentUser || !resolvedProjectId) return;
    await runReviewAction(
      'comparison',
      () => apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId)}/comparison-report`, {}, currentUser.id),
      '比价报告已生成，请核对报价排名后冻结。'
    );
  }

  async function freezeComparisonReport() {
    if (!currentUser || !resolvedProjectId) return;
    if (!window.confirm('确认冻结比价报告吗？冻结后将作为定标审批的正式比价依据。')) return;
    await runReviewAction(
      'comparison-freeze',
      () => apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId)}/comparison-report/freeze`, {}, currentUser.id),
      '比价报告已冻结，可以继续完成专家评审。'
    );
  }

  async function freezeReviewReport() {
    if (!currentUser || !resolvedProjectId) return;
    if (!window.confirm('确认冻结评审报告吗？冻结后专家分配和评分结果将不能再修改。')) return;
    await runReviewAction(
      'freeze',
      () => apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId)}/review-report/freeze`, {}, currentUser.id),
      '评审报告已冻结，可以进入定标审批。'
    );
  }

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">专家评审数据加载中...</div>;
  }
  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }
  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可评审的采购项目。</div>;
  }

  const canMaintainReview = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
  const assignmentStageOpen = ['bidding_locked', 'expert_reviewing'].includes(workbench.project.status);
  const reviewReadable = ['bidding_locked', 'expert_reviewing', 'review_report_frozen', 'award_approving', 'awarded_pending_order', 'result_notified'].includes(
    workbench.project.status
  );
  const activeAssignments = assignments.filter((item) => item.status !== 'replaced');
  const submittedSheets = workbench.scoringSheets.filter((sheet) => ['submitted_locked', 'resubmitted_locked'].includes(sheet.status));
  const lockedBidCount = workbench.bids.filter((bid) => bid.status === 'locked').length;
  const comparisonReport = workbench.comparisonReport;
  const recommendedSupplierName = workbench.suppliers.find((supplier) => supplier.id === comparisonReport?.recommendedSupplierId)?.name;
  const allSubmitted = Boolean(reviewDetail?.summary.allSubmitted && reviewDetail.summary.totalExpertCount > 0);
  const generatedReport = reports.find((report) => report.status === 'generated') ?? null;
  const frozenReport = reports.find((report) => report.status === 'frozen') ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            onClick={() => setCurrentView('QUOTE_PROGRESS')}
            className="mb-3 inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回报价进度
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Users className="h-6 w-6 text-[#006666]" />
            专家评审
          </h1>
          <p className="mt-1 text-sm text-slate-500">{workbench.project.code} / {workbench.project.name}</p>
        </div>
        <Badge variant={statusBadgeVariant(workbench.project.status)}>{projectStageLabel(workbench.project)}</Badge>
      </div>

      {!reviewReadable ? (
        <div className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-medium">报价尚未完成采购方锁定</div>
              <div className="mt-1 text-sm">请先返回报价进度，完成报价截止和统一锁定后再组织专家评审。</div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setCurrentView('QUOTE_PROGRESS')}>返回报价进度</Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '已锁定报价', value: workbench.bids.filter((bid) => bid.status === 'locked').length, unit: '家' },
          { label: '已分配专家', value: activeAssignments.length, unit: '名' },
          { label: '已提交评分', value: submittedSheets.length, unit: '份' },
          { label: '评审报告', value: frozenReport ? '已冻结' : generatedReport ? '待冻结' : '未生成', unit: '' }
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">{item.value}{item.unit}</div>
          </div>
        ))}
      </div>

      {actionMessage ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      ) : null}
      {actionError ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-slate-900">比价报告</h2>
              <p className="mt-1 text-sm text-slate-500">汇总已锁定报价的价格、交付周期和评分结果，作为后续评审与定标依据。</p>
              {comparisonReport ? (
                <div className="mt-3 text-sm text-slate-600">
                  {comparisonReport.reportNo} · 推荐供应商：{recommendedSupplierName ?? comparisonReport.recommendedSupplierId}
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">尚未生成比价报告。</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {comparisonReport ? <Badge variant={statusBadgeVariant(comparisonReport.status)}>{humanizeStatus(comparisonReport.status)}</Badge> : null}
              {canMaintainReview && assignmentStageOpen && !comparisonReport ? (
                <Button
                  variant="outline"
                  data-ui-check="comparison-report-generate"
                  disabled={lockedBidCount === 0 || busyAction !== null}
                  onClick={() => void generateComparisonReport()}
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  {busyAction === 'comparison' ? '生成中...' : '生成比价报告'}
                </Button>
              ) : null}
              {canMaintainReview && assignmentStageOpen && comparisonReport?.status === 'generated' ? (
                <Button
                  variant="brand"
                  data-ui-check="comparison-report-freeze"
                  disabled={busyAction !== null}
                  onClick={() => void freezeComparisonReport()}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {busyAction === 'comparison-freeze' ? '冻结中...' : '冻结比价报告'}
                </Button>
              ) : null}
            </div>
          </div>

          {comparisonReport?.comparisonRows?.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">排名</th>
                    <th className="px-4 py-3">供应商</th>
                    <th className="px-4 py-3">报价金额</th>
                    <th className="px-4 py-3">交付周期</th>
                    <th className="px-4 py-3">综合得分</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonReport.comparisonRows.map((row) => (
                    <tr key={row.supplierId}>
                      <td className="px-4 py-3">第 {row.rank} 名</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.supplierName}</td>
                      <td className="px-4 py-3">{row.amount.toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-3">{row.deliveryDays} 天</td>
                      <td className="px-4 py-3">{row.finalScore ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-slate-900">专家指派与确认</h2>
              <p className="mt-1 text-sm text-slate-500">专家确认回避、纪律和保密要求后，系统开放对应供应商评分表。</p>
            </div>
            {reviewLoading ? <RefreshCw className="h-5 w-5 animate-spin text-slate-400" /> : null}
          </div>

          {canMaintainReview && assignmentStageOpen ? (
            <div className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_130px_260px_auto] lg:items-end">
              <label className="text-sm text-slate-700">
                指派理由
                <input
                  value={assignmentReason}
                  onChange={(event) => setAssignmentReason(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="text-sm text-slate-700">
                抽取人数
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, availableExperts.length)}
                  value={drawCount}
                  onChange={(event) => setDrawCount(Math.max(1, Number(event.target.value) || 1))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                />
              </label>
              <label className="text-sm text-slate-700">
                指定专家
                <select
                  value={selectedExpertId}
                  onChange={(event) => setSelectedExpertId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                >
                  <option value="">暂无可指定专家</option>
                  {availableExperts.map((expert) => <option key={expert.id} value={expert.id}>{expert.name} / {expert.category}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!assignmentReason.trim() || availableExperts.length < drawCount || busyAction !== null}
                  onClick={() => void drawExperts()}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {busyAction === 'draw' ? '抽取中...' : '抽取专家'}
                </Button>
                <Button
                  variant="brand"
                  disabled={!selectedExpertId || !assignmentReason.trim() || busyAction !== null}
                  onClick={() => void appointExpert()}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {busyAction === 'appoint' ? '指派中...' : '指定专家'}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">专家</th>
                  <th className="px-4 py-3">产生方式</th>
                  <th className="px-4 py-3">回避确认</th>
                  <th className="px-4 py-3">纪律确认</th>
                  <th className="px-4 py-3">保密确认</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{assignment.expertName ?? assignment.expertId}</td>
                    <td className="px-4 py-3 text-slate-600">{assignment.method === 'appointed' ? '人工指定' : '规则抽取'}</td>
                    <td className="px-4 py-3">{assignment.avoidanceConfirmed ? '已确认' : '待确认'}</td>
                    <td className="px-4 py-3">{assignment.disciplineConfirmed ? '已确认' : '待确认'}</td>
                    <td className="px-4 py-3">{assignment.confidentialityConfirmed ? '已确认' : '待确认'}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadgeVariant(assignment.status)}>{assignmentStatusLabel(assignment.status)}</Badge></td>
                  </tr>
                ))}
                {!activeAssignments.length ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">当前项目尚未指派专家。</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-5 text-lg font-medium text-slate-900">评分进度与供应商排名</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">供应商</th>
                  <th className="px-4 py-3">专家</th>
                  <th className="px-4 py-3">技术分</th>
                  <th className="px-4 py-3">商务分</th>
                  <th className="px-4 py-3">价格分</th>
                  <th className="px-4 py-3">总分</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workbench.scoringSheets.map((sheet) => (
                  <tr key={sheet.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{sheet.supplierName ?? sheet.supplierId}</td>
                    <td className="px-4 py-3 text-slate-600">{sheet.expertName ?? sheet.expertId}</td>
                    <td className="px-4 py-3">{sheet.technical}</td>
                    <td className="px-4 py-3">{sheet.service}</td>
                    <td className="px-4 py-3">{sheet.price}</td>
                    <td className="px-4 py-3 font-semibold">{sheet.total}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadgeVariant(sheet.status)}>{humanizeStatus(sheet.status)}</Badge></td>
                  </tr>
                ))}
                {!workbench.scoringSheets.length ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">专家完成确认后将生成评分任务。</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {reviewDetail?.supplierRecords.length ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviewDetail.supplierRecords.map((supplier) => (
                <div key={supplier.supplierId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">第 {supplier.rank} 名 · {supplier.supplierName}</div>
                  <div className="mt-2 text-sm text-slate-600">总分 {supplier.total}，已提交 {supplier.submittedCount} 份评分</div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
                <ClipboardCheck className="h-5 w-5 text-[#006666]" />
                评审报告
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                专家提交进度：{reviewDetail?.summary.submittedExpertCount ?? 0}/{reviewDetail?.summary.totalExpertCount ?? 0}
              </p>
              {canMaintainReview && !frozenReport ? (
                <label className="mt-4 block text-sm text-slate-700">
                  报告说明
                  <input
                    value={reportNote}
                    onChange={(event) => setReportNote(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                  />
                </label>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {canMaintainReview && !frozenReport ? (
                <>
                  <Button
                    variant="outline"
                    disabled={!allSubmitted || Boolean(generatedReport) || busyAction !== null}
                    title={allSubmitted ? '生成评审报告' : '等待全部专家提交并锁定评分'}
                    onClick={() => void generateReviewReport()}
                  >
                    <FileCheck className="mr-2 h-4 w-4" />
                    {busyAction === 'report' ? '生成中...' : '生成评审报告'}
                  </Button>
                  <Button
                    variant="brand"
                    disabled={!generatedReport || busyAction !== null}
                    title={generatedReport ? '冻结后进入定标审批' : '请先生成评审报告'}
                    onClick={() => void freezeReviewReport()}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {busyAction === 'freeze' ? '冻结中...' : '冻结评审报告'}
                  </Button>
                </>
              ) : null}
              {frozenReport ? (
                <Button
                  variant="brand"
                  onClick={() => {
                    setCurrentProjectId(resolvedProjectId);
                    setCurrentView('AWARD_APPROVE');
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  进入定标审批
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-900">{report.reportNo}</div>
                  <div className="mt-1 text-xs text-slate-500">生成：{formatDateTime(report.generatedAt)} · 冻结：{formatDateTime(report.frozenAt)}</div>
                </div>
                <Badge variant={statusBadgeVariant(report.status)}>{humanizeStatus(report.status)}</Badge>
              </div>
            ))}
            {!reports.length ? <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">尚未生成评审报告。</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
