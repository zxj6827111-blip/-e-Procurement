<script setup lang="ts">
import { DataTable, EnterpriseButton, StatusTag, type DataTableColumn } from "../../components/base";
import type { Supplier } from "./types";

defineProps<{
  suppliers: Supplier[];
  selectedSupplierId: string;
  recentCreatedSupplierId: string;
  supplierStatus: (supplier: Supplier | null) => string;
  supplierAvailabilityLabel: (supplier: Supplier | null) => string;
  isInactiveSupplier: (supplier: Supplier | null) => boolean;
  isAdmittedSupplier: (supplier: Supplier | null) => boolean;
  onboardingProductSummary: (supplier: Supplier | null) => string;
  onboardingSiteSummary: (supplier: Supplier | null) => string;
}>();

const emit = defineEmits<{
  select: [supplier: Supplier];
}>();

const columns: DataTableColumn[] = [
  { key: "name", label: "供应商" },
  { key: "contact", label: "联系人" },
  { key: "status", label: "状态" },
  { key: "category", label: "授权品类" },
  { key: "summary", label: "经营摘要" },
  { key: "action", label: "操作" }
];
</script>

<template>
  <DataTable :columns="columns" :rows="suppliers" row-key="id" empty-text="暂无供应商">
    <template #name="{ row }">
      <strong>{{ row.name }}</strong>
      <p class="eds-meta">信用代码：{{ row.onboardingProfile?.basic?.socialCreditCode || row.socialCreditCode || "-" }}</p>
      <StatusTag v-if="row.id === recentCreatedSupplierId" tone="primary">刚新增</StatusTag>
    </template>
    <template #contact="{ row }">
      {{ row.contactName || "暂无联系人" }} / {{ row.contactPhone || "暂无电话" }}
    </template>
    <template #status="{ row }">
      <div class="eds-stack-tight">
        <StatusTag v-if="row.onboardingProfile" tone="primary">自助注册</StatusTag>
        <StatusTag>{{ supplierStatus(row) }}</StatusTag>
        <StatusTag :tone="isInactiveSupplier(row) ? 'error' : !isAdmittedSupplier(row) ? 'warning' : 'success'">
          {{ supplierAvailabilityLabel(row) }}
        </StatusTag>
      </div>
    </template>
    <template #category="{ row }">
      <div class="eds-actions">
        <StatusTag v-for="category in row.categoryAuth" :key="category">{{ category }}</StatusTag>
      </div>
    </template>
    <template #summary="{ row }">
      <p class="eds-meta">主营：{{ onboardingProductSummary(row) }}</p>
      <p class="eds-meta">场所：{{ onboardingSiteSummary(row) }}</p>
    </template>
    <template #action="{ row }">
      <EnterpriseButton :type="row.id === selectedSupplierId ? 'primary' : 'default'" @click="emit('select', row)">
        {{ row.id === selectedSupplierId ? "当前供应商" : "查看详情" }}
      </EnterpriseButton>
    </template>
  </DataTable>
</template>
