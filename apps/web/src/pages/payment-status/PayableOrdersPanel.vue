<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { PAYABLE_ORDER_COLUMNS } from "./display";
import { labelStatus } from "../../utils/status-labels";
import type { MallOrder } from "./types";

defineProps<{
  canMaintainFunds: boolean;
  money: (value?: number) => string;
  orgName: (orgId: string) => string;
  payableOrders: MallOrder[];
}>();

const emit = defineEmits<{
  capturePayment: [order: MallOrder];
  releasePayment: [order: MallOrder];
}>();
</script>

<template>
  <EnterpriseSurface title="待处理付款" :description="`共 ${payableOrders.length} 单。`">
    <DataTable :columns="PAYABLE_ORDER_COLUMNS" :rows="payableOrders" row-key="id" empty-text="暂无待处理付款。">
      <template #organization="{ row }">{{ orgName(row.orgId) }}</template>
      <template #orderStatus="{ row }">
        <StatusTag tone="warning">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #paymentStatus="{ row }">
        <StatusTag :tone="row.paymentStatus === 'payment_reserved' ? 'warning' : 'default'">{{ labelStatus(row.paymentStatus ?? "pending_payment") }}</StatusTag>
      </template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #reservedAmount="{ row }">{{ money(row.paymentReservedAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canMaintainFunds && row.paymentStatus === 'payment_reserved'" type="primary" @click="emit('capturePayment', row)">确认付款</EnterpriseButton>
          <EnterpriseButton v-if="canMaintainFunds && row.paymentStatus === 'payment_reserved'" @click="emit('releasePayment', row)">释放占用</EnterpriseButton>
          <span v-if="!canMaintainFunds" class="eds-meta">只读</span>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
