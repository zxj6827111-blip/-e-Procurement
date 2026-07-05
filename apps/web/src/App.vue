<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { apiGet } from "./api/http";
import AppShell from "./layouts/AppShell.vue";
import AuthShell from "./layouts/AuthShell.vue";
import {
  hasRoleProfile,
  pageTitle,
  roleHasMessageBell,
  roleHome,
  roleLabels,
  routeAllowed as isRouteAllowed,
  supplierRoles,
  visibleNavItems as resolveVisibleNavItems,
  visibleUtilityItems as resolveVisibleUtilityItems
} from "./permissions/role-model";
import { useSessionStore } from "./stores/session";

interface SwitchableUser {
  id: string;
  name: string;
  roleLabel: string;
  supplierName?: string;
}

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const bootstrapped = ref(false);
const roleSwitchOptions = ref<Array<{ id: string; label: string }>>([]);
const selectedRoleSwitchId = ref("");

const hasCurrentRoleProfile = computed(() => hasRoleProfile(session.roleId));
const currentRoleLabel = computed(() => {
  if (hasCurrentRoleProfile.value) return roleLabels[session.roleId as keyof typeof roleLabels];
  return session.user ? "角色异常" : "未登录";
});
const visibleItems = computed(() => resolveVisibleNavItems(session.roleId));
const visibleUtilityItems = computed(() => resolveVisibleUtilityItems(session.roleId));
const appShellUserLabel = computed(() => session.user?.name || "未登录");
const currentPageTitle = computed(() => pageTitle(route.path, session.roleId));
const environmentLabel = computed(() => {
  if (session.mode === "production") return "";
  if (session.mode === "uat") return "UAT 环境";
  if (session.mockAuthEnabled) return "本地验证环境";
  return "试用环境";
});
const roleSwitchEnabled = computed(() => session.mode !== "production" && session.mockAuthEnabled);
const shellPageTitle = computed(() => {
  if (isPermissionDeniedRoute.value) return "无权限访问";
  if (isNotFoundRoute.value) return "页面无法加载";
  return currentPageTitle.value;
});
const shellVisible = computed(
  () => bootstrapped.value && session.user && hasCurrentRoleProfile.value && !isLoginRoute.value && !isHiddenUtilityRoute.value && !isPublicSupplierRegisterRoute.value
);
const showMessageBell = computed(() => roleHasMessageBell(session.roleId));

const isLoginRoute = computed(() => route.path === "/login");
const isPublicSupplierRegisterRoute = computed(() => route.path === "/supplier-onboarding-register");
const isPermissionDeniedRoute = computed(() => route.path === "/permission-denied");
const isNotFoundRoute = computed(() => route.matched.some((item) => item.path === "/:pathMatch(.*)*"));
const isHiddenUtilityRoute = computed(() => route.path === "/role-switch");
const renderStateInAuthShell = computed(() => isPermissionDeniedRoute.value && !hasCurrentRoleProfile.value);
const supplierPasswordChangeRequired = computed(
  () => session.passwordChangeRequired && ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId)
);

function routeAllowed(path: string) {
  return isRouteAllowed(path, session.roleId, session.mockAuthEnabled);
}

async function loadSwitchableUsers() {
  if (!roleSwitchEnabled.value || !session.user) {
    roleSwitchOptions.value = [];
    selectedRoleSwitchId.value = "";
    return;
  }
  try {
    const data = await apiGet<{ users: SwitchableUser[] }>("/api/auth/mock-users");
    roleSwitchOptions.value = data.users.map((user) => ({
      id: user.id,
      label: user.supplierName ? `${user.roleLabel} / ${user.supplierName}` : `${user.roleLabel} / ${user.name}`
    }));
    selectedRoleSwitchId.value = session.user.id;
  } catch {
    roleSwitchOptions.value = [];
    selectedRoleSwitchId.value = session.user.id;
  }
}

function enforceCurrentRoute() {
  if (isLoginRoute.value || isPublicSupplierRegisterRoute.value) return;
  if (isPermissionDeniedRoute.value || isNotFoundRoute.value) return;
  if (isHiddenUtilityRoute.value && session.mockAuthEnabled) return;
  if (!session.roleId) {
    void router.replace("/login");
    return;
  }
  if (!hasCurrentRoleProfile.value) {
    void router.replace("/permission-denied");
    return;
  }
  if (supplierPasswordChangeRequired.value && route.path !== "/account-security") {
    void router.replace("/account-security");
    return;
  }
  if (supplierRoles.includes(session.roleId as (typeof supplierRoles)[number]) && route.path.startsWith("/suppliers/")) {
    const section = typeof route.params.section === "string" ? route.params.section : "";
    const target = section ? `/supplier-portal/${encodeURIComponent(section)}` : "/supplier-portal";
    void router.replace(target);
    return;
  }
  if (routeAllowed(route.path)) return;
  void router.replace("/permission-denied");
}

async function logout() {
  await session.logout();
  await router.replace("/login");
}

async function switchRole(userId: string) {
  if (!roleSwitchEnabled.value || !userId || userId === session.user?.id) {
    selectedRoleSwitchId.value = userId;
    return;
  }
  try {
    const data = await session.demoLogin(userId);
    selectedRoleSwitchId.value = userId;
    await router.replace(roleHome(data.roleId));
  } catch {
    selectedRoleSwitchId.value = session.user?.id ?? userId;
  }
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
    await loadSwitchableUsers();
    enforceCurrentRoute();
  }
});

watch(
  () => [session.user?.id, session.mockAuthEnabled, session.mode],
  () => {
    void loadSwitchableUsers();
  }
);

watch(
  () => [session.roleId, route.path],
  () => {
    if (!bootstrapped.value || isLoginRoute.value) return;
    if (isPublicSupplierRegisterRoute.value) return;
    if (isPermissionDeniedRoute.value || isNotFoundRoute.value) return;
    enforceCurrentRoute();
  },
  { immediate: true }
);
</script>

<template>
  <AuthShell v-if="isLoginRoute || isHiddenUtilityRoute || isPublicSupplierRegisterRoute || renderStateInAuthShell" :commercial="isLoginRoute">
    <RouterView />
  </AuthShell>

  <AppShell
    v-else-if="shellVisible"
    brand-mark="H"
    brand-title="酒店供应链采购平台"
    brand-subtitle="RBAC 中台 · 招采 · 履约 · 审计"
    :home-to="roleHome(session.roleId)"
    :context-label="currentRoleLabel"
    :page-title="shellPageTitle"
    :user-label="appShellUserLabel"
    :nav-items="visibleItems"
    :utility-items="visibleUtilityItems"
    :environment-label="environmentLabel"
    :role-label="currentRoleLabel"
    :role-switch-enabled="roleSwitchEnabled"
    :role-switch-options="roleSwitchOptions"
    :selected-role-switch-id="selectedRoleSwitchId"
    :show-message-bell="showMessageBell"
    message-route="/messages"
    @logout="logout"
    @update:selected-role-switch-id="selectedRoleSwitchId = $event"
    @switch-role="switchRole"
  >
    <RouterView />
  </AppShell>

  <AuthShell v-else title="酒店供应链采购平台" subtitle="正在进入" />
</template>
