<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface } from "../../components/base";

defineEmits<{
  approve: [approved: boolean];
}>();
</script>

<template>
  <EnterpriseSurface title="审批操作">
    <div class="eds-actions">
      <EnterpriseButton type="primary" @click="$emit('approve', true)">审批通过</EnterpriseButton>
      <EnterpriseButton @click="$emit('approve', false)">审批驳回</EnterpriseButton>
    </div>
  </EnterpriseSurface>
</template>
