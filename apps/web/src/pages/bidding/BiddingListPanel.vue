<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import { BID_COLUMNS } from "./constants";
import type { Bid, StatusTone } from "./types";

defineProps<{
  bids: Bid[];
  projectLabel: (projectId: string) => string;
  supplierName: (supplierId: string, fallback?: string) => string;
  labelStatus: (status?: string | null) => string;
  bidStatusTone: (status: string) => StatusTone;
}>();
</script>

<template>
  <EnterpriseSurface title="报价单列表" description="报价锁定后金额和响应文件由采购侧按保密规则处理。">
    <DataTable :columns="BID_COLUMNS" :rows="bids" row-key="id" empty-text="当前项目暂无报价单">
      <template #project="{ row }">{{ projectLabel(row.projectId) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId, row.supplierName) }}</template>
      <template #amount="{ row }">{{ row.amount ?? "-" }}</template>
      <template #taxRate="{ row }">{{ row.taxRate ?? "-" }}</template>
      <template #delivery="{ row }">{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</template>
      <template #status="{ row }">
        <StatusTag :tone="bidStatusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #version="{ row }">{{ row.versionNo ?? "-" }}</template>
      <template #submittedAt="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
      <template #lockedAt="{ row }">{{ formatDateTime(row.lockedAt) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
