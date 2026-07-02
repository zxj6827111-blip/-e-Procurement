<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag, SubmitPanel } from "../../components/base";
import { ASSIGNMENT_COLUMNS } from "./display";
import type { Assignment } from "./types";

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });

defineProps<{
  assignmentStatusLabel: (status: string) => string;
  assignments: Assignment[];
  confirmationCompleted: boolean;
  currentAssignment?: Assignment;
  pendingAssignments: Assignment[];
}>();

const emit = defineEmits<{
  confirmAll: [];
}>();
</script>

<template>
  <EnterpriseSurface title="专家确认" description="确认回避、评审纪律和保密承诺后，专家才能查看材料并提交评分。">
    <p v-if="pendingAssignments.length && !confirmationCompleted" class="eds-meta">
      已收到专家评审确认任务，请先确认回避、评审纪律和保密承诺，再查看材料并评分。
    </p>
    <DataTable :columns="ASSIGNMENT_COLUMNS" :rows="assignments" row-key="id" empty-text="当前专家暂无确认任务。">
      <template #project="{ row }">
        <EnterpriseButton type="text" @click="selectedProjectId = row.projectId">{{ row.projectId }}</EnterpriseButton>
      </template>
      <template #status="{ row }">
        <StatusTag :tone="row.status === 'confirmed' ? 'success' : row.status === 'replaced' ? 'error' : 'warning'">
          {{ assignmentStatusLabel(row.status) }}
        </StatusTag>
      </template>
      <template #avoidance="{ row }">{{ row.avoidanceConfirmed ? "已确认" : "未确认" }}</template>
      <template #discipline="{ row }">{{ row.disciplineConfirmed ? "已确认" : "未确认" }}</template>
      <template #confidentiality="{ row }">{{ row.confidentialityConfirmed ? "已确认" : "未确认" }}</template>
    </DataTable>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!currentAssignment || confirmationCompleted" @click="emit('confirmAll')">
        确认回避、纪律和保密承诺
      </EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
