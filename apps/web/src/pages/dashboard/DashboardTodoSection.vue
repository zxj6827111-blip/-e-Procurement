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
  <EnterpriseSurface title="待办事项">
    <template #actions>
      <RouterLink v-if="showEntry" class="eds-button" :to="entryLink.to">{{ entryLink.label }}</RouterLink>
    </template>
    <DataTable :columns="columns" :rows="items" :empty-text="emptyText">
      <template #title="{ row }">
        <div class="eds-table-primary-cell">
          <strong>{{ row.title }}</strong>
          <span v-if="row.meta">{{ row.meta }}</span>
        </div>
      </template>
      <template #status="{ row }">
        <StatusTag tone="warning">{{ row.status }}</StatusTag>
      </template>
      <template #risk="{ row }">
        <span class="eds-table-muted">{{ row.risk ?? "按计划" }}</span>
      </template>
      <template #action="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">处理</RouterLink>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
