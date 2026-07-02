<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: "neutral" | "success" | "warning" | "error";
    align?: "start" | "center";
  }>(),
  {
    tone: "neutral",
    align: "start"
  }
);
</script>

<template>
  <div
    :class="[
      'eds-feedback',
      tone === 'success' ? 'eds-feedback-success' : '',
      tone === 'warning' ? 'eds-feedback-warning' : '',
      tone === 'error' ? 'eds-feedback-error' : '',
      align === 'center' ? 'eds-feedback-center' : ''
    ]"
  >
    <slot />
  </div>
</template>
