<script setup lang="ts">
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import { EnterpriseButton, EnterpriseSurface, StatusTag, SummaryCards } from "../../components/base";
import type { Supplier, SupplierActionMode } from "./types";

defineProps<{
  supplier: Supplier;
  recentCreatedSupplierId: string;
  canEditOwnSupplier: boolean;
  canMaintainSupplier: boolean;
  inactive: boolean;
  showAdmissionProcess: boolean;
  processRefreshKey: number;
  supplierStatus: (supplier: Supplier | null) => string;
  serviceRegionSummary: (supplier: Supplier | null) => string;
  formatDateTime: (value?: string | null) => string;
}>();

const emit = defineEmits<{
  openAction: [mode: SupplierActionMode];
  toggleAdmissionProcess: [];
}>();
</script>

<template>
  <EnterpriseSurface title="当前档案" :description="supplier.name">
    <template #actions>
      <StatusTag v-if="supplier.id === recentCreatedSupplierId" tone="primary">刚新增</StatusTag>
      <StatusTag>{{ supplierStatus(supplier) }}</StatusTag>
      <EnterpriseButton v-if="canEditOwnSupplier && !inactive" type="text" @click="emit('openAction', 'profile')">维护资料</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainSupplier && !inactive" type="text" @click="emit('openAction', 'review')">记录评审</EnterpriseButton>
      <EnterpriseButton v-if="canEditOwnSupplier && !inactive" type="text" @click="emit('openAction', 'sample')">上传封样</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainSupplier && !inactive" type="text" @click="emit('openAction', 'deactivate')">作废停用</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainSupplier && inactive" type="primary" @click="emit('openAction', 'reactivate')">重新启用</EnterpriseButton>
    </template>
    <SummaryCards
      :items="[
        { label: '联系人', value: supplier.contactName || '-' },
        { label: '联系电话', value: supplier.contactPhone || '-' },
        { label: '主营品类', value: supplier.categoryAuth.join('，') || '-' },
        { label: '服务范围', value: serviceRegionSummary(supplier) },
        { label: '统一社会信用代码', value: supplier.onboardingProfile?.basic?.socialCreditCode || supplier.socialCreditCode || '-' },
        { label: '法定代表人', value: supplier.onboardingProfile?.basic?.legalRepresentative || supplier.legalRepresentative || '-' },
        { label: '注册来源', value: supplier.onboardingProfile ? '供应商自助注册' : supplier.supplierSource || '-' },
        { label: '资料提交时间', value: supplier.onboardingProfile?.submittedAt ? formatDateTime(supplier.onboardingProfile.submittedAt) : '-' }
      ]"
    />
  </EnterpriseSurface>

  <EnterpriseSurface title="准入流程" description="用于审计追溯和查看供应商准入节点，日常维护可不展开。">
    <div class="eds-disclosure-head">
      <EnterpriseButton type="text" @click="emit('toggleAdmissionProcess')">
        {{ showAdmissionProcess ? "隐藏流程" : "查看流程" }}
      </EnterpriseButton>
    </div>
    <ProcessTimeline
      v-if="showAdmissionProcess"
      business-type="supplier_onboarding"
      :business-id="supplier.id"
      title="供应商准入流程进度"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
