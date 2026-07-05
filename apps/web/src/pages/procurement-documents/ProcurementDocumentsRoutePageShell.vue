<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface } from "../../components/base";
import ProcurementDocumentCreatePanel from "./ProcurementDocumentCreatePanel.vue";
import ProcurementDocumentTable from "./ProcurementDocumentTable.vue";
import ProcurementDocumentsPageShell from "./ProcurementDocumentsPageShell.vue";
import { useProcurementDocumentsPage } from "./useProcurementDocumentsPage";

const {
  auditLogId,
  canMaintainDocuments,
  canPublishDocument,
  canReviseDocument,
  canVoidDocument,
  contentSummary,
  createDocument,
  documents,
  error,
  hasAvailableAction,
  internalProjects,
  nextStepDetail,
  nextStepLabel,
  nextStepTone,
  onFileChange,
  pendingPublicationDocuments,
  projectLabel,
  publishDocument,
  reviseDocument,
  selectedFileName,
  selectedProjectId,
  summaryItems,
  title,
  voidDocument,
  voidedDocuments
} = useProcurementDocumentsPage();
</script>

<template>
  <section class="eds-section">
    <ProcurementDocumentsPageShell
      :can-maintain-documents="canMaintainDocuments"
      :pending-count="pendingPublicationDocuments.length"
      :selected-project-id="selectedProjectId"
      :summary-items="summaryItems"
      :voided-count="voidedDocuments.length"
    />

    <div class="eds-process-shell">
      <section class="eds-panel-stack">
        <ProcurementDocumentCreatePanel
          v-model:selected-project-id="selectedProjectId"
          v-model:title="title"
          v-model:content-summary="contentSummary"
          :can-maintain-documents="canMaintainDocuments"
          :internal-projects="internalProjects"
          :selected-file-name="selectedFileName"
          @create-document="createDocument"
          @file-change="onFileChange"
        />

        <ProcurementDocumentTable
          :can-publish-document="canPublishDocument"
          :can-revise-document="canReviseDocument"
          :can-void-document="canVoidDocument"
          :documents="documents"
          :has-available-action="hasAvailableAction"
          :next-step-detail="nextStepDetail"
          :next-step-label="nextStepLabel"
          :next-step-tone="nextStepTone"
          :project-label="projectLabel"
          @publish-document="publishDocument"
          @revise-document="reviseDocument"
          @void-document="voidDocument"
        />
      </section>

      <aside class="eds-panel-stack">
        <EnterpriseSurface title="处理边界" description="把创建、发布、修订和停用的操作权留给采购经办与平台运营，其他角色默认只读。">
          <p class="eds-meta">当前项目：{{ projectLabel(selectedProjectId) }}</p>
          <p class="eds-meta">当前权限：{{ canMaintainDocuments ? "可维护采购文件版本" : "仅查看文件状态与版本进展" }}</p>
        </EnterpriseSurface>

        <AuditLogRef :audit-log-id="auditLogId" />
        <ErrorAlert v-if="error" :message="error" />
      </aside>
    </div>
  </section>
</template>
