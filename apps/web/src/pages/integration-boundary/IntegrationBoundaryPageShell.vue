<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import { FilterBar, PageHeader, PaginationBar, SummaryCards } from "../../components/base";
import AdapterStatusTable from "./AdapterStatusTable.vue";
import IntegrationCallPanel from "./IntegrationCallPanel.vue";
import IntegrationJobsTable from "./IntegrationJobsTable.vue";
import { useIntegrationBoundaryPage } from "./useIntegrationBoundaryPage";

const state = useIntegrationBoundaryPage();
</script>

<template>
  <PageHeader
    title="OA / 财务 / 支付集成边界"
    eyebrow="INTEGRATION BOUNDARY"
    description="以 Adapter、任务队列和管理日志组织外部系统集成，不把外部系统细节泄漏到业务页面。"
  />
  <SummaryCards :items="state.summaryItems.value" />
  <FilterBar>
    <label>
      集成范围
      <select value="all" disabled>
        <option value="all">全部 Adapter 与任务</option>
      </select>
    </label>
  </FilterBar>
  <p v-if="state.message.value" class="eds-meta">{{ state.message.value }}</p>
  <p v-if="state.loading.value" class="eds-meta">正在加载外部集成边界...</p>
  <ErrorAlert v-if="state.error.value" :message="state.error.value" />
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
  <IntegrationJobsTable :rows="state.jobs.value" @operate="state.operateJob" />
  <PaginationBar :total="state.adapters.value.length + state.jobs.value.length" />
</template>
