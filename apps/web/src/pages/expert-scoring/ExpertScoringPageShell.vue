<script setup lang="ts">
import TaskInboxSummary from "../../components/TaskInboxSummary.vue";
import { EnterpriseButton, EnterpriseSurface, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
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
  <header class="eds-page-header eds-business-context">
    <div class="eds-business-context-main">
      <p class="eds-business-eyebrow">专家评审 / 评分工作台</p>
      <h2>专家逐项评分表</h2>
      <p>按供应商逐项评分，提交并锁定后进入采购经办的评标记录汇总。</p>
    </div>
    <div class="eds-business-context-aside">
      <span class="eds-meta">当前评分单</span>
      <strong>{{ selectedSheet?.projectCode || selectedSheet?.projectName || "未选择" }}</strong>
      <EnterpriseButton :disabled="!selectedSheet" @click="emit('printSheet')">打印评分表</EnterpriseButton>
      <StatusTag v-if="selectedSheet" :tone="sheetStatusTone(selectedSheet.status)">{{ sheetStatusLabel(selectedSheet.status) }}</StatusTag>
    </div>
  </header>

  <TaskInboxSummary title="专家评审待办" :business-types="['review_award', 'expert_scoring']" compact />

  <EnterpriseSurface title="评分台账" description="专家确认、当前评分单和逐项评分汇总。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
