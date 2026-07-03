<script setup lang="ts">
import { RouterLink } from "vue-router";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import {
  EnterpriseButton,
  EnterpriseSurface,
  EnterpriseTabs,
  PageHeader,
  RiskAlertPanel,
  SplitDetailLayout,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];

defineProps<{
  title: string;
  eyebrow: string;
  loading: boolean;
  error: string;
  workflowTaskError: string;
  auditLogId: string;
  requestId?: string;
  processRefreshKey: number;
  summaryItems: SummaryCardItem[];
}>();

defineEmits<{
  back: [];
}>();
</script>

<template>
  <section class="eds-section">
    <PageHeader :title="title" :eyebrow="eyebrow" description="查看采购申请、审批状态、采购明细与后续承接动作。">
      <template #actions>
        <RouterLink class="eds-button" to="/procurement-requests">返回列表</RouterLink>
        <EnterpriseButton @click="$emit('back')">返回上一页</EnterpriseButton>
      </template>
    </PageHeader>

    <ErrorAlert v-if="error" :message="error" />
    <ErrorAlert v-if="workflowTaskError" :message="workflowTaskError" />
    <AuditLogRef :audit-log-id="auditLogId" />
    <EnterpriseSurface v-if="loading" title="正在加载">正在加载采购申请详情...</EnterpriseSurface>

    <template v-if="requestId">
      <EnterpriseTabs :tabs="detailTabs" active-key="details" />

      <SplitDetailLayout>
        <EnterpriseSurface title="申请摘要">
          <SummaryCards :items="summaryItems" />
        </EnterpriseSurface>

        <slot />

        <template #aside>
          <RiskAlertPanel title="处理提示" description="采购申请在审批、方式判定和项目生成之间需要保持责任链清晰。">
            <ul class="eds-meta-list">
              <li>审批通过后再进入采购方式判定。</li>
              <li>生成项目前确认预算、品类和附件材料。</li>
              <li>所有关键动作会进入审计记录。</li>
            </ul>
          </RiskAlertPanel>

          <EnterpriseSurface title="流程进度">
            <ProcessTimeline business-type="procurement_request" :business-id="requestId" title="采购需求流程进度" :refresh-key="processRefreshKey" />
          </EnterpriseSurface>
        </template>
      </SplitDetailLayout>
    </template>
  </section>
</template>
