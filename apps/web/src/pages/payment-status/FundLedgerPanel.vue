<script setup lang="ts">
import { DataTable, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { LEDGER_COLUMNS } from "./display";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import type { FundLedgerEntry, LedgerRow } from "./types";

defineProps<{
  allLedgerEntries: LedgerRow[];
  businessNote: (entry: FundLedgerEntry) => string;
  directionLabel: (value: string) => string;
  entryTypeLabel: (value: string) => string;
  money: (value?: number) => string;
  orderLabel: (orderId?: string) => string;
  orgName: (orgId: string) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="资金流水" :description="`共 ${allLedgerEntries.length} 条。`">
    <DataTable :columns="LEDGER_COLUMNS" :rows="allLedgerEntries" row-key="id" empty-text="暂无资金流水。">
      <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      <template #account="{ row }">{{ orgName(row.orgId) }}</template>
      <template #direction="{ row }">{{ directionLabel(row.direction) }}</template>
      <template #entryType="{ row }">{{ entryTypeLabel(row.entryType) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="row.status === 'posted' || row.status === 'captured' ? 'success' : 'warning'">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #order="{ row }">{{ orderLabel(row.orderId) }}</template>
      <template #amount="{ row }">{{ money(row.amount) }}</template>
      <template #note="{ row }">{{ businessNote(row) }}</template>
    </DataTable>
    <PaginationBar :total="allLedgerEntries.length" />
  </EnterpriseSurface>
</template>
