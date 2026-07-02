<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  loadWorkflowNotifications,
  loadWorkflowTasks,
  summarizeWorkflow,
  type R8ApprovalBusinessType,
  type R8WorkflowNotificationView,
  type R8WorkflowTaskView
} from "../api/workflow";
import { useSessionStore } from "../stores/session";
import { formatDateTime } from "../utils/status-labels";
import { DataTable, EnterpriseSurface, FeedbackMessage, StatusTag, SummaryCards, type DataTableColumn } from "./base";

const props = withDefaults(
  defineProps<{
    title?: string;
    businessTypes?: R8ApprovalBusinessType[];
    projectId?: string;
    compact?: boolean;
  }>(),
  {
    title: "待办与消息",
    businessTypes: () => [],
    projectId: "",
    compact: false
  }
);

const session = useSessionStore();
const tasks = ref<R8WorkflowTaskView[]>([]);
const messages = ref<R8WorkflowNotificationView[]>([]);
const loadError = ref("");

const visibleTasks = computed(() =>
  tasks.value
    .filter((task) => props.businessTypes.length === 0 || props.businessTypes.includes(task.businessType))
    .filter((task) => !props.projectId || task.projectId === props.projectId)
    .slice(0, props.compact ? 3 : 5)
);
const visibleMessages = computed(() =>
  messages.value
    .filter((message) => props.businessTypes.length === 0 || props.businessTypes.includes(message.businessType))
    .filter((message) => !props.projectId || message.projectId === props.projectId)
    .slice(0, props.compact ? 3 : 5)
);
const summary = computed(() => summarizeWorkflow(visibleTasks.value, visibleMessages.value));

const taskColumns: DataTableColumn[] = [
  { key: "statusLabel", label: "状态" },
  { key: "taskTypeLabel", label: "待办类型" },
  { key: "title", label: "标题" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作" }
];

const messageColumns: DataTableColumn[] = [
  { key: "readLabel", label: "状态" },
  { key: "businessTypeLabel", label: "业务类型" },
  { key: "title", label: "标题" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作" }
];

const taskRows = computed(() =>
  visibleTasks.value.map((task) => ({
    ...task,
    createdAt: formatDateTime(task.createdAt)
  }))
);

const messageRows = computed(() =>
  visibleMessages.value.map((message) => ({
    ...message,
    createdAt: formatDateTime(message.createdAt)
  }))
);

async function load() {
  if (!session.roleId) return;
  loadError.value = "";
  try {
    const [taskViews, messageViews] = await Promise.all([loadWorkflowTasks(session), loadWorkflowNotifications()]);
    tasks.value = taskViews;
    messages.value = messageViews;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "待办消息加载失败";
    tasks.value = [];
    messages.value = [];
  }
}

onMounted(load);

watch(
  () => [session.roleId, props.projectId, props.businessTypes.join(",")],
  () => {
    void load();
  }
);
</script>

<template>
  <EnterpriseSurface :title="title" description="按当前角色和业务范围汇总待办任务、未读消息和跳转入口。">
    <template #actions>
      <RouterLink class="eds-button eds-button-text" to="/my-tasks">待办中心</RouterLink>
      <RouterLink class="eds-button eds-button-text" to="/messages">消息中心</RouterLink>
    </template>

    <div class="eds-section">
      <SummaryCards
        :items="[
          { label: '待办任务', value: summary.pendingTasks },
          { label: '未读消息', value: summary.unreadMessages }
        ]"
      />

      <FeedbackMessage v-if="loadError" tone="error">{{ loadError }}</FeedbackMessage>
      <FeedbackMessage v-else-if="!visibleTasks.length && !visibleMessages.length">当前角色暂无相关待办或消息。</FeedbackMessage>

      <DataTable v-if="visibleTasks.length" :columns="taskColumns" :rows="taskRows" row-key="id">
        <template #statusLabel="{ value }">
          <StatusTag :tone="value === '待处理' ? 'warning' : 'default'">{{ value }}</StatusTag>
        </template>
        <template #actions="{ row }">
          <RouterLink class="eds-button eds-button-text" :to="row.targetPath">查看</RouterLink>
        </template>
      </DataTable>

      <DataTable v-if="visibleMessages.length" :columns="messageColumns" :rows="messageRows" row-key="id">
        <template #readLabel="{ value }">
          <StatusTag :tone="value === '未读' ? 'primary' : 'default'">{{ value }}</StatusTag>
        </template>
        <template #actions="{ row }">
          <RouterLink class="eds-button eds-button-text" :to="row.targetPath">查看</RouterLink>
        </template>
      </DataTable>
    </div>
  </EnterpriseSurface>
</template>
