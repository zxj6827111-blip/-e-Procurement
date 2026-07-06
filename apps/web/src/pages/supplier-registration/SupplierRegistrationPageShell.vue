<script setup lang="ts">
import TaskInboxSummary from "../../components/TaskInboxSummary.vue";
import { EnterpriseSurface, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canReviewRegistration: boolean;
  isSupplierView: boolean;
  pageHint: string;
  pageTitle: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>供应商准入 / 报名资料</p>
      <h2><span aria-hidden="true">报</span>{{ pageTitle }}</h2>
      <small>{{ pageHint }}</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="canReviewRegistration" tone="warning">资格审核</StatusTag>
      <StatusTag v-else-if="isSupplierView" tone="primary">供应商视角</StatusTag>
    </div>
  </header>

  <TaskInboxSummary
    v-if="isSupplierView"
    title="供应商补充材料、退货与结算消息"
    :business-types="['return_request', 'settlement_bill', 'invoice', 'payment_request']"
    compact
  />

  <EnterpriseSurface class="g-hotel-ledger-card" title="报名概览" description="报名资格通过后，供应商才能进入报价响应。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
