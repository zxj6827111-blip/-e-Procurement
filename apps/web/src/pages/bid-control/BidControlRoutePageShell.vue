<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import BidApprovalPanel from "./BidApprovalPanel.vue";
import BidControlPageShell from "./BidControlPageShell.vue";
import BidCutoffPanel from "./BidCutoffPanel.vue";
import BidProgressPanel from "./BidProgressPanel.vue";
import BidViewLogPanel from "./BidViewLogPanel.vue";
import { useBidControlPage } from "./useBidControlPage";

const {
  allowDownload,
  approvalLabel,
  approvals,
  approveSelectedApproval,
  auditLogId,
  bidProgressRows,
  canMaintainBidControl,
  createApproval,
  earlyCutoff,
  error,
  labelStatus,
  lockBids,
  logs,
  onProjectChange,
  processRefreshKey,
  projectProcessType,
  projects,
  selectedApprovalId,
  selectedProjectId,
  statusTone,
  submitApproval,
  summary,
  summaryItems,
  supplierName,
  suppliers,
  targetSupplierId,
  validateApproval,
  viewContent
} = useBidControlPage();
</script>

<template>
  <section class="eds-section">
    <BidControlPageShell :summary="summary" :summary-items="summaryItems" />

    <BidCutoffPanel
      v-model:selected-project-id="selectedProjectId"
      :projects="projects"
      :summary="summary"
      :can-maintain-bid-control="canMaintainBidControl"
      @project-change="onProjectChange"
      @early-cutoff="earlyCutoff"
      @lock-bids="lockBids"
    />

    <BidProgressPanel
      :selected-project-id="selectedProjectId"
      :rows="bidProgressRows"
      :process-refresh-key="processRefreshKey"
      :project-process-type="projectProcessType"
      :supplier-name="supplierName"
      :label-status="labelStatus"
      :status-tone="statusTone"
    />

    <BidApprovalPanel
      v-model:target-supplier-id="targetSupplierId"
      v-model:view-content="viewContent"
      v-model:allow-download="allowDownload"
      v-model:selected-approval-id="selectedApprovalId"
      :can-maintain-bid-control="canMaintainBidControl"
      :selected-project-id="selectedProjectId"
      :suppliers="suppliers"
      :approvals="approvals"
      :approval-label="approvalLabel"
      :supplier-name="supplierName"
      :status-tone="statusTone"
      @create-approval="createApproval"
      @submit-approval="submitApproval"
      @approve-selected-approval="approveSelectedApproval"
      @validate-approval="validateApproval"
    />

    <BidViewLogPanel :logs="logs" :supplier-name="supplierName" />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

