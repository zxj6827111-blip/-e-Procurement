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
  <EnterpriseSurface class="g-hotel-expert-confirmation" title="专家确认" description="确认回避、评审纪律和保密承诺后，专家才能查看材料并提交评分。">
    <section v-if="currentAssignment && !confirmationCompleted" class="g-hotel-recusal-card">
      <div>
        <strong>专家回避制度确认书</strong>
        <p>尊敬的评标专家：如您与本项目投标供应商存在任职、顾问、股权、亲属或其他利害关系，请主动申请回避；无利害关系后方可进入评分。</p>
      </div>
      <div class="g-hotel-recusal-actions">
        <EnterpriseButton disabled>我存在利害关系，申请回避</EnterpriseButton>
        <EnterpriseButton type="primary" @click="emit('confirmAll')">无利害关系，确认参与评审</EnterpriseButton>
      </div>
    </section>

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
    <SubmitPanel v-if="!currentAssignment || confirmationCompleted">
      <EnterpriseButton type="primary" :disabled="!currentAssignment || confirmationCompleted" @click="emit('confirmAll')">
        确认回避、纪律和保密承诺
      </EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
