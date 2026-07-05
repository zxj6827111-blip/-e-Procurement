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
  <header class="eds-page-header eds-business-context">
    <div class="eds-business-context-main">
      <p class="eds-business-eyebrow">供应商门户 / 报价响应</p>
      <h2>任务导向报价工作区</h2>
      <p>{{ BIDDING_ENTRY_HINT }}</p>
    </div>

    <div class="eds-business-context-aside">
      <span class="eds-meta">当前项目</span>
      <strong>{{ selectedProject?.code ? `${selectedProject.code} / ${selectedProject.name}` : (selectedProject?.name ?? (selectedProjectId ? "已选择项目" : "未选择项目")) }}</strong>
      <StatusTag v-if="selectedProject?.beforeDeadline" tone="success">可提交报价</StatusTag>
      <StatusTag v-else-if="selectedProjectId" tone="warning">等待采购方开启或已截标</StatusTag>
      <StatusTag v-else tone="default">请先选择项目</StatusTag>
    </div>
  </header>

  <EnterpriseSurface title="响应快照" description="上区聚焦需求与响应文件，下区聚焦草稿、提交与锁定，让供应商在单一路径内完成动作。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
