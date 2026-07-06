<script setup lang="ts">
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
  viewMaterials: [];
}>();
</script>

<template>
  <header class="g-hotel-page-header g-hotel-scoring-header">
    <div>
      <p>专家评审 / 评分工作台</p>
      <h2><span aria-hidden="true">评</span>专家评审打分台</h2>
      <small>{{ selectedSheet?.projectCode || "PROJ-2026" }} | {{ selectedSheet?.projectName || "请选择评分单后进入综合打分" }}</small>
    </div>
    <div class="g-hotel-page-actions">
      <EnterpriseButton :disabled="!selectedSheet" @click="emit('viewMaterials')">查看招标文件</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedSheet" @click="emit('viewMaterials')">查看所有投标文件</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedSheet" @click="emit('printSheet')">打印评分表</EnterpriseButton>
      <StatusTag v-if="selectedSheet" :tone="sheetStatusTone(selectedSheet.status)">{{ sheetStatusLabel(selectedSheet.status) }}</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="专家评分台账" description="专家确认、当前评分单和逐项评分汇总。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
