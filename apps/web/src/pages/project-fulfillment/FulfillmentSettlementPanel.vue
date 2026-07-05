<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { SETTLEMENT_COLUMNS } from "./constants";
import type { Attachment, PurchaseOrder, SettlementMaterial, StatusTone } from "./types";

defineProps<{
  orders: PurchaseOrder[];
  materials: SettlementMaterial[];
  canUploadSettlement: boolean;
  canVerifySettlement: boolean;
  settlementFileName: string;
  settlementFileSelected: boolean;
  actionBusy: string;
  materialAttachments: (material: SettlementMaterial) => Attachment[];
  label: (value: string | undefined | null) => string;
  statusTone: (value: string | undefined | null) => StatusTone;
}>();

const settlementOrderId = defineModel<string>("settlementOrderId", { required: true });
const settlementMaterialType = defineModel<string>("settlementMaterialType", { required: true });

const emit = defineEmits<{
  fileChange: [event: Event];
  uploadSettlement: [];
  verifySettlement: [materialId: string, approved: boolean];
}>();

function selectedOrderLabel(orders: PurchaseOrder[], orderId: string) {
  return orders.find((order) => order.id === orderId)?.orderNo ?? "未选择";
}
</script>

<template>
  <EnterpriseSurface title="结算材料上传与核验" description="供应商上传、采购补充和财务核验都沿同一条结算材料台账继续推进。">
    <template #actions>
      <EnterpriseButton
        v-if="canUploadSettlement"
        type="primary"
        :disabled="!settlementOrderId || !settlementFileSelected || Boolean(actionBusy)"
        @click="emit('uploadSettlement')"
      >
        上传资料
      </EnterpriseButton>
    </template>

    <div v-if="canUploadSettlement" class="eds-page-section">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>关联订单</span>
          <strong>{{ selectedOrderLabel(orders, settlementOrderId) }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>资料类型</span>
          <strong>{{ label(settlementMaterialType) }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>待上传文件</span>
          <strong>{{ settlementFileName || "未选择文件" }}</strong>
        </article>
      </div>

      <div class="eds-form-section">
        <label>
          订单
          <select v-model="settlementOrderId">
            <option v-for="order in orders" :key="order.id" :value="order.id">{{ order.orderNo }}</option>
          </select>
        </label>
        <label>
          资料类型
          <select v-model="settlementMaterialType">
            <option value="invoice">发票</option>
            <option value="delivery_note">送货单</option>
            <option value="acceptance_record">验收单</option>
            <option value="other">其他资料</option>
          </select>
        </label>
        <label>文件<input type="file" @change="emit('fileChange', $event)" /></label>
      </div>

      <footer class="eds-submit-panel">
        <span class="eds-meta">结算资料进入台账后，采购、供应商与财务沿同一条记录继续核验。</span>
      </footer>
    </div>

    <DataTable
      :columns="SETTLEMENT_COLUMNS"
      :rows="materials"
      row-key="id"
      empty-mode="compact"
      empty-text="订单收货后，上传的发票、送货单和验收单会在这里集中查看与核验。"
    >
      <template #materialType="{ row }">{{ label(row.materialType) }}</template>
      <template #status="{ row }"><StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag></template>
      <template #file="{ row }">
        <AttachmentList :attachments="materialAttachments(row)" compact empty-text="未关联文件" />
      </template>
      <template #opinion="{ row }">{{ row.verificationOpinion || "-" }}</template>
      <template #actions="{ row }">
        <div v-if="canVerifySettlement" class="eds-actions eds-actions-table">
          <EnterpriseButton size="sm" :disabled="row.status !== 'pending_verification' || Boolean(actionBusy)" @click="emit('verifySettlement', row.id, true)">核验通过</EnterpriseButton>
          <EnterpriseButton size="sm" type="text" :disabled="row.status !== 'pending_verification' || Boolean(actionBusy)" @click="emit('verifySettlement', row.id, false)">驳回重传</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
