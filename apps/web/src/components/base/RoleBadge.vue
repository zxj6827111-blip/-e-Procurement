<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <span class="enterprise-role-badge">{{ label }}</span>
</template>
