<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import { invoiceColumns } from "./display";
import type { Invoice } from "./types";

defineProps<{
  invoices: Invoice[];
  canFinanceReview: boolean;
  supplierName: (supplierId?: string) => string;
  invoiceBillNo: (invoice: Invoice) => string;
  invoiceFileLabel: (invoice: Invoice) => string;
  money: (value: number | undefined) => string;
}>();

defineEmits<{
  review: [invoice: Invoice, approved: boolean];
}>();
</script>

<template>
  <EnterpriseSurface title="发票审核" description="发票与结算单关联后进入财务审核，状态和意见都在此处闭环。">
    <DataTable :columns="invoiceColumns" :rows="invoices" empty-mode="compact" empty-text="当前角色暂无可见发票。">
      <template #invoice="{ row }">{{ invoiceFileLabel(row) }}</template>
      <template #bill="{ row }">{{ invoiceBillNo(row) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #amount="{ row }">{{ money(row.amount) }}</template>
      <template #taxAmount="{ row }">{{ money(row.taxAmount) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #uploadedAt="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions eds-actions-table">
          <EnterpriseButton
            v-if="canFinanceReview && row.status === 'pending_verification' && row.settlementBillId"
            size="sm"
            type="primary"
            @click="$emit('review', row, true)"
          >
            审核通过
          </EnterpriseButton>
          <EnterpriseButton v-if="canFinanceReview && row.status === 'pending_verification' && row.settlementBillId" size="sm" type="text" @click="$emit('review', row, false)">
            驳回
          </EnterpriseButton>
          <StatusTag v-if="!canFinanceReview || !row.settlementBillId">只读</StatusTag>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
