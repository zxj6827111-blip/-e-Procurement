import React, { useEffect, useMemo } from 'react';
import { BellRing, FileText, Trophy, Truck } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import {
  downloadTextFile,
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

function isSupplierRole(role?: string | null) {
  return role === 'SUPPLIER' || role === 'SUPPLIER_ADMIN' || role === 'SUPPLIER_BIDDER';
}

export function AwardResultView() {
  const { currentProjectId, currentUser, setCurrentProjectId } = useApp();
  const { workbench, resolvedProjectId, loading, error } = useProjectWorkbenchData(currentProjectId);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const supplierSide = isSupplierRole(currentUser?.role ?? null);
  const latestAward = useMemo(
    () => (workbench ? sortByNewest(workbench.awardApprovals, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const latestNotice = useMemo(
    () => (workbench ? sortByNewest(workbench.resultNotifications ?? [], (item) => item.sentAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const latestOrder = useMemo(
    () => (workbench ? sortByNewest(workbench.purchaseOrders, (item) => item.createdAt ?? item.expectedDeliveryAt)[0] ?? null : null),
    [workbench]
  );
  const latestBid = useMemo(
    () => (workbench ? sortByNewest(workbench.bids, (item) => item.lockedAt ?? item.submittedAt)[0] ?? null : null),
    [workbench]
  );
  const latestPricingReport = useMemo(
    () => (workbench ? sortByNewest(workbench.pricingReports ?? [], (item) => item.approvedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );

  const winnerSupplierId = latestAward?.selectedSupplierId ?? latestOrder?.supplierId ?? null;
  const winnerSupplierName = workbench ? resolveSupplierName(workbench, winnerSupplierId) : '-';
  const supplierOutcome = latestOrder
    ? '已中标'
    : latestNotice?.contentSummary?.includes('未中标')
      ? '未中标'
      : latestNotice
        ? '结果已通知'
        : '待通知';

  const downloadNotice = () => {
    if (!workbench) return;
    const lines = [
      `项目编号：${workbench.project.code}`,
      `项目名称：${workbench.project.name}`,
      `采购申请：${workbench.procurementRequest?.code ?? '-'}`,
      `通知状态：${humanizeStatus(latestNotice?.status ?? latestAward?.approvalStatus)}`,
      `中标供应商：${winnerSupplierName}`,
      `中标金额：${formatCurrency(latestBid?.amount ?? latestOrder?.totalAmount)}`,
      `通知时间：${formatDateTime(latestNotice?.sentAt ?? latestAward?.approvedAt ?? latestAward?.submittedAt)}`
    ];
    if (latestNotice?.contentSummary) {
      lines.push('', `通知内容：${latestNotice.contentSummary}`);
    }
    downloadTextFile(`${workbench.project.code}-award-notice.txt`, lines.join('\n'));
  };

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">定标结果加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的定标结果。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">定标结果</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <Button variant="outline" onClick={downloadNotice}>
          下载结果通知
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">{supplierSide ? '本方结果' : '中标供应商'}</div>
              <div className="text-sm font-medium text-slate-900">{supplierSide ? supplierOutcome : winnerSupplierName}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">结果通知</div>
              <Badge variant={statusBadgeVariant(latestNotice?.status ?? latestAward?.approvalStatus)}>
                {humanizeStatus(latestNotice?.status ?? latestAward?.approvalStatus)}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">{supplierSide ? '本方报价' : '定标金额'}</div>
              <div className="text-sm font-medium text-slate-900">{formatCurrency(latestBid?.amount ?? latestOrder?.totalAmount)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">后续订单</div>
              <div className="text-sm font-medium text-slate-900">{latestOrder?.orderNo ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {supplierSide ? (
        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <div className="text-base font-medium text-slate-900">供应商结果通知</div>
                <div className="mt-1 text-sm text-slate-500">仅展示当前供应商可见的中标结果与后续履约信息。</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-slate-900">{latestNotice?.id ?? '结果通知'}</div>
                  <Badge variant={statusBadgeVariant(latestNotice?.status)}>{humanizeStatus(latestNotice?.status)}</Badge>
                </div>
                <div className="text-sm text-slate-700">{latestNotice?.contentSummary ?? '当前供应商已收到定标结果通知。'}</div>
                <div className="mt-3 text-xs text-slate-500">发送时间：{formatDateTime(latestNotice?.sentAt ?? latestNotice?.createdAt)}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">本方报价</th>
                      <th className="px-4 py-3">订单号</th>
                      <th className="px-4 py-3">订单状态</th>
                      <th className="px-4 py-3">付款状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(latestBid?.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{latestOrder?.orderNo ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(latestOrder?.status)}>{humanizeStatus(latestOrder?.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(latestOrder?.paymentStatus)}>{humanizeStatus(latestOrder?.paymentStatus)}</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="text-base font-medium text-slate-900">中标摘要</div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">通知结论</div>
                <div className="text-sm font-medium text-slate-900">{supplierOutcome}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">通知时间</div>
                <div className="text-sm font-medium text-slate-900">{formatDateTime(latestNotice?.sentAt ?? latestAward?.approvedAt)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">定价报告</div>
                <div className="text-sm font-medium text-slate-900">{latestPricingReport?.reportNo ?? '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">审批单号</th>
                    <th className="px-4 py-3">推荐供应商</th>
                    <th className="px-4 py-3">中标供应商</th>
                    <th className="px-4 py-3">审批状态</th>
                    <th className="px-4 py-3">审批时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workbench.awardApprovals.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.id}</td>
                      <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, item.recommendedSupplierId)}</td>
                      <td className="px-4 py-3 text-slate-900">{resolveSupplierName(workbench, item.selectedSupplierId)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(item.approvalStatus)}>{humanizeStatus(item.approvalStatus)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(item.approvedAt ?? item.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="text-base font-medium text-slate-900">执行摘要</div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">定价报告</div>
                <div className="text-sm font-medium text-slate-900">{latestPricingReport?.reportNo ?? '-'}</div>
                <div className="mt-2 text-xs text-slate-500">审批通过时间：{formatDateTime(latestPricingReport?.approvedAt ?? latestPricingReport?.createdAt)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">订单生成</div>
                <div className="text-sm font-medium text-slate-900">{latestOrder?.orderNo ?? '-'}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {latestOrder ? `${humanizeStatus(latestOrder.status)} / ${formatCurrency(latestOrder.totalAmount)}` : '尚未生成订单'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">采购申请</div>
                <div className="text-sm font-medium text-slate-900">{workbench.procurementRequest?.code ?? '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
