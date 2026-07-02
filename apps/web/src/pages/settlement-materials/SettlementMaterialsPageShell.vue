<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../../api/http";
import { useSessionStore } from "../../stores/session";
import {
  canFinanceReview as canFinanceReviewRole,
  canSupplierUpload as canSupplierUploadRole,
  createOverview,
  createSettlementOperationForm,
  invoiceBillNo as resolveInvoiceBillNo,
  invoiceFileLabel as resolveInvoiceFileLabel,
  materialFileLabel as resolveMaterialFileLabel,
  materialTypeLabel,
  money,
  orderLabel as resolveOrderLabel,
  settlementSummaryItems,
  supplierName as resolveSupplierName
} from "./display";
import SettlementBillsTable from "./SettlementBillsTable.vue";
import SettlementInvoicesTable from "./SettlementInvoicesTable.vue";
import SettlementMaterialsTable from "./SettlementMaterialsTable.vue";
import SettlementOperationPanel from "./SettlementOperationPanel.vue";
import SettlementPageShell from "./SettlementPageShell.vue";
import SettlementReconciliationTable from "./SettlementReconciliationTable.vue";
import type { Invoice, Overview, SettlementBill, SettlementMaterial, SupplierRow } from "./types";

const session = useSessionStore();
const suppliers = ref<SupplierRow[]>([]);
const overview = ref<Overview>(createOverview());
const loading = ref(false);
const error = ref("");
const message = ref("");
const processRefreshKey = ref(0);
const settlementOperationForm = ref(createSettlementOperationForm());

const supplierNames = computed(() => new Map(suppliers.value.map((item) => [item.id, item.name])));
const canFinanceReview = computed(() => canFinanceReviewRole(session.roleId));
const canSupplierUpload = computed(() => canSupplierUploadRole(session.roleId));
const selectedSettlementBillId = computed(() => overview.value.settlementBills[0]?.id ?? "");
const selectedInvoiceId = computed(() => overview.value.invoices[0]?.id ?? "");
const summaryItems = computed(() => settlementSummaryItems(overview.value));

function supplierName(supplierId?: string) {
  return resolveSupplierName(supplierId, supplierNames.value);
}

function orderLabel(orderId?: string) {
  return resolveOrderLabel(orderId, overview.value.settlementBills);
}

function invoiceBillNo(invoice: Invoice) {
  return resolveInvoiceBillNo(invoice, overview.value.settlementBills);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [supplierData, overviewData] = await Promise.all([
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })),
      apiGet<Overview>("/api/settlement-finance/overview").catch(() => createOverview())
    ]);
    suppliers.value = supplierData.suppliers;
    overview.value = overviewData;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "结算数据加载失败";
  } finally {
    loading.value = false;
  }
}

async function run(action: () => Promise<unknown>, successText: string) {
  error.value = "";
  message.value = "";
  try {
    await action();
    message.value = successText;
    await load();
    processRefreshKey.value += 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function submitBill(bill: SettlementBill) {
  return run(() => apiPost(`/api/settlement-finance/settlement-bills/${bill.id}/submit`), "结算单已提交审核");
}

function reviewBill(bill: SettlementBill, approved: boolean) {
  return run(
    () =>
      apiPost(`/api/settlement-finance/settlement-bills/${bill.id}/review`, {
        approved,
        opinion: approved ? settlementOperationForm.value.billApproveOpinion : settlementOperationForm.value.billRejectOpinion
      }),
    approved ? "结算单已审核通过" : "结算单已驳回"
  );
}

function reviewMaterial(material: SettlementMaterial, approved: boolean) {
  return run(
    () =>
      apiPost(`/api/settlement-finance/materials/${material.id}/review`, {
        approved,
        opinion: approved ? settlementOperationForm.value.materialApproveOpinion : settlementOperationForm.value.materialRejectOpinion
      }),
    approved ? "结算资料已核验" : "结算资料已驳回"
  );
}

function createMaterial(bill: SettlementBill) {
  return run(
    () =>
      apiPost(`/api/settlement-finance/settlement-bills/${bill.id}/materials`, {
        materialType: settlementOperationForm.value.materialType,
        fileName: settlementOperationForm.value.materialFileName || `${bill.billNo}-${materialTypeLabel(settlementOperationForm.value.materialType)}.pdf`
      }),
    "结算资料已补充"
  );
}

function reviewInvoice(invoice: Invoice, approved: boolean) {
  if (!invoice.settlementBillId) return Promise.resolve();
  return run(
    () =>
      apiPost(`/api/settlement-finance/invoices/${invoice.id}/review`, {
        approved,
        opinion: approved ? settlementOperationForm.value.invoiceApproveOpinion : settlementOperationForm.value.invoiceRejectOpinion
      }),
    approved ? "发票已审核通过" : "发票已驳回"
  );
}

onMounted(load);
</script>

<template>
  <SettlementPageShell
    :loading="loading"
    :message="message"
    :error="error"
    :selected-settlement-bill-id="selectedSettlementBillId"
    :selected-invoice-id="selectedInvoiceId"
    :process-refresh-key="processRefreshKey"
    :summary-items="summaryItems"
  >
    <SettlementOperationPanel v-model="settlementOperationForm" />

    <SettlementBillsTable
      :bills="overview.settlementBills"
      :can-supplier-upload="canSupplierUpload"
      :can-finance-review="canFinanceReview"
      :supplier-name="supplierName"
      :money="money"
      @submit="submitBill"
      @create-material="createMaterial"
      @review="reviewBill"
    />

    <SettlementMaterialsTable
      :materials="overview.settlementMaterials"
      :can-finance-review="canFinanceReview"
      :supplier-name="supplierName"
      :order-label="orderLabel"
      :material-type-label="materialTypeLabel"
      :material-file-label="resolveMaterialFileLabel"
      @review="reviewMaterial"
    />

    <SettlementInvoicesTable
      :invoices="overview.invoices"
      :can-finance-review="canFinanceReview"
      :supplier-name="supplierName"
      :invoice-bill-no="invoiceBillNo"
      :invoice-file-label="resolveInvoiceFileLabel"
      :money="money"
      @review="reviewInvoice"
    />

    <SettlementReconciliationTable :rows="overview.reconciliationLines" :supplier-name="supplierName" :money="money" />
  </SettlementPageShell>
</template>

