<script setup lang="ts">
import type { ProcessBusinessType } from "../../api/process";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import { PROGRESS_COLUMNS } from "./constants";
import type { BidProgress, StatusTone } from "./types";

defineProps<{
  selectedProjectId: string;
  rows: BidProgress[];
  processRefreshKey: number;
  projectProcessType: (projectId: string) => ProcessBusinessType;
  supplierName: (supplierId?: unknown) => string;
  labelStatus: (status?: string | null) => string;
  statusTone: (status?: string) => StatusTone;
}>();
</script>

<template>
  <EnterpriseSurface title="报价进度" description="展示供应商报价状态、提交时间和锁定时间。">
    <DataTable :columns="PROGRESS_COLUMNS" :rows="rows" row-key="id" empty-text="暂无报价进度记录">
      <template #supplier="{ row }">{{ row.supplierName ?? supplierName(row.supplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #submittedAt="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
      <template #lockedAt="{ row }">{{ formatDateTime(row.lockedAt) }}</template>
      <template #version="{ row }">{{ row.versionNo ?? "-" }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface title="截标 / 比价活动记录" description="截标、锁定和保密审批动作会写入项目业务记录。">
    <ActivityRecordPanel
      v-if="selectedProjectId"
      :business-type="projectProcessType(selectedProjectId)"
      :business-id="selectedProjectId"
      title="截标 / 比价活动记录"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
