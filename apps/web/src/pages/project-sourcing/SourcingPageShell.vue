<script setup lang="ts">
import { RouterLink } from "vue-router";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseSurface,
  EnterpriseTabs,
  FeedbackMessage,
  PageHeader,
  RiskAlertPanel,
  SplitDetailLayout,
  StatusTag,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";

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

    <SplitDetailLayout>
      <EnterpriseSurface title="招采推进情况" eyebrow="项目执行">
        <SummaryCards :items="summaryItems" />
      </EnterpriseSurface>

      <template #aside>
        <RiskAlertPanel title="招采控制点" description="报价、开标和评审节点需要同时满足时限、保密和审批要求。">
          <ul class="eds-meta-list">
            <li>报价截止前不得暴露供应商报价明细。</li>
            <li>评审材料和专家评分需按项目留痕。</li>
            <li>定标依据应与评审记录和审批记录一致。</li>
          </ul>
        </RiskAlertPanel>
      </template>
    </SplitDetailLayout>
  </template>
</template>
