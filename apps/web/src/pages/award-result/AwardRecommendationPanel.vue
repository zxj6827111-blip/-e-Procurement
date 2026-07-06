<script setup lang="ts">
import { DataTable, EnterpriseSurface } from "../../components/base";
import { RECOMMENDATION_COLUMNS } from "./constants";
import type { AwardRecommendation } from "./types";

defineProps<{
  recommendationRows: AwardRecommendation[];
  supplierName: (supplierId?: string) => string;
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="评审推荐" description="来自评标记录的推荐供应商、候选范围和最低价判断。">
    <DataTable :columns="RECOMMENDATION_COLUMNS" :rows="recommendationRows" empty-text="暂无评审推荐">
      <template #recommended="{ row }">{{ row.recommendedSupplierName || "-" }}</template>
      <template #selected="{ row }">{{ supplierName(row.recommendedSupplierId) }}</template>
      <template #lowest="{ row }">{{ row.isLowestPrice ? "是" : "否" }}</template>
      <template #source="{ row }">{{ row.sourceReportId || "待冻结评审报告" }}</template>
      <template #candidates="{ row }">{{ row.candidateSupplierIds?.map((id: string) => supplierName(id)).join("、") || "-" }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
