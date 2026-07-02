<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, FeedbackMessage, StatusTag, SummaryCards } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { ServiceRegion, Supplier, SupplierManagedAccount } from "./types";

defineProps<{
  supplier: Supplier;
  canMaintainSupplier: boolean;
  accountLoading: boolean;
  supplierAccounts: SupplierManagedAccount[];
  latestResetPassword: { userId: string; temporaryPassword: string } | null;
  labels: {
    risk: (value?: string) => string;
    qualificationStatus: (supplier: Supplier | null) => string;
    supplierStatus: (supplier: Supplier | null) => string;
    admissionLevel: (supplier: Supplier | null) => string;
    periodicAssessment: (supplier: Supplier | null) => string;
    dateTime: (value?: string | null) => string;
  };
}>();

const emit = defineEmits<{
  refreshAccounts: [];
  resetPassword: [account: SupplierManagedAccount];
}>();

const serviceRegionColumns = [
  { key: "region", label: "区域" },
  { key: "storeName", label: "门店 / 服务点" },
  { key: "category", label: "品类" },
  { key: "status", label: "状态" }
];
</script>

<template>
  <div class="eds-section">
    <SummaryCards
      :items="[
        { label: '联系邮箱', value: supplier.contactEmail || '-' },
        { label: '风险提示', value: labels.risk(supplier.risk) },
        { label: '资质状态', value: labels.qualificationStatus(supplier) },
        { label: '准入状态', value: labels.supplierStatus(supplier) },
        { label: '供应商等级', value: labels.admissionLevel(supplier) },
        { label: '周期考核', value: labels.periodicAssessment(supplier) },
        { label: '下次考核', value: labels.dateTime(supplier.periodicAssessment?.nextDueAt) },
        { label: '评价分', value: supplier.evaluationScore ?? '-' }
      ]"
    />

    <EnterpriseSurface v-if="canMaintainSupplier" title="供应商登录账号" eyebrow="后台账号管理" description="供应商忘记密码时，重置生成临时密码并要求首次登录后修改。">
      <template #actions>
        <EnterpriseButton type="text" :disabled="accountLoading" @click="emit('refreshAccounts')">刷新账号</EnterpriseButton>
      </template>
      <div class="eds-stack-tight">
        后台不显示旧密码；供应商忘记密码时，请重置生成临时密码并交给供应商首次登录后修改。
      </div>
      <div v-if="supplierAccounts.length" class="eds-responsive-grid">
        <article v-for="account in supplierAccounts" :key="account.userId" class="eds-record">
          <div>
            <StatusTag>{{ account.label }}</StatusTag>
            <strong>{{ account.username }}</strong>
            <small>用户ID：{{ account.userId }}</small>
          </div>
          <div class="eds-meta-list">
            <span>状态：{{ labelStatus(account.status) }}</span>
            <span>密码状态：{{ account.credentialSetupRequired ? "需首次修改" : "已完成设置" }}</span>
            <span>最近登录：{{ account.lastLoginAt ? labels.dateTime(account.lastLoginAt) : "暂无" }}</span>
          </div>
          <EnterpriseButton type="text" @click="emit('resetPassword', account)">重置密码</EnterpriseButton>
          <div v-if="latestResetPassword?.userId === account.userId" class="eds-record eds-stack-tight">
            <span>新的临时密码</span>
            <strong>{{ latestResetPassword.temporaryPassword }}</strong>
          </div>
        </article>
      </div>
      <FeedbackMessage v-else>暂无可管理账号。</FeedbackMessage>
    </EnterpriseSurface>

    <DataTable :columns="serviceRegionColumns" :rows="supplier.serviceRegions as ServiceRegion[]" row-key="id" empty-text="暂无服务区域">
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
    </DataTable>
  </div>
</template>
