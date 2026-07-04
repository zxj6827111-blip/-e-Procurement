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
  <EnterpriseSurface title="待办事项" class="eds-workbench-todos">
    <template #actions>
      <RouterLink v-if="showEntry" class="eds-button" :to="entryLink.to">{{ entryLink.label }}</RouterLink>
    </template>
    <div v-if="items.length" class="eds-task-list">
      <article v-for="item in items" :key="`${item.title}-${item.to}`" class="eds-task-item">
        <div class="eds-task-item-main">
          <strong>{{ item.title }}</strong>
          <span>{{ item.meta }}</span>
        </div>
        <div class="eds-task-item-meta">
          <StatusTag tone="warning">{{ item.status }}</StatusTag>
          <span>{{ item.due ?? "按项目阶段推进" }}</span>
          <span>{{ item.risk ?? "按计划" }}</span>
        </div>
        <RouterLink class="eds-action-link" :to="item.to">处理</RouterLink>
      </article>
    </div>
    <DataTable v-else :columns="columns" :rows="items" :empty-text="emptyText" />
  </EnterpriseSurface>
</template>
