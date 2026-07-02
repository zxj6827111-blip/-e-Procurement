<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag, SummaryCards } from "../../components/base";
import { SCORING_COLUMNS } from "./constants";
import type { ReviewReportSummary, ScoringSheet, ScoringSummary, StatusTone } from "./types";

defineProps<{
  scoringSummary: ScoringSummary;
  latestReviewReport: ReviewReportSummary | null;
  sheets: ScoringSheet[];
  supplierName: (supplierId: string) => string;
  statusTone: (value: string | undefined | null) => StatusTone;
  label: (value: string | undefined | null) => string;
  formatDateTime: (value?: string | null) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="专家评分">
    <SummaryCards
      :items="[
        { label: '评分任务', value: scoringSummary.assigned },
        { label: '已提交', value: scoringSummary.submitted },
        { label: '平均分', value: scoringSummary.average === null ? '-' : scoringSummary.average.toFixed(1) },
        { label: '评审报告', value: latestReviewReport ? label(latestReviewReport.status) : '未生成' }
      ]"
    />
    <DataTable :columns="SCORING_COLUMNS" :rows="sheets" row-key="id" empty-text="报价锁定后显示专家评分记录">
      <template #expert="{ row }">{{ row.expertName || row.expertId }}</template>
      <template #supplier="{ row }">{{ row.supplierName || supplierName(row.supplierId) }}</template>
      <template #score="{ row }">技术 {{ row.technical }} / 服务 {{ row.service }} / 价格 {{ row.price }} / 总分 {{ row.total }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag>
      </template>
      <template #submittedAt="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
