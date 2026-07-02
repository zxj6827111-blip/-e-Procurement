<script setup lang="ts">
import WorkflowSurfaceSummary from "../../components/WorkflowSurfaceSummary.vue";
import { EnterpriseSurface, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canReviewRegistration: boolean;
  isSupplierView: boolean;
  pageHint: string;
  pageTitle: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader :title="pageTitle" eyebrow="供应商准入" :description="pageHint">
    <template #actions>
      <StatusTag v-if="canReviewRegistration" tone="warning">资格审核</StatusTag>
      <StatusTag v-else-if="isSupplierView" tone="primary">供应商视角</StatusTag>
    </template>
  </PageHeader>

  <WorkflowSurfaceSummary
    v-if="isSupplierView"
    title="供应商补充材料、退货与结算消息"
    :business-types="['return_request', 'settlement_bill', 'invoice', 'payment_request']"
    compact
  />

  <EnterpriseSurface title="报名概览" description="报名资格通过后，供应商才能进入报价响应。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
