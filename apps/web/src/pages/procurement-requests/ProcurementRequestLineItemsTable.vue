<script setup lang="ts">
import { DataTable, EnterpriseSurface } from "../../components/base";
import { formatDate, lineItemColumns, money } from "./display";
import type { ProcurementRequestLineItem } from "./types";

defineProps<{
  lineItems: ProcurementRequestLineItem[];
}>();
</script>

<template>
  <EnterpriseSurface title="采购明细">
    <DataTable :columns="lineItemColumns" :rows="lineItems" empty-text="暂无采购明细">
      <template #estimatedUnitPrice="{ row }">{{ money(row.estimatedUnitPrice) }}</template>
      <template #budgetAmount="{ row }">{{ money(row.budgetAmount) }}</template>
      <template #requiredByDate="{ row }">{{ formatDate(row.requiredByDate) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
