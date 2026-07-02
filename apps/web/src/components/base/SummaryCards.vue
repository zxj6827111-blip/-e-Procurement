<script setup lang="ts">
export interface SummaryCardItem {
  label: string;
  value: string | number;
  meta?: string;
}

defineProps<{
  items: SummaryCardItem[];
}>();
</script>

<template>
  <div class="eds-summary-grid">
    <div v-for="item in items" :key="item.label" class="eds-summary-item">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <small v-if="item.meta" class="eds-meta">{{ item.meta }}</small>
    </div>
  </div>
</template>
