<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface SupplierRow {
  id: string;
  name: string;
}

interface ProjectRow {
  id: string;
  name?: string;
  orgName?: string;
}

interface PurchaseOrderLine {
  id: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  receivedQuantity: number;
}

interface PurchaseOrder {
  id: string;
  projectId: string;
  supplierId: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  expectedDeliveryAt: string;
  receivingLocation: string;
  statusRemark?: string;
  updatedAt?: string;
  lineItems: PurchaseOrderLine[];
}

interface ReceiptRecord {
  id: string;
  purchaseOrderId: string;
  receiptType: string;
  exceptionType?: string;
  acceptanceResult: string;
  handlingStatus: string;
  summary: string;
  receiptAt: string;
}

interface WorkbenchPayload {
  project: ProjectRow;
  purchaseOrders: PurchaseOrder[];
  receiptRecords: ReceiptRecord[];
}

interface MallOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  lineItems: Array<{ productName: string; quantity: number; unit: string; totalPrice: number }>;
}

const session = useSessionStore();
const suppliers = ref<SupplierRow[]>([]);
const projects = ref<ProjectRow[]>([]);
const workbenches = ref<WorkbenchPayload[]>([]);
const mallOrders = ref<MallOrder[]>([]);
const loading = ref(false);
const error = ref("");
const message = ref("");
const processRefreshKey = ref(0);
const procurementReceiptForm = ref({
  receiptType: "full",
  exceptionType: "quantity_mismatch",
  summary: "门店已完成收货验收。",
  receiptAt: "",
  receivedItems: ""
});
const mallShipmentForm = ref({
  carrier: "供应商配送",
  trackingNo: "",
  contactName: "",
  contactPhone: "",
  estimatedArrivalAt: "",
  shippedQuantity: undefined as number | undefined
});
const mallReceiptForm = ref({
  receiptType: "full",
  exceptionType: "quality_issue",
  summary: "商城订单已完成收货验收。",
  receivedItems: ""
});

const supplierNames = computed(() => new Map(suppliers.value.map((item) => [item.id, item.name])));
const projectNames = computed(() => new Map(projects.value.map((item) => [item.id, item.name ?? item.id])));

const procurementOrders = computed(() =>
  workbenches.value.filter((workbench) => !isTestLabel(workbench.project.name)).flatMap((workbench) =>
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
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">订单履约</p>
        <h2>履约跟踪与收货验收</h2>
      </div>
      <div class="summary-strip">
        <span><strong>{{ summary.total }}</strong> 订单</span>
        <span><strong>{{ summary.waiting }}</strong> 待处理</span>
        <span><strong>{{ summary.exception }}</strong> 异常</span>
        <span><strong>{{ money(summary.amount) }}</strong> 金额</span>
      </div>
    </div>
    <p v-if="message" class="notice">{{ message }}</p>
    <p v-if="loading" class="notice">正在加载订单履约数据...</p>
  </section>

  <ProcessTimeline
    v-if="selectedMallOrderId"
    business-type="order_fulfillment"
    :business-id="selectedMallOrderId"
    title="商城订单履约流程"
    :refresh-key="processRefreshKey"
  />

  <section class="business-panel">
    <div class="panel-head">
      <h3>履约操作参数</h3>
    </div>
    <div class="form-grid">
      <label>
        招采收货类型
        <select v-model="procurementReceiptForm.receiptType">
          <option value="full">全部收货</option>
          <option value="partial">部分收货</option>
          <option value="exception">异常收货</option>
        </select>
      </label>
      <label>
        招采异常类型
        <select v-model="procurementReceiptForm.exceptionType">
          <option value="quantity_mismatch">数量差异</option>
          <option value="quality_issue">质量问题</option>
          <option value="delivery_delay">交付延期</option>
          <option value="missing_documents">资料缺失</option>
          <option value="other">其他</option>
        </select>
      </label>
      <label>
        招采收货时间
        <input v-model="procurementReceiptForm.receiptAt" type="datetime-local" />
      </label>
      <label>
        招采收货摘要
        <input v-model="procurementReceiptForm.summary" />
      </label>
      <label>
        招采收货明细
        <textarea v-model="procurementReceiptForm.receivedItems" rows="3" placeholder="物资名|数量|单位|是"></textarea>
      </label>
      <label>
        商城收货类型
        <select v-model="mallReceiptForm.receiptType">
          <option value="full">全部收货</option>
          <option value="partial">部分收货</option>
          <option value="exception">异常收货</option>
        </select>
      </label>
      <label>
        商城异常类型
        <select v-model="mallReceiptForm.exceptionType">
          <option value="quantity_mismatch">数量差异</option>
          <option value="quality_issue">质量问题</option>
          <option value="delivery_delay">交付延期</option>
          <option value="missing_documents">资料缺失</option>
          <option value="other">其他</option>
        </select>
      </label>
      <label>
        商城收货摘要
        <input v-model="mallReceiptForm.summary" />
      </label>
      <label>
        商城收货明细
        <textarea v-model="mallReceiptForm.receivedItems" rows="3" placeholder="商品名|数量|单位|是"></textarea>
      </label>
    </div>
    <div class="form-grid">
      <label>
        承运商
        <input v-model="mallShipmentForm.carrier" />
      </label>
      <label>
        物流单号
        <input v-model="mallShipmentForm.trackingNo" placeholder="不填自动生成" />
      </label>
      <label>
        联系人
        <input v-model="mallShipmentForm.contactName" />
      </label>
      <label>
        联系电话
        <input v-model="mallShipmentForm.contactPhone" />
      </label>
      <label>
        预计到达
        <input v-model="mallShipmentForm.estimatedArrivalAt" type="datetime-local" />
      </label>
      <label>
        发货数量
        <input v-model.number="mallShipmentForm.shippedQuantity" type="number" min="1" />
      </label>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>招采订单</h3>
      <span class="tag">{{ procurementOrders.length }} 单</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>项目</th>
            <th>供应商</th>
            <th>主要物资</th>
            <th>状态</th>
            <th>交付/收货</th>
            <th>金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in procurementOrders" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>{{ order.projectName }}</td>
            <td>{{ supplierName(order.supplierId) }}</td>
            <td>{{ firstProcurementLine(order) }}</td>
            <td>{{ labelStatus(order.status) }}</td>
            <td>
              {{ order.expectedDeliveryAt }}<br />
              <small>{{ order.receivingLocation }}</small>
            </td>
            <td>{{ money(order.totalAmount) }}</td>
            <td>
              <button v-if="canSupplierOperate && order.status === 'pending_confirmation'" type="button" @click="confirmPurchaseOrder(order)">确认订单</button>
              <button v-if="canBuyerOperate && ['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(order.status)" type="button" @click="receivePurchaseOrder(order)">
                收货验收
              </button>
              <button v-if="canBuyerOperate && ['supplier_confirmed', 'performing', 'partially_received'].includes(order.status)" type="button" class="secondary-button" @click="receivePurchaseOrder(order, true)">
                登记异常
              </button>
              <span v-if="!canBuyerOperate && !canSupplierOperate" class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!procurementOrders.length" class="empty compact-empty">当前角色暂无可见招采订单。</div>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>商品目录订单</h3>
      <span class="tag">{{ mallOrders.length }} 单</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>供应商</th>
            <th>商品</th>
            <th>状态</th>
            <th>付款</th>
            <th>收货地点</th>
            <th>金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in mallOrders" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>{{ supplierName(order.supplierId) }}</td>
            <td>{{ firstMallLine(order) }}</td>
            <td>{{ labelStatus(order.status) }}</td>
            <td>{{ labelStatus(order.paymentStatus ?? 'pending') }}</td>
            <td>{{ order.shippingAddress }}</td>
            <td>{{ money(order.totalAmount) }}</td>
            <td>
              <button v-if="canSupplierOperate && ['submitted', 'supplier_confirmed'].includes(order.status)" type="button" @click="shipMallOrder(order)">登记发货</button>
              <button v-if="canBuyerOperate && order.status === 'shipped'" type="button" @click="receiveMallOrder(order)">确认收货</button>
              <span v-if="!canBuyerOperate && !canSupplierOperate" class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!mallOrders.length" class="empty compact-empty">当前角色暂无可见商品订单。</div>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>近期验收记录</h3>
    </div>
    <div class="work-list">
      <article v-for="workbench in workbenches.filter((item) => !isTestLabel(item.project.name))" :key="workbench.project.id" class="work-list-row">
        <span class="tag">{{ workbench.receiptRecords.length }} 条</span>
        <strong>{{ workbench.project.name }}</strong>
        <small>
          <span v-for="receipt in workbench.receiptRecords.slice(0, 2)" :key="receipt.id">
            {{ labelStatus(receipt.acceptanceResult) }} / {{ labelStatus(receipt.handlingStatus) }} / {{ formatDateTime(receipt.receiptAt) }}
          </span>
        </small>
      </article>
    </div>
  </section>

  <ErrorAlert v-if="error" :message="error" />
</template>
