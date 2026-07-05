<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface } from "../../components/base";
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

function evaluableOrders(orders: PurchaseOrder[]) {
  return orders.filter((item) => ["received", "closed"].includes(item.status));
}

function selectedOrderLabel(orders: PurchaseOrder[], orderId: string) {
  return orders.find((order) => order.id === orderId)?.orderNo ?? "未选择";
}
</script>

<template>
  <EnterpriseSurface title="履约评价" description="评价只在收货完成或订单关闭后提交，并沉淀为供应商履约记录。">
    <template #actions>
      <EnterpriseButton v-if="canEvaluateSupplier" type="primary" :disabled="!evaluationOrderId || Boolean(actionBusy)" @click="emit('submitEvaluation')">
        提交评价
      </EnterpriseButton>
    </template>

    <div v-if="canEvaluateSupplier" class="eds-page-section">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>可评价订单</span>
          <strong>{{ evaluableOrders(orders).length }} 单</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>当前订单</span>
          <strong>{{ selectedOrderLabel(orders, evaluationOrderId) }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>当前评分</span>
          <strong>{{ evaluationOrderId ? `${evaluationScore} 分` : "待选择" }}</strong>
        </article>
      </div>

      <div class="eds-form-section">
        <label>
          订单
          <select v-model="evaluationOrderId">
            <option v-for="order in evaluableOrders(orders)" :key="order.id" :value="order.id">
              {{ order.orderNo }}
            </option>
          </select>
        </label>
        <label>评分<input v-model.number="evaluationScore" type="number" min="0" max="100" /></label>
        <label>评价说明<input v-model="evaluationDescription" /></label>
      </div>

      <footer class="eds-submit-panel">
        <span class="eds-meta">建议直接写明收货、服务和结算配合情况，便于后续供应商复盘与复核。</span>
      </footer>
    </div>

    <DataTable
      :columns="EVALUATION_COLUMNS"
      :rows="evaluations"
      row-key="id"
      empty-mode="compact"
      empty-text="完成收货或关闭订单后，才会开始沉淀履约评价记录。"
    >
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #score="{ row }">{{ row.score }} / {{ label(row.status) }} / 版本 {{ row.versionNo }}</template>
      <template #dimensions="{ row }">{{ Object.entries(row.dimensions).map(([key, value]) => `${label(key)} ${value}`).join(" / ") }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
