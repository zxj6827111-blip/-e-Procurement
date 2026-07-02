<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import AnnouncementActionPanel from "./AnnouncementActionPanel.vue";
import AnnouncementDraftForm from "./AnnouncementDraftForm.vue";
import AnnouncementListPanel from "./AnnouncementListPanel.vue";
import AnnouncementProjectDocumentPanel from "./AnnouncementProjectDocumentPanel.vue";
import AnnouncementsPageShell from "./AnnouncementsPageShell.vue";
import AnnouncementTimelinePanel from "./AnnouncementTimelinePanel.vue";
import InvitationListPanel from "./InvitationListPanel.vue";
import { useAnnouncementsInvitationsPage } from "./useAnnouncementsInvitationsPage";

const {
  announcementLabel,
  announcementPrerequisiteMessage,
  announcementStatus,
  auditLogId,
  busyAction,
  canCloseSelectedAnnouncement,
  canCreateAnnouncement,
  canDeleteSelectedAnnouncement,
  canMaintainSourcing,
  canPublishSelectedAnnouncement,
  canSendSelectedInvitations,
  closeAnnouncement,
  closeReason,
  createAnnouncement,
  deleteAnnouncement,
  deliveryWindow,
  displayedInvitations,
  documentLabel,
  eligibleSuppliers,
  error,
  formatDateTime,
  internalProjects,
  labelStatus,
  lockedDocuments,
  nextActionHint,
  onProjectChange,
  openingLocation,
  processRefreshKey,
  procurementMethod,
  projectAnnouncements,
  publishAnnouncement,
  quoteDeadlineAt,
  registrationDeadlineAt,
  scope,
  selectedAnnouncement,
  selectedAnnouncementId,
  selectedAnnouncementInvitations,
  selectedDocumentId,
  selectedProjectId,
  selectedProjectProcessType,
  selectedSupplierCount,
  selectedSupplierIds,
  sendInvitations,
  shouldShowCloseReason,
  statusTone,
  summaryItems,
  supplierName,
  title
} = useAnnouncementsInvitationsPage();
</script>
<template>
  <section class="eds-section">
    <AnnouncementsPageShell :selected-project-id="selectedProjectId" :locked-document-count="lockedDocuments.length" :summary-items="summaryItems" />

    <AnnouncementProjectDocumentPanel
      v-model:selected-project-id="selectedProjectId"
      v-model:selected-document-id="selectedDocumentId"
      :internal-projects="internalProjects"
      :locked-documents="lockedDocuments"
      :can-maintain-sourcing="canMaintainSourcing"
      :can-create-announcement="canCreateAnnouncement"
      :announcement-prerequisite-message="announcementPrerequisiteMessage"
      @project-change="onProjectChange"
    />

    <AnnouncementDraftForm
      v-model:title="title"
      v-model:procurement-method="procurementMethod"
      v-model:scope="scope"
      v-model:registration-deadline-at="registrationDeadlineAt"
      v-model:quote-deadline-at="quoteDeadlineAt"
      v-model:delivery-window="deliveryWindow"
      v-model:opening-location="openingLocation"
      :can-maintain-sourcing="canMaintainSourcing"
      :can-create-announcement="canCreateAnnouncement"
      :busy-action="busyAction"
      @create="createAnnouncement"
    />

    <AnnouncementActionPanel
      v-model:selected-announcement-id="selectedAnnouncementId"
      v-model:selected-supplier-ids="selectedSupplierIds"
      v-model:close-reason="closeReason"
      :announcements="projectAnnouncements"
      :selected-announcement="selectedAnnouncement"
      :selected-announcement-invitations="selectedAnnouncementInvitations"
      :eligible-suppliers="eligibleSuppliers"
      :can-maintain-sourcing="canMaintainSourcing"
      :can-publish-selected-announcement="canPublishSelectedAnnouncement"
      :can-send-selected-invitations="canSendSelectedInvitations"
      :can-delete-selected-announcement="canDeleteSelectedAnnouncement"
      :can-close-selected-announcement="canCloseSelectedAnnouncement"
      :should-show-close-reason="shouldShowCloseReason"
      :selected-supplier-count="selectedSupplierCount"
      :busy-action="busyAction"
      :next-action-hint="nextActionHint"
      :document-label="documentLabel"
      :label-status="labelStatus"
      @publish="publishAnnouncement"
      @invite="sendInvitations"
      @delete="deleteAnnouncement"
      @close="closeAnnouncement"
    />

    <AnnouncementListPanel
      :announcements="projectAnnouncements"
      :document-label="documentLabel"
      :label-status="labelStatus"
      :format-date-time="formatDateTime"
      :status-tone="statusTone"
      @select="(announcementId) => (selectedAnnouncementId = announcementId)"
    />

    <AnnouncementTimelinePanel :selected-project-id="selectedProjectId" :process-business-type="selectedProjectProcessType" :process-refresh-key="processRefreshKey" />

    <InvitationListPanel
      :invitations="displayedInvitations"
      :selected-announcement-exists="Boolean(selectedAnnouncement)"
      :announcement-label="announcementLabel"
      :announcement-status="announcementStatus"
      :supplier-name="supplierName"
      :label-status="labelStatus"
      :format-date-time="formatDateTime"
      :status-tone="statusTone"
    />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>


