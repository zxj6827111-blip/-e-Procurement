<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { STEP_COLUMNS } from "./display";

defineProps<{
  rows: Array<{ id: string; index: number; name: string; status: string }>;
}>();

defineEmits<{
  selectStep: [index: number];
}>();
</script>

<template>
  <EnterpriseSurface title="入驻步骤" description="按准入要求逐项补齐资料。">
    <DataTable :columns="STEP_COLUMNS" :rows="rows" row-key="id">
      <template #index="{ row }">{{ row.index }}</template>
      <template #status="{ row }">
        <StatusTag :tone="row.status === 'done' ? 'success' : row.status === 'active' ? 'primary' : 'default'">
          {{ row.status === "done" ? "已完成" : row.status === "active" ? "当前" : "待填写" }}
        </StatusTag>
      </template>
      <template #name="{ row }">
        <EnterpriseButton type="text" @click="$emit('selectStep', row.index - 1)">{{ row.name }}</EnterpriseButton>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
