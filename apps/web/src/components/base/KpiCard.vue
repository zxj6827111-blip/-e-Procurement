<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    meta?: string;
    tone?: "default" | "primary" | "success" | "warning" | "error";
  }>(),
  {
    tone: "default"
  }
);
</script>

<template>
  <article :class="['eds-summary-item', tone === 'warning' ? 'eds-risk-alert-panel' : '']">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <small v-if="meta" class="eds-meta">{{ meta }}</small>
  </article>
</template>
