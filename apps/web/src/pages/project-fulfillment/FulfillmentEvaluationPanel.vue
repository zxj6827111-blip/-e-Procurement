<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, FormSection, SubmitPanel } from "../../components/base";
import { EVALUATION_COLUMNS } from "./constants";
import type { PurchaseOrder, SupplierEvaluation } from "./types";

defineProps<{
  orders: PurchaseOrder[];
  evaluations: SupplierEvaluation[];
  canEvaluateSupplier: boolean;
  actionBusy: string;
  supplierName: (supplierId: string) => string;
  label: (value: string | undefined | null) => string;
}>();

const evaluationOrderId = defineModel<string>("evaluationOrderId", { required: true });
const evaluationScore = defineModel<number>("evaluationScore", { required: true });
const evaluationDescription = defineModel<string>("evaluationDescription", { required: true });

const emit = defineEmits<{
  submitEvaluation: [];
}>();
</script>

<template>
  <FormSection v-if="canEvaluateSupplier" title="履约评价" description="采购经办对已收货或已关闭订单提交供应商履约评价。">
    <label>
      订单
      <select v-model="evaluationOrderId">
        <option v-for="order in orders.filter((item) => ['received', 'closed'].includes(item.status))" :key="order.id" :value="order.id">
          {{ order.orderNo }}
        </option>
      </select>
    </label>
    <label>评分<input v-model.number="evaluationScore" type="number" min="0" max="100" /></label>
    <label>评价说明<input v-model="evaluationDescription" /></label>
  </FormSection>
  <SubmitPanel v-if="canEvaluateSupplier">
    <EnterpriseButton type="primary" :disabled="!evaluationOrderId || Boolean(actionBusy)" @click="emit('submitEvaluation')">提交评价</EnterpriseButton>
  </SubmitPanel>

  <EnterpriseSurface title="供应商评价记录">
    <DataTable :columns="EVALUATION_COLUMNS" :rows="evaluations" row-key="id" empty-text="暂无履约评价">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #score="{ row }">{{ row.score }} / {{ label(row.status) }} / 版本 {{ row.versionNo }}</template>
      <template #dimensions="{ row }">{{ Object.entries(row.dimensions).map(([key, value]) => `${label(key)} ${value}`).join(" / ") }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
