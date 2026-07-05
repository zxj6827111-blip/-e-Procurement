<script setup lang="ts">
import SummaryCards, { type SummaryCardItem } from "../../components/base/SummaryCards.vue";

defineProps<{
  items: SummaryCardItem[];
}>();
</script>

<template>
  <SummaryCards class="eds-template-a-kpis" :items="items" />
</template>
