<script setup lang="ts">
import WorkflowSurfaceSummary from "../../components/WorkflowSurfaceSummary.vue";
import { EnterpriseButton, EnterpriseSurface, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { ScoringSheet } from "./types";

defineProps<{
  selectedSheet?: ScoringSheet | null;
  summaryItems: SummaryCardItem[];
  sheetStatusLabel: (status: string) => string;
  sheetStatusTone: (status: string) => "default" | "primary" | "success" | "warning" | "error";
}>();

const emit = defineEmits<{
  printSheet: [];
}>();
</script>

<template>
  <PageHeader title="专家逐项评分表" eyebrow="专家评分" description="按供应商逐项评分，提交并锁定后进入采购经办的评标记录汇总。">
    <template #actions>
      <EnterpriseButton :disabled="!selectedSheet" @click="emit('printSheet')">打印评分表</EnterpriseButton>
      <StatusTag v-if="selectedSheet" :tone="sheetStatusTone(selectedSheet.status)">{{ sheetStatusLabel(selectedSheet.status) }}</StatusTag>
    </template>
  </PageHeader>

  <WorkflowSurfaceSummary title="专家评审待办" :business-types="['review_award', 'expert_scoring']" compact />

  <EnterpriseSurface title="评分概览" description="专家确认、当前评分单和逐项评分汇总。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
