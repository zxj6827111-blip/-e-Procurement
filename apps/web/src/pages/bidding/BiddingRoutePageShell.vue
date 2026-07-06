<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import BiddingActionPanel from "./BiddingActionPanel.vue";
import BiddingBusinessDialog from "./BiddingBusinessDialog.vue";
import BiddingDraftPanel from "./BiddingDraftPanel.vue";
import BiddingListPanel from "./BiddingListPanel.vue";
import BiddingPageShell from "./BiddingPageShell.vue";
import BiddingActivityRecordPanel from "./BiddingActivityRecordPanel.vue";
import { useBiddingPage } from "./useBiddingPage";

const {
  amount,
  auditLogId,
  bidLabel,
  bids,
  bidStatusTone,
  businessDialog,
  closeBusinessDialog,
  deliveryDays,
  emptyProjectHint,
  error,
  goRegistration,
  labelStatus,
  onFileChange,
  onProjectChange,
  processRefreshKey,
  projectLabel,
  projectProcessType,
  projects,
  responseFileName,
  responseSummary,
  resubmitBid,
  saveDraft,
  selectedBid,
  selectedBidId,
  selectedProject,
  selectedProjectId,
  serviceCommitment,
  submitBid,
  summaryItems,
  supplierName,
  taxInclusive,
  taxNote,
  taxRate,
  updateDraft,
  withdrawBid
} = useBiddingPage();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-bidding-page">
    <BiddingPageShell :selected-project="selectedProject" :selected-project-id="selectedProjectId" :summary-items="summaryItems" />

    <div class="eds-template-c-quotation-shell g-hotel-quote-response">
      <section class="eds-quotation-requirement-band g-hotel-quote-requirement">
        <BiddingListPanel
          :bids="bids"
          :project-label="projectLabel"
          :supplier-name="supplierName"
          :label-status="labelStatus"
          :bid-status-tone="bidStatusTone"
        />

        <BiddingActivityRecordPanel
          :selected-project-id="selectedProjectId"
          :process-refresh-key="processRefreshKey"
          :project-process-type="projectProcessType"
        />
      </section>

      <section class="eds-quotation-submit-band g-hotel-quote-submit">
        <BiddingDraftPanel
          v-model:selected-project-id="selectedProjectId"
          v-model:amount="amount"
          v-model:tax-rate="taxRate"
          v-model:delivery-days="deliveryDays"
          v-model:tax-note="taxNote"
          v-model:response-summary="responseSummary"
          v-model:service-commitment="serviceCommitment"
          v-model:tax-inclusive="taxInclusive"
          :projects="projects"
          :response-file-name="responseFileName"
          :empty-project-hint="emptyProjectHint"
          @project-change="onProjectChange"
          @file-change="onFileChange"
          @save-draft="saveDraft"
        />

        <BiddingActionPanel
          v-model:selected-bid-id="selectedBidId"
          :bids="bids"
          :selected-bid="selectedBid"
          :bid-label="bidLabel"
          :label-status="labelStatus"
          @update-draft="updateDraft"
          @submit-bid="submitBid"
          @withdraw-bid="withdrawBid"
          @resubmit-bid="resubmitBid"
        />
      </section>
    </div>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
    <BiddingBusinessDialog :message="businessDialog" @close="closeBusinessDialog" @go-registration="goRegistration" />
  </section>
</template>

