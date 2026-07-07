<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { AccountDraft } from "./types";

const account = defineModel<AccountDraft>("account", { required: true });

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <EnterpriseSurface title="账号注册" :description="`第 ${stepSummary} 步。手机号和验证码用于创建供应商入驻账号。`">
    <div class="eds-form-section">
      <label>手机号<input v-model="account.mobile" placeholder="用于接收注册验证码" /></label>
      <label>验证码<input v-model="account.captchaCode" placeholder="请输入验证码" /></label>
      <label>密码<input v-model="account.password" type="password" autocomplete="new-password" /></label>
      <label>确认密码<input v-model="account.confirmPassword" type="password" autocomplete="new-password" /></label>
      <label><span>注册协议</span><input v-model="account.agreementAccepted" type="checkbox" /> 同意《供应链平台注册协议》</label>
    </div>
  </EnterpriseSurface>
</template>
