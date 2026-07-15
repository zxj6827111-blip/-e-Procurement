import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { roleHome } from "../../permissions/role-model";
import { useSessionStore } from "../../stores/session";
import { demoUsers } from "./display";

function passwordForUser(userId: string) {
  return `pass-${userId}`;
}

function loginErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : "";
  if (/NetworkError|Failed to fetch|fetch resource|Load failed/i.test(message)) {
    return "本地服务未连接，请先启动后端服务后再进入系统。";
  }
  return message || fallback;
}

function defaultRoute(roleId: string) {
  return roleHome(roleId);
}

function postLoginRoute(roleId: string, passwordChangeRequired?: boolean) {
  if (passwordChangeRequired) return "/account-security";
  return defaultRoute(roleId);
}

export function useLoginPage() {
  const session = useSessionStore();
  const router = useRouter();
  const username = ref("");
  const password = ref("");
  const selectedUserId = ref("u2");
  const error = ref("");
  const auditLogId = ref("");
  const loading = ref(false);
  const selectedUser = computed(() => demoUsers.find((item) => item.id === selectedUserId.value) ?? demoUsers[0]);
  const environmentLabel = computed(() => {
    if (session.mode === "production") return "生产环境";
    if (session.mode === "uat") return "UAT 环境";
    if (session.mockAuthEnabled) return "验证环境";
    return "试用环境";
  });
  const showLocalAccess = computed(() => session.mode !== "production" && session.mockAuthEnabled);

  function selectDemoUser(userId: string) {
    selectedUserId.value = userId;
    username.value = userId;
    password.value = passwordForUser(userId);
  }

  async function login() {
    error.value = "";
    loading.value = true;
    try {
      const data = await session.login(username.value, password.value);
      auditLogId.value = data.auditLogId ?? "";
      await router.replace(postLoginRoute(data.roleId, data.passwordChangeRequired));
    } catch (err) {
      error.value = loginErrorMessage(err, "登录失败");
      auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
    } finally {
      loading.value = false;
    }
  }

  async function enterDemo() {
    error.value = "";
    loading.value = true;
    try {
      const data = await session.demoLogin(selectedUserId.value);
      auditLogId.value = data.auditLogId ?? "";
      await router.replace(postLoginRoute(data.roleId, data.passwordChangeRequired));
    } catch (err) {
      error.value = loginErrorMessage(err, "账号进入失败");
      auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void session.loadAuthProviders().catch(() => {
      session.mockAuthEnabled = true;
      session.mode = "local";
    });
  });

  return {
    auditLogId,
    demoUsers,
    enterDemo,
    environmentLabel,
    error,
    loading,
    login,
    password,
    selectDemoUser,
    selectedUser,
    selectedUserId,
    session,
    showLocalAccess,
    username
  };
}
