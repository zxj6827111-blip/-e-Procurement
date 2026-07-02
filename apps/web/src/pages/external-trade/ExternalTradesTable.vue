<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { binaryStatusLabel, binaryStatusTone, EXTERNAL_TRADE_COLUMNS, recordStatusTone } from "./display";
import type { ExternalTradeListItem } from "./types";

defineProps<{
  externalTrades: ExternalTradeListItem[];
  loading: boolean;
}>();
</script>

<template>
  <EnterpriseSurface title="备案项目" :description="loading ? '正在加载备案项目。' : `共 ${externalTrades.length} 个外部交易项目。`">
    <DataTable :columns="EXTERNAL_TRADE_COLUMNS" :rows="externalTrades" row-key="project.id" empty-text="当前角色暂无可见外部交易项目。">
      <template #project="{ row }">
        <strong>{{ row.project.code }}</strong>
        <p class="eds-meta">{{ row.project.name }}</p>
      </template>
      <template #platform="{ row }">{{ row.record?.externalPlatformName || "-" }}</template>
      <template #externalCode="{ row }">{{ row.record?.externalProjectCode || "-" }}</template>
      <template #internalApproval="{ row }">
        <StatusTag :tone="binaryStatusTone(row.record?.internalApprovalStatus)">{{ binaryStatusLabel(row.record?.internalApprovalStatus) }}</StatusTag>
      </template>
      <template #resultRecord="{ row }">
        <StatusTag :tone="binaryStatusTone(row.record?.resultRecordStatus)">{{ binaryStatusLabel(row.record?.resultRecordStatus) }}</StatusTag>
      </template>
      <template #status="{ row }">
        <StatusTag :tone="recordStatusTone(row.record)">{{ row.record?.status ? labelStatus(row.record.status) : row.project.displayStatus }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
