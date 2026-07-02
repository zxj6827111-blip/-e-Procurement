<script setup lang="ts">
import { RouterLink } from "vue-router";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface, EnterpriseTabs, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { StatusTone } from "./types";

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "履约历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];

defineProps<{
  projectId: string;
  description: string;
  statusLabel: string;
  statusTone: StatusTone;
  loading: boolean;
  errorMessage: string;
  auditLogId: string;
  hasWorkbench: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="履约结算与归档" eyebrow="项目工作台" :description="description">
    <template #actions>
      <RouterLink class="eds-button" :to="`/project-workbench/${encodeURIComponent(projectId)}`">返回项目详情</RouterLink>
      <StatusTag :tone="statusTone">{{ statusLabel }}</StatusTag>
    </template>
  </PageHeader>

  <ErrorAlert v-if="errorMessage" :message="errorMessage" />
  <p v-if="auditLogId" class="eds-meta">审计日志：{{ auditLogId }}</p>
  <p v-if="loading" class="eds-meta">正在加载履约数据...</p>

  <template v-if="hasWorkbench">
    <EnterpriseTabs :tabs="detailTabs" active-key="details" />

    <EnterpriseSurface title="履约概览">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>
  </template>
</template>
