<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { RECEIPT_SUMMARY_COLUMNS } from "./constants";
import type { WorkbenchPayload } from "./types";

defineProps<{
  workbenches: WorkbenchPayload[];
  labelStatus: (value: string) => string;
  formatDateTime: (value?: string | null) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="近期验收记录">
    <DataTable :columns="RECEIPT_SUMMARY_COLUMNS" :rows="workbenches" row-key="project.id" empty-text="暂无验收记录。">
      <template #project="{ row }">{{ row.project.name }}</template>
      <template #count="{ row }"><StatusTag>{{ row.receiptRecords.length }} 条</StatusTag></template>
      <template #recent="{ row }">
        <div v-if="row.receiptRecords.length" class="eds-stack-tight">
          <span v-for="receipt in row.receiptRecords.slice(0, 2)" :key="receipt.id">
            {{ labelStatus(receipt.acceptanceResult) }} / {{ labelStatus(receipt.handlingStatus) }} / {{ formatDateTime(receipt.receiptAt) }}
          </span>
        </div>
        <span v-else>-</span>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
