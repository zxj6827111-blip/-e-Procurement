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
  <EnterpriseSurface title="进行中项目" class="eds-workbench-activities">
    <template #actions>
      <RouterLink class="eds-button" :to="activityLink.to">{{ activityLink.label }}</RouterLink>
    </template>
    <div v-if="rows.length" class="eds-activity-list">
      <RouterLink v-for="row in rows" :key="`${row.title}-${row.time}`" class="eds-activity-item" :to="row.to">
        <strong>{{ row.title }}</strong>
        <span>{{ row.meta }}</span>
        <time>{{ row.time }}</time>
      </RouterLink>
    </div>
    <DataTable v-else :columns="columns" :rows="rows" :empty-text="emptyText" />
  </EnterpriseSurface>
</template>
