<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import { EnterpriseSurface, FeedbackMessage, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

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

  <EnterpriseSurface>
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

  <ProcessTimeline
    v-if="selectedSettlementBillId"
    business-type="settlement"
    :business-id="selectedSettlementBillId"
    title="结算流程"
    :refresh-key="processRefreshKey"
  />

  <ProcessTimeline
    v-if="selectedInvoiceId"
    business-type="invoice"
    :business-id="selectedInvoiceId"
    title="发票流程"
    :refresh-key="processRefreshKey"
  />

  <slot />

  <ErrorAlert v-if="error" :message="error" />
</template>
