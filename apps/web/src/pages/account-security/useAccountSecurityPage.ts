import { computed, ref } from "vue";
import { apiPost } from "../../api/http";
import { useSessionStore } from "../../stores/session";

export function useAccountSecurityPage() {
  const session = useSessionStore();
  const currentPassword = ref("");
  const newPassword = ref("");
  const confirmPassword = ref("");
  const error = ref("");
  const success = ref("");
  const auditLogId = ref("");
  const loading = ref(false);

  const isSupplierAccount = computed(() => ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId));

  async function changePassword() {
    error.value = "";
    success.value = "";
    auditLogId.value = "";
    if (newPassword.value !== confirmPassword.value) {
      error.value = "两次输入的新密码不一致。";
      return;
    }
    if (newPassword.value.length < 8) {
      error.value = "新密码至少需要 8 位。";
      return;
    }
    if (newPassword.value === currentPassword.value) {
      error.value = "新密码不能和当前密码相同。";
      return;
    }

    loading.value = true;
    try {
      const result = await apiPost<{ passwordChangeRequired?: boolean; auditLogId?: string }>("/api/me/change-password", {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value
      });
      auditLogId.value = result.auditLogId ?? "";
      session.passwordChangeRequired = Boolean(result.passwordChangeRequired);
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
      success.value = "密码已修改成功，下次登录请使用新密码。";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "密码修改失败";
      auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
    } finally {
      loading.value = false;
    }
  }

  return {
    auditLogId,
    changePassword,
    confirmPassword,
    currentPassword,
    error,
    isSupplierAccount,
    loading,
    newPassword,
    session,
    success
  };
}
