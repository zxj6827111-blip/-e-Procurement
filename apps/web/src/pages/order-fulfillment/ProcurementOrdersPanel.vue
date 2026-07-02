<script setup lang="ts">
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
</script>

<template>
  <EnterpriseSurface title="招采订单" :description="`${orders.length} 张订单`">
    <DataTable :columns="PROCUREMENT_ORDER_COLUMNS" :rows="orders" empty-text="当前角色暂无可见招采订单。">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #line="{ row }">{{ firstProcurementLine(row) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #delivery="{ row }">
        <strong>{{ row.expectedDeliveryAt || "-" }}</strong>
        <small class="eds-meta">{{ row.receivingLocation || "未填收货地点" }}</small>
      </template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canSupplierOperate && row.status === 'pending_confirmation'" type="primary" @click="emit('confirm', row)">确认订单</EnterpriseButton>
          <EnterpriseButton v-if="canBuyerOperate && ['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status)" type="primary" @click="emit('receive', row)">
            收货验收
          </EnterpriseButton>
          <EnterpriseButton v-if="canBuyerOperate && ['supplier_confirmed', 'performing', 'partially_received'].includes(row.status)" @click="emit('exception', row)">登记异常</EnterpriseButton>
          <StatusTag v-if="!canBuyerOperate && !canSupplierOperate">只读</StatusTag>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
