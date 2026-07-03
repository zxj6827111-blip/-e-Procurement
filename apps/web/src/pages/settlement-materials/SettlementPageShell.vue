<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import {
  EnterpriseSurface,
  FeedbackMessage,
  FilterBar,
  PageHeader,
  RiskAlertPanel,
  SplitDetailLayout,
  StatusTag,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";

defineProps<{
  loading: boolean;
  message: string;
  error: string;
  selectedSettlementBillId: string;
  selectedInvoiceId: string;
  processRefreshKey: number;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="结算与发票审核" eyebrow="结算材料" description="集中处理结算单、送货验收材料、发票核验和金额核对记录。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag v-else tone="success">数据已同步</StatusTag>
    </template>
  </PageHeader>

  <SplitDetailLayout>
    <EnterpriseSurface title="结算概览">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar>
      <label>
        结算范围
        <select value="visible" disabled>
          <option value="visible">当前角色可见结算材料</option>
        </select>
      </label>
    </FilterBar>

    <FeedbackMessage v-if="message">{{ message }}</FeedbackMessage>
    <FeedbackMessage v-if="loading">正在加载结算数据...</FeedbackMessage>

    <slot />

    <template #aside>
      <RiskAlertPanel title="结算审核关注" description="结算单、验收记录和发票审核应保持一致。">
        <ul class="eds-meta-list">
          <li>供应商提交材料后进入财务核验。</li>
          <li>发票状态与付款状态不得脱节。</li>
          <li>异常材料需要保留驳回原因和复核记录。</li>
        </ul>
      </RiskAlertPanel>

      <EnterpriseSurface v-if="selectedSettlementBillId" title="结算流程">
        <ProcessTimeline
          business-type="settlement"
          :business-id="selectedSettlementBillId"
          title="结算流程"
          :refresh-key="processRefreshKey"
        />
      </EnterpriseSurface>

      <EnterpriseSurface v-if="selectedInvoiceId" title="发票流程">
        <ProcessTimeline
          business-type="invoice"
          :business-id="selectedInvoiceId"
          title="发票流程"
          :refresh-key="processRefreshKey"
        />
      </EnterpriseSurface>
    </template>
  </SplitDetailLayout>

  <ErrorAlert v-if="error" :message="error" />
</template>
