<script setup lang="ts">
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

defineEmits<{
  markRead: [message: R8WorkflowNotificationView];
}>();
</script>

<template>
  <EnterpriseSurface title="消息列表" :description="loading ? '正在加载消息。' : `当前筛选 ${messages.length} 条消息。`">
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
        <EnterpriseButton type="primary" :disabled="row.read || busyMessageId === row.id" @click="$emit('markRead', row)">标记已读</EnterpriseButton>
      </template>
    </DataTable>
    <PaginationBar v-if="!loading" :total="messages.length" />
  </EnterpriseSurface>
</template>
