<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import FulfillmentOperationForm from "./FulfillmentOperationForm.vue";
import MallOrdersPanel from "./MallOrdersPanel.vue";
import OrderFulfillmentShell from "./OrderFulfillmentShell.vue";
import ProcurementOrdersPanel from "./ProcurementOrdersPanel.vue";
import ReceiptSummaryPanel from "./ReceiptSummaryPanel.vue";
import type { MallOrder, MallReceiptForm, MallShipmentForm, ProcurementOrderRow, ProcurementReceiptForm, ProjectRow, PurchaseOrder, SupplierRow, WorkbenchPayload } from "./types";

const session = useSessionStore();
const suppliers = ref<SupplierRow[]>([]);
const projects = ref<ProjectRow[]>([]);
const workbenches = ref<WorkbenchPayload[]>([]);
const mallOrders = ref<MallOrder[]>([]);
const loading = ref(false);
const error = ref("");
const message = ref("");
const processRefreshKey = ref(0);
const procurementReceiptForm = ref<ProcurementReceiptForm>({
  receiptType: "full",
  exceptionType: "quantity_mismatch",
  summary: "门店已完成收货验收。",
  receiptAt: "",
  receivedItems: ""
});
const mallShipmentForm = ref<MallShipmentForm>({
  carrier: "供应商配送",
  trackingNo: "",
  contactName: "",
  contactPhone: "",
  estimatedArrivalAt: "",
  shippedQuantity: undefined as number | undefined
});
const mallReceiptForm = ref<MallReceiptForm>({
  receiptType: "full",
  exceptionType: "quality_issue",
  summary: "商城订单已完成收货验收。",
  receivedItems: ""
});

const supplierNames = computed(() => new Map(suppliers.value.map((item) => [item.id, item.name])));
const visibleWorkbenches = computed(() => workbenches.value.filter((workbench) => !isTestLabel(workbench.project.name)));
const procurementOrders = computed<ProcurementOrderRow[]>(() =>
  visibleWorkbenches.value.flatMap((workbench) =>
    workbench.purchaseOrders.map((order) => ({
      ...order,
      projectName: workbench.project.name ?? "采购项目",
      receipts: workbench.receiptRecords.filter((receipt) => receipt.purchaseOrderId === order.id)
    }))
  )
);
const selectedMallOrderId = computed(() => [...mallOrders.value].sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)))[0]?.id ?? "");

const summary = computed(() => {
  const allOrders = [...procurementOrders.value, ...mallOrders.value];
  return {
    total: allOrders.length,
    waiting: allOrders.filter((item) => ["submitted", "pending_confirmation", "supplier_confirmed", "shipped"].includes(item.status)).length,
    exception: allOrders.filter((item) => ["exception", "return_requested", "return_rejected"].includes(item.status)).length,
    amount: allOrders.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)
  };
});

const canBuyerOperate = computed(() => ["buyer", "hotel_buyer", "platform_operator"].includes(session.roleId));
const canSupplierOperate = computed(() => ["supplier", "supplier_admin"].includes(session.roleId));

const summaryItems = computed<SummaryCardItem[]>(() => [
  { label: "订单总数", value: summary.value.total, meta: "招采订单与商城订单" },
  { label: "待处理", value: summary.value.waiting, meta: "待确认、待发货或待收货" },
  { label: "异常订单", value: summary.value.exception, meta: "退货或验收异常" },
  { label: "订单金额", value: money(summary.value.amount), meta: "当前角色可见范围" }
]);


function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function supplierName(supplierId: string) {
  return supplierNames.value.get(supplierId) ?? "供应商";
}

function isTestLabel(value?: string) {
  return /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? ""));
}

function firstProcurementLine(order: PurchaseOrder) {
  const line = order.lineItems[0];
  if (!line) return "-";
  return `${line.itemName} / ${line.quantity}${line.unit}`;
}

function firstMallLine(order: MallOrder) {
  const line = order.lineItems[0];
  if (!line) return "-";
  return `${line.productName} / ${line.quantity}${line.unit}`;
}

function parseReceivedItems(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [itemName, receivedQuantity, unit, accepted] = item.split("|").map((part) => part.trim());
      return {
        itemName,
        receivedQuantity: Number(receivedQuantity),
        unit: unit || "项",
        accepted: accepted === undefined ? true : !["false", "否", "不合格", "0"].includes(accepted)
      };
    })
    .filter((item) => item.itemName && Number.isFinite(item.receivedQuantity) && item.receivedQuantity > 0);
}

function defaultProcurementReceiptItems(order: PurchaseOrder) {
  return order.lineItems
    .map((line) => `${line.itemName}|${Math.max(0, line.quantity - line.receivedQuantity)}|${line.unit}|是`)
    .join("\n");
}

function defaultMallReceiptItems(order: MallOrder) {
  return order.lineItems.map((line) => `${line.productName}|${line.quantity}|${line.unit}|是`).join("\n");
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [supplierData, projectData, mallData] = await Promise.all([
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })),
      apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })),
      apiGet<{ orders: MallOrder[] }>("/api/mall/orders").catch(() => ({ orders: [] }))
    ]);
    suppliers.value = supplierData.suppliers;
    projects.value = projectData.projects.filter((project) => !isTestLabel(project.name));
    mallOrders.value = mallData.orders;
    const workbenchResults = await Promise.all(
      projects.value.slice(0, 8).map((project) =>
        apiGet<WorkbenchPayload>(`/api/project-workbench/projects/${project.id}`).catch(() => null)
      )
    );
    workbenches.value = workbenchResults.filter((item): item is WorkbenchPayload => Boolean(item));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "订单履约数据加载失败";
  } finally {
    loading.value = false;
  }
}

async function run(action: () => Promise<void>, successText: string) {
  error.value = "";
  message.value = "";
  try {
    await action();
    message.value = successText;
    await load();
    processRefreshKey.value += 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function confirmPurchaseOrder(order: PurchaseOrder) {
  return run(() => apiPost(`/api/project-workbench/purchase-orders/${order.id}/confirm`), "采购订单已确认");
}

function receivePurchaseOrder(order: PurchaseOrder, exception = procurementReceiptForm.value.receiptType === "exception") {
  const receiptType = exception ? "exception" : procurementReceiptForm.value.receiptType;
  const receivedItems = parseReceivedItems(procurementReceiptForm.value.receivedItems || defaultProcurementReceiptItems(order));
  return run(
    () =>
      apiPost(`/api/project-workbench/purchase-orders/${order.id}/receipts`, {
        receiptType,
        exceptionType: receiptType === "exception" ? procurementReceiptForm.value.exceptionType : undefined,
        summary: procurementReceiptForm.value.summary,
        receiptAt: procurementReceiptForm.value.receiptAt || undefined,
        receivedItems: receivedItems.length ? receivedItems : undefined
      }),
    exception ? "异常收货已登记" : "收货验收已登记"
  );
}

function shipMallOrder(order: MallOrder) {
  return run(async () => {
    if (order.status === "submitted") await apiPost(`/api/mall/orders/${order.id}/confirm`);
    await apiPost(`/api/mall/orders/${order.id}/shipments`, {
      carrier: mallShipmentForm.value.carrier,
      trackingNo: mallShipmentForm.value.trackingNo || `WL-${Date.now()}`,
      contactName: mallShipmentForm.value.contactName || undefined,
      contactPhone: mallShipmentForm.value.contactPhone || undefined,
      estimatedArrivalAt: mallShipmentForm.value.estimatedArrivalAt || undefined,
      shippedQuantity: mallShipmentForm.value.shippedQuantity
    });
  }, "商城订单已登记发货");
}

function receiveMallOrder(order: MallOrder) {
  const receivedItems = parseReceivedItems(mallReceiptForm.value.receivedItems || defaultMallReceiptItems(order));
  return run(
    () =>
      apiPost(`/api/mall/orders/${order.id}/receive`, {
        receiptType: mallReceiptForm.value.receiptType,
        exceptionType: mallReceiptForm.value.receiptType === "exception" ? mallReceiptForm.value.exceptionType : undefined,
        summary: mallReceiptForm.value.summary,
        receivedItems: receivedItems.length ? receivedItems : undefined
      }),
    "商城订单已收货"
  );
}

onMounted(load);
</script>

<template>
  <OrderFulfillmentShell
    :loading="loading"
    :message="message"
    :error="error"
    :selected-mall-order-id="selectedMallOrderId"
    :process-refresh-key="processRefreshKey"
    :summary-items="summaryItems"
  />

  <FulfillmentOperationForm
    v-model:procurement-receipt-form="procurementReceiptForm"
    v-model:mall-receipt-form="mallReceiptForm"
    v-model:mall-shipment-form="mallShipmentForm"
  />

  <ProcurementOrdersPanel
    :orders="procurementOrders"
    :can-buyer-operate="canBuyerOperate"
    :can-supplier-operate="canSupplierOperate"
    :supplier-name="supplierName"
    :first-procurement-line="firstProcurementLine"
    :label-status="labelStatus"
    :money="money"
    @confirm="confirmPurchaseOrder"
    @receive="receivePurchaseOrder"
    @exception="(order) => receivePurchaseOrder(order, true)"
  />

  <MallOrdersPanel
    :orders="mallOrders"
    :can-buyer-operate="canBuyerOperate"
    :can-supplier-operate="canSupplierOperate"
    :supplier-name="supplierName"
    :first-mall-line="firstMallLine"
    :label-status="labelStatus"
    :money="money"
    @ship="shipMallOrder"
    @receive="receiveMallOrder"
  />

  <ReceiptSummaryPanel :workbenches="visibleWorkbenches" :label-status="labelStatus" :format-date-time="formatDateTime" />
</template>

