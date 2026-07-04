<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import FundAccountsPanel from "./FundAccountsPanel.vue";
import FundLedgerPanel from "./FundLedgerPanel.vue";
import FundOperationPanel from "./FundOperationPanel.vue";
import PayableOrdersPanel from "./PayableOrdersPanel.vue";
import PaymentStatusPageShell from "./PaymentStatusPageShell.vue";
import { usePaymentStatusPage } from "./usePaymentStatusPage";

const {
  accounts,
  allLedgerEntries,
  businessNote,
  canMaintainFunds,
  capturePayment,
  directionLabel,
  entryTypeLabel,
  error,
  fundOperationForm,
  loading,
  message,
  money,
  orderLabel,
  orgName,
  payableOrders,
  processRefreshKey,
  recharge,
  releasePayment,
  selectedPaymentBusinessId,
  summaryItems
} = usePaymentStatusPage();
</script>

<template>
  <section class="eds-section">
    <PaymentStatusPageShell :can-maintain-funds="canMaintainFunds" :loading="loading" :message="message" :summary-items="summaryItems" />

    <ActivityRecordPanel
      v-if="selectedPaymentBusinessId"
      business-type="payment"
      :business-id="selectedPaymentBusinessId"
      title="付款记录"
      :refresh-key="processRefreshKey"
    />

    <FundOperationPanel v-model:form="fundOperationForm" :can-maintain-funds="canMaintainFunds" />

    <FundAccountsPanel :accounts="accounts" :can-maintain-funds="canMaintainFunds" :money="money" :org-name="orgName" @recharge="recharge" />

    <PayableOrdersPanel
      :can-maintain-funds="canMaintainFunds"
      :money="money"
      :org-name="orgName"
      :payable-orders="payableOrders"
      @capture-payment="capturePayment"
      @release-payment="releasePayment"
    />

    <FundLedgerPanel
      :all-ledger-entries="allLedgerEntries"
      :business-note="businessNote"
      :direction-label="directionLabel"
      :entry-type-label="entryTypeLabel"
      :money="money"
      :order-label="orderLabel"
      :org-name="orgName"
    />

    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

