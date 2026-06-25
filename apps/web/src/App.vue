<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useSessionStore } from "./stores/session";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const sessionReady = computed(() => Boolean(session.user) || route.path === "/login");

type RoleId =
  | "group_manager"
  | "buyer"
  | "hotel_buyer"
  | "hotel_finance"
  | "platform_operator"
  | "supplier"
  | "supplier_admin"
  | "supplier_quotation"
  | "expert"
  | "finance_reviewer"
  | "auditor"
  | "admin";

interface NavItem {
  label: string;
  to: string;
  roles: RoleId[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const allBusinessRoles: RoleId[] = ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "supplier", "supplier_admin", "supplier_quotation", "expert", "finance_reviewer", "auditor"];
const buyerSideRoles: RoleId[] = ["group_manager", "buyer", "hotel_buyer", "platform_operator"];
const supplierSideRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
const financeSideRoles: RoleId[] = ["hotel_finance", "finance_reviewer"];
const supervisorRoles: RoleId[] = ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"];
const projectInitiationRoles: RoleId[] = ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"];
const fulfillmentRoles: RoleId[] = [...buyerSideRoles, ...supplierSideRoles, ...financeSideRoles, "auditor"];
const workflowCenterRoles: RoleId[] = [...buyerSideRoles, ...supplierSideRoles, ...financeSideRoles, "expert", "auditor"];
const dashboardRoles: RoleId[] = [...workflowCenterRoles, "admin"];
const approvalRuleRoles: RoleId[] = ["group_manager", "buyer", "auditor", "admin"];

const navGroups: NavGroup[] = [
  {
    title: "工作台",
    items: [
      { label: "集团采购驾驶舱", to: "/", roles: dashboardRoles },
      { label: "我的任务", to: "/my-tasks", roles: workflowCenterRoles },
      { label: "消息中心", to: "/messages", roles: workflowCenterRoles }
    ]
  },
  {
    title: "采购业务",
    items: [
      { label: "采购需求", to: "/procurement-requests", roles: supervisorRoles },
      { label: "项目立项", to: "/project-initiation", roles: projectInitiationRoles },
      { label: "项目工作台", to: "/project-workbench", roles: fulfillmentRoles },
      { label: "供应商档案", to: "/suppliers", roles: ["group_manager", "buyer", "platform_operator", "supplier", "supplier_admin", "auditor"] },
      { label: "采购文件", to: "/procurement-documents", roles: supervisorRoles },
      { label: "公告与邀请", to: "/announcements-invitations", roles: supervisorRoles },
      { label: "报名资料", to: "/supplier-registration", roles: ["supplier", "supplier_admin", "supplier_quotation", "buyer", "platform_operator", "auditor"] },
      { label: "报价响应", to: "/bidding", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
      { label: "报价保密与异常查看", to: "/bid-control", roles: supervisorRoles },
      { label: "专家抽取与评审管理", to: "/expert-review", roles: supervisorRoles },
      { label: "专家评审", to: "/expert-scoring", roles: ["expert"] },
      { label: "定标审批与结果通知", to: "/award-result", roles: supervisorRoles },
      { label: "外部交易备案", to: "/external-trade", roles: supervisorRoles },
      { label: "文件与图片中心", to: "/file-center", roles: ["group_manager", "buyer", "hotel_buyer", "platform_operator", "supplier", "supplier_admin", "supplier_quotation", "auditor"] },
      { label: "供应链商城", to: "/supply-mall", roles: ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "supplier", "supplier_admin", "supplier_quotation", "finance_reviewer", "auditor"] },
      { label: "模块总览", to: "/modules", roles: ["group_manager", "buyer", "auditor"] }
    ]
  },
  {
    title: "履约与监督",
    items: [
      { label: "履约与结算入口说明", to: "/contract-performance", roles: ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "supplier", "supplier_admin", "finance_reviewer", "auditor"] },
      { label: "项目档案", to: "/archive-audit", roles: supervisorRoles },
      { label: "审计日志", to: "/audit", roles: ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "finance_reviewer", "auditor"] }
    ]
  },
  {
    title: "系统配置",
    items: [
      { label: "审批规则维护", to: "/approval-rules", roles: approvalRuleRoles },
      { label: "权限与基础配置", to: "/permissions", roles: ["admin"] }
    ]
  }
];

const utilityRoutes = new Set(["/role-switch"]);
const visibleGroups = computed(() => {
  const roleId = session.roleId as RoleId;
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(roleId))
    }))
    .filter((group) => group.items.length > 0);
});

const visibleItems = computed(() => visibleGroups.value.flatMap((group) => group.items));
const currentRoleLabel = computed(() => {
  const labels: Record<string, string> = {
    group_manager: "集团采购管理人",
    buyer: "采购经办人",
    hotel_buyer: "酒店采购",
    hotel_finance: "酒店财务",
    platform_operator: "平台运营",
    supplier: "供应商",
    supplier_admin: "供应商管理员",
    supplier_quotation: "供应商报价人员",
    expert: "专家",
    finance_reviewer: "财务审核",
    auditor: "纪检 / 审计",
    admin: "系统管理员"
  };
  return labels[session.roleId] ?? "未登录";
});

const roleSwitchVisible = computed(() => Boolean(session.mockAuthEnabled));

function routeAllowed(path: string) {
  if (path === "/role-switch") return roleSwitchVisible.value;
  if (utilityRoutes.has(path)) return true;
  return visibleItems.value.some((item) => item.to === path);
}

onMounted(() => {
  void session
    .loadMe()
    .then((result) => {
      if (!result && route.path !== "/login") {
        void router.replace("/login");
      }
    })
    .catch(() => {
      if (route.path !== "/login") {
        void router.replace("/login");
      }
    });
});

watch(
  () => [session.roleId, route.path, session.mockAuthEnabled],
  () => {
    if (!sessionReady.value) return;
    if (!session.roleId) {
      if (route.path !== "/login") {
        void router.replace("/login");
      }
      return;
    }
    if (routeAllowed(route.path)) return;
    const fallback = visibleItems.value[0]?.to ?? "/";
    void router.replace(fallback);
  },
  { immediate: true }
);
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">采</span>
        <div>
          <strong>阳光采购 UAT 版</strong>
          <small>内部采购规范化试运行</small>
        </div>
      </div>

      <nav>
        <div v-for="group in visibleGroups" :key="group.title" class="nav-group">
          <div class="nav-group-title">{{ group.title }}</div>
          <RouterLink v-for="item in group.items" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
        </div>
      </nav>
    </aside>

    <main>
      <header class="topbar">
        <div>
          <p>酒店集团内部采购规范化平台</p>
          <h1>采购业务工作台</h1>
        </div>
        <RouterLink v-if="roleSwitchVisible" class="user-pill" to="/role-switch">
          {{ session.user?.name || "未登录" }} / {{ currentRoleLabel }}
        </RouterLink>
        <span v-else class="user-pill">
          {{ session.user?.name || "未登录" }} / {{ currentRoleLabel }}
        </span>
      </header>
      <RouterView />
    </main>
  </div>
</template>
