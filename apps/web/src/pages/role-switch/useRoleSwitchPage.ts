import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { apiGet } from "../../api/http";
import { useSessionStore } from "../../stores/session";
import type { SwitchableUser } from "./types";

const roleDefaultRoutes: Record<string, string> = {
  group_manager: "/",
  buyer: "/",
  hotel_buyer: "/",
  supplier: "/",
  platform_operator: "/",
  supplier_admin: "/",
  supplier_quotation: "/",
  expert: "/",
  hotel_finance: "/",
  finance_reviewer: "/",
  auditor: "/",
  admin: "/permissions"
};

export function accountLabel(user: SwitchableUser) {
  if (user.supplierName) return `${user.roleLabel} / ${user.supplierName}`;
  return `${user.roleLabel} / ${user.name}`;
}

export function useRoleSwitchPage() {
  const session = useSessionStore();
  const router = useRouter();
  const nextUserId = ref("u1");
  const error = ref("");
  const auditLogId = ref("");
  const switchableUsers = ref<SwitchableUser[]>([]);
  const enabled = computed(() => session.mockAuthEnabled);
  const selectedUser = computed(() => switchableUsers.value.find((item) => item.id === nextUserId.value));

  async function loadSwitchableUsers() {
    if (!session.mockAuthEnabled) return;
    const data = await apiGet<{ users: SwitchableUser[] }>("/api/auth/mock-users");
    switchableUsers.value = data.users;
    if (!switchableUsers.value.some((item) => item.id === nextUserId.value)) {
      nextUserId.value = switchableUsers.value[0]?.id ?? "";
    }
  }

  async function switchRole() {
    error.value = "";
    try {
      const data = await session.demoLogin(nextUserId.value);
      auditLogId.value = data.auditLogId ?? "";
      await router.replace(roleDefaultRoutes[data.roleId] ?? "/");
    } catch (err) {
      error.value = err instanceof Error ? err.message : "角色切换失败";
      auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
    }
  }

  onMounted(async () => {
    await session.loadAuthProviders();
    await loadSwitchableUsers().catch((err) => {
      error.value = err instanceof Error ? err.message : "账号列表加载失败";
    });
  });

  return {
    auditLogId,
    enabled,
    error,
    nextUserId,
    selectedUser,
    switchableUsers,
    switchRole
  };
}
