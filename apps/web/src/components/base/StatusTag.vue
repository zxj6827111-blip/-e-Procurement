<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: "default" | "primary" | "success" | "warning" | "error";
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
      tone === 'error' ? 'eds-tag-error' : ''
    ]"
  >
    <slot />
  </span>
</template>
