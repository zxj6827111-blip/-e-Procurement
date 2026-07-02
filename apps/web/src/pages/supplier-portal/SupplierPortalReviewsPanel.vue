<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag, type DataTableColumn } from "../../components/base";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import { reviewTypeLabel } from "./display";
import type { AdmissionReview } from "./types";

defineProps<{
  reviewRows: AdmissionReview[];
  reviewColumns: DataTableColumn[];
}>();
</script>

<template>
  <div class="eds-stack">
    <EnterpriseSurface title="准入记录">
      <DataTable :columns="reviewColumns" :rows="reviewRows" row-key="id" empty-text="暂无准入评审记录">
        <template #reviewType="{ row }">{{ reviewTypeLabel(row.reviewType) }}</template>
        <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
        <template #reviewedAt="{ row }">{{ formatDateTime(row.reviewedAt) }}</template>
      </DataTable>
    </EnterpriseSurface>
  </div>
</template>
