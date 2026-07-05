<script setup lang="ts">
import { DataTable, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import { reconciliationColumns } from "./display";
import type { ReconciliationLine } from "./types";

defineProps<{
  rows: ReconciliationLine[];
  supplierName: (supplierId?: string) => string;
  money: (value: number | undefined) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="金额核对差异" description="付款前只保留真正影响结算判断的差异记录和原因说明。">
    <DataTable :columns="reconciliationColumns" :rows="rows" empty-mode="compact" empty-text="暂无金额差异记录。">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #expectedAmount="{ row }">{{ money(row.expectedAmount) }}</template>
      <template #actualAmount="{ row }">{{ money(row.actualAmount) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #reason="{ row }">{{ row.reason || `实核 ${money(row.actualAmount)} / ${formatDateTime(row.updatedAt)}` }}</template>
    </DataTable>
    <PaginationBar :total="rows.length" />
  </EnterpriseSurface>
</template>
