<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { SUPPLIER_COLUMNS } from "./constants";
import type { SupplierEngagementRow, StatusTone } from "./types";

defineProps<{
  rows: SupplierEngagementRow[];
  canReadBidBody: boolean;
  statusTone: (value: string | undefined | null) => StatusTone;
  label: (value: string | undefined | null) => string;
  formatDateTime: (value?: string | null) => string;
  currency: (value: number | undefined) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="供应商参与">
    <DataTable :columns="SUPPLIER_COLUMNS" :rows="rows" row-key="supplierId" empty-text="公告发布后将汇总供应商参与情况">
      <template #supplier="{ row }">
        <strong>{{ row.supplierName }}</strong>
        <p class="eds-meta">{{ row.contact }}</p>
      </template>
      <template #invitation="{ row }">
        <StatusTag :tone="statusTone(row.invitationStatus)">{{ label(row.invitationStatus) }}</StatusTag>
      </template>
      <template #registration="{ row }">
        <StatusTag :tone="statusTone(row.registrationStatus)">{{ label(row.registrationStatus) }}</StatusTag>
        <p v-if="row.registrationQualifiedAt" class="eds-meta">通过 {{ formatDateTime(row.registrationQualifiedAt) }}</p>
      </template>
      <template #bid="{ row }">
        <StatusTag :tone="statusTone(row.bidStatus)">{{ label(row.bidStatus) }}</StatusTag>
        <p v-if="row.bidSubmittedAt" class="eds-meta">提交 {{ formatDateTime(row.bidSubmittedAt) }}</p>
      </template>
      <template #amount="{ row }">{{ canReadBidBody ? currency(row.bidAmount) : "截标前保密" }}</template>
      <template #score="{ row }">{{ row.scoreCount ? `${row.scoreCount} 份 / ${row.scoreAverage?.toFixed(1)} 分` : "待评分" }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
