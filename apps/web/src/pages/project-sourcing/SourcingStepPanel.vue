<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseSurface, StatusTag, type DataTableColumn } from "../../components/base";
import type { SourcingStep, StatusTone } from "./types";

defineProps<{
  steps: SourcingStep[];
  stepTone: (state: SourcingStep["state"]) => StatusTone;
}>();

const columns: DataTableColumn[] = [
  { key: "index", label: "序号" },
  { key: "label", label: "阶段" },
  { key: "description", label: "说明" },
  { key: "count", label: "数量" },
  { key: "state", label: "状态" }
];
</script>

<template>
  <EnterpriseSurface title="执行步骤" description="前半段招采事项按阶段拆入独立详情页，项目主页面只保留阶段入口。">
    <DataTable :columns="columns" :rows="steps" row-key="label">
      <template #index="{ index }">{{ index + 1 }}</template>
      <template #label="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">{{ row.label }}</RouterLink>
      </template>
      <template #state="{ row }">
        <StatusTag :tone="stepTone(row.state)">
          {{ row.state === "done" ? "已完成" : row.state === "current" ? "当前阶段" : "未开始" }}
        </StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
