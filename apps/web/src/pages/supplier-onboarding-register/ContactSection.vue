<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { ContactDraft } from "./types";

const contact = defineModel<ContactDraft>("contact", { required: true });

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <EnterpriseSurface title="联系人信息" :description="`第 ${stepSummary} 步。主联系人用于后续资质初审、准入审批和账号通知。`">
    <div class="eds-form-section">
      <label>姓名<input v-model="contact.name" /></label>
      <label>职位<input v-model="contact.position" /></label>
      <label>Email<input v-model="contact.email" type="email" /></label>
      <label>手机号码<input v-model="contact.mobile" /></label>
      <label>固定电话<input v-model="contact.phone" /></label>
      <label>传真<input v-model="contact.fax" /></label>
    </div>
  </EnterpriseSurface>
</template>
