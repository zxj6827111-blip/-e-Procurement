import React, { useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { AlertCircle, CheckCircle, FileText, Handshake, ShieldAlert, Trophy, Users } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import {
  downloadTextFile,
  formatCurrency,
  formatDateTime,
  getAwardReadiness,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

export function ProjectSourcingView() {
  const { currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error } = useProjectWorkbenchData(currentProjectId);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const supplierRows = useMemo(() => {
    if (!workbench) return [];
    return [...(workbench.comparisonReport?.comparisonRows ?? [])].sort((left, right) => left.rank - right.rank);
  }, [workbench]);

  const scoreAverage = useMemo(() => {
    if (!supplierRows.length) return null;
    return supplierRows.reduce((sum, item) => sum + (item.finalScore ?? 0), 0) / supplierRows.length;
  }, [supplierRows]);

  const latestDocument = useMemo(
    () => (workbench ? sortByNewest(workbench.procurementDocuments, (item) => item.lockedAt ?? item.updatedAt)[0] ?? null : null),
    [workbench]
  );
  const latestAnnouncement = useMemo(
    () => (workbench ? sortByNewest(workbench.announcements, (item) => item.publishedAt ?? item.updatedAt)[0] ?? null : null),
    [workbench]
  );
  const awardReadiness = useMemo(() => (workbench ? getAwardReadiness(workbench) : null), [workbench]);

  const generateReviewReport = () => {
    if (!workbench) return;
    const lines = [
      `项目编号：${workbench.project.code}`,
      `项目名称：${workbench.project.name}`,
      `采购申请：${workbench.procurementRequest?.code ?? '-'}`,
      `评审报告：${workbench.comparisonReport?.reportNo ?? '-'}`,
      `推荐供应商：${resolveSupplierName(workbench, workbench.comparisonReport?.recommendedSupplierId)}`,
      `公告：${latestAnnouncement?.title ?? '-'}`,
      '供应商排名：',
      ...supplierRows.map((item) => `${item.rank}. ${item.supplierName} / 报价 ${formatCurrency(item.amount)} / 得分 ${item.finalScore ?? '-'}`)
    ];
    downloadTextFile(`${workbench.project.code}-review-summary.txt`, lines.join('\n'));
  };

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">招采执行数据加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的项目。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">项目招采执行</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={generateReviewReport}
            disabled={!awardReadiness?.hasFrozenSource}
            title={awardReadiness?.hasFrozenSource ? '导出当前冻结评审摘要' : '请先形成并冻结比价报告或评审报告'}
          >
            生成评审摘要
          </Button>
          <Button
            className="bg-[#006666] text-white hover:bg-[#004d4d]"
            disabled={!workbench.awardApprovals.length && !awardReadiness?.ready}
            title={
              workbench.awardApprovals.length || awardReadiness?.ready
                ? '进入定标审批'
                : awardReadiness?.blockers.join('；')
            }
            onClick={() => {
              setCurrentProjectId(resolvedProjectId);
              setCurrentView('AWARD_APPROVE');
            }}
          >
            进入定标阶段
          </Button>
        </div>
      </div>

      <Card className="bg-[#006666] text-white">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Badge variant="warning">{humanizeStatus(workbench.project.status)}</Badge>
                <span className="rounded bg-white/15 px-2 py-1 text-xs font-medium">{workbench.project.type}</span>
              </div>
              <h3 className="text-2xl font-semibold">{workbench.project.name}</h3>
              <p className="mt-2 text-sm text-white/80">
                采购文件 {workbench.procurementDocuments.length} 份，供应商报名 {workbench.registrations.length} 家，报价 {workbench.bids.length} 家，评分表 {workbench.scoringSheets.length} 份。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-xs text-white/70">比价报告</div>
                <div className="mt-2 text-lg font-semibold">{workbench.comparisonReport?.reportNo ?? '-'}</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-xs text-white/70">推荐供应商</div>
                <div className="mt-2 text-lg font-semibold">{resolveSupplierName(workbench, workbench.comparisonReport?.recommendedSupplierId)}</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-xs text-white/70">平均得分</div>
                <div className="mt-2 text-lg font-semibold">{scoreAverage === null ? '-' : scoreAverage.toFixed(1)}</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-xs text-white/70">报价截止</div>
                <div className="mt-2 text-lg font-semibold">{formatDateTime(workbench.project.quoteDeadlineAt)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-medium text-slate-900">
                  <Users className="h-5 w-5 text-[#006666]" />
                  报名、报价与评审汇总
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">供应商</th>
                      <th className="px-4 py-3 font-medium">报名状态</th>
                      <th className="px-4 py-3 font-medium">报价金额</th>
                      <th className="px-4 py-3 font-medium">交付天数</th>
                      <th className="px-4 py-3 font-medium">最终得分</th>
                      <th className="px-4 py-3 font-medium">排名</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierRows.length ? supplierRows.map((row) => {
                      const registration = workbench.registrations.find((item) => item.supplierId === row.supplierId);
                      return (
                        <tr key={row.supplierId} className={row.rank === 1 ? 'bg-yellow-50/40' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.supplierName}</td>
                          <td className="px-4 py-3">
                            <Badge variant={statusBadgeVariant(registration?.status)}>{humanizeStatus(registration?.status)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-3 text-slate-600">{row.deliveryDays} 天</td>
                          <td className="px-4 py-3 font-medium text-[#006666]">{row.finalScore?.toFixed(1) ?? '-'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.rank === 1
                                  ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs text-white'
                                  : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600'
                              }
                            >
                              {row.rank}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          尚未形成供应商评审排名。请先完成公告、报名、报价截止和评审。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
                <FileText className="h-5 w-5 text-[#006666]" />
                采购文件与公告
              </h3>

              <div className="space-y-3">
                {latestDocument ? (
                  <div className="flex items-center justify-between rounded border p-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{latestDocument.title}</p>
                        <p className="text-xs text-gray-500">更新时间：{formatDateTime(latestDocument.updatedAt)}</p>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(latestDocument.status)}>{humanizeStatus(latestDocument.status)}</Badge>
                  </div>
                ) : null}

                {latestAnnouncement ? (
                  <div className="flex items-center justify-between rounded border p-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Handshake className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{latestAnnouncement.title}</p>
                        <p className="text-xs text-gray-500">发布时间：{formatDateTime(latestAnnouncement.publishedAt ?? latestAnnouncement.updatedAt)}</p>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(latestAnnouncement.status)}>{humanizeStatus(latestAnnouncement.status)}</Badge>
                  </div>
                ) : null}
                {!latestDocument && !latestAnnouncement ? (
                  <div className="rounded border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                    当前项目还没有采购文件或公告记录。
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                合规与风险
              </h3>
              <div className="space-y-4">
                <div className="rounded border bg-slate-50 p-3">
                  <p className="mb-1 text-sm font-medium">评分一致性</p>
                  {awardReadiness?.hasFrozenSource ? (
                    <p className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle className="h-3 w-3" />
                      已形成冻结评审来源，推荐供应商为 {resolveSupplierName(workbench, workbench.comparisonReport?.recommendedSupplierId)}
                    </p>
                  ) : (
                    <p className="flex items-start gap-1 text-xs text-amber-700">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      尚未形成冻结的比价报告或评审报告。
                    </p>
                  )}
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <p className="mb-1 text-sm font-medium">供应商参与度</p>
                  <p className="text-xs text-slate-600">
                    共 {workbench.invitations.length} 家受邀，{workbench.registrations.filter((item) => item.status === 'qualified').length} 家资格通过，{workbench.bids.length} 家完成报价。
                  </p>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <p className="mb-1 text-sm font-medium">定标准备</p>
                  {workbench.awardApprovals.length ? (
                    <p className="text-xs text-slate-600">当前项目已有 {workbench.awardApprovals.length} 条定标审批记录，可进入定标页面查看。</p>
                  ) : awardReadiness?.ready ? (
                    <p className="text-xs text-emerald-700">定标前置条件已满足，可以创建定标审批。</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-amber-700">
                      {awardReadiness?.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
                <Trophy className="h-5 w-5 text-[#006666]" />
                专家评分记录
              </h3>
              <div className="space-y-3">
                {workbench.scoringSheets.map((sheet) => (
                  <div key={sheet.id} className="rounded border bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-slate-900">{sheet.supplierName ?? resolveSupplierName(workbench, sheet.supplierId)}</div>
                      <Badge variant={statusBadgeVariant(sheet.status)}>{humanizeStatus(sheet.status)}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      专家：{sheet.expertName ?? sheet.expertId} · 技术 {sheet.technical} / 服务 {sheet.service} / 价格 {sheet.price} / 总分 {sheet.total}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
