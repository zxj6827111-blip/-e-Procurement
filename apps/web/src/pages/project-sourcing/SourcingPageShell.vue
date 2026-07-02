<script setup lang="ts">
import { RouterLink } from "vue-router";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface, EnterpriseTabs, FeedbackMessage, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "寻源历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];

defineProps<{
  projectId: string;
  projectStatusText: string;
  loading: boolean;
  errorMessage: string;
  hasWorkbench: boolean;
  description: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="招采执行详情" eyebrow="项目工作台" :description="description">
    <template #actions>
      <RouterLink class="eds-button eds-button-text" :to="`/project-workbench/${encodeURIComponent(projectId)}`">返回项目详情</RouterLink>
      <StatusTag v-if="hasWorkbench">{{ projectStatusText }}</StatusTag>
    </template>
  </PageHeader>

  <ErrorAlert v-if="errorMessage" :message="errorMessage" />
  <FeedbackMessage v-if="loading">正在加载招采执行详情...</FeedbackMessage>
  <FeedbackMessage v-else-if="!hasWorkbench" align="center">当前项目暂无可访问的招采执行数据。</FeedbackMessage>

  <template v-if="hasWorkbench">
    <EnterpriseTabs :tabs="detailTabs" active-key="details" />

    <EnterpriseSurface title="招采推进情况" eyebrow="项目执行">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>
  </template>
</template>
