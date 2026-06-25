<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { loadWorkflowNotifications, markNotificationRead, type R8ApprovalBusinessType, type R8WorkflowNotificationView } from "../api/workflow";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime } from "../utils/status-labels";
import { r8BusinessTypeLabels } from "../../../api/src/workflow-ui-contract";

type ReadFilter = "all" | "unread" | "read";

const session = useSessionStore();
const messages = ref<R8WorkflowNotificationView[]>([]);
const loading = ref(false);
const error = ref("");
const readFilter = ref<ReadFilter>("unread");
const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");
const busyMessageId = ref("");

const businessTypeOptions = computed(() => {
  const seen = new Set(messages.value.map((message) => message.businessType));
  return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
});

const stats = computed(() => ({
  unread: messages.value.filter((message) => !message.read).length,
  read: messages.value.filter((message) => message.read).length,
  total: messages.value.length
}));

const filteredMessages = computed(() =>
  messages.value
    .filter((message) => businessTypeFilter.value === "all" || message.businessType === businessTypeFilter.value)
    .filter((message) => {
      if (readFilter.value === "all") return true;
      return readFilter.value === "read" ? message.read : !message.read;
    })
);

async function load() {
  if (!session.roleId) return;
  loading.value = true;
  error.value = "";
  try {
    messages.value = await loadWorkflowNotifications();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "消息加载失败";
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

async function markRead(message: R8WorkflowNotificationView) {
  busyMessageId.value = message.id;
  error.value = "";
  try {
    const updated = await markNotificationRead(message.id);
    messages.value = messages.value.map((item) => (item.id === updated.id ? updated : item));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "标记已读失败";
  } finally {
    busyMessageId.value = "";
  }
}

async function markAllVisibleRead() {
  for (const message of filteredMessages.value.filter((item) => !item.read)) {
    await markRead(message);
  }
}

onMounted(load);

watch(
  () => session.roleId,
  () => {
    void load();
  }
);
</script>

<template>
  <section class="panel">
    <div class="page-head">
      <div>
        <p class="eyebrow">R8 站内消息</p>
        <h2>消息中心</h2>
      </div>
      <RouterLink class="secondary-button link-button" to="/my-tasks">我的任务</RouterLink>
    </div>

    <div class="metrics">
      <div><strong>{{ stats.unread }}</strong><span>未读消息</span></div>
      <div><strong>{{ stats.read }}</strong><span>已读消息</span></div>
      <div><strong>{{ stats.total }}</strong><span>当前角色可见消息</span></div>
      <div><strong>{{ session.roleId === "admin" ? "不接收业务消息" : "按权限过滤" }}</strong><span>可见范围</span></div>
    </div>
  </section>

  <section class="panel">
    <div class="form-grid">
      <label>
        已读状态
        <select v-model="readFilter">
          <option value="all">全部消息</option>
          <option value="unread">未读</option>
          <option value="read">已读</option>
        </select>
      </label>
      <label>
        业务类型
        <select v-model="businessTypeFilter">
          <option value="all">全部业务</option>
          <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <button type="button" :disabled="!filteredMessages.some((item) => !item.read) || Boolean(busyMessageId)" @click="markAllVisibleRead">当前列表全部已读</button>
    </div>

    <ErrorAlert v-if="error" :message="error" />

    <div v-if="loading" class="notice">正在加载消息...</div>
    <div v-else-if="filteredMessages.length === 0" class="empty">当前筛选条件下没有可见消息。</div>

    <table v-else>
      <thead>
        <tr>
          <th>消息</th>
          <th>业务对象</th>
          <th>状态</th>
          <th>时间</th>
          <th>入口</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="message in filteredMessages" :key="message.id">
          <td>
            <strong>{{ message.title }}</strong>
            <small>{{ message.contentSummary }}</small>
          </td>
          <td>{{ message.businessTypeLabel }} / {{ message.businessId }}</td>
          <td><span class="tag">{{ message.readLabel }}</span></td>
          <td>
            <span>{{ formatDateTime(message.createdAt) }}</span>
            <small v-if="message.readAt">已读：{{ formatDateTime(message.readAt) }}</small>
          </td>
          <td><RouterLink class="secondary-button link-button" :to="message.targetPath">{{ message.targetLabel }}</RouterLink></td>
          <td>
            <button type="button" :disabled="message.read || busyMessageId === message.id" @click="markRead(message)">标记已读</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
