<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <span class="enterprise-environment-badge">{{ label }}</span>
</template>
