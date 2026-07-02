<script setup lang="ts">
import { PageHeader, StatusTag, SummaryCards, EnterpriseSurface, type SummaryCardItem } from "../../components/base";
import { BIDDING_ENTRY_HINT } from "./constants";
import type { Project } from "./types";

defineProps<{
  selectedProject?: Project;
  selectedProjectId: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="报价响应" eyebrow="供应商报价" :description="BIDDING_ENTRY_HINT">
    <template #actions>
      <StatusTag v-if="selectedProject?.beforeDeadline" tone="success">报价期内</StatusTag>
      <StatusTag v-else-if="selectedProjectId" tone="warning">等待或已截标</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="报价概览" description="仅展示当前供应商可报价项目及该项目下的报价单。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
