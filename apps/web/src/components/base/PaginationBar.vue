<script setup lang="ts">
defineProps<{
  total: number;
  page?: number;
  pageSize?: number;
}>();
</script>

<template>
  <div class="eds-pagination">
    <span class="eds-meta">共 {{ total }} 条</span>
    <span v-if="page && pageSize" class="eds-meta">第 {{ page }} 页 / 每页 {{ pageSize }} 条</span>
    <slot />
  </div>
</template>
