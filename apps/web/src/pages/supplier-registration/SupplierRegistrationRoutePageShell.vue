<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import SupplierRegistrationPageShell from "./SupplierRegistrationPageShell.vue";
import SupplierRegistrationSubmitPanel from "./SupplierRegistrationSubmitPanel.vue";
import SupplierRegistrationTable from "./SupplierRegistrationTable.vue";
import { useSupplierRegistrationPage } from "./useSupplierRegistrationPage";

const {
  announcementTitle,
  auditLogId,
  busy,
  canReviewRegistration,
  canSubmitRegistration,
  categoryMismatchMessage,
  emptyAnnouncementHint,
  error,
  formatDateTime,
  isSupplierView,
  materialName,
  onFileChange,
  onSupplementFileChange,
  pageHint,
  pageTitle,
  projectFilteredAnnouncements,
  projectFilteredRegistrations,
  projectLabel,
  registrationStatusLabel,
  registrationStatusTone,
  restrictedMessage,
  reviewRegistration,
  selectedAnnouncementId,
  submitRegistration,
  summaryItems,
  supplementName,
  supplierName
} = useSupplierRegistrationPage();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-supplier-page">
    <SupplierRegistrationPageShell
      :can-review-registration="canReviewRegistration"
      :is-supplier-view="isSupplierView"
      :page-hint="pageHint"
      :page-title="pageTitle"
      :summary-items="summaryItems"
    />

    <SupplierRegistrationSubmitPanel
      v-model:selected-announcement-id="selectedAnnouncementId"
      :announcements="projectFilteredAnnouncements"
      :busy="busy"
      :can-submit-registration="canSubmitRegistration"
      :category-mismatch-message="categoryMismatchMessage"
      :empty-announcement-hint="emptyAnnouncementHint"
      :is-supplier-view="isSupplierView"
      :material-name="materialName"
      :project-label="projectLabel"
      :restricted-message="restrictedMessage"
      :supplement-name="supplementName"
      @file-change="onFileChange"
      @submit-registration="submitRegistration"
      @supplement-file-change="onSupplementFileChange"
    />

    <p v-if="!isSupplierView && !canReviewRegistration" class="eds-meta">当前角色仅可查看报名记录。</p>

    <SupplierRegistrationTable
      :announcement-title="announcementTitle"
      :busy="busy"
      :can-review-registration="canReviewRegistration"
      :format-date-time="formatDateTime"
      :project-label="projectLabel"
      :registration-status-label="registrationStatusLabel"
      :registration-status-tone="registrationStatusTone"
      :registrations="projectFilteredRegistrations"
      :supplier-name="supplierName"
      @review-registration="reviewRegistration"
    />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

