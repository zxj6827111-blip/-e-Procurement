<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseSurface, type SummaryCardItem } from "../../components/base";
import { DEMAND_ITEM_COLUMNS } from "./constants";
import type { SourcingWorkbench } from "./types";

defineProps<{
  request: NonNullable<SourcingWorkbench["procurementRequest"]>;
  demandSummary: SummaryCardItem[];
  currency: (value: number | undefined) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="需求依据" class="eds-business-panel">
    <div class="eds-ledger-strip">
      <div v-for="item in demandSummary" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <DataTable v-if="request.lineItems?.length" :columns="DEMAND_ITEM_COLUMNS" :rows="request.lineItems" row-key="id">
      <template #quantity="{ row }">{{ row.quantity }} {{ row.unit }}</template>
      <template #estimatedUnitPrice="{ row }">{{ currency(row.estimatedUnitPrice) }}</template>
    </DataTable>
    <AttachmentList v-if="request.attachments?.length" :attachments="request.attachments" compact />
  </EnterpriseSurface>
</template>
