<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import { FILE_COLUMNS } from "./display";
import type { FileRecord } from "./types";

defineProps<{
  busy: boolean;
  canMaintainFiles: boolean;
  files: FileRecord[];
  objectLabel: (file: FileRecord) => string;
}>();

defineEmits<{
  discardFile: [fileId: string];
}>();
</script>

<template>
  <EnterpriseSurface title="文件列表" :description="`当前可见 ${files.length} 个文件。`">
    <DataTable :columns="FILE_COLUMNS" :rows="files" row-key="fileId" empty-text="当前角色暂无可见文件。">
      <template #file="{ row }">
        <AttachmentList :attachments="[row]" compact />
      </template>
      <template #object="{ row }">{{ objectLabel(row) }}</template>
      <template #kind="{ row }">
        <StatusTag>{{ labelStatus(row.attachmentKind) }}</StatusTag>
      </template>
      <template #version="{ row }">v{{ row.versionNo }}</template>
      <template #uploadedAt="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
      <template #actions="{ row }">
        <EnterpriseButton v-if="canMaintainFiles" :disabled="busy" @click="$emit('discardFile', row.fileId)">作废</EnterpriseButton>
        <StatusTag v-else>只读</StatusTag>
      </template>
    </DataTable>
    <PaginationBar :total="files.length" />
  </EnterpriseSurface>
</template>
