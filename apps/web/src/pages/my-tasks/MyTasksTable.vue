<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseButton, EnterpriseSurface, FeedbackMessage, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import { TASK_COLUMNS, taskStatusTone } from "./display";
import type { TaskAction, UnifiedTaskView } from "./types";

defineProps<{
  actionBusy: string;
  loading: boolean;
  tasks: UnifiedTaskView[];
}>();

const emit = defineEmits<{
  runTaskAction: [task: UnifiedTaskView, action: TaskAction];
}>();
</script>

<template>
  <EnterpriseSurface title="任务列表" :description="loading ? '正在加载任务。' : `当前筛选 ${tasks.length} 项。`">
    <FeedbackMessage v-if="loading" align="center">正在加载任务...</FeedbackMessage>
    <DataTable v-else :columns="TASK_COLUMNS" :rows="tasks" row-key="id" empty-text="当前筛选条件下没有可见任务。">
      <template #task="{ row }">
        <strong>{{ row.taskTypeLabel }} <StatusTag>{{ row.sourceLabel }}</StatusTag></strong>
        <p class="eds-meta">{{ row.title }}</p>
        <p v-if="row.nodeLabel" class="eds-meta">当前节点：{{ row.nodeLabel }} / 流程状态：{{ row.processStatusLabel }}</p>
      </template>
      <template #business="{ row }">{{ row.businessTypeLabel }} / {{ row.businessId }}</template>
      <template #status="{ row }">
        <StatusTag :tone="taskStatusTone(row.status)">{{ row.statusLabel }}</StatusTag>
      </template>
      <template #assignee="{ row }">{{ row.assigneeLabel }}</template>
      <template #time="{ row }">
        <span>创建：{{ formatDateTime(row.createdAt) }}</span>
        <p v-if="row.completedAt" class="eds-meta">完成：{{ formatDateTime(row.completedAt) }}</p>
      </template>
      <template #entry="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.targetPath">{{ row.targetLabel }}</RouterLink>
      </template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton
            v-if="row.approvalInstanceId"
            type="primary"
            :disabled="!row.canComplete || Boolean(actionBusy)"
            @click="emit('runTaskAction', row, 'approve')"
          >
            同意
          </EnterpriseButton>
          <EnterpriseButton
            v-if="row.approvalInstanceId"
            :disabled="!row.canComplete || Boolean(actionBusy)"
            @click="emit('runTaskAction', row, 'reject')"
          >
            驳回
          </EnterpriseButton>
          <EnterpriseButton
            v-if="!row.approvalInstanceId && row.actionTaskId"
            type="primary"
            :disabled="!row.canComplete || Boolean(actionBusy)"
            @click="emit('runTaskAction', row, 'complete')"
          >
            完成任务
          </EnterpriseButton>
          <StatusTag v-if="!row.canComplete">只读或无处理权限</StatusTag>
        </div>
      </template>
    </DataTable>
    <PaginationBar v-if="!loading" :total="tasks.length" />
  </EnterpriseSurface>
</template>
