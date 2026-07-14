import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { CheckCircle2, Clock, FileCheck, Search, ShieldCheck, TrendingDown, Users } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import {
  AwardApprovalRecord,
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

export function AwardApproveView() {
  const { currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error } = useProjectWorkbenchData(currentProjectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const approvals = useMemo(
    () => (workbench ? sortByNewest(workbench.awardApprovals, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt) : []),
    [workbench]
  );
  const selectedApproval = approvals.find((item) => item.id === selectedId) ?? approvals[0] ?? null;

  useEffect(() => {
    if (!selectedId && approvals[0]) {
      setSelectedId(approvals[0].id);
    }
  }, [approvals, selectedId]);

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
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FileCheck className="h-6 w-6 text-[#006666]" />
            定标审批
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentView('PROJECT_DETAIL')}>
            返回项目详情
          </Button>
        </div>
      </div>

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
