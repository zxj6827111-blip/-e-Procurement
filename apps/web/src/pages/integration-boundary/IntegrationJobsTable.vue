<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { jobColumns, jobId, jobUpdatedAt, payloadText } from "./display";
import type { IntegrationJobAction, IntegrationLog } from "./types";

defineProps<{
  rows: IntegrationLog[];
}>();

const emit = defineEmits<{
  operate: [job: IntegrationLog, action: IntegrationJobAction];
}>();
</script>

<template>
  <EnterpriseSurface title="集成任务" description="外部调用任务的执行、重试、重推和取消操作集中在任务表格内完成。">
    <DataTable :columns="jobColumns" :rows="rows" row-key="id" empty-text="暂无集成任务">
      <template #job="{ row }">{{ jobId(row) }}</template>
      <template #business="{ row }">{{ row.businessType || "-" }} / {{ row.businessId || "-" }}</template>
      <template #status="{ row }"><StatusTag :tone="row.status === 'failed' ? 'error' : 'default'">{{ labelStatus(row.status) }}</StatusTag></template>
      <template #request="{ row }">{{ payloadText(row.requestPayload) }}</template>
      <template #response="{ row }">{{ row.errorMessage || payloadText(row.responsePayload) }}</template>
      <template #updatedAt="{ row }">{{ jobUpdatedAt(row) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton type="text" @click="emit('operate', row, 'execute')">执行</EnterpriseButton>
          <EnterpriseButton type="text" @click="emit('operate', row, 'retry')">重试</EnterpriseButton>
          <EnterpriseButton type="text" @click="emit('operate', row, 'repush')">重推</EnterpriseButton>
          <EnterpriseButton type="text" @click="emit('operate', row, 'cancel')">取消</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
