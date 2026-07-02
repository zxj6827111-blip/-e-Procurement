<script setup lang="ts">
import { EnterpriseButton, EnterpriseDialog } from "../../components/base";

defineProps<{
  message: string;
}>();

const emit = defineEmits<{
  close: [];
  goRegistration: [];
}>();
</script>

<template>
  <EnterpriseDialog :open="Boolean(message)" title="暂时不能提交报价" @close="emit('close')">
    <p>{{ message }}</p>
    <template #actions>
      <EnterpriseButton @click="emit('close')">知道了</EnterpriseButton>
      <EnterpriseButton type="primary" @click="emit('goRegistration')">去报名资料</EnterpriseButton>
    </template>
  </EnterpriseDialog>
</template>
