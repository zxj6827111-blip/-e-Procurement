<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, FormSection, StatusTag, SubmitPanel } from "../../components/base";
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
  <FormSection v-if="canRecordReceipt" title="收货与订单变更参数" description="先维护本次收货、异常或订单变更信息，再在下方订单行执行对应动作。">
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
  </FormSection>
  <SubmitPanel v-if="canRecordReceipt">
    <span class="eds-meta">收货明细格式：物资名|数量|单位|是否合格。数量为空或格式错误时不会提交该行。</span>
  </SubmitPanel>

  <EnterpriseSurface title="采购订单">
    <div v-if="canGenerateOrder" class="eds-form-section">
      <div>
        <span class="eds-meta">订单生成</span>
        <strong>定标审批已通过，生成采购订单后进入供应商确认与收货流程。</strong>
      </div>
      <EnterpriseButton type="primary" :disabled="Boolean(actionBusy)" @click="emit('generateOrder')">生成采购订单</EnterpriseButton>
    </div>
    <DataTable :columns="ORDER_COLUMNS" :rows="orders" row-key="id" empty-text="尚未生成采购订单">
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #lineItems="{ row }">{{ lineProgress(row) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag>
        <p v-if="row.statusRemark" class="eds-meta">{{ row.statusRemark }}</p>
      </template>
      <template #totalAmount="{ row }">{{ currency(row.totalAmount) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canConfirmOrder" :disabled="row.status !== 'pending_confirmation' || Boolean(actionBusy)" @click="emit('confirmOrder', row.id)">
            供应商确认
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('recordReceipt', row.id, 'full')"
          >
            全部收货
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('primeReceipt', row.id)"
          >
            部分收货
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('recordReceipt', row.id, 'exception')"
          >
            登记异常
          </EnterpriseButton>
          <EnterpriseButton
            v-if="canRecordReceipt"
            :disabled="['received', 'closed'].includes(row.status) || Boolean(actionBusy)"
            @click="emit('primeChange', row.id)"
          >
            带入变更
          </EnterpriseButton>
          <EnterpriseButton v-if="canRecordReceipt" :disabled="['received', 'closed'].includes(row.status) || Boolean(actionBusy)" @click="emit('changeOrder', row.id)">提交变更</EnterpriseButton>
          <EnterpriseButton v-if="canRecordReceipt" :disabled="row.status === 'closed' || Boolean(actionBusy)" @click="emit('closeOrder', row.id)">关闭</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
