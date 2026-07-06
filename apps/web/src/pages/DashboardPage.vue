<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { apiGet } from "../api/http";
import { loadProcessTasks, type ProcessTaskView } from "../api/process";
import { loadWorkflowTasks, type R8WorkflowTaskView } from "../api/workflow";
import GeminiDashboardBridge from "../gemini-react/GeminiDashboardBridge.vue";
import type { GeminiNavItem, GeminiTodoRow } from "../gemini-react/GeminiDashboardApp";
import { roleLabels, visibleNavItems } from "../permissions/role-model";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";
import { canReadProjects, combineOrders, isFormalProject, supplierRoles } from "./dashboard/display";
import type { OrderRow, ProductRow, ProjectRow, WorkbenchPayload } from "./dashboard/types";

const session = useSessionStore();
const router = useRouter();

const projects = ref<ProjectRow[]>([]);
const products = ref<ProductRow[]>([]);
const orders = ref<OrderRow[]>([]);
const processTasks = ref<ProcessTaskView[]>([]);
const workflowTasks = ref<R8WorkflowTaskView[]>([]);

function uniqueNav(items: GeminiNavItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}:${item.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toGeminiNavItem(item: { id: string; label: string; to: string }): GeminiNavItem {
  return {
    id: item.id,
    label: item.label,
    to: item.to
  };
}

function formatTaskDeadline(value?: string) {
  return value ? formatDateTime(value).replace(/-/g, "/") : "按阶段推进";
}

function fallbackTodoRows(): GeminiTodoRow[] {
  return [
    ...projects.value.slice(0, 3).map((project) => ({
      status: labelStatus(project.status),
      title: project.name ?? project.title ?? "采购项目",
      code: project.id,
      deadline: project.dueAt ? formatTaskDeadline(project.dueAt) : "按阶段推进",
      to: "/project-workbench"
    })),
    ...products.value.slice(0, 2).map((product) => ({
      status: labelStatus(product.status),
      title: product.name,
      code: product.id,
      deadline: "商品目录",
      to: "/supply-mall"
    }))
  ].slice(0, 4);
}

const roleLabel = computed(() => roleLabels[session.roleId as keyof typeof roleLabels] ?? "业务角色");
const userName = computed(() => session.user?.name ?? "");
const organization = computed(() => (session.user?.orgId === "org-hotel" ? "酒店采购中心" : "集团采购中心"));

const navItems = computed(() =>
  uniqueNav([
    { id: "dashboard", label: "工作台", to: "/" },
    ...visibleNavItems(session.roleId).map(toGeminiNavItem)
  ])
);

const quickActions = computed(() =>
  uniqueNav([
    { id: "dashboard", label: "工作台", to: "/" },
    { id: "myTasks", label: "我的待办", to: "/my-tasks" },
    { id: "messages", label: "消息中心", to: "/messages" },
    { id: "procurementRequests", label: "采购申请", to: "/procurement-requests" },
    ...visibleNavItems(session.roleId).map(toGeminiNavItem)
  ]).slice(0, 6)
);

const todoRows = computed<GeminiTodoRow[]>(() => {
  const processRows = processTasks.value
    .filter((task) => task.status === "pending")
    .map((task) => ({
      status: task.statusLabel,
      title: task.businessTitle || task.title,
      code: task.businessId,
      deadline: formatTaskDeadline(task.dueAt),
      to: task.targetPath
    }));
  const workflowRows = workflowTasks.value
    .filter((task) => task.status === "pending")
    .map((task) => ({
      status: task.statusLabel,
      title: task.title,
      code: task.businessId,
      deadline: formatTaskDeadline(task.updatedAt),
      to: task.targetPath
    }));
  return [...workflowRows, ...processRows, ...fallbackTodoRows()].slice(0, 4);
});

const updatedAt = computed(() => {
  const candidates = [
    ...projects.value.map((item) => item.updatedAt),
    ...orders.value.map((item) => item.createdAt),
    ...processTasks.value.map((item) => item.updatedAt),
    ...workflowTasks.value.map((item) => item.updatedAt)
  ].filter(Boolean) as string[];
  const latest = candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  return latest ? formatDateTime(latest) : "暂无业务更新";
});

const kpis = computed(() => ({
  todo: todoRows.value.length,
  quoteDeadline: projects.value.filter((item) => ["document_published", "registration_open", "bidding_open"].includes(item.status)).length,
  review: projects.value.filter((item) => ["expert_reviewing", "review_report_frozen", "award_approving"].includes(item.status)).length,
  abnormal: orders.value.filter((item) => ["return_requested", "return_rejected", "partial"].includes(item.status)).length
}));

async function loadDashboard() {
  if (!session.roleId) return;
  const [projectData, productData, orderData, processTaskData, workflowTaskData] = await Promise.all([
    canReadProjects(session.roleId) ? apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })) : Promise.resolve({ projects: [] }),
    session.roleId === "admin" ? Promise.resolve({ products: [] }) : apiGet<{ products: ProductRow[] }>("/api/mall/products").catch(() => ({ products: [] })),
    session.roleId === "admin" ? Promise.resolve({ orders: [] }) : apiGet<{ orders: OrderRow[] }>("/api/mall/orders").catch(() => ({ orders: [] })),
    session.roleId !== "admin" ? loadProcessTasks().catch(() => []) : Promise.resolve([]),
    session.roleId !== "admin" ? loadWorkflowTasks(session).catch(() => []) : Promise.resolve([])
  ]);
  const formalProjects = projectData.projects.filter(isFormalProject);
  const procurementOrderData = supplierRoles.has(session.roleId)
    ? await Promise.all(
        formalProjects.slice(0, 8).map((project) =>
          apiGet<WorkbenchPayload>(`/api/project-workbench/projects/${project.id}`).catch(() => ({ purchaseOrders: [] }))
        )
      )
    : [];
  projects.value = formalProjects;
  products.value = productData.products;
  orders.value = combineOrders(orderData.orders, procurementOrderData.flatMap((item) => item.purchaseOrders));
  processTasks.value = processTaskData;
  workflowTasks.value = workflowTaskData;
}

function navigate(to: string) {
  void router.push(to);
}

async function logout() {
  await session.logout();
  await router.replace("/login");
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
  <GeminiDashboardBridge
    :user-name="userName"
    :role-label="roleLabel"
    :organization="organization"
    :nav-items="navItems"
    :quick-actions="quickActions"
    :todo-rows="todoRows"
    :updated-at="updatedAt"
    :kpis="kpis"
    :on-navigate="navigate"
    :on-logout="logout"
  />
</template>
