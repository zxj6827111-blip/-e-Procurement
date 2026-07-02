<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { adapterColumns } from "./display";
import type { IntegrationAdapter } from "./types";

defineProps<{
  rows: IntegrationAdapter[];
}>();
</script>

<template>
  <EnterpriseSurface title="Adapter 状态" description="外部系统适配器的模式、名称和日志规模。">
    <DataTable :columns="adapterColumns" :rows="rows" row-key="key" empty-text="暂无 Adapter">
      <template #mode="{ row }"><StatusTag>{{ row.mode }}</StatusTag></template>
      <template #logs="{ row }">{{ row.logs.length }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
