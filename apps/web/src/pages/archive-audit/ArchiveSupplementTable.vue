<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { approvalTone, SUPPLEMENT_COLUMNS } from "./display";
import type { SupplementRequest } from "./types";

defineProps<{
  archiveItemLabel: (itemId: string) => string;
  supplementRequestLabel: (requestId: string) => string;
  supplementRequests: SupplementRequest[];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="补档申请" :description="`共 ${supplementRequests.length} 条补档申请。`">
    <DataTable :columns="SUPPLEMENT_COLUMNS" :rows="supplementRequests" row-key="id" empty-text="暂无补档申请。">
      <template #request="{ row }">{{ supplementRequestLabel(row.id) }}</template>
      <template #archiveItem="{ row }">{{ archiveItemLabel(row.archiveItemId) }}</template>
      <template #approvalStatus="{ row }">
        <StatusTag :tone="approvalTone(row.approvalStatus)">{{ labelStatus(row.approvalStatus) }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
