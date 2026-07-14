import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { ArrowLeft, Archive, CheckCircle2, Clock, FileText, ShieldAlert, Trophy, Truck, Users } from 'lucide-react';
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

function stageNextView(status: string, hasOrder: boolean) {
  if (hasOrder || ['contract_registered', 'performing', 'evaluated', 'archived'].includes(status)) {
    return 'PROJECT_FULFILLMENT' as const;
  }
  return 'PROJECT_SOURCING' as const;
}

interface ProjectDetailViewProps {
  initialTab?: ProjectDetailTab;
}

export function ProjectDetailView({ initialTab = 'OVERVIEW' }: ProjectDetailViewProps) {
  const { currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error } = useProjectWorkbenchData(currentProjectId);
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>(initialTab);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const archivePercent = calculateArchiveCompleteness(workbench);

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
      `采购文件：${workbench.procurementDocuments.length} 份`,
      `公告邀请：${workbench.announcements.length} 条 / ${workbench.invitations.length} 条`,
      `报名与报价：${workbench.registrations.length} 家报名 / ${workbench.bids.length} 家报价`,
      `专家评审：${workbench.scoringSheets.length} 份评分 / ${workbench.reviewReports?.length ?? 0} 份报告`,
      `定标审批：${workbench.awardApprovals.length} 条`,
      `履约结算：${workbench.purchaseOrders.length} 张订单 / ${workbench.settlementMaterials.length} 份结算材料`,
      `档案完整度：${archivePercent}%`
    ].join('\n');
    downloadTextFile(`${workbench.project.code}-archive-checklist.txt`, content);
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
  const nextView = stageNextView(workbench.project.status, hasOrder);
  const recommendedSupplierId = workbench.comparisonReport?.recommendedSupplierId ?? latestAward?.selectedSupplierId;
  const recommendedSupplierName = resolveSupplierName(workbench, recommendedSupplierId);

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
                setCurrentView(nextView);
              }}
            >
              进入下一阶段处理
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
                          { label: '采购文件', value: `${workbench.procurementDocuments.length} 份` },
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
                    {workbench.procurementDocuments.map((document) => (
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
                  <div className="grid gap-4 md:grid-cols-3">
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
                      <div className="text-xs text-slate-500">已锁定报价</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{workbench.bids.length} 家</div>
                    </div>
                  </div>

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
                            <Badge variant={item.collectedFlag ? 'success' : 'warning'}>{item.collectedFlag ? '已归集' : humanizeStatus(item.status)}</Badge>
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
                    采购文件 {workbench.procurementDocuments.length} 份
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
