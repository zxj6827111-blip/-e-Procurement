<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import AppShell from "./layouts/AppShell.vue";
import AuthShell from "./layouts/AuthShell.vue";
import {
  pageTitle,
  roleHome,
  roleLabels,
  routeAllowed as isRouteAllowed,
  supplierRoles,
  visibleNavItems as resolveVisibleNavItems,
  visibleUtilityItems as resolveVisibleUtilityItems
} from "./permissions/role-model";
import { useSessionStore } from "./stores/session";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const bootstrapped = ref(false);

const currentRoleLabel = computed(() => {
  return roleLabels[session.roleId as keyof typeof roleLabels] ?? "未登录";
});

const visibleItems = computed(() => resolveVisibleNavItems(session.roleId));

const visibleUtilityItems = computed(() => resolveVisibleUtilityItems(session.roleId));

const appShellUserLabel = computed(() => `${session.user?.name || "未登录"} / ${currentRoleLabel.value}`);

const currentPageTitle = computed(() => {
  return pageTitle(route.path, session.roleId);
});

const environmentLabel = computed(() => {
  if (session.mode === "production") return "";
  if (session.mode === "uat") return "UAT 环境";
  if (session.mockAuthEnabled) return "本地验证环境";
  return "试用环境";
});

const isLoginRoute = computed(() => route.path === "/login");
const isPublicSupplierRegisterRoute = computed(() => route.path === "/supplier-onboarding-register");
const isHiddenUtilityRoute = computed(() => route.path === "/role-switch");
const supplierPasswordChangeRequired = computed(
  () => session.passwordChangeRequired && ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId)
);

function routeAllowed(path: string) {
  return isRouteAllowed(path, session.roleId, session.mockAuthEnabled);
}

function fallbackRoute() {
  return roleHome(session.roleId);
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
  if (supplierRoles.includes(session.roleId as (typeof supplierRoles)[number]) && route.path.startsWith("/suppliers/")) {
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
  <AuthShell v-if="isLoginRoute || isHiddenUtilityRoute || isPublicSupplierRegisterRoute" :commercial="isLoginRoute">
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
    :environment-label="environmentLabel"
    :role-label="currentRoleLabel"
    @logout="logout"
  >
    <RouterView />
  </AppShell>

  <AuthShell v-else title="酒店供应链采购平台" subtitle="正在进入" />
</template>
