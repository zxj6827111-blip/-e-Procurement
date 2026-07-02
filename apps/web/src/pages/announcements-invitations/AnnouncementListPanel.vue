<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { ANNOUNCEMENT_COLUMNS } from "./constants";
import type { Announcement, StatusTone } from "./types";

defineProps<{
  announcements: Announcement[];
  documentLabel: (documentId: string) => string;
  labelStatus: (value: string) => string;
  formatDateTime: (value?: string | null) => string;
  statusTone: (status: string) => StatusTone;
}>();

const emit = defineEmits<{
  select: [announcementId: string];
}>();
</script>

<template>
  <EnterpriseSurface title="公告列表" :description="`当前项目共 ${announcements.length} 条公告。`">
    <DataTable :columns="ANNOUNCEMENT_COLUMNS" :rows="announcements" row-key="id" empty-text="当前项目还没有公告。">
      <template #title="{ row }">
        <EnterpriseButton type="text" @click="emit('select', row.id)">{{ row.title }}</EnterpriseButton>
      </template>
      <template #document="{ row }">{{ documentLabel(row.documentId) }}</template>
      <template #methodScope="{ row }">{{ labelStatus(row.procurementMethod) }} / {{ labelStatus(row.scope) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #registrationDeadline="{ row }">{{ formatDateTime(row.registrationDeadlineAt) }}</template>
      <template #quoteDeadline="{ row }">{{ formatDateTime(row.quoteDeadlineAt) }}</template>
      <template #published="{ row }">
        {{ row.status === "published" ? `已发布：${formatDateTime(row.publishedAt)}` : row.status === "closed" ? "已关闭" : "未发布草稿" }}
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
