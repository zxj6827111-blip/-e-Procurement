<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import EnterpriseTabs from "../../components/base/EnterpriseTabs.vue";
import FeedbackMessage from "../../components/base/FeedbackMessage.vue";
import RiskAlertPanel from "../../components/base/RiskAlertPanel.vue";
import SplitDetailLayout from "../../components/base/SplitDetailLayout.vue";
import StatusTag from "../../components/base/StatusTag.vue";
import DemandSummaryPanel from "./DemandSummaryPanel.vue";
import ProjectExecutionMap from "./ProjectExecutionMap.vue";
import ProjectSelectorSummary from "./ProjectSelectorSummary.vue";
import WorkbenchFocusPanel from "./WorkbenchFocusPanel.vue";
import WorkbenchSubpageEntrypoints from "./WorkbenchSubpageEntrypoints.vue";
import { useProjectWorkbenchPage } from "./useProjectWorkbenchPage";

const {
  auditLogId,
  completedOperationCount,
  currency,
  currentProjectLabel,
  demandSummary,
  errorMessage,
  fulfillmentMetrics,
  isExternalTradeProject,
  lineItemSummary,
  loading,
  nextAction,
  operationStateLabel,
  progressOverview,
  projectOperationLinks,
  projectOptionLabel,
  projectOptions,
  projectStatusText,
  projectSummaryItems,
  selectedProjectId,
  selectedProjectOptionLabel,
  showSourcingDetails,
  sourcingMetrics,
  totalOperationCount,
  workbench
} = useProjectWorkbenchPage();

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "执行历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];
</script>

<template>
  <section class="eds-section">
    <header class="eds-page-header eds-business-context">
      <div class="eds-business-context-main">
        <p class="eds-business-eyebrow">采购项目 / 执行总览</p>
        <h2>采购项目执行</h2>
        <p>{{ currentProjectLabel }}</p>
      </div>
      <div class="eds-business-context-aside">
        <span class="eds-meta">当前阶段</span>
        <strong>{{ projectStatusText }}</strong>
        <StatusTag>{{ projectStatusText }}</StatusTag>
      </div>
    </header>

    <ProjectSelectorSummary
      v-model:selected-project-id="selectedProjectId"
      :current-project-label="currentProjectLabel"
      :selected-project-option-label="selectedProjectOptionLabel"
      :project-options="projectOptions"
      :project-summary-items="projectSummaryItems"
      :project-option-label="projectOptionLabel"
    />

    <ErrorAlert v-if="errorMessage" :message="errorMessage" />
    <AuditLogRef :audit-log-id="auditLogId" />

    <FeedbackMessage v-if="loading">正在加载项目执行信息...</FeedbackMessage>
    <FeedbackMessage v-else-if="!workbench" align="center">当前角色没有可访问的项目执行数据。</FeedbackMessage>

    <template v-else>
      <EnterpriseTabs :tabs="detailTabs" active-key="details" />

      <SplitDetailLayout>
        <WorkbenchFocusPanel :project-id="workbench.project.id" :next-action="nextAction" />

        <ProjectExecutionMap
          :title="isExternalTradeProject ? '外部采购备案链路' : '采购执行步骤'"
          :project-status-text="projectStatusText"
          :progress-overview="progressOverview"
          :completed-operation-count="completedOperationCount"
          :total-operation-count="totalOperationCount"
          :project-operation-links="projectOperationLinks"
          :operation-state-label="operationStateLabel"
        />

        <DemandSummaryPanel
          :procurement-request="workbench.procurementRequest"
          :demand-summary="demandSummary"
          :line-item-summary="lineItemSummary"
          :currency="currency"
        />

        <template #aside>
          <RiskAlertPanel title="下一步关注" description="优先处理当前项目的下一动作、截止时间和责任人。">
            <ul class="eds-meta-list">
              <li>优先确认公告、报价截止和评审安排。</li>
              <li>涉及外部采购备案时保留完整审批依据。</li>
              <li>项目状态变化必须与业务记录一致。</li>
            </ul>
          </RiskAlertPanel>

          <WorkbenchSubpageEntrypoints
            :workbench="workbench"
            :show-sourcing-details="showSourcingDetails"
            :sourcing-metrics="sourcingMetrics"
            :fulfillment-metrics="fulfillmentMetrics"
          />
        </template>
      </SplitDetailLayout>

    </template>
  </section>
</template>

