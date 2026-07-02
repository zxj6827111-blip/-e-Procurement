<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseSurface, type DataTableColumn } from "../../components/base";

defineProps<{
  rows: Array<{ title: string; meta: string; time: string; to: string }>;
  columns: DataTableColumn[];
  activityLink: { label: string; to: string };
}>();
</script>

<template>
  <EnterpriseSurface title="近期动态">
    <template #actions>
      <RouterLink class="eds-button" :to="activityLink.to">{{ activityLink.label }}</RouterLink>
    </template>
    <DataTable :columns="columns" :rows="rows" empty-text="暂无近期动态">
      <template #action="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.to">查看</RouterLink>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
