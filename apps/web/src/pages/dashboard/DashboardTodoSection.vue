<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseSurface, StatusTag, type DataTableColumn } from "../../components/base";
import type { DashboardTodoItem } from "./types";

defineProps<{
  items: DashboardTodoItem[];
  columns: DataTableColumn[];
  entryLink: { label: string; to: string };
  showEntry: boolean;
}>();
</script>

<template>
  <EnterpriseSurface title="待办事项">
    <template #actions>
      <RouterLink v-if="showEntry" class="eds-button" :to="entryLink.to">{{ entryLink.label }}</RouterLink>
    </template>
    <DataTable :columns="columns" :rows="items" empty-text="暂无待处理事项">
      <template #status="{ row }">
        <StatusTag tone="warning">{{ row.status }}</StatusTag>
      </template>
      <template #action="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">处理</RouterLink>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
