<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
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
      :pending-count="pendingPublicationDocuments.length"
      :selected-project-id="selectedProjectId"
      :summary-items="summaryItems"
      :voided-count="voidedDocuments.length"
    />

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

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

