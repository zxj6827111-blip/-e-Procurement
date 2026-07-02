<script setup lang="ts">
import { PageHeader } from "../../components/base";
import AccountSecurityFormPanel from "./AccountSecurityFormPanel.vue";
import { useAccountSecurityPage } from "./useAccountSecurityPage";

const state = useAccountSecurityPage();
</script>

<template>
  <PageHeader title="账号安全" eyebrow="登录设置" description="维护当前账号登录密码，保留审计引用便于后续追踪。" />
  <AccountSecurityFormPanel
    v-model:confirm-password="state.confirmPassword.value"
    v-model:current-password="state.currentPassword.value"
    v-model:new-password="state.newPassword.value"
    :audit-log-id="state.auditLogId.value"
    :error="state.error.value"
    :is-supplier-account="state.isSupplierAccount.value"
    :loading="state.loading.value"
    :password-change-required="state.session.passwordChangeRequired"
    :success="state.success.value"
    @submit="state.changePassword"
  />
</template>
