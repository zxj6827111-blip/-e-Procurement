<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { RECEIPT_COLUMNS } from "./constants";
import type { PurchaseOrder, ReceiptRecord, StatusTone } from "./types";

defineProps<{
  receipts: ReceiptRecord[];
  orders: PurchaseOrder[];
  canHandleException: boolean;
  actionBusy: string;
  handlingStatus: string;
  handlingNote: string;
  label: (value: string | undefined | null) => string;
  statusTone: (value: string | undefined | null) => StatusTone;
  formatDateTime: (value?: string | null) => string;
}>();

const handlingStatus = defineModel<string>("handlingStatus", { required: true });
const handlingNote = defineModel<string>("handlingNote", { required: true });

const emit = defineEmits<{
  handleException: [receiptId: string];
}>();

function orderNo(orders: PurchaseOrder[], orderId: string) {
  return orders.find((order) => order.id === orderId)?.orderNo ?? orderId;
}

function receiptItems(row: ReceiptRecord) {
  if (!row.receivedItems?.length) return "-";
  return row.receivedItems.map((item) => `${item.itemName} ${item.receivedQuantity}${item.unit}${item.accepted ? "" : " 未通过"}`).join(" / ");
}
</script>

<template>
  <EnterpriseSurface title="收货记录与异常处置" description="异常收货不再单独跳页处理，直接在收货台账内补充说明并完成闭环。">
    <div v-if="canHandleException" class="eds-page-section">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>当前处理状态</span>
          <strong>{{ label(handlingStatus) }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>处理说明</span>
          <strong>{{ handlingNote || "待补充说明" }}</strong>
        </article>
      </div>

      <div class="eds-form-section">
        <label>
          处理状态
          <select v-model="handlingStatus">
            <option value="supplemented">补充处理</option>
            <option value="rejected">驳回继续处理</option>
            <option value="closed">关闭异常</option>
            <option value="pending_resolution">保持待处理</option>
          </select>
        </label>
        <label>
          处理说明
          <input v-model="handlingNote" />
        </label>
      </div>

      <footer class="eds-submit-panel">
        <span class="eds-meta">仅异常收货记录可处理，非异常记录保持只读。</span>
      </footer>
    </div>

    <DataTable
      :columns="RECEIPT_COLUMNS"
      :rows="receipts"
      row-key="id"
      empty-mode="compact"
      empty-text="订单确认并产生收货动作后，这里会形成收货与异常处理记录。"
    >
      <template #order="{ row }">{{ orderNo(orders, row.purchaseOrderId) }}</template>
      <template #type="{ row }">{{ label(row.receiptType) }} / {{ label(row.exceptionType) }}</template>
      <template #items="{ row }">{{ receiptItems(row) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.handlingStatus)">{{ label(row.handlingStatus) }}</StatusTag>
        <p v-if="row.handlingNote" class="eds-meta">{{ row.handlingNote }}</p>
        <div v-if="canHandleException && row.receiptType === 'exception'" class="eds-actions eds-actions-table">
          <EnterpriseButton size="sm" type="accent" :disabled="Boolean(actionBusy)" @click="emit('handleException', row.id)">提交处理</EnterpriseButton>
        </div>
      </template>
      <template #createdAt="{ row }">{{ formatDateTime(row.receiptAt || row.createdAt) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
