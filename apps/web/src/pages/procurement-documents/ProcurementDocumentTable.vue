<script setup lang="ts">
import { RouterLink } from "vue-router";
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { DOCUMENT_COLUMNS, documentStatusTone, reviewStatusTone } from "./display";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import type { ProcurementDocument, StatusTone } from "./types";

defineProps<{
  canPublishDocument: (document: ProcurementDocument) => boolean;
  canReviseDocument: (document: ProcurementDocument) => boolean;
  canVoidDocument: (document: ProcurementDocument) => boolean;
  documents: ProcurementDocument[];
  hasAvailableAction: (document: ProcurementDocument) => boolean;
  nextStepDetail: (document: ProcurementDocument) => string;
  nextStepLabel: (document: ProcurementDocument) => string;
  nextStepTone: (document: ProcurementDocument) => StatusTone;
  projectLabel: (projectId: string) => string;
}>();

const emit = defineEmits<{
  publishDocument: [document: ProcurementDocument];
  reviseDocument: [document: ProcurementDocument];
  voidDocument: [document: ProcurementDocument];
}>();
</script>

<template>
  <EnterpriseSurface title="采购文件列表" description="锁定后的版本才能进入公告与邀请，列表保留全部版本和停用留痕。">
    <DataTable :columns="DOCUMENT_COLUMNS" :rows="documents" row-key="id" empty-text="暂无采购文件" empty-mode="compact">
      <template #project="{ row }">{{ projectLabel(row.projectId) }}</template>
      <template #version="{ row }">v{{ row.versionNo }}</template>
      <template #status="{ row }">
        <StatusTag :tone="documentStatusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #reviewStatus="{ row }">
        <StatusTag :tone="reviewStatusTone(row.reviewStatus)">{{ labelStatus(row.reviewStatus) }}</StatusTag>
      </template>
      <template #nextStep="{ row }">
        <StatusTag :tone="nextStepTone(row)">{{ nextStepLabel(row) }}</StatusTag>
        <p class="eds-meta">{{ nextStepDetail(row) }}</p>
      </template>
      <template #attachments="{ row }">
        <AttachmentList :attachments="row.attachmentMetadata" compact />
      </template>
      <template #lockedAt="{ row }">{{ formatDateTime(row.lockedAt) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions-table">
          <EnterpriseButton v-if="canPublishDocument(row)" type="primary" size="sm" @click="emit('publishDocument', row)">发布并锁定</EnterpriseButton>
          <RouterLink
            v-if="row.status === 'locked'"
            class="eds-button eds-button-text eds-button-sm"
            :to="{ path: '/announcements-invitations', query: { projectId: row.projectId } }"
          >
            创建公告
          </RouterLink>
          <EnterpriseButton v-if="canVoidDocument(row)" size="sm" @click="emit('voidDocument', row)">停用</EnterpriseButton>
          <EnterpriseButton v-if="canReviseDocument(row)" size="sm" @click="emit('reviseDocument', row)">修订版本</EnterpriseButton>
          <span v-if="!hasAvailableAction(row)" class="eds-meta">无可用操作</span>
        </div>
      </template>
    </DataTable>
    <PaginationBar :total="documents.length" />
  </EnterpriseSurface>
</template>
