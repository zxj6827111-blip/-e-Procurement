<script setup lang="ts">
import { EnterpriseSurface, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import { BIDDING_ENTRY_HINT } from "./constants";
import type { Project } from "./types";

defineProps<{
  selectedProject?: Project;
  selectedProjectId: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>供应商门户 / 报价响应</p>
      <h2><span aria-hidden="true">价</span>项目报价响应</h2>
      <small>{{ selectedProject?.code ? `项目编号：${selectedProject.code} | ${selectedProject.name}` : BIDDING_ENTRY_HINT }}</small>
    </div>

    <div class="g-hotel-page-actions">
      <StatusTag v-if="selectedProject?.beforeDeadline" tone="success">可提交报价</StatusTag>
      <StatusTag v-else-if="selectedProjectId" tone="warning">等待采购方开启或已截标</StatusTag>
      <StatusTag v-else tone="default">请先选择项目</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="响应快照" description="上区聚焦需求与响应文件，下区聚焦草稿、提交与锁定，让供应商在单一路径内完成动作。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
