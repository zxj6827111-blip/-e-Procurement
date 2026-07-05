<script setup lang="ts">
import { RouterLink } from "vue-router";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseSurface,
  EnterpriseTabs,
  RiskAlertPanel,
  StatusTag,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";
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
  <header class="eds-page-header eds-business-context">
    <div class="eds-business-context-main">
      <p class="eds-business-eyebrow">项目工作台 / 履约结算</p>
      <h2>履约结算与归档</h2>
      <p>{{ description }}</p>
    </div>
    <div class="eds-business-context-aside">
      <span class="eds-meta">当前阶段</span>
      <strong>{{ statusLabel }}</strong>
      <StatusTag :tone="statusTone">{{ statusLabel }}</StatusTag>
      <RouterLink class="eds-action-link" :to="`/project-workbench/${encodeURIComponent(projectId)}`">返回项目详情 <span>→</span></RouterLink>
    </div>
  </header>

  <ErrorAlert v-if="errorMessage" :message="errorMessage" />
  <p v-if="auditLogId" class="eds-meta">审计日志：{{ auditLogId }}</p>
  <p v-if="loading" class="eds-meta">正在加载履约数据...</p>

  <template v-if="hasWorkbench">
    <div class="eds-process-hero">
      <EnterpriseSurface title="履约证据链" description="订单、收货、结算、评价和归档围绕同一项目持续收口。">
        <SummaryCards :items="summaryItems" />
      </EnterpriseSurface>

      <RiskAlertPanel title="履约收口条件" description="先确认事实，再进入结算和归档，不做脱节流转。">
        <div class="eds-process-reference">
          <article class="eds-process-reference-item">
            <span>当前阶段</span>
            <strong>{{ statusLabel }}</strong>
          </article>
          <article class="eds-process-reference-item">
            <span>审计流水</span>
            <strong>{{ auditLogId || "待形成" }}</strong>
          </article>
        </div>
        <ul class="eds-process-checklist">
          <li>
            <strong>先看订单是否完成确认</strong>
            <span>订单状态、供应商确认和实际收货必须前后连贯，不能跳步进入结算。</span>
          </li>
          <li>
            <strong>先看异常是否闭环</strong>
            <span>异常收货、差异处理和补充说明需要在同页形成处置记录，避免后置补写。</span>
          </li>
          <li>
            <strong>先看归档证据是否完整</strong>
            <span>结算资料、履约评价和审计日志完整后，再推进项目归档和后续检查。</span>
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
