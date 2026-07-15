import React, { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, FileCheck2, ListFilter, ShieldCheck, Wallet, XCircle } from 'lucide-react';
import { apiPost } from '../../../api/http';
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
import { SettlementProjectPicker } from './SettlementProjectPicker';
import { SettlementWorkbenchListView } from './SettlementWorkbenchListView';
import { deriveSettlementOverviewStatus } from './settlement-overview-data';

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#006666] focus:ring-1 focus:ring-[#006666]';
const financeActionRoles = new Set(['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'HOTEL_PROCUREMENT', 'HOTEL_FINANCE', 'FINANCE_REVIEWER', 'PLATFORM_OPERATIONS']);
const paymentConfirmRoles = new Set(['HOTEL_FINANCE', 'FINANCE_REVIEWER']);

export function SettlementPaymentView() {
  const { currentProjectId } = useApp();
  return currentProjectId ? <SettlementPaymentDetailView /> : <SettlementWorkbenchListView />;
}

function SettlementPaymentDetailView() {
  const { currentProjectId, currentUser, navigateToPath, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading: projectLoading, error: projectError } = useProjectWorkbenchData(currentProjectId);
  const { overview, loading: financeLoading, error: financeError, reload } = useSettlementFinanceOverview();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [reviewOpinion, setReviewOpinion] = useState('资料与金额核对无误。');
  const [paymentNote, setPaymentNote] = useState('结算审核完成，发起付款申请。');

  const projectId = resolvedProjectId ?? workbench?.project.id ?? null;
  const bills = useMemo(() => (projectId && overview ? overview.settlementBills.filter((item) => item.projectId === projectId) : []), [overview, projectId]);
  const materials = useMemo(() => (projectId && overview ? overview.settlementMaterials.filter((item) => item.projectId === projectId) : []), [overview, projectId]);
  const invoices = useMemo(() => {
    if (!overview || !bills.length) return [];
    const ids = new Set(bills.map((item) => item.id));
    return overview.invoices.filter((item) => ids.has(item.settlementBillId));
  }, [overview, bills]);
  const ledgerEntries = useMemo(() => {
    if (!overview || !bills.length) return [];
    const ids = new Set(bills.map((item) => item.id));
    return overview.fundLedgerEntries.filter((item) => ids.has(item.settlementBillId));
  }, [overview, bills]);
  const latestBill = useMemo(() => sortByNewest(bills, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null, [bills]);
  const latestInvoice = useMemo(() => sortByNewest(invoices, (item) => item.verifiedAt ?? item.uploadedAt ?? item.issueDate)[0] ?? null, [invoices]);
  const latestLedger = useMemo(() => sortByNewest(ledgerEntries, (item) => item.operatedAt ?? item.createdAt)[0] ?? null, [ledgerEntries]);
  const canAct = financeActionRoles.has(String(currentUser?.role));
  const canConfirmPayment = paymentConfirmRoles.has(String(currentUser?.role));
  const currentSettlementStatus = deriveSettlementOverviewStatus({
    billStatus: latestBill?.status,
    materialStatuses: materials.map((item) => item.status),
    invoiceStatuses: invoices.map((item) => item.status),
    ledgerStatuses: ledgerEntries.map((item) => item.status)
  });

  async function runAction(key: string, action: () => Promise<unknown>, success: string) {
    if (!currentUser || busyAction) return;
    setBusyAction(key);
    setActionMessage('');
    setActionError('');
    try {
      await action();
      setActionMessage(success);
      reload();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : '操作失败，请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  }

  function reviewBill(billId: string, approved: boolean) {
    return runAction(`bill:${billId}`, () => apiPost(`/api/settlement-finance/settlement-bills/${encodeURIComponent(billId)}/review`, { approved, opinion: reviewOpinion.trim() }, currentUser?.id), approved ? '结算单已审核通过。' : '结算单已驳回。');
  }
  function reviewMaterial(materialId: string, approved: boolean) {
    return runAction(`material:${materialId}`, () => apiPost(`/api/settlement-finance/materials/${encodeURIComponent(materialId)}/review`, { approved, opinion: reviewOpinion.trim() }, currentUser?.id), approved ? '结算资料已核验通过。' : '结算资料已驳回。');
  }
  function reviewInvoice(invoiceId: string, approved: boolean) {
    return runAction(`invoice:${invoiceId}`, () => apiPost(`/api/settlement-finance/invoices/${encodeURIComponent(invoiceId)}/review`, { approved, opinion: reviewOpinion.trim() }, currentUser?.id), approved ? '发票已核验通过。' : '发票已驳回。');
  }
  function createPayment(billId: string) {
    return runAction(`payment:${billId}`, () => apiPost(`/api/settlement-finance/settlement-bills/${encodeURIComponent(billId)}/fund-ledger`, { status: 'payment_requested', note: paymentNote.trim() }, currentUser?.id), '付款申请已发起，等待集团采购管理审批。');
  }
  function confirmPayment(entryId: string) {
    return runAction(`confirm:${entryId}`, () => apiPost(`/api/settlement-finance/fund-ledger/${encodeURIComponent(entryId)}/confirm-payment`, { note: '酒店财务已确认付款完成。' }, currentUser?.id), '付款已确认，结算流程完成。');
  }

  if ((projectLoading || financeLoading) && !workbench && !overview) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">付款进度加载中...</div>;
  const fatalError = projectError || financeError;
  if (fatalError && !workbench && !overview) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{fatalError}</div>;
  if (!workbench || !projectId) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的付款进度。</div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold text-slate-900">结算审核与付款</h2><p className="mt-1 text-sm text-slate-500">{workbench.project.code} / {workbench.project.name}</p></div>
      <div className="flex flex-wrap items-end justify-end gap-2">
        <SettlementProjectPicker
          currentProject={{
            id: workbench.project.id,
            code: workbench.project.code,
            name: workbench.project.name,
            status: workbench.project.status,
            settlementStatus: currentSettlementStatus,
            externalTradeFlag: Boolean(workbench.project.externalTradeFlag),
            supplierName: workbench.purchaseOrders[0]
              ? resolveSupplierName(workbench, workbench.purchaseOrders[0].supplierId)
              : '暂未关联供应商',
            settlementBillNo: latestBill?.billNo ?? null
          }}
        />
        <Button variant="outline" onClick={() => navigateToPath('/settlement-materials')}>
          <ListFilter className="mr-2 h-4 w-4" />结算工作台
        </Button>
        <Button variant="outline" onClick={reload}>刷新状态</Button>
        <Button variant="outline" onClick={() => setCurrentView('SETTLEMENT_MATS')}>结算资料</Button>
      </div>
    </div>
    {actionMessage || actionError ? <div className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${actionError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">{actionError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{actionError || actionMessage}</div> : null}

    <div className="grid gap-4 md:grid-cols-4">
      <StatusCard icon={Wallet} label="结算单状态" value={latestBill?.status} color="bg-blue-100 text-blue-600" />
      <StatusCard icon={FileCheck2} label="发票状态" value={latestInvoice?.status} color="bg-emerald-100 text-emerald-600" />
      <StatusCard icon={Banknote} label="付款状态" value={latestLedger?.status} color="bg-amber-100 text-amber-600" />
      <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><CheckCircle2 className="h-5 w-5" /></div><div><div className="mb-1 text-xs text-slate-500">支付金额</div><div className="text-sm font-medium text-slate-900">{formatCurrency(latestLedger?.amount ?? latestBill?.settlementAmount)}</div></div></CardContent></Card>
    </div>

    {canAct ? <Card><CardContent className="grid gap-4 p-6 md:grid-cols-2"><label className="text-sm text-slate-600">审核意见<input className={`${inputClass} mt-1`} value={reviewOpinion} onChange={(event) => setReviewOpinion(event.target.value)} /></label><label className="text-sm text-slate-600">付款申请备注<input className={`${inputClass} mt-1`} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} /></label></CardContent></Card> : null}

    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">结算单</th><th className="px-4 py-3">供应商</th><th className="px-4 py-3">金额</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">操作</th></tr></thead><tbody className="divide-y divide-slate-100">
      {bills.map((bill) => {
        const billInvoices = invoices.filter((item) => item.settlementBillId === bill.id);
        const verifiedAmount = billInvoices.filter((item) => item.status === 'verified').reduce((sum, item) => sum + item.amount, 0);
        const billLedgers = ledgerEntries.filter((item) => item.settlementBillId === bill.id);
        const activeLedger = billLedgers.find((item) => !['rejected', 'cancelled'].includes(item.status));
        const currentLedger = activeLedger ?? billLedgers[0];
        const canInitiatePayment =
          ['approved', 'payable'].includes(bill.status) &&
          verifiedAmount >= bill.settlementAmount &&
          !activeLedger;
        return <tr key={bill.id}>
          <td className="px-4 py-3"><div className="font-medium text-slate-900">{bill.billNo}</div><div className="mt-1 text-xs text-slate-500">{bill.purchaseOrderNo ?? bill.purchaseOrderId}</div></td>
          <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, bill.supplierId)}</td>
          <td className="px-4 py-3">{formatCurrency(bill.settlementAmount)}</td>
          <td className="px-4 py-3"><Badge variant={statusBadgeVariant(currentLedger?.status ?? bill.status)}>{humanizeStatus(currentLedger?.status ?? bill.status)}</Badge></td>
          <td className="px-4 py-3"><div className="flex min-w-max items-center gap-2">
            {canAct && bill.status === 'submitted' ? <><ActionButton approved busy={busyAction === `bill:${bill.id}`} onClick={() => void reviewBill(bill.id, true)} /><ActionButton approved={false} busy={busyAction === `bill:${bill.id}`} onClick={() => void reviewBill(bill.id, false)} /></> : null}
            {canAct && canInitiatePayment ? <Button size="sm" variant="brand" disabled={Boolean(busyAction)} onClick={() => void createPayment(bill.id)}>{busyAction === `payment:${bill.id}` ? '发起中...' : '发起付款申请'}</Button> : null}
            {currentLedger?.status === 'payment_requested' && currentUser?.role === 'GROUP_PROCUREMENT_MANAGER' ? <Button size="sm" variant="outline" onClick={() => setCurrentView('TODO')}>进入待审批</Button> : null}
            {currentLedger?.status === 'payment_requested' && currentUser?.role !== 'GROUP_PROCUREMENT_MANAGER' ? <span className="text-xs text-amber-700">等待集团采购管理审批</span> : null}
            {currentLedger?.status === 'pending_payment' && canConfirmPayment ? <Button size="sm" variant="brand" disabled={Boolean(busyAction)} onClick={() => void confirmPayment(currentLedger.id)}>{busyAction === `confirm:${currentLedger.id}` ? '确认中...' : '确认已付款'}</Button> : null}
            {currentLedger?.status === 'pending_payment' && !canConfirmPayment ? <span className="text-xs text-blue-700">等待酒店财务确认付款</span> : null}
            {currentLedger?.status === 'paid' ? <span className="text-xs text-emerald-700">付款已完成</span> : null}
          </div></td>
        </tr>;
      })}
      {!bills.length ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">暂无结算单。</td></tr> : null}
    </tbody></table></div></CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <ReviewList title="结算资料审核" empty="暂无待核验资料。">{materials.map((item) => <ReviewItem key={item.id} title={item.fileName ?? humanizeStatus(item.materialType)} subtitle={`${humanizeStatus(item.materialType)} · ${formatDateTime(item.uploadedAt)}`} status={item.status} opinion={item.verificationOpinion} actions={canAct && item.status === 'pending_verification' ? <><ActionButton approved busy={busyAction === `material:${item.id}`} onClick={() => void reviewMaterial(item.id, true)} /><ActionButton approved={false} busy={busyAction === `material:${item.id}`} onClick={() => void reviewMaterial(item.id, false)} /></> : null} />)}</ReviewList>
      <ReviewList title="发票审核" empty="暂无待核验发票。">{invoices.map((item) => <ReviewItem key={item.id} title={item.invoiceNo} subtitle={`${formatCurrency(item.amount)} · ${formatDateTime(item.issueDate, false)}`} status={item.status} opinion={item.verificationOpinion} actions={canAct && item.status === 'pending_verification' ? <><ActionButton approved busy={busyAction === `invoice:${item.id}`} onClick={() => void reviewInvoice(item.id, true)} /><ActionButton approved={false} busy={busyAction === `invoice:${item.id}`} onClick={() => void reviewInvoice(item.id, false)} /></> : null} />)}</ReviewList>
    </div>

    <Card><CardContent className="space-y-4 p-6"><div className="font-medium text-slate-900">资金台账</div><div className="grid gap-4 md:grid-cols-2">{ledgerEntries.map((entry) => <div key={entry.id} className="rounded-md border border-slate-200 p-4"><div className="flex justify-between gap-3"><div className="font-medium text-slate-900">{entry.ledgerNo}</div><Badge variant={statusBadgeVariant(entry.status)}>{humanizeStatus(entry.status)}</Badge></div><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><span>金额：{formatCurrency(entry.amount)}</span><span>时间：{formatDateTime(entry.operatedAt ?? entry.createdAt)}</span></div>{entry.note ? <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{entry.note}</div> : null}</div>)}{!ledgerEntries.length ? <div className="rounded bg-slate-50 p-4 text-sm text-slate-500">结算单和足额发票均审核通过后，可登记付款台账。</div> : null}</div></CardContent></Card>
  </div>;
}

function StatusCard({ icon: Icon, label, value, color }: { icon: typeof Wallet; label: string; value?: string; color: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}><Icon className="h-5 w-5" /></div><div><div className="mb-1 text-xs text-slate-500">{label}</div><Badge variant={statusBadgeVariant(value)}>{humanizeStatus(value)}</Badge></div></CardContent></Card>;
}
function ActionButton({ approved, busy, onClick }: { approved: boolean; busy: boolean; onClick: () => void }) {
  return <Button size="sm" variant={approved ? 'brand' : 'outline'} disabled={busy} onClick={onClick}>{approved ? <ShieldCheck className="mr-1 h-4 w-4" /> : <XCircle className="mr-1 h-4 w-4" />}{busy ? '处理中...' : approved ? '通过' : '驳回'}</Button>;
}
function ReviewList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return <Card><CardContent className="space-y-4 p-6"><div className="font-medium text-slate-900">{title}</div><div className="space-y-3">{React.Children.count(children) ? children : <div className="rounded bg-slate-50 p-4 text-sm text-slate-500">{empty}</div>}</div></CardContent></Card>;
}
function ReviewItem({ title, subtitle, status, opinion, actions }: { title: string; subtitle: string; status: string; opinion?: string; actions: React.ReactNode }) {
  return <div className="rounded-md border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><div className="font-medium text-slate-900">{title}</div><div className="mt-1 text-xs text-slate-500">{subtitle}</div></div><Badge variant={statusBadgeVariant(status)}>{humanizeStatus(status)}</Badge></div>{opinion ? <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{opinion}</div> : null}{actions ? <div className="mt-3 flex justify-end gap-2">{actions}</div> : null}</div>;
}
