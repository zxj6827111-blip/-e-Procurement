<script setup lang="ts">
import { ref } from "vue";
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

const selectedTask = ref<UnifiedTaskView | null>(null);
const selectedAction = ref<TaskAction>("approve");

function openTask(task: UnifiedTaskView, action: TaskAction = "approve") {
  selectedTask.value = task;
  selectedAction.value = action;
}

function submitTask() {
  if (!selectedTask.value) return;
  emit("runTaskAction", selectedTask.value, selectedAction.value);
  selectedTask.value = null;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="任务列表" :description="loading ? '正在加载任务。' : `当前筛选 ${tasks.length} 项。`">
    <FeedbackMessage v-if="loading" align="center">正在加载任务...</FeedbackMessage>
    <DataTable v-else :columns="TASK_COLUMNS" :rows="tasks" row-key="id" empty-text="当前筛选条件下没有可见任务。">
      <template #task="{ row }">
        <strong>{{ row.taskTypeLabel }} <StatusTag>{{ row.sourceLabel }}</StatusTag></strong>
        <p class="eds-meta">{{ row.title }}</p>
        <p v-if="row.nodeLabel" class="eds-meta">办理环节：{{ row.nodeLabel }} / 处理状态：{{ row.processStatusLabel }}</p>
      </template>
      <template #business="{ row }">{{ row.projectName }}</template>
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
            @click="openTask(row, 'approve')"
          >
            去处理
          </EnterpriseButton>
          <EnterpriseButton
            v-if="row.approvalInstanceId"
            :disabled="!row.canComplete || Boolean(actionBusy)"
            @click="openTask(row, 'reject')"
          >
            驳回
          </EnterpriseButton>
          <EnterpriseButton
            v-if="!row.approvalInstanceId && row.actionTaskId"
            type="primary"
            :disabled="!row.canComplete || Boolean(actionBusy)"
            @click="openTask(row, 'complete')"
          >
            去处理
          </EnterpriseButton>
          <StatusTag v-if="!row.canComplete">只读或无处理权限</StatusTag>
        </div>
      </template>
    </DataTable>
    <PaginationBar v-if="!loading" :total="tasks.length" />
  </EnterpriseSurface>

  <div v-if="selectedTask" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="任务处理">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedTask = null"></button>
    <article class="g-hotel-modal-panel g-hotel-task-modal">
      <header>
        <h3>任务处理</h3>
        <button type="button" aria-label="关闭" @click="selectedTask = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>任务名称：</span>{{ selectedTask.title }}</p>
        <p><span>关联项目：</span>{{ selectedTask.projectName }}</p>
        <p><span>任务发起：</span>{{ selectedTask.assigneeLabel }}</p>
        <p><span>到达时间：</span>{{ formatDateTime(selectedTask.createdAt) }}</p>
        <p><span>当前状态：</span>{{ selectedTask.statusLabel }}</p>
      </div>
      <section>
        <h4>任务内容详情与审批意见</h4>
        <p class="eds-meta">
          请核对关联单据的内容，并根据系统要求进行处理。如果需要退回修改，请点击下方的“驳回 / 拒绝”按钮。
        </p>
      </section>
      <footer>
        <EnterpriseButton @click="selectedTask = null">取消</EnterpriseButton>
        <EnterpriseButton
          v-if="selectedTask.approvalInstanceId"
          :disabled="!selectedTask.canComplete || Boolean(actionBusy)"
          @click="selectedAction = 'reject'; submitTask()"
        >
          驳回 / 拒绝
        </EnterpriseButton>
        <EnterpriseButton
          type="primary"
          :disabled="!selectedTask.canComplete || Boolean(actionBusy)"
          @click="selectedAction = selectedTask.approvalInstanceId ? 'approve' : 'complete'; submitTask()"
        >
          {{ selectedTask.approvalInstanceId ? "同意并提交" : "完成任务" }}
        </EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
