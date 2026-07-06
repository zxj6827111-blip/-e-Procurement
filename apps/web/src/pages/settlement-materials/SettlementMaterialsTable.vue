<script setup lang="ts">
import { ref } from "vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import { materialColumns } from "./display";
import type { SettlementMaterial } from "./types";

defineProps<{
  materials: SettlementMaterial[];
  canFinanceReview: boolean;
  supplierName: (supplierId?: string) => string;
  orderLabel: (orderId?: string) => string;
  materialTypeLabel: (value: string) => string;
  materialFileLabel: (fileName?: string) => string;
}>();

const emit = defineEmits<{
  review: [material: SettlementMaterial, approved: boolean];
}>();

const selectedMaterial = ref<SettlementMaterial | null>(null);
const selectedApproved = ref(true);

function openMaterialReview(material: SettlementMaterial, approved: boolean) {
  selectedMaterial.value = material;
  selectedApproved.value = approved;
}

function submitMaterialReview() {
  if (!selectedMaterial.value) return;
  emit("review", selectedMaterial.value, selectedApproved.value);
  selectedMaterial.value = null;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="结算资料台账" description="送货单、验收单和发票附件统一进入资料台账，核验意见直接沉淀在同一行。">
    <DataTable :columns="materialColumns" :rows="materials" empty-mode="compact" empty-text="当前角色暂无可见结算资料。">
      <template #id="{ row }">
        <strong>{{ row.id }}</strong>
        <small class="eds-meta">{{ materialTypeLabel(row.materialType) }} / {{ materialFileLabel(row.fileName) }}</small>
      </template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #order="{ row }">{{ orderLabel(row.purchaseOrderId) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #actions="{ row }">
        <div class="eds-actions eds-actions-table">
          <EnterpriseButton type="text" @click="openMaterialReview(row, true)">材料审核</EnterpriseButton>
          <EnterpriseButton v-if="canFinanceReview && row.status === 'pending_verification'" size="sm" type="primary" @click="openMaterialReview(row, true)">审核通过</EnterpriseButton>
          <EnterpriseButton v-if="canFinanceReview && row.status === 'pending_verification'" size="sm" type="text" @click="openMaterialReview(row, false)">驳回</EnterpriseButton>
          <StatusTag v-if="!canFinanceReview">只读</StatusTag>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedMaterial" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="材料审核">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedMaterial = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>材料审核</h3>
        <button type="button" aria-label="关闭" @click="selectedMaterial = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>结算编号：</span>{{ selectedMaterial.id }}</p>
        <p><span>关联订单：</span>{{ orderLabel(selectedMaterial.purchaseOrderId) }}</p>
        <p><span>供应商：</span>{{ supplierName(selectedMaterial.supplierId) }}</p>
        <p><span>资料类型：</span>{{ materialTypeLabel(selectedMaterial.materialType) }}</p>
        <p><span>文件：</span>{{ materialFileLabel(selectedMaterial.fileName) }}</p>
        <p><span>上传时间：</span>{{ formatDateTime(selectedMaterial.uploadedAt) }}</p>
        <p><span>核验意见：</span>{{ selectedMaterial.verificationOpinion || "-" }}</p>
      </div>
      <footer>
        <EnterpriseButton @click="selectedMaterial = null">取消</EnterpriseButton>
        <EnterpriseButton v-if="canFinanceReview && selectedMaterial.status === 'pending_verification'" @click="selectedApproved = false; submitMaterialReview()">驳回</EnterpriseButton>
        <EnterpriseButton v-if="canFinanceReview && selectedMaterial.status === 'pending_verification'" type="primary" @click="selectedApproved = true; submitMaterialReview()">审核通过</EnterpriseButton>
        <EnterpriseButton v-else type="primary" @click="selectedMaterial = null">关闭</EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
