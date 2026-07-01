<script setup lang="ts">
import { computed, ref } from "vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { apiPost } from "../api/http";
import { useSessionStore } from "../stores/session";

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
</script>

<template>
  <section class="panel account-security-panel">
    <div class="section-heading">
      <div>
        <p class="eyebrow">账号安全</p>
        <h2>修改登录密码</h2>
      </div>
    </div>

    <p v-if="session.passwordChangeRequired" class="warning-alert">
      当前账号正在使用临时密码，必须先完成密码修改，才能继续使用供应商业务功能。
    </p>

    <p class="notice">
      后台重置后拿到的是临时密码。请在这里输入当前临时密码，再设置自己的正式密码；修改成功后旧临时密码会失效。
    </p>

    <div v-if="!isSupplierAccount" class="notice">
      当前页面主要用于供应商账号自助修改密码。集团、酒店和平台账号后续应接入统一身份系统修改。
    </div>

    <form class="form-grid account-password-form" @submit.prevent="changePassword">
      <label>
        当前密码
        <input v-model="currentPassword" type="password" autocomplete="current-password" placeholder="请输入当前临时密码或当前密码" />
      </label>
      <label>
        新密码
        <input v-model="newPassword" type="password" autocomplete="new-password" placeholder="至少 8 位" />
      </label>
      <label>
        确认新密码
        <input v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="再次输入新密码" />
      </label>
      <button type="submit" :disabled="loading">{{ loading ? "正在修改" : "确认修改" }}</button>
    </form>

    <div v-if="success" class="success-alert">{{ success }}</div>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>
