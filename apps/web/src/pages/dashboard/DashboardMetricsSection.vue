<script setup lang="ts">
import { EnterpriseSurface, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  items: SummaryCardItem[];
}>();
</script>

<template>
  <EnterpriseSurface class="eds-workbench-brief" title="待处理概览">
    <SummaryCards :items="items" />
  </EnterpriseSurface>
</template>
