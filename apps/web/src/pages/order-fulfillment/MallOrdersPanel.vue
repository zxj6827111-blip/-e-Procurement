<script setup lang="ts">
import { ref } from "vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { MALL_ORDER_COLUMNS } from "./constants";
import type { MallOrder } from "./types";

defineProps<{
  orders: MallOrder[];
  canBuyerOperate: boolean;
  canSupplierOperate: boolean;
  supplierName: (supplierId: string) => string;
  firstMallLine: (order: MallOrder) => string;
  labelStatus: (value: string) => string;
  money: (value: number | undefined) => string;
}>();

const emit = defineEmits<{
  ship: [order: MallOrder];
  receive: [order: MallOrder];
}>();

const selectedOrder = ref<MallOrder | null>(null);
const selectedAction = ref<"ship" | "receive">("receive");

function openOrderAction(order: MallOrder, action: "ship" | "receive") {
  selectedOrder.value = order;
  selectedAction.value = action;
}

function submitOrderAction() {
  if (!selectedOrder.value) return;
  if (selectedAction.value === "ship") emit("ship", selectedOrder.value);
  if (selectedAction.value === "receive") emit("receive", selectedOrder.value);
  selectedOrder.value = null;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="商城订单履约" :description="`${orders.length} 张订单`">
    <DataTable :columns="MALL_ORDER_COLUMNS" :rows="orders" empty-text="当前角色暂无可见商城订单。">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #line="{ row }">{{ firstMallLine(row) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canSupplierOperate && ['submitted', 'supplier_confirmed'].includes(row.status)" type="primary" @click="openOrderAction(row, 'ship')">登记发货</EnterpriseButton>
          <EnterpriseButton v-if="canBuyerOperate && row.status === 'shipped'" type="primary" @click="openOrderAction(row, 'receive')">确认收货</EnterpriseButton>
          <StatusTag v-if="!canBuyerOperate && !canSupplierOperate">只读</StatusTag>
        </div>
      </template>
    </DataTable>
    <PaginationBar :total="orders.length" />
  </EnterpriseSurface>

  <div v-if="selectedOrder" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="商城订单履约">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedOrder = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>{{ selectedAction === "ship" ? "登记发货" : "确认收货" }}：{{ selectedOrder.orderNo }}</h3>
        <button type="button" aria-label="关闭" @click="selectedOrder = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>供应商：</span>{{ supplierName(selectedOrder.supplierId) }}</p>
        <p><span>商品：</span>{{ firstMallLine(selectedOrder) }}</p>
        <p><span>订单金额：</span>{{ money(selectedOrder.totalAmount) }}</p>
        <p><span>当前状态：</span>{{ labelStatus(selectedOrder.status) }}</p>
        <p><span>收货地点：</span>{{ selectedOrder.shippingAddress }}</p>
      </div>
      <footer>
        <EnterpriseButton @click="selectedOrder = null">取消</EnterpriseButton>
        <EnterpriseButton type="primary" @click="submitOrderAction">{{ selectedAction === "ship" ? "确认发货" : "确认收货" }}</EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
