<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { apiGet, apiPost } from "./api/http";
import { loadWorkflowNotifications, type R8WorkflowNotificationView } from "./api/workflow";
import GeminiShellBridge from "./gemini-react/GeminiShellBridge.vue";
import { geminiViewForPath, toGeminiUser } from "./gemini-react/route-mapping";
import AppShell from "./layouts/AppShell.vue";
import AuthShell from "./layouts/AuthShell.vue";
import { evaluateReactFeatureFlag, resolveFrontendFeatureFlags } from "./meta/feature-flags";
import { createFrontendRuntimeState, resolveMenu, resolveRuntimeRoute } from "./meta/system-registry";
import { recordFeatureFlagEvaluation, recordReactModuleError, recordRouteUsage } from "./observability/frontend-observability";
import {
  hasRoleProfile,
  pageTitle,
  roleHasMessageBell,
  roleHome,
  roleLabels,
  routeAllowed as isRouteAllowed,
  supplierRoles
} from "./permissions/role-model";
import { useSessionStore } from "./stores/session";

interface SwitchableUser {
  id: string;
  name: string;
  roleLabel: string;
  supplierName?: string;
}

interface ShellNotificationItem {
  id: string;
  title: string;
  summary: string;
  to: string;
  unread: boolean;
}

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const runtimeDataResetRoles = new Set(["admin", "group_manager", "platform_operator"]);
const bootstrapped = ref(false);
const roleSwitchOptions = ref<Array<{ id: string; label: string }>>([]);
const selectedRoleSwitchId = ref("");
const notificationItems = ref<ShellNotificationItem[]>([]);
const resetMessage = ref("");
const resettingData = ref(false);

const hasCurrentRoleProfile = computed(() => hasRoleProfile(session.roleId));
const frontendFeatureFlags = computed(() => resolveFrontendFeatureFlags());
const runtimeRouteDecision = computed(() => resolveRuntimeRoute(route.path, session.roleId, frontendFeatureFlags.value));
const registryMenuConfig = computed(() => resolveMenu(session.roleId));
const currentRoleLabel = computed(() => {
  if (hasCurrentRoleProfile.value) return roleLabels[session.roleId as keyof typeof roleLabels];
  return session.user ? "角色异常" : "未登录";
});
const visibleItems = computed(() => registryMenuConfig.value.navItems);
const visibleUtilityItems = computed(() => registryMenuConfig.value.utilityItems);
const appShellUserLabel = computed(() => session.user?.name || "未登录");
const currentPageTitle = computed(() => runtimeRouteDecision.value.pageTitle || pageTitle(route.path, session.roleId));
const environmentLabel = computed(() => {
  if (session.mode === "production") return "";
  if (session.mode === "uat") return "UAT 环境";
  if (session.mockAuthEnabled) return "验证环境";
  return "试用环境";
});
const roleSwitchEnabled = computed(() => session.mode !== "production" && session.mockAuthEnabled);
const canResetRuntimeData = computed(() => session.mode !== "production" && runtimeDataResetRoles.has(session.roleId));
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
const managedPasswordChangeRequired = computed(() => session.passwordChangeRequired);
const geminiView = computed(() => geminiViewForPath(route.path, session.roleId));
const geminiRenderableView = computed(() => (runtimeRouteDecision.value.canRenderReact ? geminiView.value : null));
const geminiCurrentUser = computed(() => {
  if (!session.user) return null;
  return toGeminiUser({
    id: session.user.id,
    name: session.user.name,
    roleId: session.roleId,
    orgId: session.user.orgId
  });
});
const routeProjectId = computed(() => {
  const routeParam = route.params.projectId;
  if (typeof routeParam === "string") return routeParam;
  const queryParam = route.query.projectId;
  if (typeof queryParam === "string") return queryParam;
  return null;
});
const geminiProjectId = computed(() => routeProjectId.value);
const frontendRuntimeState = computed(() =>
  createFrontendRuntimeState({
    route: route.path,
    roleId: session.roleId,
    session: {
      userId: session.user?.id ?? "",
      userName: session.user?.name ?? "",
      orgId: session.user?.orgId,
      mode: session.mode,
      mockAuthEnabled: session.mockAuthEnabled,
      passwordChangeRequired: session.passwordChangeRequired
    },
    uiContext: {
      environmentLabel: environmentLabel.value,
      projectId: geminiProjectId.value
    },
    flags: frontendFeatureFlags.value
  })
);

function routeAllowed(path: string) {
  return isRouteAllowed(path, session.roleId, session.mockAuthEnabled);
}

function navigateFromReact(path: string) {
  if (!path || path === route.fullPath) return;
  void router.push(path);
}

function reportReactError(error: unknown) {
  recordReactModuleError(route.path, session.roleId, error);
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

function toShellNotification(message: R8WorkflowNotificationView): ShellNotificationItem {
  return {
    id: message.id,
    title: message.title || message.businessTypeLabel,
    summary: message.contentSummary || `${message.businessTypeLabel} / ${message.readLabel}`,
    to: message.targetPath || "/messages",
    unread: !message.read
  };
}

async function loadShellNotifications() {
  if (!showMessageBell.value || !session.user) {
    notificationItems.value = [];
    return;
  }
  try {
    notificationItems.value = (await loadWorkflowNotifications()).map(toShellNotification).slice(0, 6);
  } catch {
    notificationItems.value = [];
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
  if (managedPasswordChangeRequired.value && route.path !== "/account-security") {
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

async function resetRuntimeData() {
  if (resettingData.value) return false;
  const confirmed = window.confirm("确认恢复初始业务数据吗？当前新增流程、上传材料和业务处理记录会被清空。");
  if (!confirmed) return false;
  resettingData.value = true;
  resetMessage.value = "";
  try {
    await apiPost<{ ok: true; auditLogId?: string }>("/api/runtime/reset-data", { confirm: true });
    resetMessage.value = "已恢复初始业务数据，可以重新从需求发起开始跑完整流程。";
    return true;
  } catch {
    resetMessage.value = "恢复失败，请稍后重试或联系系统管理员。";
    return false;
  } finally {
    resettingData.value = false;
  }
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
    await loadShellNotifications();
    enforceCurrentRoute();
  }
});

watch(
  () => [session.user?.id, session.mockAuthEnabled, session.mode],
  () => {
    void loadSwitchableUsers();
    void loadShellNotifications();
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

watch(
  () => [session.roleId, route.path, runtimeRouteDecision.value.runtimeOwner],
  () => {
    if (!bootstrapped.value || !session.roleId) return;
    recordRouteUsage(runtimeRouteDecision.value, session.roleId);
    recordFeatureFlagEvaluation(evaluateReactFeatureFlag(route.path, session.roleId, frontendFeatureFlags.value));
  }
);
</script>

<template>
  <RouterView v-if="isPublicSupplierRegisterRoute" />

  <AuthShell v-else-if="isLoginRoute || isHiddenUtilityRoute || renderStateInAuthShell" :commercial="isLoginRoute">
    <RouterView />
  </AuthShell>

  <GeminiShellBridge
    v-else-if="shellVisible && geminiRenderableView && geminiCurrentUser"
    :current-user="geminiCurrentUser"
    :current-view="geminiRenderableView"
    :current-project-id="geminiProjectId"
    :runtime-state="frontendRuntimeState"
    :menu-config="registryMenuConfig"
    :route-context="frontendRuntimeState.routeContext"
    :permission-snapshot="frontendRuntimeState.permissions"
    :feature-flags="frontendFeatureFlags"
    :can-reset-runtime-data="canResetRuntimeData"
    :resetting-data="resettingData"
    :reset-message="resetMessage"
    :on-reset-runtime-data="resetRuntimeData"
    :on-navigate="navigateFromReact"
    :on-logout="logout"
    :on-report-error="reportReactError"
  />

  <AppShell
    v-else-if="shellVisible"
    brand-mark="采"
    brand-title="集团内部采购规范化平台"
    brand-subtitle="招采流程 · 供应协同 · 履约审计"
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
    :notification-items="notificationItems"
    message-route="/messages"
    global-title="G-Hotel Enterprise Procurement Platform"
    @logout="logout"
    @update:selected-role-switch-id="selectedRoleSwitchId = $event"
    @switch-role="switchRole"
  >
    <section v-if="runtimeRouteDecision.runtimeOwner === 'vue-shell'" class="eds-state eds-state-warning enterprise-governance-fallback">
      <span class="eds-state-icon" aria-hidden="true">!</span>
      <p class="enterprise-governance-fallback-kicker">Frontend Governance</p>
      <h2>业务界面暂不可用</h2>
      <p>
        当前路由未通过 React 渲染门禁，Vue Shell 仅保留会话、权限、导航和统一状态承载，不回退到旧 Vue 业务页面。
      </p>
      <dl class="enterprise-governance-fallback-meta">
        <div>
          <dt>Route</dt>
          <dd class="enterprise-governance-fallback-code">{{ runtimeRouteDecision.route }}</dd>
        </div>
        <div>
          <dt>Module</dt>
          <dd>{{ runtimeRouteDecision.moduleId || "未登记" }}</dd>
        </div>
      </dl>
    </section>
    <RouterView v-else />
  </AppShell>

  <AuthShell v-else title="酒店供应链采购平台" subtitle="正在进入" />
</template>
