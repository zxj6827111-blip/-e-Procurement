<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { apiGet, apiPost } from "../../api/http";
import { loadProcessTasks, type ProcessTaskView } from "../../api/process";
import PageHeader from "../../components/base/PageHeader.vue";
import FeedbackMessage from "../../components/base/FeedbackMessage.vue";
import EnterpriseSurface from "../../components/base/EnterpriseSurface.vue";
import EnterpriseButton from "../../components/base/EnterpriseButton.vue";
import StatusTag from "../../components/base/StatusTag.vue";
import type { DataTableColumn, SummaryCardItem } from "../../components/base";
import DashboardActivitySection from "./DashboardActivitySection.vue";
import DashboardMetricsSection from "./DashboardMetricsSection.vue";
import DashboardQuickActionSection from "./DashboardQuickActionSection.vue";
import DashboardSmartRiskPanel from "./DashboardSmartRiskPanel.vue";
import DashboardTimelineSection from "./DashboardTimelineSection.vue";
import DashboardTodoSection from "./DashboardTodoSection.vue";
import {
  auditRoles,
  canReadAuditLogs,
  canReadProjects,
  canReadSuppliers,
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
import { roleTemplate } from "../../permissions/role-model";

type TimelineState = "done" | "current" | "pending";
type DashboardRiskItem = {
  id: string;
  type: string;
  description: string;
  time: string;
  tone: "high" | "medium";
  to: string;
};

const runtimeDataResetRoles = new Set(["admin", "group_manager", "platform_operator"]);
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
const resetMessage = ref("");
const resettingData = ref(false);

const timelineBuckets = [
  { label: "需求", statuses: ["project_created"] },
  { label: "公告", statuses: ["document_preparing", "document_published", "registration_open"] },
  { label: "报价", statuses: ["bidding_open", "bidding_locked"] },
  { label: "评审", statuses: ["expert_reviewing", "review_report_frozen"] },
  { label: "定标", statuses: ["award_approving", "awarded_pending_order", "result_notified"] },
  { label: "履约", statuses: ["contract_registered", "performing", "evaluated", "archived", "closed"] }
] as const;

function supplierName(supplierId: string) {
  return resolveSupplierName(supplierId, suppliers.value);
}

function resolveTimelineIndex(status: string) {
  const index = timelineBuckets.findIndex((bucket) => (bucket.statuses as readonly string[]).includes(status));
  return index >= 0 ? index : 0;
}

function buildTimelineStages(status: string) {
  const currentIndex = resolveTimelineIndex(status);
  return timelineBuckets.map((bucket, index) => {
    const state: TimelineState =
      index < currentIndex
        ? "done"
        : index > currentIndex
          ? "pending"
          : currentIndex === timelineBuckets.length - 1 && ["archived", "closed"].includes(status)
            ? "done"
            : "current";
    return { label: bucket.label, state };
  });
}

const roleTitle = computed(() => resolveRoleTitle(session.roleId));
const landingTemplate = computed(() => roleTemplate(session.roleId));
const roleWorkbench = computed(() => getRoleWorkbench(session.roleId));
const quickActions = computed(() => roleWorkbench.value.primaryActions.slice(0, 6));
const focusItems = computed(() => roleWorkbench.value.todayFocus.slice(0, 5));
const canResetRuntimeData = computed(() => session.mode !== "production" && runtimeDataResetRoles.has(session.roleId));

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
  if (supplierRoles.has(session.roleId)) return { label: "进入报价响应", to: "/bidding" };
  if (financeRoles.has(session.roleId)) return { label: "进入结算付款", to: "/settlement-materials" };
  if (auditRoles.has(session.roleId)) return { label: "查看操作日志", to: "/audit" };
  if (session.roleId === "expert") return { label: "进入专家评分", to: "/expert-scoring" };
  if (session.roleId === "hotel_buyer") return { label: "查看采购申请", to: "/procurement-requests" };
  return { label: "进入我的待办", to: "/my-tasks" };
});

const summaryCards = computed<SummaryCard[]>(() => {
  if (session.roleId === "expert") {
    return [
      { label: "待处理任务", value: expertPendingTasks.value.length, meta: "当前专家可见", tone: "blue", to: "/my-tasks" },
      { label: "待专家评分", value: expertScoringPendingCount.value, meta: "未锁定评分单", tone: "amber", to: "/expert-scoring" },
      { label: "待回避确认", value: expertConfirmationPendingCount.value, meta: "先确认后评分", tone: "green", to: "/expert-scoring" },
      { label: "未读消息", value: expertUnreadMessages.value.length, meta: "流程提醒", tone: "red", to: "/messages" }
    ];
  }
  if (supplierRoles.has(session.roleId)) {
    return [
      {
        label: "可响应项目",
        value: projects.value.filter((item) => isFormalProject(item) && ["document_published", "bidding_open"].includes(item.status)).length,
        meta: "已通过报名资格",
        tone: "blue"
      },
      {
        label: "待发货订单",
        value: orders.value.filter((item) => ["submitted", "pending_confirmation", "supplier_confirmed"].includes(item.status)).length,
        meta: "待确认或待履约",
        tone: "amber"
      },
      {
        label: "资质临期",
        value: suppliers.value.filter((item) => (item.risk ?? "").includes("到期") || item.qualification === "即将到期").length,
        meta: "尽快补齐材料",
        tone: "red"
      },
      {
        label: "待结算订单",
        value: orders.value.filter((item) => item.status === "received" || item.paymentStatus === "payment_reserved").length,
        meta: "可提交结算材料",
        tone: "green"
      }
    ];
  }
  if (financeRoles.has(session.roleId)) {
    return [
      { label: "待审核发票", value: orders.value.filter((item) => item.paymentStatus !== "paid").length, meta: "未付款订单", tone: "amber" },
      {
        label: "待付款金额",
        value: money(orders.value.filter((item) => item.paymentStatus !== "paid").reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)),
        meta: "当前可见订单",
        tone: "blue"
      },
      {
        label: "异常金额",
        value: money(orders.value.filter((item) => ["return_requested", "partial"].includes(item.status)).reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)),
        meta: "退回或部分收货",
        tone: "red"
      },
      { label: "可见订单", value: orders.value.length, meta: "结算与付款范围", tone: "green" }
    ];
  }
  if (auditRoles.has(session.roleId)) {
    const archived = projects.value.filter((item) => item.status === "archived").length;
    return [
      {
        label: "在途项目",
        value: projects.value.filter((item) => !["archived", "closed"].includes(item.status)).length,
        meta: "需持续监督",
        tone: "blue"
      },
      {
        label: "日志异常",
        value: auditLogs.value.filter((item) => item.result === "denied").length,
        meta: "拒绝与越权尝试",
        tone: "red"
      },
      {
        label: "归档完整率",
        value: projects.value.length ? `${Math.round((archived / projects.value.length) * 100)}%` : "-",
        meta: "正式项目口径",
        tone: "green"
      },
      { label: "审计记录", value: auditLogs.value.length, meta: "近期可见流水", tone: "amber" }
    ];
  }
  if (session.roleId === "admin") {
    return [
      { label: "系统服务", value: health.value, meta: "平台基础健康", tone: "green" },
      { label: "配置入口", value: "权限", meta: "矩阵与规则", tone: "blue" },
      { label: "业务隔离", value: "启用", meta: "RBAC 菜单裁剪", tone: "amber" },
      { label: "当前角色", value: "系统管理员", meta: "无业务消息提醒", tone: "green" }
    ];
  }
  if (session.roleId === "group_manager") {
    return [
      { label: "待审需求", value: pendingProcurementRequestCount.value, meta: "集团准入审批", tone: "blue", to: "/procurement-requests" },
      {
        label: "进行中项目",
        value: projects.value.filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status)).length,
        meta: "招采主流程",
        tone: "amber",
        to: "/project-workbench"
      },
      {
        label: "定标审批中",
        value: projects.value.filter((item) => item.status === "award_approving").length,
        meta: "等待集团批示",
        tone: "green",
        to: "/award-result"
      },
      {
        label: "供应商风险",
        value: suppliers.value.filter((item) => ["pending", "restricted", "suspended"].includes(item.admissionStatus ?? item.status)).length,
        meta: "准入与资质关注",
        tone: "red",
        to: "/suppliers"
      }
    ];
  }
  return [
    {
      label: "待推进项目",
      value: projects.value.filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status)).length,
      meta: "当前可见项目",
      tone: "blue",
      to: "/my-tasks"
    },
    {
      label: "报价截止提醒",
      value: projects.value.filter((item) => isFormalProject(item) && ["document_published", "bidding_open"].includes(item.status)).length,
      meta: "关注时效节点",
      tone: "amber",
      to: "/announcements-invitations"
    },
    {
      label: "待发公告",
      value: projects.value.filter((item) => isFormalProject(item) && ["document_locked", "document_published"].includes(item.status)).length,
      meta: "公告与邀请",
      tone: "green",
      to: "/announcements-invitations"
    },
    {
      label: "异常订单",
      value: orders.value.filter((item) => ["return_requested", "return_rejected", "partial"].includes(item.status)).length,
      meta: "履约与验收异常",
      tone: "red",
      to: "/order-fulfillment"
    }
  ];
});

const summaryItems = computed<SummaryCardItem[]>(() =>
  summaryCards.value.map((item) => ({
    label: item.label,
    value: item.value,
    meta: item.meta,
    tone: item.tone
  }))
);

const gHotelDashboardKpis = computed<SummaryCardItem[]>(() => {
  const quoteDeadlineCount = projects.value.filter((item) => ["document_published", "registration_open", "bidding_open"].includes(item.status)).length;
  const reviewCount = projects.value.filter((item) => ["expert_reviewing", "review_report_frozen", "award_approving"].includes(item.status)).length;
  const abnormalCount = orders.value.filter((item) => ["return_requested", "return_rejected", "partial"].includes(item.status)).length;
  return [
    { label: "我的待办事项", value: `${todoItems.value.length} 项`, tone: "green" },
    { label: "今日截止报价项目", value: `${quoteDeadlineCount} 个`, meta: "需密切关注", tone: "amber" },
    { label: "待评审/定标项目", value: `${reviewCount} 个`, tone: "blue" },
    { label: "异常履约/违约告警", value: `${abnormalCount} 起`, meta: abnormalCount ? "立即处理" : "", tone: "red" }
  ];
});

const gHotelTodoColumns: DataTableColumn[] = [
  { key: "status", label: "状态" },
  { key: "title", label: "任务名称" },
  { key: "code", label: "关联项目编号" },
  { key: "deadline", label: "截止时间" },
  { key: "action", label: "操作" }
];

const gHotelTodoItems = computed<DashboardTodoItem[]>(() =>
  todoItems.value.slice(0, 5).map((item, index) => ({
    ...item,
    code: item.code ?? item.meta ?? `TASK-${String(index + 1).padStart(2, "0")}`,
    deadline: item.deadline ?? item.due ?? "按阶段推进"
  }))
);

const dashboardUpdatedAt = computed(() => {
  const candidates = [
    ...projects.value.map((item) => item.updatedAt),
    ...orders.value.map((item) => item.createdAt),
    ...auditLogs.value.map((item) => item.createdAt),
    ...workflowTasks.value.map((item) => item.updatedAt),
    ...workflowMessages.value.map((item) => item.updatedAt)
  ].filter(Boolean) as string[];
  const latest = candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  return latest ? formatDateTime(latest) : "暂无业务更新";
});

const dashboardRiskItems = computed<DashboardRiskItem[]>(() => {
  const risks: DashboardRiskItem[] = [];
  const deniedLog = auditLogs.value.find((item) => item.result === "denied");
  if (deniedLog) {
    risks.push({
      id: `audit-${deniedLog.id}`,
      type: "敏感操作异常",
      description: `${labelAuditAction(deniedLog.action)} / ${labelObjectType(deniedLog.objectType)} 被系统拒绝，请审计核查。`,
      time: deniedLog.createdAt ? formatDateTime(deniedLog.createdAt) : "最近",
      tone: "high",
      to: "/audit"
    });
  }

  const riskySupplier = suppliers.value.find((item) => ["pending", "restricted", "suspended"].includes(item.admissionStatus ?? item.status) || Boolean(item.risk));
  if (riskySupplier) {
    risks.push({
      id: `supplier-${riskySupplier.id}`,
      type: "供应商准入风险",
      description: `${riskySupplier.name} 当前状态为 ${labelStatus(riskySupplier.admissionStatus ?? riskySupplier.status)}，${riskySupplier.risk || "需跟进准入或资质材料"}。`,
      time: "按供应商台账",
      tone: "high",
      to: "/suppliers"
    });
  }

  const abnormalOrder = orders.value.find((item) => ["return_requested", "return_rejected", "partial"].includes(item.status));
  if (abnormalOrder) {
    risks.push({
      id: `order-${abnormalOrder.id}`,
      type: "履约验收异常",
      description: `${abnormalOrder.orderNo} 当前状态为 ${labelStatus(abnormalOrder.status)}，涉及金额 ${money(abnormalOrder.totalAmount)}。`,
      time: abnormalOrder.createdAt ? formatDateTime(abnormalOrder.createdAt) : "最近",
      tone: "medium",
      to: "/order-fulfillment"
    });
  }

  const deadlineProject = projects.value.find((item) => isFormalProject(item) && ["document_published", "registration_open", "bidding_open"].includes(item.status));
  if (deadlineProject) {
    risks.push({
      id: `project-${deadlineProject.id}`,
      type: "招采时效提醒",
      description: `${deadlineProject.name ?? deadlineProject.title ?? deadlineProject.id} 处于 ${labelStatus(deadlineProject.status)} 阶段，请关注公告、报名和报价截止节点。`,
      time: deadlineProject.updatedAt ? formatDateTime(deadlineProject.updatedAt) : "按项目阶段",
      tone: "medium",
      to: "/project-workbench"
    });
  }

  return risks.slice(0, 3);
});

const todoColumns = computed<DataTableColumn[]>(() => {
  if (["buyer", "platform_operator"].includes(session.roleId)) {
    return [
      { key: "title", label: "任务名称" },
      { key: "status", label: "当前阶段" },
      { key: "due", label: "截止时间" },
      { key: "risk", label: "关注点" },
      { key: "action", label: "操作" }
    ];
  }
  return [
    { key: "status", label: "状态" },
    { key: "title", label: "任务名称" },
    { key: "meta", label: "关联业务" },
    { key: "action", label: "操作" }
  ];
});

const activityColumns: DataTableColumn[] = [
  { key: "title", label: "动态" },
  { key: "meta", label: "类型" },
  { key: "time", label: "时间" },
  { key: "action", label: "操作" }
];

const todoItems = computed<DashboardTodoItem[]>(() => {
  if (session.roleId === "expert") {
    return expertTodoItems.value;
  }
  if (supplierRoles.has(session.roleId)) {
    return [
      ...projects.value.filter(isFormalProject).slice(0, 2).map((item) => ({
        title: item.name ?? item.title ?? "采购项目",
        meta: "报价响应",
        status: labelStatus(item.status),
        to: `/bidding?projectId=${item.id}`
      })),
      ...orders.value.slice(0, 3).map((item) => ({
        title: item.orderNo,
        meta: `${supplierName(item.supplierId)} / ${money(item.totalAmount)}`,
        status: labelStatus(item.status),
        to: "/order-fulfillment"
      }))
    ].slice(0, 5);
  }
  if (financeRoles.has(session.roleId)) {
    return orders.value
      .slice(0, 5)
      .map((item) => ({ title: item.orderNo, meta: `金额 ${money(item.totalAmount)}`, status: labelStatus(item.paymentStatus ?? item.status), to: "/settlement-materials" }));
  }
  if (auditRoles.has(session.roleId)) {
    return [
      ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({
        title: item.name ?? item.title ?? "采购项目",
        meta: "项目归档与监督",
        status: labelStatus(item.status),
        to: "/archive-audit"
      })),
      ...auditLogs.value.slice(0, 2).map((item) => ({
        title: labelAuditAction(item.action),
        meta: labelObjectType(item.objectType),
        status: labelStatus(item.result ?? "recorded"),
        to: "/audit"
      }))
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
      ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({
        title: item.name ?? item.title ?? "采购项目",
        meta: `预算 ${money(item.budgetAmount)}`,
        status: labelStatus(item.status),
        due: item.dueAt ? formatDateTime(item.dueAt) : "按阶段推进",
        risk: ["document_published", "bidding_open"].includes(item.status) ? "关注报价截止" : "按计划推进",
        to: "/project-workbench"
      })),
      ...products.value.slice(0, 2).map((item) => ({
        title: item.name,
        meta: `${item.supplierName ?? supplierName(item.supplierId)} / ${productPrice(item)}`,
        status: labelStatus(item.status),
        due: item.activePrice?.deliveryDays ? `${item.activePrice.deliveryDays} 天交付` : "目录维护",
        risk: "商品目录",
        to: "/supply-mall"
      }))
    ].slice(0, 5);
  }
  return [
    ...projects.value.filter(isFormalProject).slice(0, 3).map((item) => ({
      title: item.name ?? item.title ?? "采购项目",
      meta: `预算 ${money(item.budgetAmount)}`,
      status: labelStatus(item.status),
      to: "/procurement-requests"
    })),
    ...products.value.slice(0, 2).map((item) => ({
      title: item.name,
      meta: `${item.supplierName ?? supplierName(item.supplierId)} / ${productPrice(item)}`,
      status: labelStatus(item.status),
      to: "/supply-mall"
    }))
  ].slice(0, 5);
});

const activeProjectItems = computed(() => {
  if (session.roleId === "expert") {
    return expertPendingTasks.value
      .filter((task) => task.businessType === "expert_scoring" || task.businessType === "review_award")
      .slice(0, 5)
      .map((task) => ({
        title: task.title,
        meta: task.businessTypeLabel,
        time: formatDateTime(task.updatedAt),
        to: task.targetPath
      }));
  }
  if (supplierRoles.has(session.roleId)) {
    return [
      ...projects.value.filter(isFormalProject).slice(0, 3).map((project) => ({
        title: project.name ?? project.title ?? "采购项目",
        meta: `${labelStatus(project.status)} / ${money(project.budgetAmount)}`,
        time: project.updatedAt ? formatDateTime(project.updatedAt) : "等待采购方推进",
        to: `/bidding?projectId=${project.id}`
      })),
      ...orders.value.slice(0, 2).map((order) => ({
        title: order.orderNo,
        meta: `${supplierName(order.supplierId)} / ${labelStatus(order.status)}`,
        time: order.createdAt ? formatDateTime(order.createdAt) : "最近更新",
        to: "/order-fulfillment"
      }))
    ].slice(0, 5);
  }
  if (financeRoles.has(session.roleId)) {
    return orders.value.slice(0, 5).map((order) => ({
      title: order.orderNo,
      meta: `${labelStatus(order.paymentStatus ?? order.status)} / ${money(order.totalAmount)}`,
      time: order.createdAt ? formatDateTime(order.createdAt) : "最近更新",
      to: "/settlement-materials"
    }));
  }
  if (auditRoles.has(session.roleId)) {
    return [...auditLogs.value]
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
      .slice(0, 5)
      .map((item) => ({
        title: labelAuditAction(item.action),
        meta: `${labelObjectType(item.objectType)} / ${labelStatus(item.result ?? "recorded")}`,
        time: item.createdAt ? formatDateTime(item.createdAt) : "最近更新",
        to: "/audit"
      }));
  }
  return projects.value
    .filter((item) => isFormalProject(item) && !["archived", "closed"].includes(item.status))
    .slice(0, 5)
    .map((project) => ({
      title: project.name ?? project.title ?? "采购项目",
      meta: `${labelStatus(project.status)} / ${money(project.budgetAmount)}`,
      time: project.dueAt ? formatDateTime(project.dueAt) : (project.updatedAt ? formatDateTime(project.updatedAt) : "按项目阶段推进"),
      to: "/project-workbench"
    }));
});

const activityLink = computed(() => {
  if (session.roleId === "expert") return { label: "进入评分台", to: "/expert-scoring" };
  if (supplierRoles.has(session.roleId)) return { label: "进入报价响应", to: "/bidding" };
  if (financeRoles.has(session.roleId)) return { label: "进入结算付款", to: "/settlement-materials" };
  if (auditRoles.has(session.roleId)) return { label: "查看操作日志", to: "/audit" };
  if (session.roleId === "hotel_buyer") return { label: "查看采购申请", to: "/procurement-requests" };
  return { label: "查看采购项目", to: "/project-workbench" };
});

const timelineRows = computed(() =>
  projects.value
    .filter((item) => isFormalProject(item))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.name ?? item.title ?? "采购项目",
      meta: `${labelStatus(item.status)} / ${money(item.budgetAmount)}`,
      stages: buildTimelineStages(item.status)
    }))
);

const auditWaterfallRows = computed(() =>
  [...auditLogs.value]
    .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      time: item.createdAt ? formatDateTime(item.createdAt).slice(5, 16) : "最近",
      title: labelAuditAction(item.action),
      meta: `${labelObjectType(item.objectType)} / ${labelStatus(item.result ?? "recorded")}`
    }))
);

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

async function resetRuntimeData() {
  if (resettingData.value) return;
  const confirmed = window.confirm("确认恢复初始业务数据吗？当前新增流程、上传材料和业务处理记录会被清空。");
  if (!confirmed) return;
  resettingData.value = true;
  resetMessage.value = "";
  loadError.value = "";
  try {
    await apiPost<{ ok: true; auditLogId?: string }>("/api/runtime/reset-data", { confirm: true });
    resetMessage.value = "已恢复初始业务数据，可以重新从需求发起开始跑完整流程。";
    await loadDashboard();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "恢复初始业务数据失败";
  } finally {
    resettingData.value = false;
  }
}

onMounted(loadDashboard);

watch(
  () => session.roleId,
  () => {
    resetMessage.value = "";
    void loadDashboard();
  }
);
</script>

<template>
  <section class="eds-section">
    <PageHeader v-if="landingTemplate !== 'A'" :title="roleTitle" eyebrow="工作台" :description="roleWorkbench.description">
      <template #actions>
        <EnterpriseButton v-if="canResetRuntimeData" type="danger" :disabled="resettingData" @click="resetRuntimeData">
          {{ resettingData ? "正在恢复" : "恢复初始业务数据" }}
        </EnterpriseButton>
        <StatusTag :tone="health === '正常' ? 'success' : 'warning'">服务{{ health }}</StatusTag>
      </template>
    </PageHeader>

    <FeedbackMessage v-if="loadError" tone="error">{{ loadError }}</FeedbackMessage>
    <FeedbackMessage v-else-if="resetMessage" tone="success">{{ resetMessage }}</FeedbackMessage>

    <template v-if="landingTemplate === 'A'">
      <div class="g-hotel-dashboard">
        <header class="g-hotel-dashboard-head">
          <EnterpriseButton
            v-if="canResetRuntimeData"
            class="runtime-reset-action"
            type="danger"
            :disabled="resettingData"
            @click="resetRuntimeData"
          >
            {{ resettingData ? "正在恢复" : "恢复初始业务数据" }}
          </EnterpriseButton>
          <h2>工作台概览</h2>
          <span>更新时间: {{ dashboardUpdatedAt }}</span>
        </header>

        <DashboardMetricsSection :items="gHotelDashboardKpis" />

        <div class="g-hotel-dashboard-grid eds-template-a-main-grid">
          <div class="g-hotel-dashboard-main eds-template-a-flow">
            <DashboardTodoSection
              :items="gHotelTodoItems"
              :columns="gHotelTodoColumns"
              :entry-link="{ label: '查看全部', to: todoEntryLink.to }"
              :show-entry="true"
              :empty-text="roleWorkbench.emptyTodoText"
            />

            <DashboardTimelineSection class="eds-template-a-timeline" :rows="timelineRows" />
          </div>

          <div class="g-hotel-dashboard-side">
            <DashboardQuickActionSection
              :actions="quickActions"
              :risk-signals="[]"
              :storage-key="`dashboard-quick-actions-${session.user?.id || session.roleId}`"
            />
            <DashboardSmartRiskPanel :risks="dashboardRiskItems" />
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="landingTemplate === 'B'" class="eds-template-b-shell">
      <DashboardTodoSection
        :items="todoItems"
        :columns="todoColumns"
        :entry-link="todoEntryLink"
        :show-entry="true"
        :empty-text="roleWorkbench.emptyTodoText"
      />

      <EnterpriseSurface title="处理焦点" description="保留列表优先的批量处理视角，不再把首页做成装饰化仪表盘。">
        <div class="eds-ledger-strip">
          <div v-for="item in summaryItems" :key="`ledger-${item.label}`">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small v-if="item.meta" class="eds-meta">{{ item.meta }}</small>
          </div>
        </div>
      </EnterpriseSurface>

      <EnterpriseSurface title="本角色处理策略" description="将首页作为列表处理入口，右手信息只保留真正会影响审批或付款的判断线索。">
        <div class="eds-waterfall-log">
          <article v-for="item in focusItems" :key="item" class="eds-waterfall-log-item">
            <span class="eds-waterfall-log-time">重点</span>
            <div class="eds-waterfall-log-main">
              <strong>{{ item }}</strong>
              <span>{{ roleWorkbench.description }}</span>
            </div>
          </article>
        </div>
      </EnterpriseSurface>
    </div>

    <div v-else-if="landingTemplate === 'C'" class="eds-template-c-shell">
      <div class="eds-template-c-hero">
        <DashboardQuickActionSection
          :actions="quickActions"
          :risk-signals="roleWorkbench.riskSignals"
          :storage-key="`dashboard-quick-actions-${session.user?.id || session.roleId}`"
        />

        <EnterpriseSurface title="提交规则与时效" description="外部门户保持任务导向，只展示会影响提交、锁定与履约的关键上下文。">
          <div class="eds-ledger-strip">
            <div v-for="item in summaryItems" :key="`portal-${item.label}`">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small v-if="item.meta" class="eds-meta">{{ item.meta }}</small>
            </div>
          </div>

          <div class="eds-waterfall-log">
            <article v-for="item in focusItems" :key="`portal-focus-${item}`" class="eds-waterfall-log-item">
              <span class="eds-waterfall-log-time">时效</span>
              <div class="eds-waterfall-log-main">
                <strong>{{ item }}</strong>
                <span>提交前先完成资质、材料和锁定时点核对。</span>
              </div>
            </article>
          </div>
        </EnterpriseSurface>
      </div>

      <DashboardTodoSection
        :items="todoItems"
        :columns="todoColumns"
        :entry-link="todoEntryLink"
        :show-entry="true"
        :empty-text="roleWorkbench.emptyTodoText"
      />
    </div>

    <div v-else class="eds-template-d-shell">
      <div class="eds-template-d-hero">
        <EnterpriseSurface title="操作日志流水" description="优先暴露真实操作轨迹，避免用大色块和大数字遮蔽监督信息。">
          <div v-if="auditWaterfallRows.length" class="eds-waterfall-log">
            <article v-for="item in auditWaterfallRows" :key="item.id" class="eds-waterfall-log-item">
              <span class="eds-waterfall-log-time">{{ item.time }}</span>
              <div class="eds-waterfall-log-main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.meta }}</span>
              </div>
            </article>
          </div>

          <div v-else class="eds-state">
            <span class="eds-state-icon" aria-hidden="true"></span>
            <h3>暂无可见操作流水</h3>
            <p>待监督的操作发生后，这里会自动按时间瀑布流展开。</p>
          </div>
        </EnterpriseSurface>

        <EnterpriseSurface title="监督重点" description="把审计角色真正关心的越权、归档与敏感节点集中到同一视图。">
          <div class="eds-ledger-strip">
            <div v-for="item in summaryItems" :key="`audit-${item.label}`">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small v-if="item.meta" class="eds-meta">{{ item.meta }}</small>
            </div>
          </div>

          <div class="eds-waterfall-log">
            <article v-for="item in roleWorkbench.riskSignals" :key="`risk-${item}`" class="eds-waterfall-log-item">
              <span class="eds-waterfall-log-time">风险</span>
              <div class="eds-waterfall-log-main">
                <strong>{{ item }}</strong>
                <span>按权限边界、日志可追溯性和归档完整性进行核查。</span>
              </div>
            </article>
          </div>
        </EnterpriseSurface>
      </div>

      <DashboardTodoSection
        :items="todoItems"
        :columns="todoColumns"
        :entry-link="todoEntryLink"
        :show-entry="true"
        :empty-text="roleWorkbench.emptyTodoText"
      />

      <DashboardActivitySection
        :rows="activeProjectItems"
        :columns="activityColumns"
        :activity-link="activityLink"
        :empty-text="roleWorkbench.emptyActivityText"
      />
    </div>
  </section>
</template>
