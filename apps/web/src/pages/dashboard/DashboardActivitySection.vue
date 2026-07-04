<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseSurface, type DataTableColumn } from "../../components/base";

defineProps<{
  rows: Array<{ title: string; meta: string; time: string; to: string }>;
  columns: DataTableColumn[];
  activityLink: { label: string; to: string };
  emptyText: string;
}>();
</script>

<template>
  <EnterpriseSurface title="进行中项目">
    <template #actions>
      <RouterLink class="eds-button" :to="activityLink.to">{{ activityLink.label }}</RouterLink>
    </template>
    <DataTable :columns="columns" :rows="rows" :empty-text="emptyText">
      <template #action="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">查看</RouterLink>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
