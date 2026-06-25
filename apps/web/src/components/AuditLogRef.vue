<script setup lang="ts">
defineProps<{
  auditLogId?: string;
}>();
</script>

<template>
  <span v-if="auditLogId" class="audit-ref">审计日志号：{{ auditLogId }}</span>
</template>
