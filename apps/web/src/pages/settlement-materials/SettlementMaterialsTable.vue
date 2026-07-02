<script setup lang="ts">
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

defineEmits<{
  review: [material: SettlementMaterial, approved: boolean];
}>();
</script>

<template>
  <EnterpriseSurface title="结算资料" :description="`${materials.length} 份`">
    <DataTable :columns="materialColumns" :rows="materials" empty-text="当前角色暂无可见结算资料。">
      <template #materialType="{ row }">{{ materialTypeLabel(row.materialType) }}</template>
      <template #fileName="{ row }">{{ materialFileLabel(row.fileName) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #order="{ row }">{{ orderLabel(row.purchaseOrderId) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #uploadedAt="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
      <template #opinion="{ row }">{{ row.verificationOpinion || "-" }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="canFinanceReview && row.status === 'pending_verification'" type="primary" @click="$emit('review', row, true)">核验通过</EnterpriseButton>
          <EnterpriseButton v-if="canFinanceReview && row.status === 'pending_verification'" @click="$emit('review', row, false)">驳回</EnterpriseButton>
          <StatusTag v-if="!canFinanceReview">只读</StatusTag>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
