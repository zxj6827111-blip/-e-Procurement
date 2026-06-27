<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { apiGet } from "../api/http";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelAuditAction, labelObjectType, labelStatus } from "../utils/status-labels";

interface ProjectRow {
  id: string;
  name?: string;
  title?: string;
  status: string;
  budgetAmount?: number;
  supplierId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SupplierRow {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  qualification?: string;
  risk?: string;
  qualificationAttachments?: unknown[];
  sealSamples?: unknown[];
  admissionReviews?: Array<{ status: string; reviewedAt?: string; opinion?: string }>;
}

interface ProductRow {
  id: string;
  name: string;
  status: string;
  supplierName?: string;
  supplierId: string;
  activePrice?: { salePrice?: number; price?: number; deliveryDays?: number } | null;
}

interface OrderRow {
  id: string;
  orderNo: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  createdAt?: string;
}

interface AuditRow {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  createdAt?: string;
  result?: string;
}

interface WorkbenchPayload {
  purchaseOrders: OrderRow[];
}

const session = useSessionStore();
const health = ref("检查中");
const projects = ref<ProjectRow[]>([]);
const suppliers = ref<SupplierRow[]>([]);
const products = ref<ProductRow[]>([]);
const orders = ref<OrderRow[]>([]);
const auditLogs = ref<AuditRow[]>([]);
const loadError = ref("");

const procurementRoles = new Set(["group_manager", "buyer", "hotel_buyer", "platform_operator"]);
const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const financeRoles = new Set(["hotel_finance", "finance_reviewer"]);
const auditRoles = new Set(["auditor"]);

function isTestLabel(value?: string) {
  return /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? ""));
}

function isFormalProject(project: ProjectRow) {
  return !isTestLabel(project.name) && !isTestLabel(project.title);
}

function canReadProjects(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor", "supplier", "supplier_admin", "supplier_quotation"].includes(roleId);
}

function canReadSuppliers(roleId: string) {
  return ["group_manager", "buyer", "platform_operator", "supplier", "supplier_admin", "auditor"].includes(roleId);
}

function canReadAuditLogs(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "finance_reviewer", "auditor"].includes(roleId);
}

function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function productPrice(product: ProductRow) {
  const price = product.activePrice;
  if (!price) return "待定价";
  return money(price.salePrice ?? price.price);
}

function supplierName(supplierId: string) {
  return suppliers.value.find((item) => item.id === supplierId)?.name ?? "供应商";
}

function combineOrders(mallOrders: OrderRow[], procurementOrders: OrderRow[]) {
  const seen = new Set<string>();
  return [...procurementOrders, ...mallOrders].filter((order) => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}

const roleTitle = computed(() => {
  if (supplierRoles.has(session.roleId)) return "供应商工作台";
  if (financeRoles.has(session.roleId)) return "财务工作台";
  if (auditRoles.has(session.roleId)) return "监督工作台";
  if (session.roleId === "admin") return "系统配置工作台";
  return "采购工作台";
});

const summaryCards = computed(() => {
  if (supplierRoles.has(session.roleId)) {
    return [
      { label: "待报价", value: projects.value.filter((item) => isFormalProject(item) && ["document_published", "bidding_open"].includes(item.status)).length, tone: "blue" },
      { label: "待发货订单", value: orders.value.filter((item) => ["submitted", "pending_confirmation", "supplier_confirmed"].includes(item.status)).length, tone: "amber" },
      { label: "待补资料", value: suppliers.value.filter((item) => (item.risk ?? "").includes("到期") || item.qualification === "即将到期").length, tone: "red" },
      { label: "待结算", value: orders.value.filter((item) => item.status === "received" || item.paymentStatus === "payment_reserved").length, tone: "green" }
    ];
  }
  if (financeRoles.has(session.roleId)) {
    return [
      { label: "待审核发票", value: orders.value.filter((item) => item.paymentStatus !== "paid").length, tone: "amber" },
      { label: "待付款金额", value: money(orders.value.filter((item) => item.paymentStatus !== "paid").reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)), tone: "blue" },
      { label: "异常金额", value: money(orders.value.filter((item) => ["return_requested", "partial"].includes(item.status)).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)), tone: "red" },
      { label: "可见订单", value: orders.value.length, tone: "green" }
    ];
  }
  if (auditRoles.has(session.roleId)) {
    const archived = projects.value.filter((item) => item.status === "archived").length;
    return [
      { label: "待核查项目", value: projects.value.filter((item) => !["archived", "closed"].includes(item.status)).length, tone: "blue" },
      { label: "日志异常", value: auditLogs.value.filter((item) => item.result === "denied").length, tone: "red" },
      { label: "归档完整率", value: projects.value.length ? `${Math.round((archived / projects.value.length) * 100)}%` : "-", tone: "green" },
      { label: "审计记录", value: auditLogs.value.length, tone: "amber" }
    ];
  }
  if (session.roleId === "admin") {
    return [
      { label: "系统服务", value: health.value, tone: "green" },
      { label: "配置入口", value: "权限", tone: "blue" },
      { label: "业务菜单", value: "隔离", tone: "amber" },
      { label: "当前角色", value: "管理员", tone: "green" }
    ];
  }
  return [
    { label: "待处理采购", value: projects.value.filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status)).length, tone: "blue" },
    { label: "报价截止提醒", value: projects.value.filter((item) => isFormalProject(item) && ["document_published", "bidding_open"].includes(item.status)).length, tone: "amber" },
    { label: "供应商准入", value: suppliers.value.filter((item) => ["pending", "restricted"].includes(item.admissionStatus ?? item.status)).length, tone: "green" },
    { label: "异常订单", value: orders.value.filter((item) => ["return_requested", "return_rejected", "partial"].includes(item.status)).length, tone: "red" }
  ];
});

const todoItems = computed(() => {
  if (supplierRoles.has(session.roleId)) {
    return [
      ...projects.value.filter(isFormalProject).slice(0, 2).map((item) => ({ title: item.name ?? item.title ?? "采购项目", meta: "报价响应", status: labelStatus(item.status), to: "/bidding" })),
      ...orders.value.slice(0, 3).map((item) => ({ title: item.orderNo, meta: `${supplierName(item.supplierId)} / ${money(item.totalAmount)}`, status: labelStatus(item.status), to: "/order-fulfillment" }))
    ].slice(0, 5);
  }
  if (financeRoles.has(session.roleId)) {
    return orders.value
      .slice(0, 5)
      .map((item) => ({ title: item.orderNo, meta: `金额 ${money(item.totalAmount)}`, status: labelStatus(item.paymentStatus ?? item.status), to: "/settlement-materials" }));
  }
  if (auditRoles.has(session.roleId)) {
    return [
      ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({ title: item.name ?? item.title ?? "采购项目", meta: "项目档案", status: labelStatus(item.status), to: "/archive-audit" })),
      ...auditLogs.value.slice(0, 2).map((item) => ({ title: labelAuditAction(item.action), meta: labelObjectType(item.objectType), status: labelStatus(item.result ?? "recorded"), to: "/audit" }))
    ].slice(0, 5);
  }
  if (session.roleId === "admin") {
    return [{ title: "权限与基础配置", meta: "系统配置", status: "待维护", to: "/permissions" }];
  }
  return [
    ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({ title: item.name ?? item.title ?? "采购项目", meta: `预算 ${money(item.budgetAmount)}`, status: labelStatus(item.status), to: "/procurement-requests" })),
    ...suppliers.value.slice(0, 2).map((item) => ({ title: item.name, meta: item.risk ?? item.qualification ?? "供应商档案", status: labelStatus(item.admissionStatus ?? item.status), to: "/suppliers" }))
  ].slice(0, 5);
});

const recentActivities = computed(() => {
  const productActivities = products.value.slice(0, 2).map((item) => ({
    title: item.name,
    meta: `${item.supplierName ?? supplierName(item.supplierId)} / ${productPrice(item)}`,
    time: item.activePrice?.deliveryDays ? `${item.activePrice.deliveryDays} 天交付` : "商品目录",
    to: "/supply-mall"
  }));
  const auditActivities = auditLogs.value.slice(0, 3).map((item) => ({
    title: labelAuditAction(item.action),
    meta: labelObjectType(item.objectType),
    time: formatDateTime(item.createdAt),
    to: "/audit"
  }));
  return [...productActivities, ...auditActivities].slice(0, 5);
});

async function loadDashboard() {
  if (!session.roleId) return;
  loadError.value = "";
  try {
    const [healthData, projectData, supplierData, productData, orderData, auditData] = await Promise.all([
      apiGet<{ status: string }>("/health").catch(() => ({ status: "unavailable" })),
      canReadProjects(session.roleId) ? apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })) : Promise.resolve({ projects: [] }),
      canReadSuppliers(session.roleId) ? apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })) : Promise.resolve({ suppliers: [] }),
      session.roleId === "admin" ? Promise.resolve({ products: [] }) : apiGet<{ products: ProductRow[] }>("/api/mall/products").catch(() => ({ products: [] })),
      session.roleId === "admin" ? Promise.resolve({ orders: [] }) : apiGet<{ orders: OrderRow[] }>("/api/mall/orders").catch(() => ({ orders: [] })),
      canReadAuditLogs(session.roleId) ? apiGet<{ auditLogs: AuditRow[] }>("/api/audit-logs").catch(() => ({ auditLogs: [] })) : Promise.resolve({ auditLogs: [] })
    ]);
    const formalProjects = projectData.projects.filter(isFormalProject);
    const procurementOrderData = supplierRoles.has(session.roleId)
      ? await Promise.all(
          formalProjects.slice(0, 8).map((project) =>
            apiGet<WorkbenchPayload>(`/api/project-workbench/projects/${project.id}`).catch(() => ({ purchaseOrders: [] }))
          )
        )
      : [];
    health.value = healthData.status === "ok" ? "正常" : healthData.status;
    projects.value = formalProjects;
    suppliers.value = supplierData.suppliers;
    products.value = productData.products;
    orders.value = combineOrders(orderData.orders, procurementOrderData.flatMap((item) => item.purchaseOrders));
    auditLogs.value = auditData.auditLogs;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "工作台加载失败";
  }
}

onMounted(loadDashboard);

watch(
  () => session.roleId,
  () => {
    void loadDashboard();
  }
);
</script>

<template>
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">今日事项</p>
        <h2>{{ roleTitle }}</h2>
      </div>
      <span class="tag">服务{{ health }}</span>
    </div>

    <p v-if="loadError" class="inline-error">{{ loadError }}</p>

    <div class="kpi-row">
      <article v-for="card in summaryCards" :key="card.label" class="kpi-card" :class="`tone-${card.tone}`">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>
  </section>

  <section class="dashboard-grid">
    <div class="business-panel">
      <div class="panel-head">
        <h3>待办事项</h3>
        <RouterLink v-if="session.roleId !== 'admin'" class="text-link" to="/my-tasks">查看任务</RouterLink>
      </div>
      <div v-if="todoItems.length" class="work-list">
        <RouterLink v-for="item in todoItems" :key="`${item.to}-${item.title}`" :to="item.to" class="work-list-row">
          <span class="tag">{{ item.status }}</span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.meta }}</small>
        </RouterLink>
      </div>
      <div v-else class="empty compact-empty">暂无待处理事项。</div>
    </div>

    <div class="business-panel">
      <div class="panel-head">
        <h3>近期动态</h3>
        <RouterLink class="text-link" to="/supply-mall">商品目录</RouterLink>
      </div>
      <div v-if="recentActivities.length" class="activity-list">
        <RouterLink v-for="item in recentActivities" :key="`${item.title}-${item.time}`" :to="item.to" class="activity-row">
          <strong>{{ item.title }}</strong>
          <span>{{ item.meta }}</span>
          <small>{{ item.time }}</small>
        </RouterLink>
      </div>
      <div v-else class="empty compact-empty">暂无近期动态。</div>
    </div>
  </section>
</template>
