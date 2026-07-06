<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseSurface, StatusTag, type DataTableColumn } from "../../components/base";
import type { DashboardTodoItem } from "./types";

defineProps<{
  items: DashboardTodoItem[];
  columns: DataTableColumn[];
  entryLink: { label: string; to: string };
  showEntry: boolean;
  emptyText: string;
}>();
</script>

<template>
  <EnterpriseSurface title="高优待处理任务" description="按状态、关联业务和时效风险排列，优先处理会阻塞采购推进的事项。">
    <template #actions>
      <RouterLink v-if="showEntry" class="eds-button" :to="entryLink.to">{{ entryLink.label }}</RouterLink>
    </template>

    <DataTable :columns="columns" :rows="items" row-key="title" empty-title="暂无高优先待办" :empty-text="emptyText">
      <template #status="{ row }">
        <StatusTag tone="warning">{{ row.status }}</StatusTag>
      </template>
      <template #action="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">去处理</RouterLink>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
