<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import {
  EnterpriseSurface,
  FeedbackMessage,
  FilterBar,
  RiskAlertPanel,
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
  <header class="g-hotel-page-header">
    <div>
      <p>结算材料 / 批量审核</p>
      <h2><span aria-hidden="true">结</span>结算材料</h2>
      <small>集中处理结算单、送货验收材料、发票核验和金额核对记录。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag v-else tone="success">数据已同步</StatusTag>
    </div>
  </header>

  <div class="eds-process-hero">
    <EnterpriseSurface class="g-hotel-ledger-card" title="审核快照" eyebrow="结算概览" description="不展示空洞大数字，只保留审核和流转判断所需信息。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <RiskAlertPanel title="审核规则" description="结算单、资料、发票和核对差异必须按同一套口径处理。">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>结算记录</span>
          <strong>{{ selectedSettlementBillId || "暂无" }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>发票记录</span>
          <strong>{{ selectedInvoiceId || "暂无" }}</strong>
        </article>
      </div>
      <ul class="eds-process-checklist">
        <li>
          <strong>先看结算单与资料是否配齐</strong>
          <span>结算单、送货验收材料和发票要能互相映射，避免孤立审核。</span>
        </li>
        <li>
          <strong>先看金额差异是否解释清楚</strong>
          <span>金额核对表不是附属信息，而是决定是否付款的重要判定依据。</span>
        </li>
        <li>
          <strong>先看驳回意见是否可追溯</strong>
          <span>所有驳回与复核都应留下原因，便于供应商重传与财务复核。</span>
        </li>
      </ul>
    </RiskAlertPanel>
  </div>

  <div class="eds-review-shell">
    <section class="eds-review-main">
      <EnterpriseSurface class="g-hotel-ledger-card" title="审核范围" description="只展示当前角色权限范围内的结算材料与审核操作。">
        <FilterBar class="g-hotel-filter-bar">
          <label>
            结算范围
            <select value="visible" disabled>
              <option value="visible">当前角色可见结算材料</option>
            </select>
          </label>
        </FilterBar>
      </EnterpriseSurface>

      <FeedbackMessage v-if="message">{{ message }}</FeedbackMessage>
      <FeedbackMessage v-if="loading">正在加载结算数据...</FeedbackMessage>

      <slot />
    </section>

    <aside class="eds-review-aside">
      <EnterpriseSurface v-if="selectedSettlementBillId" title="结算记录">
        <ActivityRecordPanel
          business-type="settlement"
          :business-id="selectedSettlementBillId"
          title="结算记录"
          :refresh-key="processRefreshKey"
        />
      </EnterpriseSurface>

      <EnterpriseSurface v-if="selectedInvoiceId" title="发票业务">
        <ActivityRecordPanel
          business-type="invoice"
          :business-id="selectedInvoiceId"
          title="发票业务"
          :refresh-key="processRefreshKey"
        />
      </EnterpriseSurface>
    </aside>
  </div>

  <ErrorAlert v-if="error" :message="error" />
</template>
