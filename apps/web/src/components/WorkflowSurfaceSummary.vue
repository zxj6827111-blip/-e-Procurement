<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { loadWorkflowNotifications, loadWorkflowTasks, summarizeWorkflow, type R8ApprovalBusinessType, type R8WorkflowNotificationView, type R8WorkflowTaskView } from "../api/workflow";
import { useSessionStore } from "../stores/session";
import { formatDateTime } from "../utils/status-labels";

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
  <section class="workflow-summary" :class="{ compact: props.compact }">
    <div class="workflow-summary-head">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ summary.pendingTasks }} 个待办 / {{ summary.unreadMessages }} 条未读消息</span>
      </div>
      <div class="actions">
        <RouterLink class="secondary-button link-button" to="/my-tasks">待办中心</RouterLink>
        <RouterLink class="secondary-button link-button" to="/messages">消息中心</RouterLink>
      </div>
    </div>

    <p v-if="loadError" class="inline-error">{{ loadError }}</p>
    <div v-else-if="!visibleTasks.length && !visibleMessages.length" class="notice">当前视角暂无相关待办或消息。</div>

    <div v-if="visibleTasks.length" class="workflow-mini-list">
      <RouterLink v-for="task in visibleTasks" :key="task.id" :to="task.targetPath">
        <span class="tag">{{ task.statusLabel }}</span>
        <strong>{{ task.taskTypeLabel }}</strong>
        <small>{{ task.title }} / {{ formatDateTime(task.createdAt) }}</small>
      </RouterLink>
    </div>

    <div v-if="visibleMessages.length" class="workflow-mini-list">
      <RouterLink v-for="message in visibleMessages" :key="message.id" :to="message.targetPath">
        <span class="tag">{{ message.readLabel }}</span>
        <strong>{{ message.businessTypeLabel }}</strong>
        <small>{{ message.title }} / {{ formatDateTime(message.createdAt) }}</small>
      </RouterLink>
    </div>
  </section>
</template>
