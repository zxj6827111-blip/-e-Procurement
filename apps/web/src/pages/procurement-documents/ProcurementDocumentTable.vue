<script setup lang="ts">
import { ref } from "vue";
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

const selectedDocument = ref<ProcurementDocument | null>(null);
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="采购文件台账" description="管理招标文件、采购清单及合同范本草案。">
    <DataTable :columns="DOCUMENT_COLUMNS" :rows="documents" row-key="id" empty-text="暂无采购文件" empty-mode="compact">
      <template #title="{ row }">
        <div class="eds-table-primary-cell">
          <strong>{{ row.title }}</strong>
          <span>{{ row.id }} / v{{ row.versionNo }}</span>
        </div>
      </template>
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
          <EnterpriseButton size="sm" @click="selectedDocument = row">查看详情</EnterpriseButton>
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

  <div v-if="selectedDocument" class="g-hotel-drawer" role="dialog" aria-modal="true" aria-label="文件版本详情">
    <button class="g-hotel-drawer-mask" type="button" aria-label="关闭详情" @click="selectedDocument = null"></button>
    <aside class="g-hotel-drawer-panel">
      <header>
        <h3>文件版本详情</h3>
        <button type="button" @click="selectedDocument = null">×</button>
      </header>
      <section>
        <h4>文件信息</h4>
        <div class="g-hotel-detail-list">
          <p><span>名称：</span>{{ selectedDocument.title }}</p>
          <p><span>编号：</span>{{ selectedDocument.id }}</p>
          <p><span>项目：</span>{{ projectLabel(selectedDocument.projectId) }}</p>
          <p><span>状态：</span>{{ labelStatus(selectedDocument.status) }} / {{ labelStatus(selectedDocument.reviewStatus) }}</p>
        </div>
      </section>
      <section>
        <h4>版本历史</h4>
        <div class="g-hotel-timeline">
          <article>
            <span></span>
            <div>
              <small>{{ formatDateTime(selectedDocument.lockedAt) }}</small>
              <strong>V{{ selectedDocument.versionNo }} {{ labelStatus(selectedDocument.status) }}</strong>
              <p>{{ selectedDocument.contentSummary || "采购文件版本已记录并进入留痕。" }}</p>
            </div>
          </article>
        </div>
      </section>
      <section>
        <h4>附件</h4>
        <AttachmentList :attachments="selectedDocument.attachmentMetadata" compact />
      </section>
      <footer>
        <EnterpriseButton @click="selectedDocument = null">关闭</EnterpriseButton>
      </footer>
    </aside>
  </div>
</template>
