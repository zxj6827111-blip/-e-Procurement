import React, { useEffect, useMemo } from 'react';
import { Banknote, CheckCircle2, FileCheck2, Wallet } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import {
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData,
  useSettlementFinanceOverview
} from './project-workbench-data';

export function SettlementPaymentView() {
  const { currentProjectId, setCurrentProjectId } = useApp();
  const { workbench, resolvedProjectId, loading: projectLoading, error: projectError } = useProjectWorkbenchData(currentProjectId);
  const { overview, loading: financeLoading, error: financeError, reload } = useSettlementFinanceOverview();

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const projectId = resolvedProjectId ?? workbench?.project.id ?? null;
  const bills = useMemo(
    () => (projectId && overview ? overview.settlementBills.filter((item) => item.projectId === projectId) : []),
    [overview, projectId]
  );
  const invoices = useMemo(() => {
    if (!overview || !bills.length) return [];
    const billIds = new Set(bills.map((item) => item.id));
    return overview.invoices.filter((item) => billIds.has(item.settlementBillId));
  }, [overview, bills]);
  const ledgerEntries = useMemo(() => {
    if (!overview || !bills.length) return [];
    const billIds = new Set(bills.map((item) => item.id));
    return overview.fundLedgerEntries.filter((item) => billIds.has(item.settlementBillId));
  }, [overview, bills]);

  const latestBill = useMemo(
    () => sortByNewest(bills, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null,
    [bills]
  );
  const latestInvoice = useMemo(
    () => sortByNewest(invoices, (item) => item.verifiedAt ?? item.uploadedAt ?? item.issueDate)[0] ?? null,
    [invoices]
  );
  const latestLedger = useMemo(
    () => sortByNewest(ledgerEntries, (item) => item.operatedAt ?? item.createdAt)[0] ?? null,
    [ledgerEntries]
  );
  const latestOrder = useMemo(
    () => (workbench ? sortByNewest(workbench.purchaseOrders, (item) => item.updatedAt ?? item.createdAt ?? item.expectedDeliveryAt)[0] ?? null : null),
    [workbench]
  );

  if ((projectLoading || financeLoading) && !workbench && !overview) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">付款进度加载中...</div>;
  }

  const fatalError = projectError || financeError;
  if (fatalError && !workbench && !overview) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{fatalError}</div>;
  }

  if (!workbench || !projectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的付款进度。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">结算付款</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <Button variant="outline" onClick={reload}>
          刷新付款状态
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">结算单状态</div>
              <Badge variant={statusBadgeVariant(latestBill?.status)}>{humanizeStatus(latestBill?.status)}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">发票状态</div>
              <Badge variant={statusBadgeVariant(latestInvoice?.status)}>{humanizeStatus(latestInvoice?.status)}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">付款状态</div>
              <Badge variant={statusBadgeVariant(latestLedger?.status ?? latestOrder?.paymentStatus)}>{humanizeStatus(latestLedger?.status ?? latestOrder?.paymentStatus)}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">支付金额</div>
              <div className="text-sm font-medium text-slate-900">{formatCurrency(latestLedger?.amount ?? latestBill?.settlementAmount)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">结算单</th>
                <th className="px-4 py-3">供应商</th>
                <th className="px-4 py-3">结算金额</th>
                <th className="px-4 py-3">发票状态</th>
                <th className="px-4 py-3">付款状态</th>
                <th className="px-4 py-3">付款时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((bill) => {
                const billInvoice = sortByNewest(invoices.filter((item) => item.settlementBillId === bill.id), (item) => item.verifiedAt ?? item.uploadedAt ?? item.issueDate)[0] ?? null;
                const billLedger = sortByNewest(ledgerEntries.filter((item) => item.settlementBillId === bill.id), (item) => item.operatedAt ?? item.createdAt)[0] ?? null;
                return (
                  <tr key={bill.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{bill.billNo}</div>
                      <div className="mt-1 text-xs text-slate-500">{bill.purchaseOrderNo ?? bill.purchaseOrderId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, bill.supplierId)}</td>
                    <td className="px-4 py-3 text-slate-900">{formatCurrency(bill.settlementAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(billInvoice?.status)}>{humanizeStatus(billInvoice?.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(billLedger?.status ?? bill.status)}>{humanizeStatus(billLedger?.status ?? bill.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(billLedger?.operatedAt ?? billLedger?.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="text-base font-medium text-slate-900">发票核验记录</div>
            <div className="space-y-4">
              {invoices.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{item.invoiceNo}</div>
                    <Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div>金额：{formatCurrency(item.amount)}</div>
                    <div>开票日期：{formatDateTime(item.issueDate, false)}</div>
                    <div>上传时间：{formatDateTime(item.uploadedAt)}</div>
                    <div>核验时间：{formatDateTime(item.verifiedAt)}</div>
                  </div>
                  {item.verificationOpinion ? (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.verificationOpinion}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="text-base font-medium text-slate-900">资金台账</div>
            <div className="space-y-4">
              {ledgerEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{entry.ledgerNo}</div>
                    <Badge variant={statusBadgeVariant(entry.status)}>{humanizeStatus(entry.status)}</Badge>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div>金额：{formatCurrency(entry.amount)}</div>
                    <div>记账时间：{formatDateTime(entry.operatedAt ?? entry.createdAt)}</div>
                    <div>供应商：{resolveSupplierName(workbench, entry.supplierId)}</div>
                    <div>台账类型：{humanizeStatus(entry.entryType)}</div>
                  </div>
                  {entry.note ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{entry.note}</div> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
