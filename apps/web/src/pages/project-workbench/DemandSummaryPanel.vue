<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag, SummaryCards } from "../../components/base";
import type { WorkbenchResponse } from "./types";

defineProps<{
  procurementRequest: WorkbenchResponse["procurementRequest"];
  demandSummary: Array<{ label: string; value: string }>;
  lineItemSummary: string;
  currency: (value: number | undefined) => string;
}>();

const lineItemColumns = [
  { key: "itemName", label: "物品" },
  { key: "specification", label: "规格" },
  { key: "quantity", label: "数量" },
  { key: "estimatedUnitPrice", label: "预估单价" }
];
</script>

<template>
  <EnterpriseSurface v-if="procurementRequest" title="需求依据" :description="procurementRequest.title">
    <template #actions>
      <StatusTag tone="primary">{{ lineItemSummary }}</StatusTag>
    </template>
    <SummaryCards :items="demandSummary" />
    <DataTable v-if="procurementRequest.lineItems?.length" :columns="lineItemColumns" :rows="procurementRequest.lineItems" row-key="id">
      <template #quantity="{ row }">{{ row.quantity }} {{ row.unit }}</template>
      <template #estimatedUnitPrice="{ row }">{{ currency(row.estimatedUnitPrice) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
