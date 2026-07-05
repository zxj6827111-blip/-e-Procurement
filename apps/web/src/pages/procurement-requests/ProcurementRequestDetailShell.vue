<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import {
  EnterpriseButton,
  EnterpriseSurface,
  EnterpriseTabs,
  RiskAlertPanel,
  type SummaryCardItem
} from "../../components/base";

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];

const props = defineProps<{
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

const focusItems = computed(() => [
  props.summaryItems[0] ?? { label: "申请状态", value: "-" },
  props.summaryItems[1] ?? { label: "审批状态", value: "-" }
]);
</script>

<template>
  <section class="eds-section">
    <header class="eds-page-header eds-business-context">
      <div class="eds-business-context-main">
        <p class="eds-business-eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p>查看采购申请、审批状态、采购明细与后续承接动作，保证从需求到项目的主线连续。</p>
      </div>
      <div class="eds-business-context-aside">
        <span class="eds-meta">当前处理</span>
        <strong>{{ focusItems[1].value }}</strong>
        <div class="eds-actions">
          <RouterLink class="eds-button" to="/procurement-requests">返回列表</RouterLink>
          <EnterpriseButton @click="$emit('back')">返回上一页</EnterpriseButton>
        </div>
      </div>
    </header>

    <ErrorAlert v-if="error" :message="error" />
    <ErrorAlert v-if="workflowTaskError" :message="workflowTaskError" />
    <AuditLogRef :audit-log-id="auditLogId" />
    <EnterpriseSurface v-if="loading" title="正在加载">正在加载采购申请详情...</EnterpriseSurface>

    <template v-if="requestId">
      <div class="eds-process-hero">
        <EnterpriseSurface title="需求单据总览" eyebrow="版式 B / 审批与承接" description="把申请状态、审批状态、采购方式和预算规模固定展示，避免处理人只看局部表单。">
          <div class="eds-template-b-ledger">
            <article v-for="item in summaryItems" :key="item.label" class="eds-template-b-ledger-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small v-if="item.meta">{{ item.meta }}</small>
            </article>
          </div>
        </EnterpriseSurface>

        <RiskAlertPanel title="处理规则" description="只保留真正影响审批、方式判定和项目承接的判断点。">
          <div class="eds-process-reference">
            <article class="eds-process-reference-item">
              <span>{{ focusItems[0].label }}</span>
              <strong>{{ focusItems[0].value }}</strong>
            </article>
            <article class="eds-process-reference-item">
              <span>{{ focusItems[1].label }}</span>
              <strong>{{ focusItems[1].value }}</strong>
            </article>
          </div>
          <ul class="eds-process-checklist">
            <li>
              <strong>先看审批状态，再看后续动作</strong>
              <span>只有审批通过后，采购方式判定与项目发起才成立，避免越级承接。</span>
            </li>
            <li>
              <strong>先看采购方式，再看项目生成</strong>
              <span>方式判定结果会影响后续项目执行路径，尤其是外部交易备案场景。</span>
            </li>
            <li>
              <strong>先看附件与预算是否完整</strong>
              <span>预算口径、需求附件和审批意见缺失时，后续项目审计链条会断开。</span>
            </li>
          </ul>
        </RiskAlertPanel>
      </div>

      <EnterpriseTabs :tabs="detailTabs" active-key="details" />

      <div class="eds-process-shell">
        <section class="eds-panel-stack">
          <slot />
        </section>

        <aside class="eds-panel-stack">
          <EnterpriseSurface title="审批进度">
            <ActivityRecordPanel business-type="procurement_request" :business-id="requestId" title="采购需求审批进度" :refresh-key="processRefreshKey" />
          </EnterpriseSurface>
        </aside>
      </div>
    </template>
  </section>
</template>
