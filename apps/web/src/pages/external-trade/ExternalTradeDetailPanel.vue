<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { binaryStatusLabel, binaryStatusTone, PROJECT_DETAIL_COLUMNS } from "./display";

defineProps<{
  rows: Array<{
    id: string;
    project: string;
    internalApproval: string;
    announcementMaterials: number;
    resultMaterials: number;
    resultRecord: string;
  }>;
}>();
</script>

<template>
  <EnterpriseSurface title="当前项目详情" description="核对选中项目的内部审批、材料归集和结果备案状态。">
    <DataTable :columns="PROJECT_DETAIL_COLUMNS" :rows="rows" row-key="id">
      <template #internalApproval="{ row }">
        <StatusTag :tone="binaryStatusTone(row.internalApproval)">{{ binaryStatusLabel(row.internalApproval) }}</StatusTag>
      </template>
      <template #resultRecord="{ row }">
        <StatusTag :tone="binaryStatusTone(row.resultRecord)">{{ binaryStatusLabel(row.resultRecord) }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
