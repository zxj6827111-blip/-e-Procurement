<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { ORDER_COLUMNS } from "./constants";
import type { PurchaseOrder, StatusTone } from "./types";

defineProps<{
  orders: PurchaseOrder[];
  canGenerateOrder: boolean;
  canConfirmOrder: boolean;
  canRecordReceipt: boolean;
  actionBusy: string;
  supplierName: (supplierId: string) => string;
  label: (value: string | undefined | null) => string;
  statusTone: (value: string | undefined | null) => StatusTone;
  currency: (value: number | undefined) => string;
  receiptItems: string;
  receiptSummary: string;
  receiptType: string;
  receiptExceptionType: string;
  receiptAt: string;
  changeExpectedDeliveryAt: string;
  changeReceivingLocation: string;
  changeRemark: string;
}>();

const receiptItems = defineModel<string>("receiptItems", { required: true });
const receiptSummary = defineModel<string>("receiptSummary", { required: true });
const receiptType = defineModel<string>("receiptType", { required: true });
const receiptExceptionType = defineModel<string>("receiptExceptionType", { required: true });
const receiptAt = defineModel<string>("receiptAt", { required: true });
const changeExpectedDeliveryAt = defineModel<string>("changeExpectedDeliveryAt", { required: true });
const changeReceivingLocation = defineModel<string>("changeReceivingLocation", { required: true });
const changeRemark = defineModel<string>("changeRemark", { required: true });

const emit = defineEmits<{
  generateOrder: [];
  confirmOrder: [orderId: string];
  recordReceipt: [orderId: string, forcedType?: string];
  primeReceipt: [orderId: string];
  primeChange: [orderId: string];
  changeOrder: [orderId: string];
  closeOrder: [orderId: string];
}>();

function lineProgress(order: PurchaseOrder) {
  if (order.lineItems.length === 0) return "-";
  return order.lineItems.map((line) => `${line.itemName} ${line.receivedQuantity}/${line.quantity}${line.unit}`).join(" / ");
}
</script>

<template>
  <EnterpriseSurface title="采购订单与收货控制" description="先设置本次收货或订单变更参数，再在订单台账上执行确认、收货、变更与关闭。">
    <template #actions>
      <EnterpriseButton v-if="canGenerateOrder" type="primary" :disabled="Boolean(actionBusy)" @click="emit('generateOrder')">生成采购订单</EnterpriseButton>
    </template>

    <div v-if="canRecordReceipt" class="eds-page-section">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>收货方式</span>
          <strong>{{ label(receiptType) }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>异常类型</span>
          <strong>{{ label(receiptExceptionType) }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>计划到货调整</span>
          <strong>{{ changeExpectedDeliveryAt || "保持订单原计划" }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>收货地点</span>
          <strong>{{ changeReceivingLocation || "按订单地点执行" }}</strong>
        </article>
      </div>

      <div class="eds-form-section">
        <label>
          收货类型
          <select v-model="receiptType">
            <option value="full">全部收货</option>
            <option value="partial">部分收货</option>
            <option value="exception">异常收货</option>
          </select>
        </label>
        <label>
          异常类型
          <select v-model="receiptExceptionType">
            <option value="quantity_mismatch">数量差异</option>
            <option value="quality_issue">质量问题</option>
            <option value="delivery_delay">交付延期</option>
            <option value="missing_documents">资料缺失</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label>
          收货时间
          <input v-model="receiptAt" type="datetime-local" />
        </label>
        <label>
          收货摘要
          <input v-model="receiptSummary" />
        </label>
        <label>
          收货明细
          <textarea v-model="receiptItems" rows="3" placeholder="物资名|数量|单位|是"></textarea>
        </label>
        <label>
          变更计划到货
          <input v-model="changeExpectedDeliveryAt" type="date" />
        </label>
        <label>
          变更收货地点
          <input v-model="changeReceivingLocation" />
        </label>
        <label>
          变更说明
          <input v-model="changeRemark" />
        </label>
      </div>

      <footer class="eds-submit-panel">
        <span class="eds-meta">收货明细格式：物资名|数量|单位|是否合格。数量为空或格式错误时不会提交该行。</span>
        <span class="eds-meta">带入变更后会直接复用当前参数，避免在订单行重复输入。</span>
      </footer>
    </div>

    <DataTable
      :columns="ORDER_COLUMNS"
      :rows="orders"
      row-key="id"
      empty-mode="compact"
      empty-text="定标通过并生成订单后，在这里持续推进供应商确认、收货和变更处理。"
    >
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #lineItems="{ row }">{{ lineProgress(row) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag>
        <p v-if="row.statusRemark" class="eds-meta">{{ row.statusRemark }}</p>
      </template>
      <template #totalAmount="{ row }">{{ currency(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions eds-actions-table">
          <EnterpriseButton v-if="canConfirmOrder" size="sm" :disabled="row.status !== 'pending_confirmation' || Boolean(actionBusy)" @click="emit('confirmOrder', row.id)">
            供应商确认
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            size="sm"
            :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('recordReceipt', row.id, 'full')"
          >
            全部收货
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            size="sm"
            type="accent"
            :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('primeReceipt', row.id)"
          >
            部分收货
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            size="sm"
            type="danger"
            :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('recordReceipt', row.id, 'exception')"
          >
            登记异常
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            size="sm"
            type="text"
            :disabled="['received', 'closed'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('primeChange', row.id)"
          >
            带入变更
          </EnterpriseButton>
          <EnterpriseButton v-if="canRecordReceipt" size="sm" type="accent" :disabled="['received', 'closed'].includes(row.status) || Boolean(actionBusy)" @click="emit('changeOrder', row.id)">提交变更</EnterpriseButton>
          <EnterpriseButton v-if="canRecordReceipt" size="sm" type="text" :disabled="row.status === 'closed' || Boolean(actionBusy)" @click="emit('closeOrder', row.id)">关闭</EnterpriseButton>
        </div>
      </template>
      <template #orderNo="{ row }">
        <div class="eds-table-primary-cell">
          <strong>{{ row.orderNo }}</strong>
          <span>{{ row.expectedDeliveryAt || "待安排到货计划" }}</span>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
