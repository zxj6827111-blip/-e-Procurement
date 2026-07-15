import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileArchive,
  FileCheck,
  FileUp,
  ListFilter,
  PackagePlus,
  Receipt,
  Star,
  Truck
} from 'lucide-react';
import { apiPost, uploadFile } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import {
  calculateArchiveCompleteness,
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';
import { FulfillmentWorkbenchListView } from './FulfillmentWorkbenchListView';
import { FulfillmentProjectPicker } from './FulfillmentProjectPicker';
import type { FulfillmentOverviewStatus } from './fulfillment-overview-data';

type ReceiptType = 'partial' | 'full' | 'exception';
type EvaluationDimension = 'quality' | 'delivery' | 'service' | 'cooperation' | 'priceReasonableness';

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#006666] focus:ring-1 focus:ring-[#006666]';
const receivableStatuses = new Set(['supplier_confirmed', 'performing', 'partially_received', 'exception']);
const evaluationLabels: Record<EvaluationDimension, string> = {
  quality: '质量',
  delivery: '交付',
  service: '服务',
  cooperation: '配合',
  priceReasonableness: '价格合理性'
};

export function ProjectFulfillmentView() {
  const { currentProjectId } = useApp();
  return currentProjectId ? <ProjectFulfillmentDetailView /> : <FulfillmentWorkbenchListView />;
}

function ProjectFulfillmentDetailView() {
  const { currentProjectId, currentUser, navigateToPath, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [receiptOrderId, setReceiptOrderId] = useState('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('full');
  const [receiptExceptionType, setReceiptExceptionType] = useState('quantity_mismatch');
  const [receiptSummary, setReceiptSummary] = useState('全部到货并验收通过。');
  const [receiptAt, setReceiptAt] = useState('');
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [handlingStatus, setHandlingStatus] = useState('supplemented');
  const [handlingNote, setHandlingNote] = useState('异常事项已补充核实并完成处理。');
  const [evaluationOrderId, setEvaluationOrderId] = useState('');
  const [evaluationDescription, setEvaluationDescription] = useState('收货、服务和结算资料配合情况良好。');
  const [evaluationScores, setEvaluationScores] = useState<Record<EvaluationDimension, number>>({
    quality: 90,
    delivery: 90,
    service: 90,
    cooperation: 90,
    priceReasonableness: 90
  });

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) setCurrentProjectId(resolvedProjectId);
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const canMaintainOrder = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
  const supplierSide = ['SUPPLIER', 'SUPPLIER_ADMIN', 'SUPPLIER_BIDDER'].includes(String(currentUser?.role));
  const confirmedContract = workbench?.contracts.find((contract) => ['registered', 'performing', 'completed'].includes(contract.status));
  const canGenerateOrder =
    canMaintainOrder &&
    Boolean(confirmedContract) &&
    workbench?.purchaseOrders.length === 0 &&
    workbench.awardApprovals.some((item) => item.approvalStatus === 'approved') &&
    ['awarded_pending_order', 'result_notified', 'contract_registered'].includes(workbench.project.status);
  const receivableOrders = useMemo(
    () => workbench?.purchaseOrders.filter((order) => receivableStatuses.has(order.status)) ?? [],
    [workbench]
  );
  const evaluableOrders = useMemo(
    () => workbench?.purchaseOrders.filter((order) => ['received', 'closed'].includes(order.status)) ?? [],
    [workbench]
  );
  const selectedReceiptOrder = workbench?.purchaseOrders.find((order) => order.id === receiptOrderId) ?? receivableOrders[0] ?? null;

  useEffect(() => {
    if (!receivableOrders.length) {
      setReceiptOrderId('');
      return;
    }
    if (!receivableOrders.some((order) => order.id === receiptOrderId)) setReceiptOrderId(receivableOrders[0].id);
  }, [receivableOrders, receiptOrderId]);

  useEffect(() => {
    if (!evaluableOrders.length) {
      setEvaluationOrderId('');
      return;
    }
    if (!evaluableOrders.some((order) => order.id === evaluationOrderId)) setEvaluationOrderId(evaluableOrders[0].id);
  }, [evaluableOrders, evaluationOrderId]);

  useEffect(() => {
    if (!selectedReceiptOrder) return;
    setReceiptQuantities(
      Object.fromEntries(
        selectedReceiptOrder.lineItems.map((line) => {
          const remaining = Math.max(0, line.quantity - line.receivedQuantity);
          const partialQuantity = Math.min(line.quantity, line.receivedQuantity + Math.max(1, Math.ceil(remaining / 2)));
          return [line.id, String(receiptType === 'full' ? line.quantity : partialQuantity)];
        })
      )
    );
    setReceiptSummary(
      receiptType === 'exception'
        ? '登记异常收货并进入后续处理。'
        : receiptType === 'partial'
          ? '本次到货已完成部分收货验收。'
          : '全部到货并验收通过。'
    );
  }, [selectedReceiptOrder?.id, receiptType]);

  const archivePercent = calculateArchiveCompleteness(workbench);
  const latestEvaluation = useMemo(
    () => (workbench ? sortByNewest(workbench.supplierEvaluations, (item) => item.id)[0] ?? null : null),
    [workbench]
  );
  const currentFulfillmentStatus = useMemo<FulfillmentOverviewStatus>(() => {
    const order = workbench?.purchaseOrders[0];
    const contract = workbench?.contracts[0];
    if (!order) return contract?.status === 'pending_supplier_confirmation' ? 'pending_contract_confirmation' : 'pending_order_generation';
    const hasOpenException =
      order.status === 'exception' ||
      workbench.receiptRecords.some((receipt) => receipt.receiptType === 'exception' && receipt.handlingStatus !== 'closed');
    if (hasOpenException) return 'exception';
    if (order.status === 'pending_confirmation') return 'pending_supplier_confirmation';
    if (order.status === 'supplier_confirmed' || order.status === 'performing') return 'pending_receipt';
    if (order.status === 'partially_received') return 'partially_received';
    if (order.status === 'received' || order.status === 'closed') {
      return workbench.supplierEvaluations.some((evaluation) => evaluation.status === 'submitted_locked') ? 'completed' : 'pending_evaluation';
    }
    return 'pending_receipt';
  }, [workbench]);
  const summaryCards: Array<{ label: string; value: string; icon: typeof FileCheck; color: string }> = [
    { label: '采购订单', value: `${workbench?.purchaseOrders.length ?? 0} 张`, icon: FileCheck, color: 'bg-blue-100 text-blue-600' },
    { label: '收货记录', value: `${workbench?.receiptRecords.length ?? 0} 条`, icon: Truck, color: 'bg-amber-100 text-amber-600' },
    { label: '供应商评价', value: `${workbench?.supplierEvaluations.length ?? 0} 条`, icon: Star, color: 'bg-emerald-100 text-emerald-600' },
    { label: '档案完整度', value: `${archivePercent}%`, icon: FileArchive, color: 'bg-slate-100 text-slate-600' }
  ];

  async function runAction(key: string, action: () => Promise<unknown>, successMessage: string) {
    if (!currentUser || busyAction) return;
    setBusyAction(key);
    setActionMessage('');
    setActionError('');
    try {
      await action();
      setActionMessage(successMessage);
      reload();
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : '操作失败，请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  }

  function generatePurchaseOrder() {
    if (!resolvedProjectId || !workbench || !canGenerateOrder) return;
    return runAction(
      'generate',
      () =>
        apiPost(
          `/api/project-workbench/projects/${encodeURIComponent(resolvedProjectId)}/purchase-orders/generate`,
          {
            expectedDeliveryAt: workbench.procurementRequest?.expectedArrivalAt,
            receivingLocation: workbench.procurementRequest?.receivingLocation
          },
          currentUser?.id
        ),
      '采购订单已生成，等待供应商确认。'
    );
  }

  function confirmPurchaseOrder(orderId: string, orderNo: string) {
    return runAction(
      `confirm:${orderId}`,
      () => apiPost(`/api/project-workbench/purchase-orders/${encodeURIComponent(orderId)}/confirm`, {}, currentUser?.id),
      `采购订单 ${orderNo} 已确认，项目进入履约阶段。`
    );
  }

  async function recordReceipt() {
    if (!selectedReceiptOrder || !resolvedProjectId) return;
    const receivedItems = selectedReceiptOrder.lineItems.map((line) => ({
      itemName: line.itemName,
      receivedQuantity: Number(receiptQuantities[line.id] ?? line.receivedQuantity),
      unit: line.unit,
      accepted: receiptType !== 'exception'
    }));
    if (receivedItems.some((item) => !Number.isFinite(item.receivedQuantity) || item.receivedQuantity < 0)) {
      setActionError('请填写有效的累计实收数量。');
      return;
    }
    await runAction(
      `receipt:${selectedReceiptOrder.id}`,
      async () => {
        const attachmentMetadata = receiptFile
          ? [
              (
                await uploadFile(
                  receiptFile,
                  {
                    attachmentKind: 'receipt_record_attachment',
                    objectType: 'receipt_record',
                    objectId: `${selectedReceiptOrder.id}-${Date.now()}`,
                    projectId: resolvedProjectId,
                    supplierId: selectedReceiptOrder.supplierId
                  },
                  currentUser?.id
                )
              ).file
            ]
          : [];
        await apiPost(
          `/api/project-workbench/purchase-orders/${encodeURIComponent(selectedReceiptOrder.id)}/receipts`,
          {
            receiptType,
            exceptionType: receiptType === 'exception' ? receiptExceptionType : undefined,
            summary: receiptSummary.trim(),
            receiptAt: receiptAt || undefined,
            receivedItems,
            attachmentMetadata
          },
          currentUser?.id
        );
        setReceiptFile(null);
      },
      receiptType === 'exception' ? '异常收货已登记，请继续处理异常。' : '收货验收记录已保存。'
    );
  }

  function handleReceiptException(receiptId: string) {
    return runAction(
      `handle:${receiptId}`,
      () =>
        apiPost(
          `/api/project-workbench/receipts/${encodeURIComponent(receiptId)}/handle`,
          { handlingStatus, handlingNote: handlingNote.trim() },
          currentUser?.id
        ),
      '收货异常处理结果已保存。'
    );
  }

  function submitEvaluation() {
    if (!evaluationOrderId) return;
    return runAction(
      'evaluation',
      () =>
        apiPost(
          `/api/project-workbench/purchase-orders/${encodeURIComponent(evaluationOrderId)}/evaluations`,
          { dimensions: evaluationScores, description: evaluationDescription.trim() },
          currentUser?.id
        ),
      '供应商履约评价已提交并锁定。'
    );
  }

  if (loading && !workbench) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">履约数据加载中...</div>;
  if (error && !workbench) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  if (!workbench || !resolvedProjectId) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的项目。</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">项目履约与结算</h2>
          <p className="mt-1 text-sm text-slate-500">{workbench.project.code} / {workbench.project.name}</p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <FulfillmentProjectPicker
            currentProject={{
              id: workbench.project.id,
              code: workbench.project.code,
              name: workbench.project.name,
              status: workbench.project.status,
              fulfillmentStatus: currentFulfillmentStatus,
              externalTradeFlag: Boolean(workbench.project.externalTradeFlag),
              supplierName: workbench.purchaseOrders[0]
                ? resolveSupplierName(workbench, workbench.purchaseOrders[0].supplierId)
                : workbench.contracts[0]
                  ? resolveSupplierName(workbench, workbench.contracts[0].supplierId)
                  : '暂未关联供应商'
            }}
          />
          <Button variant="outline" onClick={() => navigateToPath('/order-fulfillment')}>
            <ListFilter className="mr-2 h-4 w-4" />履约工作台
          </Button>
          {canGenerateOrder ? (
            <Button variant="brand" onClick={() => void generatePurchaseOrder()} disabled={Boolean(busyAction)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              {busyAction === 'generate' ? '生成中...' : '生成采购订单'}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setCurrentView(supplierSide ? 'SETTLEMENT_MATS' : 'SETTLEMENT')}>
            <Receipt className="mr-2 h-4 w-4" />进入结算
          </Button>
          {!supplierSide ? (
            <Button variant="outline" onClick={() => setCurrentView('AUDIT_LOG')}>
              <FileArchive className="mr-2 h-4 w-4" />档案归集
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setCurrentView('PROJECT_DETAIL')}>返回项目详情</Button>
        </div>
      </div>

      {actionMessage || actionError ? (
        <div className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${actionError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`} role="status">
          {actionError ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {actionError || actionMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}><Icon className="h-5 w-5" /></div>
              <div><p className="mb-1 text-xs text-slate-500">{label}</p><p className="text-sm font-medium">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900"><Truck className="h-5 w-5 text-[#006666]" />采购订单</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600"><tr>
                <th className="px-4 py-3">订单编号</th><th className="px-4 py-3">供应商</th><th className="px-4 py-3">金额</th><th className="px-4 py-3">计划到货</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">操作</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {workbench.purchaseOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{order.orderNo}</td>
                    <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, order.supplierId)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(order.expectedDeliveryAt)}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadgeVariant(order.status)}>{humanizeStatus(order.status)}</Badge></td>
                    <td className="px-4 py-3">
                      {supplierSide && order.status === 'pending_confirmation' ? (
                        <Button size="sm" variant="brand" onClick={() => void confirmPurchaseOrder(order.id, order.orderNo)} disabled={Boolean(busyAction)}>{busyAction === `confirm:${order.id}` ? '确认中...' : '确认订单'}</Button>
                      ) : canMaintainOrder && receivableStatuses.has(order.status) ? (
                        <Button size="sm" variant="outline" onClick={() => setReceiptOrderId(order.id)}>登记收货</Button>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                  </tr>
                ))}
                {!workbench.purchaseOrders.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">当前尚未生成采购订单。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canMaintainOrder ? (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2 font-medium text-slate-900"><ClipboardCheck className="h-5 w-5 text-[#006666]" />收货验收登记</div>
            {!receivableOrders.length ? (
              <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">暂无可登记收货的订单。订单需先由供应商确认。</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <label className="text-sm text-slate-600">采购订单<select className={`${inputClass} mt-1`} value={selectedReceiptOrder?.id ?? ''} onChange={(event) => setReceiptOrderId(event.target.value)}>{receivableOrders.map((order) => <option key={order.id} value={order.id}>{order.orderNo}</option>)}</select></label>
                  <label className="text-sm text-slate-600">验收类型<select className={`${inputClass} mt-1`} value={receiptType} onChange={(event) => setReceiptType(event.target.value as ReceiptType)}><option value="full">全部收货</option><option value="partial">部分收货</option><option value="exception">异常收货</option></select></label>
                  {receiptType === 'exception' ? <label className="text-sm text-slate-600">异常类型<select className={`${inputClass} mt-1`} value={receiptExceptionType} onChange={(event) => setReceiptExceptionType(event.target.value)}><option value="quantity_mismatch">数量不符</option><option value="quality_issue">质量问题</option><option value="delivery_delay">交付延迟</option><option value="missing_documents">单据缺失</option><option value="other">其他</option></select></label> : null}
                  <label className="text-sm text-slate-600">验收时间<input className={`${inputClass} mt-1`} type="datetime-local" value={receiptAt} onChange={(event) => setReceiptAt(event.target.value)} /></label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedReceiptOrder?.lineItems.map((line) => (
                    <label key={line.id} className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                      <span className="mb-2 block font-medium text-slate-900">{line.itemName}（订单 {line.quantity} {line.unit}，已收 {line.receivedQuantity}）</span>
                      <input className={inputClass} type="number" min={line.receivedQuantity} max={line.quantity} step="0.01" value={receiptQuantities[line.id] ?? ''} onChange={(event) => setReceiptQuantities((current) => ({ ...current, [line.id]: event.target.value }))} aria-label={`${line.itemName}累计实收数量`} />
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-600">验收说明<textarea className={`${inputClass} mt-1 min-h-24`} value={receiptSummary} onChange={(event) => setReceiptSummary(event.target.value)} /></label>
                  <label className="text-sm text-slate-600">验收附件（可选）<span className="mt-1 flex min-h-24 items-center gap-3 rounded-md border border-dashed border-slate-300 px-4"><FileUp className="h-5 w-5 text-slate-400" /><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)} /></span></label>
                </div>
                <div className="flex justify-end"><Button variant="brand" disabled={Boolean(busyAction)} onClick={() => void recordReceipt()}>{busyAction?.startsWith('receipt:') ? '保存中...' : '保存验收记录'}</Button></div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="flex items-center gap-2 font-medium text-slate-900"><AlertTriangle className="h-5 w-5 text-[#006666]" />收货与异常处理</h3>
            {canMaintainOrder && workbench.receiptRecords.some((item) => item.receiptType === 'exception' && item.handlingStatus !== 'closed') ? (
              <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 md:grid-cols-2">
                <select className={inputClass} value={handlingStatus} onChange={(event) => setHandlingStatus(event.target.value)}><option value="supplemented">已补充处理</option><option value="rejected">处理驳回</option><option value="closed">关闭异常</option></select>
                <input className={inputClass} value={handlingNote} onChange={(event) => setHandlingNote(event.target.value)} placeholder="处理说明" />
              </div>
            ) : null}
            <div className="space-y-3">
              {sortByNewest(workbench.receiptRecords, (item) => item.receiptAt ?? item.createdAt).map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3"><div><div className="font-medium text-slate-900">{humanizeStatus(item.receiptType)} · {item.id}</div><div className="mt-1 text-xs text-slate-500">{formatDateTime(item.receiptAt ?? item.createdAt)}</div></div><Badge variant={statusBadgeVariant(item.handlingStatus ?? item.status)}>{humanizeStatus(item.handlingStatus ?? item.status)}</Badge></div>
                  <p className="mt-3 text-sm text-slate-700">{item.summary}</p>
                  {item.handlingNote ? <p className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">{item.handlingNote}</p> : null}
                  {canMaintainOrder && item.receiptType === 'exception' && item.handlingStatus !== 'closed' ? <div className="mt-3 flex justify-end"><Button size="sm" variant="outline" disabled={Boolean(busyAction)} onClick={() => void handleReceiptException(item.id)}>{busyAction === `handle:${item.id}` ? '处理中...' : '保存处理结果'}</Button></div> : null}
                </div>
              ))}
              {!workbench.receiptRecords.length ? <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">暂无收货验收记录。</div> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-medium text-slate-900"><Star className="h-5 w-5 text-[#006666]" />供应商履约评价</h3>{latestEvaluation ? <Badge variant={statusBadgeVariant(latestEvaluation.status)}>{humanizeStatus(latestEvaluation.status)}</Badge> : null}</div>
            {canMaintainOrder && evaluableOrders.length ? (
              <div className="space-y-4 rounded-md border border-slate-200 p-4">
                <label className="text-sm text-slate-600">评价订单<select className={`${inputClass} mt-1`} value={evaluationOrderId} onChange={(event) => setEvaluationOrderId(event.target.value)}>{evaluableOrders.map((order) => <option key={order.id} value={order.id}>{order.orderNo}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(evaluationLabels) as EvaluationDimension[]).map((key) => <label key={key} className="text-sm text-slate-600">{evaluationLabels[key]}<input className={`${inputClass} mt-1`} type="number" min="0" max="100" value={evaluationScores[key]} onChange={(event) => setEvaluationScores((current) => ({ ...current, [key]: Math.max(0, Math.min(100, Number(event.target.value))) }))} /></label>)}
                </div>
                <label className="text-sm text-slate-600">评价说明<textarea className={`${inputClass} mt-1 min-h-20`} value={evaluationDescription} onChange={(event) => setEvaluationDescription(event.target.value)} /></label>
                <div className="flex justify-end"><Button variant="brand" disabled={Boolean(busyAction)} onClick={() => void submitEvaluation()}>{busyAction === 'evaluation' ? '提交中...' : '提交并锁定评价'}</Button></div>
              </div>
            ) : null}
            {latestEvaluation ? (
              <div className="rounded-md bg-slate-50 p-4"><div className="font-medium text-slate-900">{resolveSupplierName(workbench, latestEvaluation.supplierId)} · {latestEvaluation.score} 分</div><p className="mt-2 text-sm text-slate-700">{latestEvaluation.description}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(latestEvaluation.dimensions).map(([key, value]) => <div key={key} className="flex justify-between text-sm text-slate-600"><span>{evaluationLabels[key as EvaluationDimension] ?? key}</span><span className="font-medium text-slate-900">{value}</span></div>)}</div></div>
            ) : <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">订单全部收货或关闭后可提交履约评价。</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
