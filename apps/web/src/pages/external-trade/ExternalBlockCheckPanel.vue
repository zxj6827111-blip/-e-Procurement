<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag, SubmitPanel } from "../../components/base";
import { BLOCK_CHECK_COLUMNS } from "./display";
import type { BlockAction } from "./types";

defineProps<{
  actions: BlockAction[];
  rows: Array<{
    id: string;
    project: string;
    externalFlag: string;
    result: string;
  }>;
}>();

defineEmits<{
  checkBlock: [action: string];
}>();
</script>

<template>
  <EnterpriseSurface title="拦截校验" description="外部交易项目必须阻断内部公告、报名、报价、评审和定标动作。">
    <SubmitPanel>
      <EnterpriseButton v-for="action in actions" :key="action.value" @click="$emit('checkBlock', action.value)">{{ action.label }}校验</EnterpriseButton>
    </SubmitPanel>
    <DataTable :columns="BLOCK_CHECK_COLUMNS" :rows="rows" row-key="id">
      <template #externalFlag="{ row }">
        <StatusTag :tone="row.externalFlag === '是' ? 'success' : 'warning'">{{ row.externalFlag }}</StatusTag>
      </template>
      <template #result="{ row }">
        <StatusTag :tone="row.result === '允许' ? 'success' : row.result === '已拦截' ? 'error' : 'default'">{{ row.result }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
