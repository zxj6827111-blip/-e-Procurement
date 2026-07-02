<script setup lang="ts">
import { EnterpriseSurface, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  items: SummaryCardItem[];
}>();
</script>

<template>
  <EnterpriseSurface title="今日业务台账" description="按当前岗位汇总需要优先处理的采购、履约、结算和监督事项。">
    <SummaryCards :items="items" />
  </EnterpriseSurface>
</template>
