import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, FileUp, ListFilter, Receipt, Send, ShieldCheck, Wallet } from 'lucide-react';
import { apiPost, uploadFile } from '../../../api/http';
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
const supplierRoles = new Set(['SUPPLIER', 'SUPPLIER_ADMIN', 'SUPPLIER_BIDDER']);
const billCreatorRoles = new Set(['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'HOTEL_PROCUREMENT', 'HOTEL_FINANCE', 'FINANCE_REVIEWER', 'PLATFORM_OPERATIONS']);
const fileUploaderRoles = new Set(['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS', ...supplierRoles]);

export function SettlementMaterialView() {
  const { currentProjectId } = useApp();
  return currentProjectId ? <SettlementMaterialDetailView /> : <SettlementWorkbenchListView />;
}

function SettlementMaterialDetailView() {
  const { currentProjectId, currentUser, navigateToPath, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading: projectLoading, error: projectError, reload: reloadProject } = useProjectWorkbenchData(currentProjectId);
  const { overview, loading: financeLoading, error: financeError, reload: reloadFinance } = useSettlementFinanceOverview();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [billOrderId, setBillOrderId] = useState('');
  const [billPeriod, setBillPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [serviceFeeRate, setServiceFeeRate] = useState('0');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [materialType, setMaterialType] = useState('delivery_note');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceType, setInvoiceType] = useState('special_vat');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceTaxRate, setInvoiceTaxRate] = useState('0.13');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const projectId = resolvedProjectId ?? workbench?.project.id ?? null;
  const bills = useMemo(() => (projectId && overview ? overview.settlementBills.filter((item) => item.projectId === projectId) : []), [overview, projectId]);
  const materials = useMemo(() => (projectId && overview ? overview.settlementMaterials.filter((item) => item.projectId === projectId) : []), [overview, projectId]);
  const invoices = useMemo(() => {
    if (!overview || !bills.length) return [];
    const billIds = new Set(bills.map((item) => item.id));
    return overview.invoices.filter((item) => billIds.has(item.settlementBillId));
  }, [overview, bills]);
  const reconciliation = useMemo(() => (overview && projectId ? overview.reconciliationLines.filter((item) => item.projectId === projectId) : []), [overview, projectId]);
  const latestBill = useMemo(() => sortByNewest(bills, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null, [bills]);
  const selectedBill = bills.find((item) => item.id === selectedBillId) ?? latestBill;
  const latestInvoice = useMemo(() => sortByNewest(invoices, (item) => item.verifiedAt ?? item.uploadedAt ?? item.issueDate)[0] ?? null, [invoices]);
  const latestReconciliation = useMemo(() => sortByNewest(reconciliation, (item) => item.updatedAt)[0] ?? null, [reconciliation]);
  const billableOrders = useMemo(() => {
    const billedOrderIds = new Set(bills.map((item) => item.purchaseOrderId));
    return workbench?.purchaseOrders.filter((order) => ['partially_received', 'received', 'closed'].includes(order.status) && !billedOrderIds.has(order.id)) ?? [];
  }, [bills, workbench]);
  const canCreateBill = billCreatorRoles.has(String(currentUser?.role));
  const canUploadFiles = fileUploaderRoles.has(String(currentUser?.role));
  const canSubmitBill = canCreateBill || supplierRoles.has(String(currentUser?.role));
  const currentSettlementStatus = deriveSettlementOverviewStatus({
    billStatus: latestBill?.status,
    materialStatuses: materials.map((item) => item.status),
    invoiceStatuses: invoices.map((item) => item.status),
    ledgerStatuses: overview?.fundLedgerEntries
      .filter((item) => bills.some((bill) => bill.id === item.settlementBillId))
      .map((item) => item.status)
  });

  useEffect(() => {
    if (!billableOrders.length) setBillOrderId('');
    else if (!billableOrders.some((item) => item.id === billOrderId)) setBillOrderId(billableOrders[0].id);
  }, [billOrderId, billableOrders]);

  useEffect(() => {
    if (!bills.length) setSelectedBillId('');
    else if (!bills.some((item) => item.id === selectedBillId)) setSelectedBillId(latestBill?.id ?? bills[0].id);
  }, [bills, latestBill?.id, selectedBillId]);

  useEffect(() => {
    if (selectedBill) setInvoiceAmount(String(selectedBill.settlementAmount));
  }, [selectedBill?.id, selectedBill?.settlementAmount]);

  async function runAction(key: string, action: () => Promise<unknown>, success: string) {
    if (!currentUser || busyAction) return;
    setBusyAction(key);
    setActionMessage('');
    setActionError('');
    try {
      await action();
      setActionMessage(success);
      reloadFinance();
      reloadProject();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : '操作失败，请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  }

  function createBill() {
    if (!billOrderId) return;
    const fee = Number(serviceFeeRate);
    if (!Number.isFinite(fee) || fee < 0 || fee > 1) {
      setActionError('服务费率应填写 0 到 1 之间的小数。');
      return;
    }
    return runAction('create-bill', () => apiPost('/api/settlement-finance/settlement-bills', { purchaseOrderId: billOrderId, period: billPeriod, serviceFeeRate: fee }, currentUser?.id), '结算单已生成，可继续补充资料并提交审核。');
  }

  function submitBill(billId: string) {
    return runAction(`submit:${billId}`, () => apiPost(`/api/settlement-finance/settlement-bills/${encodeURIComponent(billId)}/submit`, {}, currentUser?.id), '结算单已提交财务审核。');
  }

  async function uploadMaterial() {
    if (!selectedBill || !projectId || !materialFile) {
      setActionError('请选择结算单和需要上传的结算资料。');
      return;
    }
    await runAction('material', async () => {
      const uploaded = await uploadFile(materialFile, {
        attachmentKind: 'settlement_material', objectType: 'settlement_material', objectId: selectedBill.id,
        projectId, supplierId: selectedBill.supplierId
      }, currentUser?.id);
      await apiPost(`/api/settlement-finance/settlement-bills/${encodeURIComponent(selectedBill.id)}/materials`, {
        materialType, fileId: uploaded.file.id, fileName: uploaded.file.fileName
      }, currentUser?.id);
      setMaterialFile(null);
    }, '结算资料已上传，等待财务核验。');
  }

  async function uploadInvoice() {
    if (!selectedBill || !projectId || !invoiceFile || !invoiceNo.trim()) {
      setActionError('请填写发票号码并选择发票文件。');
      return;
    }
    const amount = Number(invoiceAmount);
    const taxRate = Number(invoiceTaxRate);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(taxRate) || taxRate < 0) {
      setActionError('请填写有效的发票金额和税率。');
      return;
    }
    await runAction('invoice', async () => {
      const uploaded = await uploadFile(invoiceFile, {
        attachmentKind: 'settlement_invoice', objectType: 'settlement_invoice', objectId: selectedBill.id,
        projectId, supplierId: selectedBill.supplierId
      }, currentUser?.id);
      await apiPost(`/api/settlement-finance/settlement-bills/${encodeURIComponent(selectedBill.id)}/invoices`, {
        invoiceNo: invoiceNo.trim(), invoiceType, issueDate: invoiceDate, amount, taxRate,
        fileId: uploaded.file.id, fileName: uploaded.file.fileName
      }, currentUser?.id);
      setInvoiceFile(null);
      setInvoiceNo('');
    }, '发票已上传，等待财务核验。');
  }

  if ((projectLoading || financeLoading) && !workbench && !overview) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">结算资料加载中...</div>;
  const fatalError = projectError || financeError;
  if (fatalError && !workbench && !overview) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{fatalError}</div>;
  if (!workbench || !projectId) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的结算资料。</div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold text-slate-900">结算资料</h2><p className="mt-1 text-sm text-slate-500">{workbench.project.code} / {workbench.project.name}</p></div>
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
        <Button variant="outline" onClick={() => { reloadFinance(); reloadProject(); }}>刷新状态</Button>
        {!supplierRoles.has(String(currentUser?.role)) ? <Button variant="outline" onClick={() => setCurrentView('PAYMENT_PROGRESS')}>审核与付款</Button> : null}
        <Button variant="outline" onClick={() => navigateToPath(`/order-fulfillment?projectId=${encodeURIComponent(projectId)}`)}>返回订单履约</Button>
      </div>
    </div>

    {actionMessage || actionError ? <div className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${actionError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">{actionError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{actionError || actionMessage}</div> : null}

    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard icon={Wallet} color="bg-blue-100 text-blue-600" label="结算单" value={latestBill?.billNo ?? '-'} />
      <SummaryCard icon={FileText} color="bg-amber-100 text-amber-600" label="资料上传" value={`${materials.length} 份`} />
      <SummaryCard icon={Receipt} color="bg-emerald-100 text-emerald-600" label="发票核验" value={humanizeStatus(latestInvoice?.status)} />
      <SummaryCard icon={ShieldCheck} color="bg-slate-100 text-slate-600" label="对账结果" value={humanizeStatus(latestReconciliation?.status)} />
    </div>

    {supplierRoles.has(String(currentUser?.role)) && !bills.length ? <div className="rounded-md border border-blue-200 bg-blue-50 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">等待采购或财务生成结算单</div>
          <div className="mt-1 text-sm text-slate-600">结算单生成后，本页面会自动显示结算资料和发票上传区域。</div>
        </div>
        <Badge variant="info">当前无需操作</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workbench.purchaseOrders.map((order) => <div key={order.id} className="rounded border border-blue-100 bg-white px-4 py-3 text-sm">
          <div className="font-medium text-slate-900">{order.orderNo}</div>
          <div className="mt-1 text-slate-600">订单金额：{formatCurrency(order.totalAmount)}</div>
          <div className="mt-1 text-slate-600">收货状态：{humanizeStatus(order.status)}</div>
        </div>)}
      </div>
    </div> : null}

    {canCreateBill && billableOrders.length ? <Card><CardContent className="space-y-4 p-6">
      <div className="font-medium text-slate-900">生成结算单</div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm text-slate-600">已收货订单<select className={`${inputClass} mt-1`} value={billOrderId} onChange={(event) => setBillOrderId(event.target.value)}>{billableOrders.map((order) => <option key={order.id} value={order.id}>{order.orderNo} · {formatCurrency(order.totalAmount)}</option>)}</select></label>
        <label className="text-sm text-slate-600">结算期间<input className={`${inputClass} mt-1`} type="month" value={billPeriod} onChange={(event) => setBillPeriod(event.target.value)} /></label>
        <label className="text-sm text-slate-600">服务费率<input className={`${inputClass} mt-1`} type="number" min="0" max="1" step="0.01" value={serviceFeeRate} onChange={(event) => setServiceFeeRate(event.target.value)} /></label>
      </div><div className="flex justify-end"><Button variant="brand" disabled={Boolean(busyAction)} onClick={() => void createBill()}>{busyAction === 'create-bill' ? '生成中...' : '生成结算单'}</Button></div>
    </CardContent></Card> : null}

    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">结算单号</th><th className="px-4 py-3">订单号</th><th className="px-4 py-3">供应商</th><th className="px-4 py-3">结算金额</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">操作</th></tr></thead><tbody className="divide-y divide-slate-100">
      {bills.map((item) => <tr key={item.id} className={selectedBill?.id === item.id ? 'bg-teal-50/50' : ''}><td className="px-4 py-3 font-medium text-slate-900">{item.billNo}</td><td className="px-4 py-3 text-slate-600">{item.purchaseOrderNo ?? item.purchaseOrderId}</td><td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, item.supplierId)}</td><td className="px-4 py-3">{formatCurrency(item.settlementAmount)}</td><td className="px-4 py-3"><Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedBillId(item.id)}>选择</Button>{canSubmitBill && ['draft', 'rejected'].includes(item.status) ? <Button size="sm" variant="brand" disabled={Boolean(busyAction)} onClick={() => void submitBill(item.id)}><Send className="mr-1 h-4 w-4" />{busyAction === `submit:${item.id}` ? '提交中...' : '提交审核'}</Button> : null}</div></td></tr>)}
      {!bills.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">收货验收后，由采购或财务角色生成结算单。</td></tr> : null}
    </tbody></table></div></CardContent></Card>

    {canUploadFiles && selectedBill ? <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardContent className="space-y-4 p-6"><div className="font-medium text-slate-900">上传结算资料</div><label className="text-sm text-slate-600">资料类型<select className={`${inputClass} mt-1`} value={materialType} onChange={(event) => setMaterialType(event.target.value)}><option value="delivery_note">送货单</option><option value="acceptance_record">验收记录</option><option value="other">其他资料</option></select></label><label className="flex min-h-20 items-center gap-3 rounded-md border border-dashed border-slate-300 px-4 text-sm text-slate-600"><FileUp className="h-5 w-5 text-slate-400" /><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)} /></label><div className="flex justify-end"><Button variant="brand" disabled={!materialFile || Boolean(busyAction)} onClick={() => void uploadMaterial()}>{busyAction === 'material' ? '上传中...' : '上传资料'}</Button></div></CardContent></Card>
      <Card><CardContent className="space-y-4 p-6"><div className="font-medium text-slate-900">上传发票</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-600">发票号码<input className={`${inputClass} mt-1`} value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} /></label><label className="text-sm text-slate-600">发票类型<select className={`${inputClass} mt-1`} value={invoiceType} onChange={(event) => setInvoiceType(event.target.value)}><option value="special_vat">增值税专用发票</option><option value="normal_vat">增值税普通发票</option></select></label><label className="text-sm text-slate-600">开票日期<input className={`${inputClass} mt-1`} type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></label><label className="text-sm text-slate-600">含税金额<input className={`${inputClass} mt-1`} type="number" min="0.01" step="0.01" value={invoiceAmount} onChange={(event) => setInvoiceAmount(event.target.value)} /></label><label className="text-sm text-slate-600">税率<input className={`${inputClass} mt-1`} type="number" min="0" step="0.01" value={invoiceTaxRate} onChange={(event) => setInvoiceTaxRate(event.target.value)} /></label></div><label className="flex min-h-20 items-center gap-3 rounded-md border border-dashed border-slate-300 px-4 text-sm text-slate-600"><FileUp className="h-5 w-5 text-slate-400" /><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)} /></label><div className="flex justify-end"><Button variant="brand" disabled={!invoiceFile || Boolean(busyAction)} onClick={() => void uploadInvoice()}>{busyAction === 'invoice' ? '上传中...' : '上传发票'}</Button></div></CardContent></Card>
    </div> : null}

    <div className="grid gap-6 lg:grid-cols-2"><RecordList title="结算资料清单" empty="暂无结算资料。">{materials.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-4"><div className="flex justify-between gap-3"><div className="font-medium text-slate-900">{item.fileName ?? humanizeStatus(item.materialType)}</div><Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge></div><div className="mt-2 text-sm text-slate-600">{humanizeStatus(item.materialType)} · {formatDateTime(item.uploadedAt)}</div>{item.verificationOpinion ? <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.verificationOpinion}</div> : null}</div>)}</RecordList><RecordList title="发票与核验意见" empty="暂无发票。">{invoices.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-4"><div className="flex justify-between gap-3"><div className="font-medium text-slate-900">{item.invoiceNo}</div><Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge></div><div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><span>金额：{formatCurrency(item.amount)}</span><span>开票：{formatDateTime(item.issueDate, false)}</span></div>{item.verificationOpinion ? <div className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.verificationOpinion}</div> : null}</div>)}</RecordList></div>
  </div>;
}

function SummaryCard({ icon: Icon, color, label, value }: { icon: typeof Wallet; color: string; label: string; value: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="mb-1 text-xs text-slate-500">{label}</div><div className="truncate text-sm font-medium text-slate-900">{value}</div></div></CardContent></Card>;
}

function RecordList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return <Card><CardContent className="space-y-4 p-6"><div className="font-medium text-slate-900">{title}</div><div className="space-y-3">{hasChildren ? children : <div className="rounded bg-slate-50 p-4 text-sm text-slate-500">{empty}</div>}</div></CardContent></Card>;
}
