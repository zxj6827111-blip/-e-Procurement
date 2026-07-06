<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { EnterpriseSurface, FeedbackMessage, FilterBar, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  loading: boolean;
  message: string;
  error: string;
  selectedMallOrderId: string;
  processRefreshKey: number;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>订单履约 / 收货验收</p>
      <h2><span aria-hidden="true">履</span>订单履约</h2>
      <small>统一查看招采订单、商城订单、发货登记、收货验收和异常记录。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag v-else tone="success">数据已同步</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="履约概览" description="按当前角色可见范围汇总订单、待处理、异常和金额。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      履约范围
      <select value="visible" disabled>
        <option value="visible">当前角色可见订单</option>
      </select>
    </label>
  </FilterBar>

  <FeedbackMessage v-if="message">{{ message }}</FeedbackMessage>
  <FeedbackMessage v-if="loading">正在加载订单履约数据...</FeedbackMessage>

  <ActivityRecordPanel
    v-if="selectedMallOrderId"
    business-type="order_fulfillment"
    :business-id="selectedMallOrderId"
    title="最新商城订单履约业务"
    :refresh-key="processRefreshKey"
  />

  <ErrorAlert v-if="error" :message="error" />
</template>
