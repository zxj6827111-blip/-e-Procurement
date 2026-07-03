<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: "default" | "primary" | "success" | "warning" | "error" | "info" | "locked" | "draft" | "pending";
  }>(),
  {
    tone: "default"
  }
);
</script>

<template>
  <span
    :class="[
      'eds-tag',
      tone === 'primary' ? 'eds-tag-primary' : '',
      tone === 'success' ? 'eds-tag-success' : '',
      tone === 'warning' ? 'eds-tag-warning' : '',
      tone === 'error' ? 'eds-tag-error' : '',
      tone === 'info' || tone === 'pending' ? 'eds-tag-info' : '',
      tone === 'locked' ? 'eds-tag-locked' : '',
      tone === 'draft' ? 'eds-tag' : ''
    ]"
  >
    <slot />
  </span>
</template>
