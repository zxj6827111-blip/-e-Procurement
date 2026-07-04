<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { FeedbackMessage } from "../../components/base";
import AwardBuyerActions from "./AwardBuyerActions.vue";
import AwardGroupApprovalPanel from "./AwardGroupApprovalPanel.vue";
import AwardPageShell from "./AwardPageShell.vue";
import AwardPostApprovalActions from "./AwardPostApprovalActions.vue";
import AwardActivityRecordPanel from "./AwardActivityRecordPanel.vue";
import AwardRecommendationPanel from "./AwardRecommendationPanel.vue";
import AwardRecordTables from "./AwardRecordTables.vue";
import AwardSupplierResultSection from "./AwardSupplierResultSection.vue";
import { useAwardResultPage } from "./useAwardResultPage";

const {
  selectedProjectId,
  selectedSupplierId,
  projects,
  suppliers,
  nonLowestPriceReason,
  approvals,
  selectedApprovalId,
  notifications,
  publicityRecords,
  supplierResults,
  pricingReports,
  currentContract,
  currentContractRows,
  awardProducts,
  auditLogId,
  error,
  success,
  processRefreshKey,
  canPrepareAward,
  canApproveAward,
  isSupplierResultView,
  groupAwardProjects,
  projectHasApprovedAward,
  canStartContractSigning,
  canConfirmContract,
  hasListedAwardProducts,
  canAutoListAwardProducts,
  canCreateAwardApproval,
  canSubmitAwardApproval,
  canGeneratePricingReport,
  canSendResultNotification,
  canPublishInternalPublicity,
  groupApprovalOptions,
  selectedApprovalDisplay,
  canProcessSelectedAwardApproval,
  awardOperationForm,
  approvalOpinion,
  rejectionOpinion,
  recommendationRows,
  awardSummaryItems,
  supplierSummaryItems,
  supplierName,
  approvalLabel,
  createAwardApprovalDisabledText,
  submitAwardApprovalDisabledText,
  pricingReportButtonText,
  resultNotificationButtonText,
  internalPublicityButtonText,
  nextActionNotice,
  notificationSelected,
  notificationLabel,
  publicityLabel,
  reloadProject,
  createAwardApproval,
  submitAwardApproval,
  sendResultNotification,
  publishInternalPublicity,
  generatePricingReport,
  startContractSigning,
  confirmContract,
  autoListAwardProducts,
  processAwardApproval
} = useAwardResultPage();
</script>

<template>
  <section class="eds-section">
    <AwardPageShell
      v-model:selected-project-id="selectedProjectId"
      :is-supplier-result-view="isSupplierResultView"
      :project-has-approved-award="projectHasApprovedAward"
      :can-approve-award="canApproveAward"
      :projects="projects"
      :group-award-projects="groupAwardProjects"
      :summary-items="isSupplierResultView ? supplierSummaryItems : awardSummaryItems"
      @reload-project="reloadProject"
    />

    <AwardSupplierResultSection
      v-if="isSupplierResultView"
      :supplier-results="supplierResults"
      :current-contract="currentContract"
      :current-contract-rows="currentContractRows"
      :pricing-reports="pricingReports"
      :can-confirm-contract="canConfirmContract"
      :notification-selected="notificationSelected"
      :notification-label="notificationLabel"
      @confirm-contract="confirmContract"
    />

    <template v-else>
      <AwardRecommendationPanel :recommendation-rows="recommendationRows" :supplier-name="supplierName" />

      <AwardBuyerActions
        v-if="canPrepareAward"
        v-model:selected-supplier-id="selectedSupplierId"
        v-model:non-lowest-price-reason="nonLowestPriceReason"
        v-model:selected-approval-id="selectedApprovalId"
        v-model:award-operation-form="awardOperationForm"
        :suppliers="suppliers"
        :project-has-approved-award="projectHasApprovedAward"
        :can-create-award-approval="canCreateAwardApproval"
        :can-submit-award-approval="canSubmitAwardApproval"
        :can-generate-pricing-report="canGeneratePricingReport"
        :can-send-result-notification="canSendResultNotification"
        :can-publish-internal-publicity="canPublishInternalPublicity"
        :create-award-approval-disabled-text="createAwardApprovalDisabledText()"
        :submit-award-approval-disabled-text="submitAwardApprovalDisabledText()"
        :pricing-report-button-text="pricingReportButtonText()"
        :result-notification-button-text="resultNotificationButtonText()"
        :internal-publicity-button-text="internalPublicityButtonText()"
        :next-action-notice="nextActionNotice()"
        @create-award-approval="createAwardApproval"
        @submit-award-approval="submitAwardApproval"
        @generate-pricing-report="generatePricingReport"
        @send-result-notification="sendResultNotification"
        @publish-internal-publicity="publishInternalPublicity"
      >
        <template #approval-options>
          <option v-for="(approval, index) in approvals" :key="approval.id" :value="approval.id">{{ approvalLabel(approval, index) }}</option>
        </template>
      </AwardBuyerActions>

      <AwardPostApprovalActions
        v-if="canPrepareAward && projectHasApprovedAward"
        :current-contract="currentContract"
        :has-listed-award-products="hasListedAwardProducts"
        :can-start-contract-signing="canStartContractSigning"
        :can-auto-list-award-products="canAutoListAwardProducts"
        @start-contract-signing="startContractSigning"
        @auto-list-award-products="autoListAwardProducts"
      />

      <AwardGroupApprovalPanel
        v-if="canApproveAward"
        v-model:selected-project-id="selectedProjectId"
        v-model:approval-opinion="approvalOpinion"
        v-model:rejection-opinion="rejectionOpinion"
        :group-award-projects="groupAwardProjects"
        :selected-approval-display="selectedApprovalDisplay"
        :group-approval-count="groupApprovalOptions.length"
        :can-process-selected-award-approval="canProcessSelectedAwardApproval"
        @reload-project="reloadProject"
        @approve="processAwardApproval(true)"
        @reject="processAwardApproval(false)"
      />

      <AwardRecordTables
        :approvals="approvals"
        :pricing-reports="pricingReports"
        :award-products="awardProducts"
        :notifications="notifications"
        :supplier-results="supplierResults"
        :publicity-records="publicityRecords"
        :approval-label="approvalLabel"
        :supplier-name="supplierName"
        :notification-label="notificationLabel"
        :notification-selected="notificationSelected"
        :publicity-label="publicityLabel"
      />
    </template>

    <FeedbackMessage v-if="success" tone="success">{{ success }}</FeedbackMessage>
    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />

    <AwardActivityRecordPanel
      :is-supplier-result-view="isSupplierResultView"
      :selected-project-id="selectedProjectId"
      :selected-approval-id="selectedApprovalId"
      :process-refresh-key="processRefreshKey"
    />
  </section>
</template>

