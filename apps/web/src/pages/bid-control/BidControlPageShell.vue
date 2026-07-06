<script setup lang="ts">
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { BidSummary } from "./types";

defineProps<{
  summary: BidSummary;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="报价进度" eyebrow="报价监督" description="跟踪供应商报价提交状态">
    <template #actions>
      <StatusTag v-if="summary.beforeDeadline" tone="warning">报价期内</StatusTag>
      <StatusTag v-else tone="success">可锁定或评审</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface class="g-hotel-ledger-card" title="报价进度概览" description="报价统计不展示明细金额，金额查看需通过保密审批。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      状态
      <select>
        <option>全部状态</option>
        <option>报价中</option>
        <option>报价结束</option>
        <option>已锁定</option>
      </select>
    </label>
  </FilterBar>
</template>
