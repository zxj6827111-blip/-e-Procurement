<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import TaskInboxSummary from "../../components/TaskInboxSummary.vue";
import ArchiveAuditLogsPanel from "./ArchiveAuditLogsPanel.vue";
import ArchiveAuditPageShell from "./ArchiveAuditPageShell.vue";
import ArchiveControlPanel from "./ArchiveControlPanel.vue";
import ArchiveItemsTable from "./ArchiveItemsTable.vue";
import ArchiveSupplementPanel from "./ArchiveSupplementPanel.vue";
import ArchiveSupplementTable from "./ArchiveSupplementTable.vue";
import { useArchiveAuditPage } from "./useArchiveAuditPage";

const {
  applySupplement,
  approveSupplementRequest,
  archiveItemLabel,
  archiveItems,
  auditLogId,
  canMaintainArchive,
  checkArchive,
  createArchiveSnapshot,
  createSupplementRequest,
  error,
  load,
  loading,
  onSupplementFileChange,
  processRefreshKey,
  projectAuditLogs,
  sealArchive,
  selectedArchiveItemId,
  selectedProjectId,
  selectedSupplementRequestId,
  sensitiveLogs,
  summaryItems,
  supplementFile,
  supplementFileName,
  supplementRequestLabel,
  supplementRequests
} = useArchiveAuditPage();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-archive-page">
    <ArchiveAuditPageShell :can-maintain-archive="canMaintainArchive" :loading="loading" :summary-items="summaryItems" />

    <TaskInboxSummary title="档案补档审批与消息" :business-types="['archive_supplement']" compact />

    <ActivityRecordPanel
      v-if="selectedProjectId"
      business-type="archive"
      :business-id="selectedProjectId"
      title="档案归集业务"
      :refresh-key="processRefreshKey"
    />

    <ArchiveControlPanel
      v-model:selected-project-id="selectedProjectId"
      :can-maintain-archive="canMaintainArchive"
      @check-archive="checkArchive"
      @create-archive-snapshot="createArchiveSnapshot"
      @load="load"
      @seal-archive="sealArchive"
    />

    <ArchiveSupplementPanel
      v-model:selected-archive-item-id="selectedArchiveItemId"
      v-model:selected-supplement-request-id="selectedSupplementRequestId"
      :archive-items="archiveItems"
      :can-maintain-archive="canMaintainArchive"
      :supplement-file="supplementFile"
      :supplement-file-name="supplementFileName"
      :supplement-request-label="supplementRequestLabel"
      :supplement-requests="supplementRequests"
      @apply-supplement="applySupplement"
      @approve-supplement-request="approveSupplementRequest"
      @create-supplement-request="createSupplementRequest"
      @file-change="onSupplementFileChange"
    />

    <ArchiveItemsTable :archive-items="archiveItems" />

    <ArchiveSupplementTable
      :archive-item-label="archiveItemLabel"
      :supplement-request-label="supplementRequestLabel"
      :supplement-requests="supplementRequests"
    />

    <ArchiveAuditLogsPanel :project-audit-logs="projectAuditLogs" :sensitive-logs="sensitiveLogs" />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

