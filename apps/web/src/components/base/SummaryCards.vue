<script setup lang="ts">
export interface SummaryCardItem {
  label: string;
  value: string | number;
  meta?: string;
  tone?: "blue" | "green" | "amber" | "red";
}

defineProps<{
  items: SummaryCardItem[];
}>();
</script>

<template>
  <div class="eds-summary-grid">
    <div
      v-for="item in items"
      :key="item.label"
      :class="['eds-summary-item', item.tone ? `eds-summary-item-${item.tone}` : '']"
    >
      <span class="eds-summary-label">{{ item.label }}</span>
      <strong class="eds-summary-value">{{ item.value }}</strong>
      <small v-if="item.meta" class="eds-summary-meta">{{ item.meta }}</small>
    </div>
  </div>
</template>
