<script setup lang="ts">
import { RouterLink } from "vue-router";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseSurface,
  EnterpriseTabs,
  RiskAlertPanel,
  SplitDetailLayout,
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
      <span class="eds-meta">当前节点</span>
      <strong>{{ statusLabel }}</strong>
      <StatusTag :tone="statusTone">{{ statusLabel }}</StatusTag>
      <RouterLink class="eds-action-link" :to="`/project-workbench/${encodeURIComponent(projectId)}`">返回项目详情 <span>→</span></RouterLink>
    </div>
  </header>

  <ErrorAlert v-if="errorMessage" :message="errorMessage" />
  <p v-if="auditLogId" class="eds-meta">审计日志：{{ auditLogId }}</p>
  <p v-if="loading" class="eds-meta">正在加载履约数据...</p>

  <template v-if="hasWorkbench">
    <EnterpriseTabs :tabs="detailTabs" active-key="details" />

    <SplitDetailLayout>
      <EnterpriseSurface title="履约证据链">
        <SummaryCards :items="summaryItems" />
      </EnterpriseSurface>

      <template #aside>
        <RiskAlertPanel title="履约与结算关注" description="收货、验收、结算和归档需要形成连续证据链。">
          <ul class="eds-meta-list">
            <li>收货数量、验收结果和异常处理需要一致。</li>
            <li>结算资料应关联订单、发票和验收记录。</li>
            <li>归档前确认关键附件和审计日志完整。</li>
          </ul>
        </RiskAlertPanel>
      </template>
    </SplitDetailLayout>
  </template>
</template>
