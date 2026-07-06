<script setup lang="ts">
import { ref } from "vue";
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

const selectedOrder = ref<MallOrder | null>(null);
const selectedAction = ref<"capture" | "release">("capture");

function openPayment(order: MallOrder, action: "capture" | "release") {
  selectedOrder.value = order;
  selectedAction.value = action;
}

function submitPayment() {
  if (!selectedOrder.value) return;
  if (selectedAction.value === "capture") emit("capturePayment", selectedOrder.value);
  if (selectedAction.value === "release") emit("releasePayment", selectedOrder.value);
  selectedOrder.value = null;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="待确认付款" :description="`共 ${payableOrders.length} 单。`">
    <DataTable :columns="PAYABLE_ORDER_COLUMNS" :rows="payableOrders" row-key="id" empty-text="暂无待处理付款。">
      <template #orderNo="{ row }">
        <strong>PAY-{{ row.id }}</strong>
        <small class="eds-meta">{{ row.orderNo }}</small>
      </template>
      <template #organization="{ row }">{{ orgName(row.orgId) }}</template>
      <template #paymentStatus="{ row }">
        <StatusTag :tone="row.paymentStatus === 'payment_reserved' ? 'warning' : 'default'">{{ labelStatus(row.paymentStatus ?? "pending_payment") }}</StatusTag>
      </template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canMaintainFunds && row.paymentStatus === 'payment_reserved'" type="primary" @click="openPayment(row, 'capture')">确认付款</EnterpriseButton>
          <EnterpriseButton v-if="canMaintainFunds && row.paymentStatus === 'payment_reserved'" @click="openPayment(row, 'release')">释放占用</EnterpriseButton>
          <span v-if="!canMaintainFunds" class="eds-meta">只读</span>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedOrder" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="付款确认">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedOrder = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>付款确认</h3>
        <button type="button" aria-label="关闭" @click="selectedOrder = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>付款编号：</span>PAY-{{ selectedOrder.id }}</p>
        <p><span>订单编号：</span>{{ selectedOrder.orderNo }}</p>
        <p><span>金额：</span>{{ money(selectedOrder.totalAmount) }}</p>
        <p><span>占用金额：</span>{{ money(selectedOrder.paymentReservedAmount) }}</p>
        <p><span>收款组织：</span>{{ orgName(selectedOrder.orgId) }}</p>
        <p><span>状态：</span>{{ labelStatus(selectedOrder.paymentStatus ?? "pending_payment") }}</p>
      </div>
      <footer>
        <EnterpriseButton @click="selectedOrder = null">取消</EnterpriseButton>
        <EnterpriseButton type="primary" @click="submitPayment">{{ selectedAction === "capture" ? "确认已付款" : "释放占用" }}</EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
