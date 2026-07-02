<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { AwardOperationForm, SupplierOption } from "./types";

defineProps<{
  suppliers: SupplierOption[];
  projectHasApprovedAward: boolean;
  canCreateAwardApproval: boolean;
  canSubmitAwardApproval: boolean;
  canGeneratePricingReport: boolean;
  canSendResultNotification: boolean;
  canPublishInternalPublicity: boolean;
  createAwardApprovalDisabledText: string;
  submitAwardApprovalDisabledText: string;
  pricingReportButtonText: string;
  resultNotificationButtonText: string;
  internalPublicityButtonText: string;
  nextActionNotice: string;
}>();

const selectedSupplierId = defineModel<string>("selectedSupplierId", { required: true });
const nonLowestPriceReason = defineModel<string>("nonLowestPriceReason", { required: true });
const selectedApprovalId = defineModel<string>("selectedApprovalId", { required: true });
const awardOperationForm = defineModel<AwardOperationForm>("awardOperationForm", { required: true });

const emit = defineEmits<{
  createAwardApproval: [];
  submitAwardApproval: [];
  generatePricingReport: [];
  sendResultNotification: [];
  publishInternalPublicity: [];
}>();
</script>

<template>
  <EnterpriseSurface title="创建定标审批" description="采购经办选择拟定标供应商，并说明非最低价定标理由。">
    <div class="eds-form-section">
      <label>
        拟定标供应商
        <select v-model="selectedSupplierId">
          <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <label>
        非最低价理由
        <input v-model="nonLowestPriceReason" />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!canCreateAwardApproval" :title="!canCreateAwardApproval ? createAwardApprovalDisabledText : ''" @click="emit('createAwardApproval')">
        {{ projectHasApprovedAward ? "定标审批已通过" : "创建定标审批" }}
      </EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>

  <EnterpriseSurface title="定标后执行" :description="nextActionNotice">
    <div class="eds-form-section">
      <label>
        审批单
        <select v-model="selectedApprovalId">
          <slot name="approval-options" />
        </select>
      </label>
      <label>
        通知范围
        <select v-model="awardOperationForm.notificationScope">
          <option value="supplier_self">供应商各自可见</option>
          <option value="internal_publicity">内部公示通知</option>
        </select>
      </label>
      <label>
        可见配置
        <select v-model="awardOperationForm.visibilityConfig">
          <option value="supplier_self_only">仅供应商本人可见</option>
          <option value="show_winner_name">展示中标供应商名称</option>
        </select>
      </label>
      <label>
        内部公示摘要
        <input v-model="awardOperationForm.publicitySummary" />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton :disabled="!canSubmitAwardApproval" :title="!canSubmitAwardApproval ? submitAwardApprovalDisabledText : ''" @click="emit('submitAwardApproval')">
        {{ projectHasApprovedAward ? "审批已通过" : "提交审批" }}
      </EnterpriseButton>
      <EnterpriseButton :disabled="!canGeneratePricingReport" @click="emit('generatePricingReport')">{{ pricingReportButtonText }}</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!canSendResultNotification" @click="emit('sendResultNotification')">{{ resultNotificationButtonText }}</EnterpriseButton>
      <EnterpriseButton :disabled="!canPublishInternalPublicity" @click="emit('publishInternalPublicity')">{{ internalPublicityButtonText }}</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
