<script setup lang="ts">
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
</script>

<template>
  <EnterpriseSurface title="商品目录订单" :description="`${orders.length} 张订单`">
    <DataTable :columns="MALL_ORDER_COLUMNS" :rows="orders" empty-text="当前角色暂无可见商品订单。">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #line="{ row }">{{ firstMallLine(row) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #payment="{ row }">{{ labelStatus(row.paymentStatus ?? "pending") }}</template>
      <template #address="{ row }">{{ row.shippingAddress }}</template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canSupplierOperate && ['submitted', 'supplier_confirmed'].includes(row.status)" type="primary" @click="emit('ship', row)">登记发货</EnterpriseButton>
          <EnterpriseButton v-if="canBuyerOperate && row.status === 'shipped'" type="primary" @click="emit('receive', row)">确认收货</EnterpriseButton>
          <StatusTag v-if="!canBuyerOperate && !canSupplierOperate">只读</StatusTag>
        </div>
      </template>
    </DataTable>
    <PaginationBar :total="orders.length" />
  </EnterpriseSurface>
</template>
