<script setup lang="ts">
import FulfillmentArchiveAuditPanel from "./FulfillmentArchiveAuditPanel.vue";
import FulfillmentEvaluationPanel from "./FulfillmentEvaluationPanel.vue";
import FulfillmentOrderPanel from "./FulfillmentOrderPanel.vue";
import FulfillmentPageShell from "./FulfillmentPageShell.vue";
import FulfillmentReceiptPanel from "./FulfillmentReceiptPanel.vue";
import FulfillmentSettlementPanel from "./FulfillmentSettlementPanel.vue";
import { useProjectFulfillmentPage } from "./useProjectFulfillmentPage";

const {
  actionBusy,
  auditLogId,
  canConfirmOrder,
  canEvaluateSupplier,
  canGenerateOrder,
  canRecordReceipt,
  canUploadSettlement,
  canVerifySettlement,
  changeExpectedDeliveryAt,
  changeReceivingLocation,
  changeRemark,
  currency,
  errorMessage,
  evaluationDescription,
  evaluationOrderId,
  evaluationScore,
  formatDateTime,
  label,
  labelAuditAction,
  loading,
  materialAttachments,
  onSettlementFileChange,
  pageDescription,
  primeChangeForm,
  primeReceiptForm,
  projectId,
  projectStatusLabel,
  projectStatusTone,
  receiptAt,
  receiptExceptionType,
  receiptHandlingNote,
  receiptHandlingStatus,
  receiptItems,
  receiptSummary,
  receiptType,
  runChangeOrder,
  runCloseOrder,
  runConfirmOrder,
  runGenerateOrder,
  runHandleReceiptException,
  runRecordReceipt,
  settlementFileName,
  settlementFileSelected,
  settlementMaterialType,
  settlementOrderId,
  statusTone,
  submitSupplierEvaluation,
  summaryItems,
  supplierName,
  uploadSettlementMaterial,
  verifySettlementMaterial,
  workbench
} = useProjectFulfillmentPage();
</script>
<template>
  <section class="eds-section">
    <FulfillmentPageShell
      :project-id="projectId"
      :description="pageDescription"
      :status-label="projectStatusLabel"
      :status-tone="projectStatusTone"
      :loading="loading"
      :error-message="errorMessage"
      :audit-log-id="auditLogId"
      :has-workbench="Boolean(workbench)"
      :summary-items="summaryItems"
    >
      <template v-if="workbench" #primary>
        <FulfillmentOrderPanel
          v-model:receipt-items="receiptItems"
          v-model:receipt-summary="receiptSummary"
          v-model:receipt-type="receiptType"
          v-model:receipt-exception-type="receiptExceptionType"
          v-model:receipt-at="receiptAt"
          v-model:change-expected-delivery-at="changeExpectedDeliveryAt"
          v-model:change-receiving-location="changeReceivingLocation"
          v-model:change-remark="changeRemark"
          :orders="workbench.purchaseOrders"
          :can-generate-order="canGenerateOrder"
          :can-confirm-order="canConfirmOrder"
          :can-record-receipt="canRecordReceipt"
          :action-busy="actionBusy"
          :supplier-name="supplierName"
          :label="label"
          :status-tone="statusTone"
          :currency="currency"
          @generate-order="runGenerateOrder"
          @confirm-order="runConfirmOrder"
          @record-receipt="runRecordReceipt"
          @prime-receipt="primeReceiptForm"
          @prime-change="primeChangeForm"
          @change-order="runChangeOrder"
          @close-order="runCloseOrder"
        />
        <FulfillmentReceiptPanel
          v-model:handling-status="receiptHandlingStatus"
          v-model:handling-note="receiptHandlingNote"
          :receipts="workbench.receiptRecords"
          :orders="workbench.purchaseOrders"
          :can-handle-exception="canRecordReceipt"
          :action-busy="actionBusy"
          :label="label"
          :status-tone="statusTone"
          :format-date-time="formatDateTime"
          @handle-exception="runHandleReceiptException"
        />
        <FulfillmentSettlementPanel
          v-model:settlement-order-id="settlementOrderId"
          v-model:settlement-material-type="settlementMaterialType"
          :orders="workbench.purchaseOrders"
          :materials="workbench.settlementMaterials"
          :can-upload-settlement="canUploadSettlement"
          :can-verify-settlement="canVerifySettlement"
          :settlement-file-name="settlementFileName"
          :settlement-file-selected="settlementFileSelected"
          :action-busy="actionBusy"
          :material-attachments="materialAttachments"
          :label="label"
          :status-tone="statusTone"
          @file-change="onSettlementFileChange"
          @upload-settlement="uploadSettlementMaterial"
          @verify-settlement="verifySettlementMaterial"
        />
      </template>

      <template v-if="workbench" #secondary>
        <FulfillmentEvaluationPanel
          v-model:evaluation-order-id="evaluationOrderId"
          v-model:evaluation-score="evaluationScore"
          v-model:evaluation-description="evaluationDescription"
          :orders="workbench.purchaseOrders"
          :evaluations="workbench.supplierEvaluations"
          :can-evaluate-supplier="canEvaluateSupplier"
          :action-busy="actionBusy"
          :supplier-name="supplierName"
          :label="label"
          @submit-evaluation="submitSupplierEvaluation"
        />
        <FulfillmentArchiveAuditPanel
          :archive-items="workbench.archiveItems"
          :supplement-requests="workbench.archiveSupplementRequests"
          :audit-logs="workbench.auditLogs"
          :label="label"
          :status-tone="statusTone"
          :label-audit-action="labelAuditAction"
          :format-date-time="formatDateTime"
        />
      </template>
    </FulfillmentPageShell>
  </section>
</template>


