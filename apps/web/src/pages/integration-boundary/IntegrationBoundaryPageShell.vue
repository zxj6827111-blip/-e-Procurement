<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface, FilterBar, PaginationBar, StatusTag, SummaryCards } from "../../components/base";
import AdapterStatusTable from "./AdapterStatusTable.vue";
import IntegrationCallPanel from "./IntegrationCallPanel.vue";
import IntegrationJobsTable from "./IntegrationJobsTable.vue";
import { useIntegrationBoundaryPage } from "./useIntegrationBoundaryPage";

const state = useIntegrationBoundaryPage();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-integration-page">
    <header class="g-hotel-page-header">
      <div>
        <p>系统设置 / 外部集成</p>
        <h2><span aria-hidden="true">集</span>外部集成边界台账</h2>
        <small>以 Adapter、任务队列和管理日志组织外部系统集成，不把外部系统细节泄漏到业务页面。</small>
      </div>
      <div class="g-hotel-page-actions">
        <StatusTag v-if="state.loading.value" tone="warning">加载中</StatusTag>
        <StatusTag :tone="state.error.value ? 'error' : 'success'">{{ state.error.value ? "需处理" : "边界正常" }}</StatusTag>
      </div>
    </header>

    <EnterpriseSurface class="g-hotel-ledger-card" title="集成运行概览" description="汇总适配器、任务队列和最近调用状态，帮助系统管理员从统一入口处理外部集成。">
      <SummaryCards :items="state.summaryItems.value" />
    </EnterpriseSurface>

    <FilterBar class="g-hotel-filter-bar">
      <label>
        集成范围
        <select value="all" disabled>
          <option value="all">全部适配器与任务</option>
        </select>
      </label>
    </FilterBar>

    <p v-if="state.message.value" class="eds-meta">{{ state.message.value }}</p>
    <p v-if="state.loading.value" class="eds-meta">正在加载外部集成边界...</p>
    <ErrorAlert v-if="state.error.value" :message="state.error.value" />

    <div class="g-hotel-integration-grid">
      <IntegrationCallPanel
        v-model="state.selectedAdapterKey.value"
        :adapters="state.adapters.value"
        :disabled="!state.selectedAdapterKey.value"
        :form="state.callForm.value"
        :selected-adapter="state.selectedAdapter.value"
        @call="state.callAdapter"
        @refresh="state.load"
      />
      <AdapterStatusTable :rows="state.adapters.value" />
    </div>

    <IntegrationJobsTable :rows="state.jobs.value" @operate="state.operateJob" />
    <PaginationBar :total="state.adapters.value.length + state.jobs.value.length" />
  </section>
</template>
