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
  <header class="eds-page-header eds-business-context">
    <div class="eds-business-context-main">
      <p class="eds-business-eyebrow">项目工作台 / 招采执行</p>
      <h2>招采执行详情</h2>
      <p>{{ description }}</p>
    </div>
    <div class="eds-business-context-aside">
      <span class="eds-meta">当前节点</span>
      <strong>{{ hasWorkbench ? projectStatusText : "未加载" }}</strong>
      <RouterLink class="eds-action-link" :to="`/project-workbench/${encodeURIComponent(projectId)}`">返回项目详情 <span>→</span></RouterLink>
    </div>
  </header>

  <ErrorAlert v-if="errorMessage" :message="errorMessage" />
  <FeedbackMessage v-if="loading">正在加载招采执行详情...</FeedbackMessage>
  <FeedbackMessage v-else-if="!hasWorkbench" align="center">当前项目暂无可访问的招采执行数据。</FeedbackMessage>

  <template v-if="hasWorkbench">
    <EnterpriseTabs :tabs="detailTabs" active-key="details" />

    <SplitDetailLayout>
      <EnterpriseSurface title="项目推进台账" eyebrow="招采控制">
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
