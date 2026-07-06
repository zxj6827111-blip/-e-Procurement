<script setup lang="ts">
import { ref } from "vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { PROCUREMENT_ORDER_COLUMNS } from "./constants";
import type { ProcurementOrderRow } from "./types";

defineProps<{
  orders: ProcurementOrderRow[];
  canBuyerOperate: boolean;
  canSupplierOperate: boolean;
  supplierName: (supplierId: string) => string;
  firstProcurementLine: (order: ProcurementOrderRow) => string;
  labelStatus: (value: string) => string;
  money: (value: number | undefined) => string;
}>();

const emit = defineEmits<{
  confirm: [order: ProcurementOrderRow];
  receive: [order: ProcurementOrderRow];
  exception: [order: ProcurementOrderRow];
}>();

const selectedOrder = ref<ProcurementOrderRow | null>(null);
const selectedAction = ref<"confirm" | "receive" | "exception">("receive");

function openOrderAction(order: ProcurementOrderRow, action: "confirm" | "receive" | "exception") {
  selectedOrder.value = order;
  selectedAction.value = action;
}

function submitOrderAction() {
  if (!selectedOrder.value) return;
  if (selectedAction.value === "confirm") emit("confirm", selectedOrder.value);
  if (selectedAction.value === "receive") emit("receive", selectedOrder.value);
  if (selectedAction.value === "exception") emit("exception", selectedOrder.value);
  selectedOrder.value = null;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="招采订单履约" :description="`${orders.length} 张订单`">
    <DataTable :columns="PROCUREMENT_ORDER_COLUMNS" :rows="orders" empty-text="当前角色暂无可见招采订单。">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #line="{ row }">{{ firstProcurementLine(row) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canSupplierOperate && row.status === 'pending_confirmation'" type="primary" @click="openOrderAction(row, 'confirm')">确认订单</EnterpriseButton>
          <EnterpriseButton v-if="canBuyerOperate && ['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status)" type="primary" @click="openOrderAction(row, 'receive')">
            订单验收
          </EnterpriseButton>
          <EnterpriseButton v-if="canBuyerOperate && ['supplier_confirmed', 'performing', 'partially_received'].includes(row.status)" @click="openOrderAction(row, 'exception')">登记异常</EnterpriseButton>
          <StatusTag v-if="!canBuyerOperate && !canSupplierOperate">只读</StatusTag>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedOrder" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="订单验收">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedOrder = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>订单验收：{{ selectedOrder.orderNo }}</h3>
        <button type="button" aria-label="关闭" @click="selectedOrder = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>供应商：</span>{{ supplierName(selectedOrder.supplierId) }}</p>
        <p><span>项目：</span>{{ selectedOrder.projectName }}</p>
        <p><span>订单金额：</span>{{ money(selectedOrder.totalAmount) }}</p>
        <p><span>当前状态：</span>{{ labelStatus(selectedOrder.status) }}</p>
        <p><span>收货地点：</span>{{ selectedOrder.receivingLocation || "未填写收货地点" }}</p>
      </div>
      <footer>
        <EnterpriseButton @click="selectedOrder = null">取消</EnterpriseButton>
        <EnterpriseButton type="primary" @click="submitOrderAction">
          {{ selectedAction === "confirm" ? "确认订单" : selectedAction === "exception" ? "登记异常" : "确认验收" }}
        </EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
