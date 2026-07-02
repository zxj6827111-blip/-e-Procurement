<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, FormSection, StatusTag, SubmitPanel } from "../../components/base";
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
</script>

<template>
  <FormSection v-if="canUploadSettlement" title="上传结算资料" description="供应商或采购经办上传发票、送货单、验收单等结算材料。">
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
    <p class="eds-meta">{{ settlementFileName || "未选择文件" }}</p>
  </FormSection>
  <SubmitPanel v-if="canUploadSettlement">
    <EnterpriseButton type="primary" :disabled="!settlementOrderId || !settlementFileSelected || Boolean(actionBusy)" @click="emit('uploadSettlement')">上传资料</EnterpriseButton>
  </SubmitPanel>

  <EnterpriseSurface title="结算材料">
    <DataTable :columns="SETTLEMENT_COLUMNS" :rows="materials" row-key="id" empty-text="暂无结算材料">
      <template #materialType="{ row }">{{ label(row.materialType) }}</template>
      <template #status="{ row }"><StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag></template>
      <template #file="{ row }">
        <AttachmentList :attachments="materialAttachments(row)" compact empty-text="未关联文件" />
      </template>
      <template #opinion="{ row }">{{ row.verificationOpinion || "-" }}</template>
      <template #actions="{ row }">
        <div v-if="canVerifySettlement" class="eds-actions">
          <EnterpriseButton :disabled="row.status !== 'pending_verification' || Boolean(actionBusy)" @click="emit('verifySettlement', row.id, true)">核验通过</EnterpriseButton>
          <EnterpriseButton :disabled="row.status !== 'pending_verification' || Boolean(actionBusy)" @click="emit('verifySettlement', row.id, false)">驳回重传</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
