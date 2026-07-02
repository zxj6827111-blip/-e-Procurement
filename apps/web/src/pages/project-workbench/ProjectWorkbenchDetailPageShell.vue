<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import EnterpriseTabs from "../../components/base/EnterpriseTabs.vue";
import PageHeader from "../../components/base/PageHeader.vue";
import FeedbackMessage from "../../components/base/FeedbackMessage.vue";
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
    <PageHeader title="采购项目执行" eyebrow="项目工作台" :description="currentProjectLabel">
      <template #actions>
        <StatusTag>{{ projectStatusText }}</StatusTag>
      </template>
    </PageHeader>

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

      <WorkbenchSubpageEntrypoints
        :workbench="workbench"
        :show-sourcing-details="showSourcingDetails"
        :sourcing-metrics="sourcingMetrics"
        :fulfillment-metrics="fulfillmentMetrics"
      />

    </template>
  </section>
</template>

