<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseSurface, StatusTag, SummaryCards, type DataTableColumn } from "../../components/base";
import type { ProjectOperationLink, WorkbenchStage } from "./types";

const props = defineProps<{
  title: string;
  projectStatusText: string;
  progressOverview: string;
  completedOperationCount: number;
  totalOperationCount: number;
  projectOperationLinks: ProjectOperationLink[];
  operationStateLabel: (state: WorkbenchStage) => string;
}>();

const columns: DataTableColumn[] = [
  { key: "index", label: "序号" },
  { key: "label", label: "阶段" },
  { key: "meta", label: "业务说明" },
  { key: "count", label: "数量" },
  { key: "state", label: "状态" }
];
</script>

<template>
  <EnterpriseSurface :title="title" eyebrow="项目进度">
    <SummaryCards
      :items="[
        { label: '当前状态', value: projectStatusText },
        { label: '进度概览', value: progressOverview },
        { label: '完成步骤', value: `${completedOperationCount} / ${totalOperationCount}` }
      ]"
    />

    <DataTable :columns="columns" :rows="props.projectOperationLinks" row-key="label">
      <template #index="{ index }">{{ index + 1 }}</template>
      <template #label="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">{{ row.label }}</RouterLink>
      </template>
      <template #state="{ row }">
        <StatusTag :tone="row.state === 'done' ? 'success' : row.state === 'current' ? 'primary' : 'default'">
          {{ operationStateLabel(row.state) }}
        </StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
