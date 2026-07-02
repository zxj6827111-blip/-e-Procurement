<script setup lang="ts">
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintainFunds: boolean;
  loading: boolean;
  message: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="资金与付款状态" eyebrow="资金付款" description="跟踪门店资金账户、订单付款占用、确认付款和资金流水。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainFunds ? 'success' : 'warning'">{{ canMaintainFunds ? "可维护" : "只读" }}</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="资金概览" description="汇总账户余额、授信、占用和待处理付款。">
    <SummaryCards :items="summaryItems" />
    <p v-if="message" class="eds-meta">{{ message }}</p>
  </EnterpriseSurface>

  <FilterBar>
    <label>
      资金范围
      <select value="visible" disabled>
        <option value="visible">当前组织资金与付款</option>
      </select>
    </label>
  </FilterBar>
</template>
