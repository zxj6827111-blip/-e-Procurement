<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseSurface,
  EnterpriseTabs,
  FeedbackMessage,
  RiskAlertPanel,
  StatusTag,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";
import DemandSummaryPanel from "./DemandSummaryPanel.vue";
import ProjectExecutionMap from "./ProjectExecutionMap.vue";
import ProjectSelectorSummary from "./ProjectSelectorSummary.vue";
import WorkbenchFocusPanel from "./WorkbenchFocusPanel.vue";
import WorkbenchSubpageEntrypoints from "./WorkbenchSubpageEntrypoints.vue";
import { useProjectWorkbenchPage } from "./useProjectWorkbenchPage";

const {
  auditLogId,
  completedOperationCount,
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
  workbench,
  currency
} = useProjectWorkbenchPage();

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "执行历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];

const executionSummaryItems = computed<SummaryCardItem[]>(() => [
  { label: "当前阶段", value: projectStatusText.value || "-" },
  { label: "下一步动作", value: nextAction.value?.title ?? "待识别" },
  { label: "执行进度", value: `${completedOperationCount.value} / ${totalOperationCount.value}` },
  { label: "执行模式", value: isExternalTradeProject.value ? "外部采购备案" : "内部招采履约" }
]);
</script>

<template>
  <section class="eds-section g-hotel-project-detail">
    <header class="g-hotel-project-command">
      <div>
        <div class="g-hotel-project-title-row">
          <h2>{{ currentProjectLabel }}</h2>
          <StatusTag v-if="isExternalTradeProject" tone="warning">外部交易备案</StatusTag>
        </div>
        <p>
          <span>{{ selectedProjectOptionLabel }}</span>
          <span>当前阶段: {{ projectStatusText }}</span>
          <span>执行模式: {{ isExternalTradeProject ? "外部采购备案" : "内部招采履约" }}</span>
        </p>
      </div>
      <div class="g-hotel-project-actions">
        <RouterLink class="eds-button" to="/project-workbench">返回列表</RouterLink>
        <RouterLink v-if="workbench && !isExternalTradeProject" class="eds-button eds-button-primary" :to="`/project-workbench/${encodeURIComponent(workbench.project.id)}/sourcing`">
          进入下一阶段处理
        </RouterLink>
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
      <div class="g-hotel-project-status-band">
        <article>
          <span>当前业务阶段</span>
          <strong>{{ projectStatusText }}</strong>
        </article>
        <article>
          <span>关键时间节点</span>
          <strong>{{ nextAction?.title ?? "未设定" }}</strong>
        </article>
        <article>
          <span>档案完整度</span>
          <strong>{{ completedOperationCount }} / {{ totalOperationCount }}</strong>
        </article>
      </div>

      <div class="eds-process-hero g-hotel-project-hero">
        <EnterpriseSurface title="项目基本信息" description="项目阶段、下一步动作与关键处理链路固定在同一张执行面板中。">
          <SummaryCards :items="executionSummaryItems" />
        </EnterpriseSurface>

        <RiskAlertPanel title="审计跟踪与风险" description="保留当前项目最影响推进和审计追溯的判断点。">
          <div class="eds-process-reference">
            <article class="eds-process-reference-item">
              <span>当前阶段</span>
              <strong>{{ projectStatusText }}</strong>
            </article>
            <article class="eds-process-reference-item">
              <span>下一步</span>
              <strong>{{ nextAction?.title ?? "待识别" }}</strong>
            </article>
          </div>
          <ul class="eds-process-checklist">
            <li>
              <strong>先看阶段与动作是否一致</strong>
              <span>项目阶段、下一步动作和可进入子页面必须互相印证，避免页面能进但业务链条未到位。</span>
            </li>
            <li>
              <strong>先看采购方式与执行路径是否一致</strong>
              <span>外部采购项目必须走备案链路，内部项目才进入招采与履约执行页面。</span>
            </li>
            <li>
              <strong>先看留痕是否完整</strong>
              <span>方式判定、评审、定标、履约和归档都必须能回溯到同一项目主线。</span>
            </li>
          </ul>
        </RiskAlertPanel>
      </div>

      <EnterpriseTabs class="g-hotel-project-tabs" :tabs="detailTabs" active-key="details" />

      <div class="eds-process-shell">
        <section class="eds-panel-stack">
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
        </section>

        <aside class="eds-panel-stack">
          <WorkbenchSubpageEntrypoints
            :workbench="workbench"
            :show-sourcing-details="showSourcingDetails"
            :sourcing-metrics="sourcingMetrics"
            :fulfillment-metrics="fulfillmentMetrics"
          />
        </aside>
      </div>
    </template>
  </section>
</template>
