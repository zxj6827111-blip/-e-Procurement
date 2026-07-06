<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { billColumns } from "./display";
import type { SettlementBill } from "./types";

defineProps<{
  bills: SettlementBill[];
  canSupplierUpload: boolean;
  canFinanceReview: boolean;
  supplierName: (supplierId?: string) => string;
  money: (value: number | undefined) => string;
}>();

defineEmits<{
  submit: [bill: SettlementBill];
  "create-material": [bill: SettlementBill];
  review: [bill: SettlementBill, approved: boolean];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="结算单处理台账" description="先判断结算单状态，再决定是补资料、提交审核还是进入财务复核。">
    <DataTable :columns="billColumns" :rows="bills" empty-mode="compact" empty-text="当前角色暂无可见结算单。">
      <template #billNo="{ row }">
        <strong>{{ row.billNo }}</strong>
        <small class="eds-meta">{{ row.period || "-" }}</small>
      </template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #orderAmount="{ row }">{{ money(row.orderAmount) }}</template>
      <template #deductions="{ row }">{{ money(row.returnAmount + row.serviceFee) }}</template>
      <template #settlementAmount="{ row }">{{ money(row.settlementAmount) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #actions="{ row }">
        <div class="eds-actions eds-actions-table">
          <EnterpriseButton v-if="canSupplierUpload && row.status === 'draft'" size="sm" type="primary" @click="$emit('submit', row)">提交审核</EnterpriseButton>
          <EnterpriseButton v-if="canSupplierUpload" size="sm" type="text" @click="$emit('create-material', row)">补充资料</EnterpriseButton>
          <EnterpriseButton v-if="canFinanceReview && ['submitted', 'payable'].includes(row.status)" size="sm" type="primary" @click="$emit('review', row, true)">审核通过</EnterpriseButton>
          <EnterpriseButton v-if="canFinanceReview && row.status === 'submitted'" size="sm" type="text" @click="$emit('review', row, false)">驳回</EnterpriseButton>
          <StatusTag v-if="!canSupplierUpload && !canFinanceReview">只读</StatusTag>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
