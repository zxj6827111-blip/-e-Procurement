<script setup lang="ts">
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  FormSection,
  StatusTag,
  type DataTableColumn
} from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { MallOrder } from "./types";

defineProps<{
  recentOrders: MallOrder[];
  orderColumns: DataTableColumn[];
  selectedOrderProcessId: string;
  processRefreshKey: number;
  buyerVisible: boolean;
  money: (value: number | undefined) => string;
  orderSupplierName: (order: MallOrder) => string;
}>();

const orderForm = defineModel<{
  shippingAddress: string;
  invoiceTitle: string;
  expectedDeliveryAt: string;
  departmentId: string;
}>("orderForm", { required: true });

const copyOrderForm = defineModel<{
  shippingAddress: string;
  invoiceTitle: string;
  expectedDeliveryAt: string;
}>("copyOrderForm", { required: true });

const emit = defineEmits<{
  copyOrder: [orderId: string];
}>();
</script>

<template>
  <FormSection title="采购清单参数" description="酒店采购下单和复购时使用这些收货、发票和部门信息。">
    <label>
      下单收货地址
      <input v-model="orderForm.shippingAddress" />
    </label>
    <label>
      发票抬头
      <input v-model="orderForm.invoiceTitle" />
    </label>
    <label>
      期望到货日期
      <input v-model="orderForm.expectedDeliveryAt" type="date" />
    </label>
    <label>
      使用部门
      <input v-model="orderForm.departmentId" placeholder="可选" />
    </label>
    <label>
      复购收货地址
      <input v-model="copyOrderForm.shippingAddress" />
    </label>
    <label>
      复购发票抬头
      <input v-model="copyOrderForm.invoiceTitle" />
    </label>
    <label>
      复购期望到货
      <input v-model="copyOrderForm.expectedDeliveryAt" type="date" />
    </label>
  </FormSection>

  <EnterpriseSurface title="最近订单">
    <DataTable :columns="orderColumns" :rows="recentOrders" empty-text="暂无订单。">
      <template #supplier="{ row }">{{ orderSupplierName(row) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #amount="{ row }">{{ money(row.totalAmount) }}</template>
      <template #address="{ row }">{{ row.shippingAddress }}</template>
      <template #actions="{ row }">
        <EnterpriseButton v-if="buyerVisible" @click="emit('copyOrder', row.id)">复购</EnterpriseButton>
      </template>
    </DataTable>
    <ProcessTimeline
      v-if="selectedOrderProcessId"
      business-type="order_fulfillment"
      :business-id="selectedOrderProcessId"
      title="最近订单履约流程"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
