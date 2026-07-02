<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { FeedbackMessage } from "../../components/base";
import SupplierActionPanel from "./SupplierActionPanel.vue";
import SupplierCardList from "./SupplierCardList.vue";
import SupplierDetailHeader from "./SupplierDetailHeader.vue";
import SupplierDetailTabs from "./SupplierDetailTabs.vue";
import SupplierGovernanceShell from "./SupplierGovernanceShell.vue";
import { useSupplierManagementPage } from "./useSupplierManagementPage";

const {
  accountLoading,
  actionMode,
  activeTab,
  auditLogId,
  basicPanelLabels,
  canEditOwnSupplier,
  canMaintainSupplier,
  currentReviewBlockReason,
  deactivateReason,
  deactivateSupplier,
  deleteQualification,
  deleteSealSample,
  error,
  formatDateTime,
  groupOnboardingPrompts,
  groupOnboardingStats,
  hasPassedQualificationReview,
  isAdmittedSupplier,
  isInactiveSupplier,
  isSupplierPortal,
  latestResetPassword,
  loadSupplierAccounts,
  onboardingPanelLabels,
  onboardingProductSummary,
  onboardingSiteSummary,
  onQualificationChange,
  openAction,
  openSupplierOnboardingPrompt,
  pageTitle,
  processRefreshKey,
  profileBusinessLicenseNo,
  profileBusinessScope,
  profileCategory,
  profileContactEmail,
  profileContactName,
  profileContactPhone,
  profileLegalRepresentative,
  profileName,
  profileQualificationFileName,
  profileRegion,
  profileRegisteredAddress,
  profileSocialCreditCode,
  profileStore,
  reactivateSupplier,
  recentCreatedSupplierId,
  resetSupplierPassword,
  reviewOpinion,
  reviewScore,
  reviewStatus,
  reviewType,
  reviewTypeLabels,
  samplesPanelLabels,
  saveProfile,
  searchText,
  sealSampleFileName,
  sealSampleName,
  sealSampleSpec,
  selectSupplier,
  selectTab,
  selectedSupplier,
  serviceRegionSummary,
  showActionPanel,
  showAdmissionProcess,
  showEmbeddedSupplierList,
  statusFilter,
  statusOptions,
  submitReview,
  submitSealSample,
  supplierAccounts,
  supplierAvailabilityLabel,
  supplierOnboardingAttachmentCount,
  supplierStats,
  supplierStatus,
  tabs,
  visibleSuppliers
} = useSupplierManagementPage();
</script>
<template>
  <SupplierGovernanceShell
    v-model:status-filter="statusFilter"
    v-model:search-text="searchText"
    :page-title="pageTitle"
    :is-supplier-portal="isSupplierPortal"
    :can-maintain-supplier="canMaintainSupplier"
    :supplier-stats="supplierStats"
    :status-options="statusOptions"
    :group-onboarding-prompts="groupOnboardingPrompts"
    :group-onboarding-stats="groupOnboardingStats"
    @open-onboarding-prompt="openSupplierOnboardingPrompt"
  />

  <section class="eds-responsive-grid" :class="{ 'eds-single-column': isSupplierPortal }">
    <SupplierCardList
      v-if="showEmbeddedSupplierList"
      :suppliers="visibleSuppliers"
      :selected-supplier-id="selectedSupplier?.id ?? ''"
      :recent-created-supplier-id="recentCreatedSupplierId"
      :supplier-status="supplierStatus"
      :supplier-availability-label="supplierAvailabilityLabel"
      :is-inactive-supplier="isInactiveSupplier"
      :is-admitted-supplier="isAdmittedSupplier"
      :onboarding-product-summary="onboardingProductSummary"
      :onboarding-site-summary="onboardingSiteSummary"
      @select="selectSupplier"
    />

    <div v-if="selectedSupplier" class="eds-section">
      <SupplierDetailHeader
        :supplier="selectedSupplier"
        :recent-created-supplier-id="recentCreatedSupplierId"
        :can-edit-own-supplier="canEditOwnSupplier"
        :can-maintain-supplier="canMaintainSupplier"
        :inactive="isInactiveSupplier(selectedSupplier)"
        :show-admission-process="showAdmissionProcess"
        :process-refresh-key="processRefreshKey"
        :supplier-status="supplierStatus"
        :service-region-summary="serviceRegionSummary"
        :format-date-time="formatDateTime"
        @open-action="openAction"
        @toggle-admission-process="showAdmissionProcess = !showAdmissionProcess"
      />

      <SupplierActionPanel
        v-if="showActionPanel"
        v-model:profile-name="profileName"
        v-model:profile-contact-name="profileContactName"
        v-model:profile-contact-phone="profileContactPhone"
        v-model:profile-contact-email="profileContactEmail"
        v-model:profile-social-credit-code="profileSocialCreditCode"
        v-model:profile-business-license-no="profileBusinessLicenseNo"
        v-model:profile-legal-representative="profileLegalRepresentative"
        v-model:profile-registered-address="profileRegisteredAddress"
        v-model:profile-business-scope="profileBusinessScope"
        v-model:profile-category="profileCategory"
        v-model:profile-region="profileRegion"
        v-model:profile-store="profileStore"
        v-model:profile-qualification-file-name="profileQualificationFileName"
        v-model:review-type="reviewType"
        v-model:review-status="reviewStatus"
        v-model:review-score="reviewScore"
        v-model:review-opinion="reviewOpinion"
        v-model:seal-sample-name="sealSampleName"
        v-model:seal-sample-spec="sealSampleSpec"
        v-model:seal-sample-file-name="sealSampleFileName"
        v-model:deactivate-reason="deactivateReason"
        :action-mode="actionMode"
        :selected-supplier="selectedSupplier"
        :is-supplier-portal="isSupplierPortal"
        :current-review-block-reason="currentReviewBlockReason"
        :attachment-count="supplierOnboardingAttachmentCount(selectedSupplier)"
        :qualification-review-passed="hasPassedQualificationReview(selectedSupplier)"
        :selected-supplier-status="supplierStatus(selectedSupplier)"
        @close="showActionPanel = false"
        @file-change="onQualificationChange"
        @save-profile="saveProfile"
        @submit-review="submitReview"
        @submit-seal-sample="submitSealSample"
        @deactivate-supplier="deactivateSupplier"
        @reactivate-supplier="reactivateSupplier"
      />

      <SupplierDetailTabs
        :supplier="selectedSupplier"
        :tabs="tabs"
        :active-tab="activeTab"
        :can-maintain-supplier="canMaintainSupplier"
        :can-edit-own-supplier="canEditOwnSupplier"
        :inactive="isInactiveSupplier(selectedSupplier)"
        :account-loading="accountLoading"
        :supplier-accounts="supplierAccounts"
        :latest-reset-password="latestResetPassword"
        :basic-panel-labels="basicPanelLabels"
        :onboarding-panel-labels="onboardingPanelLabels"
        :samples-panel-labels="samplesPanelLabels"
        :review-type-labels="reviewTypeLabels"
        :supplier-status="supplierStatus"
        :date-time="formatDateTime"
        @select-tab="selectTab"
        @refresh-accounts="loadSupplierAccounts"
        @reset-password="resetSupplierPassword"
        @add-qualification="openAction('profile')"
        @delete-qualification="deleteQualification"
        @upload-sample="openAction('sample')"
        @delete-sample="deleteSealSample"
      />
    </div>

    <FeedbackMessage v-else align="center">当前角色暂无可见供应商档案。</FeedbackMessage>
  </section>

  <AuditLogRef :audit-log-id="auditLogId" />
  <ErrorAlert v-if="error" :message="error" />
</template>


