<script setup lang="ts">
import type { SummaryCardItem } from "../../components/base";

defineProps<{
  items: SummaryCardItem[];
}>();
</script>

<template>
  <section class="eds-workbench-brief" aria-label="业务摘要">
    <div class="eds-workbench-brief-title">
      <span>业务摘要</span>
    </div>
    <dl class="eds-business-summary-strip">
      <div v-for="item in items" :key="item.label" class="eds-business-summary-item">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </section>
</template>
