<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { apiGet } from "../../api/http";
import { loadProcessTasks, type ProcessTaskView } from "../../api/process";
import PageHeader from "../../components/base/PageHeader.vue";
import FeedbackMessage from "../../components/base/FeedbackMessage.vue";
import StatusTag from "../../components/base/StatusTag.vue";
import type { DataTableColumn, SummaryCardItem } from "../../components/base";
import DashboardActivitySection from "./DashboardActivitySection.vue";
import DashboardMetricsSection from "./DashboardMetricsSection.vue";
import DashboardRoleWorkbenchSection from "./DashboardRoleWorkbenchSection.vue";
import DashboardTodoSection from "./DashboardTodoSection.vue";
import {
  auditActivityTarget,
  auditRoles,
  canReadAuditLogs,
  canReadProjects,
  canReadSuppliers,
  canUseCatalogActivities,
  combineOrders,
  financeRoles,
  isBusinessAuditLog,
  isFormalProject,
  money,
  productPrice,
  roleTitle as resolveRoleTitle,
  supplierName as resolveSupplierName,
  supplierRoles
} from "./display";
import type { AuditRow, DashboardTodoItem, OrderRow, ProductRow, ProjectRow, SupplierRow, SummaryCard, WorkbenchPayload } from "./types";
import { taskKey } from "./types";
import { getRoleWorkbench } from "./role-workbench";
import { useSessionStore } from "../../stores/session";
import { formatDateTime, labelAuditAction, labelObjectType, labelStatus } from "../../utils/status-labels";
import { loadWorkflowNotifications, loadWorkflowTasks, type R8WorkflowNotificationView, type R8WorkflowTaskView } from "../../api/workflow";

const session = useSessionStore();
const health = ref("检查中");
const projects = ref<ProjectRow[]>([]);
const suppliers = ref<SupplierRow[]>([]);
const products = ref<ProductRow[]>([]);
const orders = ref<OrderRow[]>([]);
const auditLogs = ref<AuditRow[]>([]);
const processTasks = ref<ProcessTaskView[]>([]);
const workflowTasks = ref<R8WorkflowTaskView[]>([]);
const workflowMessages = ref<R8WorkflowNotificationView[]>([]);
const loadError = ref("");

function supplierName(supplierId: string) {
  return resolveSupplierName(supplierId, suppliers.value);
}

const roleTitle = computed(() => {
  return resolveRoleTitle(session.roleId);
});

const roleWorkbench = computed(() => getRoleWorkbench(session.roleId));

const pendingProcurementRequestCount = computed(() => {
  const seen = new Set<string>();
  processTasks.value
    .filter((task) => task.status === "pending" && task.businessType === "procurement_request")
    .forEach((task) => {
      seen.add(taskKey(task));
    });
  workflowTasks.value
    .filter((task) => task.status === "pending" && task.businessType === "procurement_request")
    .forEach((task) => {
      seen.add(taskKey(task));
    });
  return seen.size;
});

const groupPendingRequestTasks = computed<DashboardTodoItem[]>(() => {
  const seen = new Set<string>();
  const items: DashboardTodoItem[] = [];
  processTasks.value
    .filter((task) => task.status === "pending" && task.businessType === "procurement_request")
    .forEach((task) => {
      seen.add(taskKey(task));
      items.push({ title: task.businessTitle || task.title, meta: task.businessTypeLabel, status: task.statusLabel, to: task.targetPath });
    });
  workflowTasks.value
    .filter((task) => task.status === "pending" && task.businessType === "procurement_request" && !seen.has(taskKey(task)))
    .forEach((task) => {
      seen.add(taskKey(task));
      items.push({ title: task.title, meta: task.businessTypeLabel, status: task.statusLabel, to: task.targetPath });
    });
  return items;
});

const expertPendingTasks = computed(() => workflowTasks.value.filter((task) => task.status === "pending"));
const expertUnreadMessages = computed(() => workflowMessages.value.filter((message) => !message.read));
const expertScoringPendingCount = computed(() => expertPendingTasks.value.filter((task) => task.businessType === "expert_scoring").length);
const expertConfirmationPendingCount = computed(
  () => expertPendingTasks.value.filter((task) => task.businessType === "review_award" || task.taskType === "review_award_expert_confirmation").length
);
const expertTodoItems = computed<DashboardTodoItem[]>(() =>
  expertPendingTasks.value
    .map((task) => ({
      title: task.title,
      meta: `${task.businessTypeLabel} / ${task.businessId}`,
      status: task.statusLabel,
      to: task.targetPath
    }))
    .slice(0, 5)
);

const todoEntryLink = computed(() => {
  if (session.roleId === "group_manager") return { label: "查看需求审批", to: "/procurement-requests" };
  return { label: "进入待办中心", to: "/my-tasks" };
});

const summaryCards = computed<SummaryCard[]>(() => {
  if (session.roleId === "expert") {
    return [
      { label: "待处理任务", value: expertPendingTasks.value.length, tone: "blue", to: "/my-tasks" },
      { label: "待专家评分", value: expertScoringPendingCount.value, tone: "amber", to: "/expert-scoring" },
      { label: "待专家确认", value: expertConfirmationPendingCount.value, tone: "green", to: "/expert-scoring" },
      { label: "未读消息", value: expertUnreadMessages.value.length, tone: "red", to: "/messages" }
    ];
  }
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
  if (session.roleId === "group_manager") {
    return [
      { label: "待审批需求", value: pendingProcurementRequestCount.value, tone: "blue", to: "/procurement-requests" },
      { label: "进行中项目", value: projects.value.filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status)).length, tone: "amber", to: "/project-workbench" },
      { label: "定标审批中", value: projects.value.filter((item) => item.status === "award_approving").length, tone: "green", to: "/award-result" },
      { label: "供应商风险", value: suppliers.value.filter((item) => ["pending", "restricted", "suspended"].includes(item.admissionStatus ?? item.status)).length, tone: "red", to: "/suppliers" }
    ];
  }
  return [
    { label: "待处理采购", value: projects.value.filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status)).length, tone: "blue", to: "/my-tasks" },
    { label: "报价截止提醒", value: projects.value.filter((item) => isFormalProject(item) && ["document_published", "bidding_open"].includes(item.status)).length, tone: "amber", to: "/announcements-invitations" },
    { label: "待发公告", value: projects.value.filter((item) => isFormalProject(item) && ["document_locked", "document_published"].includes(item.status)).length, tone: "green", to: "/announcements-invitations" },
    { label: "异常订单", value: orders.value.filter((item) => ["return_requested", "return_rejected", "partial"].includes(item.status)).length, tone: "red", to: "/order-fulfillment" }
  ];
});

const todoItems = computed(() => {
  if (session.roleId === "expert") {
    return expertTodoItems.value;
  }
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
  if (session.roleId === "group_manager") {
    return [
      ...groupPendingRequestTasks.value.slice(0, 3),
      ...projects.value
        .filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status))
        .slice(0, 2)
        .map((item) => ({ title: item.name ?? item.title ?? "采购项目", meta: `预算 ${money(item.budgetAmount)}`, status: labelStatus(item.status), to: "/project-workbench" }))
    ].slice(0, 5);
  }
  if (["buyer", "platform_operator"].includes(session.roleId)) {
    return [
      ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({ title: item.name ?? item.title ?? "采购项目", meta: `预算 ${money(item.budgetAmount)}`, status: labelStatus(item.status), to: "/project-workbench" })),
      ...products.value.slice(0, 2).map((item) => ({ title: item.name, meta: `${item.supplierName ?? supplierName(item.supplierId)} / ${productPrice(item)}`, status: labelStatus(item.status), to: "/supply-mall" }))
    ].slice(0, 5);
  }
  return [
    ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({ title: item.name ?? item.title ?? "采购项目", meta: `预算 ${money(item.budgetAmount)}`, status: labelStatus(item.status), to: "/procurement-requests" })),
    ...products.value.slice(0, 2).map((item) => ({ title: item.name, meta: `${item.supplierName ?? supplierName(item.supplierId)} / ${productPrice(item)}`, status: labelStatus(item.status), to: "/supply-mall" }))
  ].slice(0, 5);
});

const recentActivities = computed(() => {
  if (session.roleId === "expert") {
    return workflowMessages.value
      .slice(0, 5)
      .map((message) => ({
        title: message.title,
        meta: message.businessTypeLabel,
        time: formatDateTime(message.createdAt),
        to: message.targetPath
      }));
  }
  const productActivities = canUseCatalogActivities(session.roleId)
    ? products.value.slice(0, 2).map((item) => ({
        title: item.name,
        meta: `${item.supplierName ?? supplierName(item.supplierId)} / ${productPrice(item)}`,
        time: item.activePrice?.deliveryDays ? `${item.activePrice.deliveryDays} 天交付` : "商品目录",
        to: "/supply-mall"
      }))
    : [];
  const auditActivities = auditLogs.value.slice(0, 3).map((item) => ({
    title: labelAuditAction(item.action),
    meta: labelObjectType(item.objectType),
    time: formatDateTime(item.createdAt),
    to: auditActivityTarget(session.roleId)
  }));
  return [...productActivities, ...auditActivities].slice(0, 5);
});

const activityLink = computed(() => {
  if (session.roleId === "group_manager") return { label: "项目档案", to: "/archive-audit" };
  if (auditRoles.has(session.roleId)) return { label: "日志与监督", to: "/audit" };
  if (financeRoles.has(session.roleId)) return { label: "结算与发票", to: "/settlement-materials" };
  if (supplierRoles.has(session.roleId)) return { label: "报价响应", to: "/bidding" };
  if (session.roleId === "expert") return { label: "消息中心", to: "/messages" };
  return { label: "商品目录", to: "/supply-mall" };
});

const summaryItems = computed<SummaryCardItem[]>(() => summaryCards.value.map((item) => ({ label: item.label, value: item.value })));

const todoColumns: DataTableColumn[] = [
  { key: "status", label: "状态" },
  { key: "title", label: "事项" },
  { key: "meta", label: "业务信息" },
  { key: "action", label: "操作" }
];

const activityColumns: DataTableColumn[] = [
  { key: "title", label: "动态" },
  { key: "meta", label: "类型" },
  { key: "time", label: "时间" },
  { key: "action", label: "操作" }
];

async function loadDashboard() {
  if (!session.roleId) return;
  loadError.value = "";
  try {
    const [healthData, projectData, supplierData, productData, orderData, auditData, processTaskData, workflowTaskData, workflowMessageData] = await Promise.all([
      apiGet<{ status: string }>("/health").catch(() => ({ status: "unavailable" })),
      canReadProjects(session.roleId) ? apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })) : Promise.resolve({ projects: [] }),
      canReadSuppliers(session.roleId) ? apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })) : Promise.resolve({ suppliers: [] }),
      session.roleId === "admin" ? Promise.resolve({ products: [] }) : apiGet<{ products: ProductRow[] }>("/api/mall/products").catch(() => ({ products: [] })),
      session.roleId === "admin" ? Promise.resolve({ orders: [] }) : apiGet<{ orders: OrderRow[] }>("/api/mall/orders").catch(() => ({ orders: [] })),
      canReadAuditLogs(session.roleId) ? apiGet<{ auditLogs: AuditRow[] }>("/api/audit-logs").catch(() => ({ auditLogs: [] })) : Promise.resolve({ auditLogs: [] }),
      session.roleId !== "admin" ? loadProcessTasks().catch(() => []) : Promise.resolve([]),
      session.roleId !== "admin" ? loadWorkflowTasks(session).catch(() => []) : Promise.resolve([]),
      session.roleId !== "admin" ? loadWorkflowNotifications().catch(() => []) : Promise.resolve([])
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
    auditLogs.value = auditData.auditLogs.filter(isBusinessAuditLog);
    processTasks.value = processTaskData;
    workflowTasks.value = workflowTaskData;
    workflowMessages.value = workflowMessageData;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "首页加载失败";
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
  <section class="eds-section">
    <PageHeader :title="roleTitle" eyebrow="今日事项" description="按当前角色汇总待处理采购、履约、结算与监督事项。">
      <template #actions>
        <StatusTag :tone="health === '正常' ? 'success' : 'warning'">服务{{ health }}</StatusTag>
      </template>
    </PageHeader>

    <FeedbackMessage v-if="loadError" tone="error">{{ loadError }}</FeedbackMessage>

    <DashboardMetricsSection :items="summaryItems" />

    <DashboardRoleWorkbenchSection :workbench="roleWorkbench" />

    <DashboardTodoSection
      :items="todoItems"
      :columns="todoColumns"
      :entry-link="todoEntryLink"
      :show-entry="session.roleId !== 'admin'"
      :empty-text="roleWorkbench.emptyTodoText"
    />

    <DashboardActivitySection
      :rows="recentActivities"
      :columns="activityColumns"
      :activity-link="activityLink"
      :empty-text="roleWorkbench.emptyActivityText"
    />
  </section>
</template>

