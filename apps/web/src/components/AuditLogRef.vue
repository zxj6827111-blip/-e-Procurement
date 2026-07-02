<script setup lang="ts">
defineProps<{
  auditLogId?: string;
}>();
</script>

<template>
  <span v-if="auditLogId" class="eds-audit-ref">审计日志号：{{ auditLogId }}</span>
</template>
