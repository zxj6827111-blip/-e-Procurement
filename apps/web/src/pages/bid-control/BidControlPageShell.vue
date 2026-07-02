<script setup lang="ts">
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { BidSummary } from "./types";

defineProps<{
  summary: BidSummary;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="报价锁定与保密查看" eyebrow="报价监督" description="报价金额和响应文件在截标、锁定、授权审批后才可按范围查看。">
    <template #actions>
      <StatusTag v-if="summary.beforeDeadline" tone="warning">报价期内</StatusTag>
      <StatusTag v-else tone="success">可锁定或评审</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="报价封存状态" description="报价统计不展示明细金额，金额查看需通过保密审批。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar>
    <label>
      监督范围
      <select value="current" disabled>
        <option value="current">当前项目报价记录</option>
      </select>
    </label>
  </FilterBar>
</template>
