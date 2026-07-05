<script setup lang="ts">
import SourcingAwardPanel from "./SourcingAwardPanel.vue";
import SourcingDemandPanel from "./SourcingDemandPanel.vue";
import SourcingNextStepPanel from "./SourcingNextStepPanel.vue";
import SourcingPageShell from "./SourcingPageShell.vue";
import SourcingQuotePanel from "./SourcingQuotePanel.vue";
import SourcingRequirementsPanel from "./SourcingRequirementsPanel.vue";
import SourcingScoringPanel from "./SourcingScoringPanel.vue";
import SourcingStepPanel from "./SourcingStepPanel.vue";
import SourcingSupplierPanel from "./SourcingSupplierPanel.vue";
import { useProjectSourcingPage } from "./useProjectSourcingPage";

const {
  bidAttachmentRows,
  canReadBidBody,
  comparisonRows,
  currency,
  demandSummary,
  errorMessage,
  formatDateTime,
  label,
  latestAwardApproval,
  latestPricingReport,
  latestReviewReport,
  loading,
  pageDescription,
  projectId,
  projectStatusText,
  quoteRows,
  scoringSummary,
  sentNotificationCount,
  sourcingSteps,
  statusTone,
  stepTone,
  summaryItems,
  supplierEngagementRows,
  supplierName,
  workbench
} = useProjectSourcingPage();
</script>
<template>
  <section class="eds-section">
    <SourcingPageShell
      :project-id="projectId"
      :project-status-text="projectStatusText"
      :loading="loading"
      :error-message="errorMessage"
      :has-workbench="Boolean(workbench)"
      :description="pageDescription"
      :summary-items="summaryItems"
    >
      <template v-if="workbench" #primary>
        <SourcingDemandPanel v-if="workbench.procurementRequest" :request="workbench.procurementRequest" :demand-summary="demandSummary" :currency="currency" />
        <SourcingSupplierPanel
          :rows="supplierEngagementRows"
          :can-read-bid-body="canReadBidBody"
          :status-tone="statusTone"
          :label="label"
          :format-date-time="formatDateTime"
          :currency="currency"
        />
        <SourcingQuotePanel :can-read-bid-body="canReadBidBody" :quote-rows="quoteRows" :currency="currency" />
        <SourcingRequirementsPanel
          :project="workbench.project"
          :bid-attachment-rows="bidAttachmentRows"
          :can-read-bid-body="canReadBidBody"
          :status-tone="statusTone"
          :label="label"
          :currency="currency"
        />
      </template>

      <template v-if="workbench" #secondary>
        <SourcingStepPanel :steps="sourcingSteps" :step-tone="stepTone" />
        <SourcingScoringPanel
          :scoring-summary="scoringSummary"
          :latest-review-report="latestReviewReport"
          :sheets="workbench.scoringSheets ?? []"
          :supplier-name="supplierName"
          :status-tone="statusTone"
          :label="label"
          :format-date-time="formatDateTime"
        />
        <SourcingAwardPanel
          :comparison-rows="comparisonRows"
          :comparison-report="workbench.comparisonReport"
          :latest-award-approval="latestAwardApproval"
          :latest-pricing-report="latestPricingReport"
          :sent-notification-count="sentNotificationCount"
          :supplier-name="supplierName"
          :label="label"
          :currency="currency"
        />
        <SourcingNextStepPanel :project-id="projectId" />
      </template>
    </SourcingPageShell>
  </section>
</template>


