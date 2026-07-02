<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseButton, FormSection, SubmitPanel } from "../../components/base";

defineProps<{
  passwordChangeRequired: boolean;
  isSupplierAccount: boolean;
  loading: boolean;
  success: string;
  error: string;
  auditLogId: string;
}>();

const currentPassword = defineModel<string>("currentPassword", { required: true });
const newPassword = defineModel<string>("newPassword", { required: true });
const confirmPassword = defineModel<string>("confirmPassword", { required: true });

const emit = defineEmits<{
  submit: [];
}>();
</script>

<template>
  <FormSection title="修改登录密码" description="临时密码换正式密码后，旧临时密码会立即失效。">
    <p v-if="passwordChangeRequired" class="eds-meta">当前账号正在使用临时密码，必须先完成密码修改，才能继续使用供应商业务功能。</p>
    <p class="eds-meta">后台重置后拿到的是临时密码。请在这里输入当前临时密码，再设置自己的正式密码。</p>
    <p v-if="!isSupplierAccount" class="eds-meta">集团、酒店和平台账号后续应接入统一身份系统修改；此页主要用于供应商账号自助修改密码。</p>

    <form class="eds-form-section" @submit.prevent="emit('submit')">
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
      <SubmitPanel>
        <EnterpriseButton native-type="submit" type="primary" :disabled="loading">{{ loading ? "正在修改" : "确认修改" }}</EnterpriseButton>
      </SubmitPanel>
    </form>

    <p v-if="success" class="eds-meta">{{ success }}</p>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </FormSection>
</template>
