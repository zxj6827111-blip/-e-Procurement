<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import AppShell from "./layouts/AppShell.vue";
import AuthShell from "./layouts/AuthShell.vue";
import { useSessionStore } from "./stores/session";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const bootstrapped = ref(false);

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

const groupManagerRoles: RoleId[] = ["group_manager"];
const procurementExecutorRoles: RoleId[] = ["buyer", "platform_operator"];
const platformOperatorRoles: RoleId[] = ["platform_operator"];
const procurementBusinessRoles: RoleId[] = [...groupManagerRoles, ...procurementExecutorRoles];
const hotelBuyerRoles: RoleId[] = ["hotel_buyer"];
const supplierRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
const financeRoles: RoleId[] = ["hotel_finance", "finance_reviewer"];
const auditRoles: RoleId[] = ["auditor"];
const businessRoles: RoleId[] = [...procurementBusinessRoles, ...hotelBuyerRoles, ...supplierRoles, ...financeRoles, ...auditRoles, "expert"];

const navItems: NavItem[] = [
  { label: "首页", to: "/", roles: [...businessRoles] },
  { label: "待办中心", to: "/my-tasks", roles: [...businessRoles] },
  { label: "审批规则", to: "/approval-rules", roles: [...groupManagerRoles, ...auditRoles, "admin"] },
  { label: "需求审批", to: "/procurement-requests", roles: [...groupManagerRoles] },
  { label: "项目监督", to: "/project-workbench", roles: [...groupManagerRoles] },
  { label: "报价监督", to: "/bid-control", roles: [...groupManagerRoles] },
  { label: "专家库评审", to: "/expert-review", roles: [...groupManagerRoles] },
  { label: "评分模板", to: "/scoring-templates", roles: [...groupManagerRoles] },
  { label: "定标审批", to: "/award-result", roles: [...groupManagerRoles] },
  { label: "供应商治理", to: "/suppliers", roles: [...groupManagerRoles] },
  { label: "项目档案", to: "/archive-audit", roles: [...groupManagerRoles] },
  { label: "需求转项目", to: "/procurement-requests", roles: [...procurementExecutorRoles] },
  { label: "项目执行", to: "/project-workbench", roles: [...procurementExecutorRoles] },
  { label: "中标结果", to: "/award-result", roles: [...procurementExecutorRoles] },
  { label: "专家抽取", to: "/expert-review", roles: [...procurementExecutorRoles] },
  { label: "评分模板", to: "/scoring-templates", roles: [...platformOperatorRoles] },
  { label: "专家评审", to: "/expert-scoring", roles: ["expert"] },
  { label: "外部联调", to: "/integration-boundary", roles: ["auditor", "admin"] },
  { label: "商品定价", to: "/supply-mall", roles: [...groupManagerRoles, ...platformOperatorRoles] },
  { label: "商品目录", to: "/supply-mall", roles: [...hotelBuyerRoles] },
  { label: "商品维护", to: "/supply-mall", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "供应商档案", to: "/supplier-portal", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "报名资料", to: "/supplier-registration", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "报价响应", to: "/bidding", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "中标结果", to: "/award-result", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "采购申请", to: "/procurement-requests", roles: [...hotelBuyerRoles] },
  { label: "订单履约", to: "/order-fulfillment", roles: [...procurementExecutorRoles, ...hotelBuyerRoles, ...supplierRoles] },
  { label: "结算材料", to: "/settlement-materials", roles: [...supplierRoles] },
  { label: "结算与发票", to: "/settlement-materials", roles: [...financeRoles] },
  { label: "资金/付款状态", to: "/payment-status", roles: [...financeRoles] },
  { label: "项目归档", to: "/archive-audit", roles: [...procurementExecutorRoles] },
  { label: "需求监督", to: "/procurement-requests", roles: [...auditRoles] },
  { label: "定标监督", to: "/award-result", roles: [...auditRoles] },
  { label: "供应商监督", to: "/suppliers", roles: [...auditRoles] },
  { label: "项目档案", to: "/archive-audit", roles: [...auditRoles] },
  { label: "日志与监督", to: "/audit", roles: [...auditRoles] },
  { label: "模块总览", to: "/modules", roles: ["admin"] },
  { label: "系统配置", to: "/permissions", roles: ["admin"] }
];

const utilityItems: NavItem[] = [
  { label: "消息", to: "/messages", roles: [...businessRoles] },
  { label: "账号安全", to: "/account-security", roles: [...businessRoles] }
];

const routeTitles: Record<string, string> = {
  "/": "首页",
  "/procurement-requests": "采购需求",
  "/project-initiation": "需求转项目",
  "/project-workbench": "项目执行",
  "/procurement-documents": "采购文件",
  "/announcements-invitations": "公告与邀请",
  "/supplier-registration": "报名资料",
  "/bidding": "报价响应",
  "/bid-control": "报价监督",
  "/expert-review": "专家库与评审管理",
  "/scoring-templates": "评分模板",
  "/expert-scoring": "专家评审",
  "/award-result": "定标结果",
  "/external-trade": "外部备案",
  "/integration-boundary": "外部联调",
  "/file-center": "文件中心",
  "/supply-mall": "商品目录",
  "/suppliers": "供应商档案",
  "/suppliers/new": "新增供应商",
  "/supplier-portal": "我的供应商档案",
  "/procurement-requests/new": "新建采购申请",
  "/account-security": "账号安全",
  "/order-fulfillment": "订单履约",
  "/contract-performance": "订单履约",
  "/settlement-materials": "结算与发票",
  "/settlement-documents": "结算材料",
  "/settlement-invoices": "结算与发票",
  "/invoice-review": "结算与发票",
  "/payment-status": "资金/付款状态",
  "/funds": "资金/付款状态",
  "/archive-audit": "项目档案",
  "/audit": "日志与监督",
  "/approval-rules": "审批规则",
  "/modules": "模块总览",
  "/permissions": "系统配置",
  "/my-tasks": "待办中心",
  "/messages": "消息中心",
  "/role-switch": "账号入口"
};

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
    auditor: "纪检审计",
    admin: "系统管理员"
  };
  return labels[session.roleId] ?? "未登录";
});

const visibleItems = computed(() => {
  const roleId = session.roleId as RoleId;
  return navItems.filter((item) => item.roles.includes(roleId));
});

const visibleUtilityItems = computed(() => {
  const roleId = session.roleId as RoleId;
  return utilityItems.filter((item) => item.roles.includes(roleId));
});

const appShellUserLabel = computed(() => `${session.user?.name || "未登录"} / ${currentRoleLabel.value}`);

const currentPageTitle = computed(() => {
  if (route.path === "/procurement-requests") {
    if (session.roleId === "group_manager") return "需求审批";
    if (session.roleId === "buyer" || session.roleId === "platform_operator") return "需求转项目";
    if (session.roleId === "auditor") return "需求监督";
    return "采购申请";
  }
  if (route.path.startsWith("/procurement-requests/")) {
    if (route.path === "/procurement-requests/new") return "新建采购申请";
    if (session.roleId === "group_manager") return "需求审批详情";
    if (session.roleId === "buyer" || session.roleId === "platform_operator") return "需求转项目详情";
    return "采购申请详情";
  }
  if (route.path.includes("/sourcing")) return "招采执行详情";
  if (route.path.includes("/fulfillment")) return "履约结算与归档";
  if (route.path.startsWith("/supply-mall/")) return "商品目录详情";
  if (route.path.startsWith("/project-workbench/")) return "项目执行详情";
  if (route.path.startsWith("/award-result/")) return ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId) ? "中标结果详情" : "定标结果详情";
  if (route.path === "/suppliers/new") return "新增供应商";
  if (route.path.startsWith("/suppliers/")) return "供应商档案详情";
  const visible = visibleItems.value.find((item) => item.to === route.path);
  return visible?.label ?? routeTitles[route.path] ?? "采购业务";
});

const isLoginRoute = computed(() => route.path === "/login");
const isPublicSupplierRegisterRoute = computed(() => route.path === "/supplier-onboarding-register");
const isHiddenUtilityRoute = computed(() => route.path === "/role-switch");
const supplierPasswordChangeRequired = computed(
  () => session.passwordChangeRequired && ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId)
);

function routeAllowed(path: string) {
  if (path === "/role-switch") return session.mockAuthEnabled;
  if (["/my-tasks", "/messages"].includes(path)) return session.roleId !== "admin";
  if (path === "/modules") return session.roleId === "admin";
  if (path === "/approval-rules") return ["group_manager", "auditor", "admin"].includes(session.roleId);
  if (path === "/procurement-requests/new") return session.roleId === "hotel_buyer";
  if (path === "/procurement-requests") return ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"].includes(session.roleId);
  if (path.startsWith("/procurement-requests/")) return ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"].includes(session.roleId);
  if (path === "/expert-scoring") return session.roleId === "expert";
  if (path === "/scoring-templates") return ["group_manager", "platform_operator", "auditor"].includes(session.roleId);
  if (path === "/integration-boundary") return ["admin", "auditor"].includes(session.roleId);
  if (path === "/supply-mall" || path.startsWith("/supply-mall/")) return ["group_manager", "platform_operator", "hotel_buyer", "supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId);
  if (path === "/suppliers/new") return session.roleId === "group_manager";
  if (path === "/supplier-portal" || path.startsWith("/supplier-portal/")) return ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId);
  if (path.startsWith("/suppliers/")) return ["group_manager", "auditor"].includes(session.roleId);
  if (path === "/account-security") return session.roleId !== "admin";
  if (path === "/award-result" || path.startsWith("/award-result/")) return ["group_manager", "buyer", "platform_operator", "auditor", "supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId);
  if (path === "/project-workbench" || path.startsWith("/project-workbench/")) return ["group_manager", "buyer", "platform_operator", "auditor"].includes(session.roleId);
  if (["/procurement-documents", "/announcements-invitations", "/bid-control", "/expert-review", "/external-trade", "/file-center"].includes(path)) {
    return ["group_manager", "buyer", "platform_operator", "auditor"].includes(session.roleId);
  }
  if (path === "/project-initiation") return ["buyer", "platform_operator"].includes(session.roleId);
  if (path === "/supplier-registration") return ["supplier", "supplier_admin", "supplier_quotation", "buyer", "platform_operator", "auditor"].includes(session.roleId);
  return visibleItems.value.some((item) => item.to === path);
}

function fallbackRoute() {
  return visibleItems.value[0]?.to ?? (session.roleId === "admin" ? "/permissions" : "/");
}

function enforceCurrentRoute() {
  if (isLoginRoute.value || isPublicSupplierRegisterRoute.value) return;
  if (isHiddenUtilityRoute.value && session.mockAuthEnabled) return;
  if (!session.roleId) {
    void router.replace("/login");
    return;
  }
  if (supplierPasswordChangeRequired.value && route.path !== "/account-security") {
    void router.replace("/account-security");
    return;
  }
  if (["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId) && route.path.startsWith("/suppliers/")) {
    const section = typeof route.params.section === "string" ? route.params.section : "";
    const target = section ? `/supplier-portal/${encodeURIComponent(section)}` : "/supplier-portal";
    void router.replace(target);
    return;
  }
  if (routeAllowed(route.path)) return;
  void router.replace(fallbackRoute());
}

async function logout() {
  await session.logout();
  await router.replace("/login");
}

onMounted(async () => {
  try {
    const initialPath = router.currentRoute.value.path;
    if (initialPath === "/supplier-onboarding-register") {
      bootstrapped.value = true;
      return;
    }
    if (initialPath === "/login" || initialPath === "/role-switch") {
      await session.loadAuthProviders();
    } else {
      const result = await session.loadMe();
      if (!result) await router.replace("/login");
    }
  } catch {
    if (!isLoginRoute.value) await router.replace("/login");
  } finally {
    bootstrapped.value = true;
    enforceCurrentRoute();
  }
});

watch(
  () => [session.roleId, route.path],
  () => {
    if (!bootstrapped.value || isLoginRoute.value) return;
    if (isPublicSupplierRegisterRoute.value) return;
    enforceCurrentRoute();
  },
  { immediate: true }
);
</script>

<template>
  <AuthShell v-if="isLoginRoute || isHiddenUtilityRoute || isPublicSupplierRegisterRoute">
    <RouterView />
  </AuthShell>

  <AppShell
    v-else-if="bootstrapped && session.user && routeAllowed(route.path)"
    brand-mark="采"
    brand-title="酒店供应链采购平台"
    brand-subtitle="准入、集采、履约、结算"
    context-label="酒店连锁供应链采购平台"
    :page-title="currentPageTitle"
    :user-label="appShellUserLabel"
    :nav-items="visibleItems"
    :utility-items="visibleUtilityItems"
    @logout="logout"
  >
    <RouterView />
  </AppShell>

  <AuthShell v-else title="酒店供应链采购平台" subtitle="正在进入" />
</template>
