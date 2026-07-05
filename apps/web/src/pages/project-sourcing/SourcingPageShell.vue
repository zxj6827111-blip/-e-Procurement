<script setup lang="ts">
import { RouterLink } from "vue-router";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseSurface,
  EnterpriseTabs,
  FeedbackMessage,
  RiskAlertPanel,
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
      <span class="eds-meta">当前阶段</span>
      <strong>{{ hasWorkbench ? projectStatusText : "未加载" }}</strong>
      <RouterLink class="eds-action-link" :to="`/project-workbench/${encodeURIComponent(projectId)}`">返回项目详情 <span>→</span></RouterLink>
    </div>
  </header>

  <ErrorAlert v-if="errorMessage" :message="errorMessage" />
  <FeedbackMessage v-if="loading">正在加载招采执行详情...</FeedbackMessage>
  <FeedbackMessage v-else-if="!hasWorkbench" align="center">当前项目暂无可访问的招采执行数据。</FeedbackMessage>

  <template v-if="hasWorkbench">
    <div class="eds-process-hero">
      <EnterpriseSurface title="项目推进台账" eyebrow="招采控制" description="把需求、报名、报价、评审与定标放在同一条执行主线上查看。">
        <SummaryCards :items="summaryItems" />
      </EnterpriseSurface>

      <RiskAlertPanel title="招采控制点" description="只保留当前阶段最有业务价值的控制提醒，不做无意义装饰。">
        <ul class="eds-process-checklist">
          <li>
            <strong>报价阶段先看保密边界</strong>
            <span>报价截止和锁定前只允许看提交进度，不提前暴露金额、明细和响应文件。</span>
          </li>
          <li>
            <strong>评审阶段先看留痕完整性</strong>
            <span>专家评分、评审结论和评审报告必须按项目留痕，后续定标才能成立。</span>
          </li>
          <li>
            <strong>定标阶段先看依据一致性</strong>
            <span>推荐结果、审批记录和价格报告要能互相印证，避免形成孤立结论。</span>
          </li>
        </ul>
      </RiskAlertPanel>
    </div>

    <EnterpriseTabs :tabs="detailTabs" active-key="details" />

    <div class="eds-process-shell">
      <section class="eds-panel-stack">
        <slot name="primary" />
      </section>
      <aside class="eds-panel-stack">
        <slot name="secondary" />
      </aside>
    </div>
  </template>
</template>
