<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import type { R8WorkflowNotificationView } from "../../api/workflow";
import { DataTable, EnterpriseButton, EnterpriseSurface, FeedbackMessage, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import { MESSAGE_COLUMNS, readTone } from "./display";

defineProps<{
  busyMessageId: string;
  loading: boolean;
  messages: R8WorkflowNotificationView[];
}>();

const emit = defineEmits<{
  markRead: [message: R8WorkflowNotificationView];
}>();

const selectedMessage = ref<R8WorkflowNotificationView | null>(null);

function openMessage(message: R8WorkflowNotificationView) {
  selectedMessage.value = message;
  if (!message.read) emit("markRead", message);
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="消息列表" :description="loading ? '正在加载消息。' : `当前筛选 ${messages.length} 条消息。`">
    <FeedbackMessage v-if="loading" align="center">正在加载消息...</FeedbackMessage>
    <DataTable v-else :columns="MESSAGE_COLUMNS" :rows="messages" row-key="id" empty-text="当前筛选条件下没有可见消息。">
      <template #message="{ row }">
        <strong>{{ row.title }}</strong>
        <p class="eds-meta">{{ row.contentSummary }}</p>
      </template>
      <template #business="{ row }">{{ row.businessTypeLabel }} / {{ row.businessId }}</template>
      <template #status="{ row }">
        <StatusTag :tone="readTone(row.read)">{{ row.readLabel }}</StatusTag>
      </template>
      <template #time="{ row }">
        <span>{{ formatDateTime(row.createdAt) }}</span>
        <p v-if="row.readAt" class="eds-meta">已读：{{ formatDateTime(row.readAt) }}</p>
      </template>
      <template #entry="{ row }">
        <RouterLink class="eds-button eds-button-text" :to="row.targetPath">{{ row.targetLabel }}</RouterLink>
      </template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton type="text" @click="openMessage(row)">查看详情</EnterpriseButton>
          <EnterpriseButton type="primary" :disabled="row.read || busyMessageId === row.id" @click="emit('markRead', row)">标记已读</EnterpriseButton>
        </div>
      </template>
    </DataTable>
    <PaginationBar v-if="!loading" :total="messages.length" />
  </EnterpriseSurface>

  <div v-if="selectedMessage" class="g-hotel-drawer" role="dialog" aria-modal="true" aria-label="消息详情">
    <button class="g-hotel-drawer-mask" type="button" aria-label="关闭" @click="selectedMessage = null"></button>
    <aside class="g-hotel-drawer-panel">
      <header>
        <h3>消息详情</h3>
        <button type="button" aria-label="关闭" @click="selectedMessage = null">›</button>
      </header>
      <section>
        <h4>类型</h4>
        <p>{{ selectedMessage.businessTypeLabel }}</p>
      </section>
      <section>
        <h4>时间</h4>
        <p>{{ formatDateTime(selectedMessage.createdAt) }}</p>
      </section>
      <section>
        <h4>内容详情</h4>
        <div class="g-hotel-detail-list">
          <p><span>标题：</span>{{ selectedMessage.title }}</p>
          <p><span>内容：</span>{{ selectedMessage.contentSummary }}</p>
          <p><span>业务对象：</span>{{ selectedMessage.businessTypeLabel }} / {{ selectedMessage.businessId }}</p>
          <p><span>状态：</span>{{ selectedMessage.readLabel }}</p>
        </div>
      </section>
      <footer>
        <RouterLink class="eds-button eds-button-primary" :to="selectedMessage.targetPath">{{ selectedMessage.targetLabel }}</RouterLink>
        <EnterpriseButton @click="selectedMessage = null">关闭</EnterpriseButton>
      </footer>
    </aside>
  </div>
</template>
