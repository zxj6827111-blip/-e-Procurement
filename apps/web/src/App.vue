<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
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

const groupManagerRoles: RoleId[] = ["group_manager", "buyer", "platform_operator"];
const hotelBuyerRoles: RoleId[] = ["hotel_buyer"];
const supplierRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
const financeRoles: RoleId[] = ["hotel_finance", "finance_reviewer"];
const auditRoles: RoleId[] = ["auditor"];
const businessRoles: RoleId[] = [...groupManagerRoles, ...hotelBuyerRoles, ...supplierRoles, ...financeRoles, ...auditRoles, "expert"];

const navItems: NavItem[] = [
  { label: "工作台", to: "/", roles: [...businessRoles] },
  { label: "采购需求", to: "/procurement-requests", roles: [...groupManagerRoles] },
  { label: "项目立项", to: "/project-initiation", roles: [...groupManagerRoles] },
  { label: "项目工作台", to: "/project-workbench", roles: [...groupManagerRoles, ...hotelBuyerRoles] },
  { label: "采购文件", to: "/procurement-documents", roles: [...groupManagerRoles] },
  { label: "公告与邀请", to: "/announcements-invitations", roles: [...groupManagerRoles] },
  { label: "报名资料", to: "/supplier-registration", roles: ["buyer", "platform_operator"] },
  { label: "报价保密", to: "/bid-control", roles: [...groupManagerRoles] },
  { label: "专家评审管理", to: "/expert-review", roles: [...groupManagerRoles] },
  { label: "专家评审", to: "/expert-scoring", roles: ["expert"] },
  { label: "定标审批", to: "/award-result", roles: [...groupManagerRoles] },
  { label: "外部备案", to: "/external-trade", roles: [...groupManagerRoles] },
  { label: "外部联调", to: "/integration-boundary", roles: ["group_manager", "auditor", "admin"] },
  { label: "供应商与商品", to: "/suppliers", roles: [...groupManagerRoles] },
  { label: "商品定价", to: "/supply-mall", roles: [...groupManagerRoles] },
  { label: "商品目录", to: "/supply-mall", roles: [...hotelBuyerRoles] },
  { label: "商品维护", to: "/supply-mall", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "供应商档案", to: "/suppliers", roles: ["supplier", "supplier_admin"] },
  { label: "报名资料", to: "/supplier-registration", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "报价响应", to: "/bidding", roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { label: "采购申请", to: "/procurement-requests", roles: [...hotelBuyerRoles] },
  { label: "订单履约", to: "/order-fulfillment", roles: [...groupManagerRoles, ...hotelBuyerRoles, ...supplierRoles] },
  { label: "结算材料", to: "/settlement-materials", roles: [...supplierRoles] },
  { label: "结算与发票", to: "/settlement-materials", roles: [...financeRoles] },
  { label: "资金/付款状态", to: "/payment-status", roles: [...financeRoles] },
  { label: "结算与监督", to: "/archive-audit", roles: [...groupManagerRoles] },
  { label: "项目档案", to: "/archive-audit", roles: ["auditor"] },
  { label: "日志与监督", to: "/audit", roles: ["auditor"] },
  { label: "系统配置", to: "/permissions", roles: ["admin"] }
];

const routeTitles: Record<string, string> = {
  "/": "工作台",
  "/procurement-requests": "采购需求",
  "/project-initiation": "项目立项",
  "/project-workbench": "项目工作台",
  "/procurement-documents": "采购文件",
  "/announcements-invitations": "公告与邀请",
  "/supplier-registration": "报名资料",
  "/bidding": "报价响应",
  "/bid-control": "报价监督",
  "/expert-review": "专家评审管理",
  "/expert-scoring": "专家评审",
  "/award-result": "定标结果",
  "/external-trade": "外部备案",
  "/integration-boundary": "外部联调",
  "/file-center": "文件中心",
  "/supply-mall": "商品目录",
  "/suppliers": "供应商档案",
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
  "/permissions": "系统配置",
  "/my-tasks": "我的待办",
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

const currentPageTitle = computed(() => {
  const visible = visibleItems.value.find((item) => item.to === route.path);
  return visible?.label ?? routeTitles[route.path] ?? "采购业务";
});

const isLoginRoute = computed(() => route.path === "/login");
const isHiddenUtilityRoute = computed(() => route.path === "/role-switch");

function routeAllowed(path: string) {
  if (path === "/role-switch") return session.mockAuthEnabled;
  if (["/my-tasks", "/messages"].includes(path)) return session.roleId !== "admin";
  if (path === "/approval-rules") return ["group_manager", "buyer", "auditor", "admin"].includes(session.roleId);
  if (path === "/expert-scoring") return session.roleId === "expert";
  if (path === "/integration-boundary") return ["admin", "group_manager", "auditor"].includes(session.roleId);
  if (path === "/supply-mall") return ["group_manager", "buyer", "platform_operator", "hotel_buyer", "supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId);
  if (["/project-workbench", "/procurement-documents", "/announcements-invitations", "/bid-control", "/expert-review", "/award-result", "/external-trade", "/file-center"].includes(path)) {
    return ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"].includes(session.roleId);
  }
  if (path === "/supplier-registration") return ["supplier", "supplier_admin", "supplier_quotation", "buyer", "platform_operator", "auditor"].includes(session.roleId);
  return visibleItems.value.some((item) => item.to === path);
}

function fallbackRoute() {
  return visibleItems.value[0]?.to ?? (session.roleId === "admin" ? "/permissions" : "/");
}

function enforceCurrentRoute() {
  if (isLoginRoute.value) return;
  if (isHiddenUtilityRoute.value && session.mockAuthEnabled) return;
  if (!session.roleId) {
    void router.replace("/login");
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
    enforceCurrentRoute();
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="isLoginRoute || isHiddenUtilityRoute" class="login-shell">
    <RouterView />
  </div>

  <div v-else-if="bootstrapped && session.user && routeAllowed(route.path)" class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">采</span>
        <div>
          <strong>酒店供应链采购平台</strong>
          <small>准入、集采、履约、结算</small>
        </div>
      </div>

      <nav class="nav-list">
        <RouterLink v-for="item in visibleItems" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
      </nav>
    </aside>

    <main>
      <header class="topbar">
        <div>
          <p>酒店连锁供应链采购平台</p>
          <h1>{{ currentPageTitle }}</h1>
        </div>
        <div class="topbar-actions">
          <span class="user-pill">
            {{ session.user?.name || "未登录" }} / {{ currentRoleLabel }}
          </span>
          <button type="button" class="secondary-button" @click="logout">退出</button>
        </div>
      </header>
      <RouterView />
    </main>
  </div>

  <div v-else class="login-shell">
    <section class="login-card">
      <div class="login-main">
        <p class="eyebrow">正在进入</p>
        <h1>酒店供应链采购平台</h1>
      </div>
    </section>
  </div>
</template>
