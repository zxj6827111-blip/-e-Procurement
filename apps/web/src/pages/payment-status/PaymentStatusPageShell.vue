<script setup lang="ts">
import { EnterpriseSurface, FilterBar, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintainFunds: boolean;
  loading: boolean;
  message: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>资金付款 / 结算付款</p>
      <h2><span aria-hidden="true">付</span>结算付款</h2>
      <small>跟踪门店资金账户、订单付款占用、确认付款和资金流水。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainFunds ? 'success' : 'warning'">{{ canMaintainFunds ? "可维护" : "只读" }}</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="资金占用与付款概览" description="汇总账户余额、授信、占用和待处理付款。">
    <SummaryCards :items="summaryItems" />
    <p v-if="message" class="eds-meta">{{ message }}</p>
  </EnterpriseSurface>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      资金范围
      <select value="visible" disabled>
        <option value="visible">当前组织资金与付款</option>
      </select>
    </label>
  </FilterBar>
</template>
