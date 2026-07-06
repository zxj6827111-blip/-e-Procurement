<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import type { ProcessBusinessType } from "../../api/process";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import { PROGRESS_COLUMNS } from "./constants";
import type { BidProgress, StatusTone } from "./types";

const props = defineProps<{
  selectedProjectId: string;
  rows: BidProgress[];
  processRefreshKey: number;
  projectProcessType: (projectId: string) => ProcessBusinessType;
  supplierName: (supplierId?: unknown) => string;
  labelStatus: (status?: string | null) => string;
  statusTone: (status?: string) => StatusTone;
}>();

const selectedProgress = ref<BidProgress | null>(null);
const submittedCount = computed(() => props.rows.filter((row) => row.status === "submitted" || row.submittedAt).length);
const totalCount = computed(() => props.rows.length);
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="报价进度" description="展示供应商报价状态、提交时间和锁定时间；截标前金额与响应文件继续隐藏。">
    <DataTable :columns="PROGRESS_COLUMNS" :rows="rows" row-key="id" empty-text="暂无报价进度记录">
      <template #project="{ row }">{{ row.projectId }}</template>
      <template #supplier="{ row }">{{ row.supplierName ?? supplierName(row.supplierId) }}</template>
      <template #progress>
        {{ submittedCount }} / {{ totalCount }}
      </template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #submittedAt="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
      <template #lockedAt="{ row }">{{ formatDateTime(row.lockedAt) }}</template>
      <template #version="{ row }">{{ row.versionNo ?? "-" }}</template>
      <template #actions="{ row }">
        <EnterpriseButton size="sm" type="text" @click="selectedProgress = row">明细</EnterpriseButton>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedProgress" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="报价进度明细">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedProgress = null"></button>
    <section class="g-hotel-modal-panel">
      <header>
        <h3>报价进度明细: {{ selectedProgress.supplierName ?? supplierName(selectedProgress.supplierId) }}</h3>
        <button type="button" @click="selectedProgress = null">x</button>
      </header>
      <div class="g-hotel-detail-list">
        <p>目前已有 {{ submittedCount }} 家供应商提交报价。</p>
        <p>剩余 {{ Math.max(totalCount - submittedCount, 0) }} 家未提交。</p>
        <p><span>提交时间：</span>{{ formatDateTime(selectedProgress.submittedAt) }}</p>
        <p><span>锁定时间：</span>{{ formatDateTime(selectedProgress.lockedAt) }}</p>
      </div>
      <footer>
        <RouterLink v-if="selectedProgress.status !== 'submitted'" class="eds-button eds-button-primary" to="/messages" @click="selectedProgress = null">
          查看消息中心
        </RouterLink>
        <EnterpriseButton @click="selectedProgress = null">关闭</EnterpriseButton>
      </footer>
    </section>
  </div>

  <EnterpriseSurface class="g-hotel-table-card" title="截标 / 比价活动记录" description="截标、锁定和保密审批动作会写入项目业务记录。">
    <ActivityRecordPanel
      v-if="selectedProjectId"
      :business-type="projectProcessType(selectedProjectId)"
      :business-id="selectedProjectId"
      title="截标 / 比价活动记录"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
