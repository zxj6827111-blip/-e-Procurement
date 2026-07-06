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
  <EnterpriseSurface class="g-hotel-table-card" title="采购方需求与报价单列表" description="上半区查看当前项目、提交状态、金额和响应文件处理记录。">
    <DataTable :columns="BID_COLUMNS" :rows="bids" row-key="id" empty-text="当前项目暂无报价单">
      <template #project="{ row }">{{ projectLabel(row.projectId) }}</template>
      <template #amount="{ row }">{{ row.amount ?? "-" }}</template>
      <template #taxRate="{ row }">{{ row.taxRate ?? "-" }}</template>
      <template #delivery="{ row }">{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</template>
      <template #status="{ row }">
        <div class="eds-stack-tight">
          <StatusTag :tone="bidStatusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
          <span class="eds-table-muted">{{ formatDateTime(row.submittedAt) }}</span>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
