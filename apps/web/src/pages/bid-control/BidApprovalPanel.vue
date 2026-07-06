<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag, SubmitPanel } from "../../components/base";
import { APPROVAL_COLUMNS, APPROVAL_STATUS_LABELS, VIEW_CONTENT_LABELS } from "./constants";
import type { Approval, StatusTone, SupplierRow } from "./types";

const targetSupplierId = defineModel<string>("targetSupplierId", { required: true });
const viewContent = defineModel<string>("viewContent", { required: true });
const allowDownload = defineModel<boolean>("allowDownload", { required: true });
const selectedApprovalId = defineModel<string>("selectedApprovalId", { required: true });

defineProps<{
  canMaintainBidControl: boolean;
  selectedProjectId: string;
  suppliers: SupplierRow[];
  approvals: Approval[];
  approvalLabel: (approval: Approval, index: number) => string;
  supplierName: (supplierId?: unknown) => string;
  statusTone: (status?: string) => StatusTone;
}>();

const emit = defineEmits<{
  createApproval: [];
  submitApproval: [];
  approveSelectedApproval: [];
  validateApproval: [];
}>();
</script>

<template>
  <EnterpriseSurface v-if="canMaintainBidControl" class="eds-drawer-panel" title="创建保密查看审批" description="指定供应商和可查看内容，下载权限需单独授权。">
    <div class="eds-form-section">
      <label>
        目标供应商
        <select v-model="targetSupplierId">
          <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <label>
        查看内容
        <select v-model="viewContent">
          <option value="response_file_metadata">响应文件元数据</option>
          <option value="amount">报价金额</option>
          <option value="response_file_download">响应文件下载</option>
        </select>
      </label>
      <label>
        允许下载
        <select v-model="allowDownload">
          <option :value="false">否</option>
          <option :value="true">是</option>
        </select>
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!selectedProjectId" @click="emit('createApproval')">创建查看审批</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>

  <EnterpriseSurface v-if="canMaintainBidControl" class="eds-drawer-panel" title="报价查看审批处理" description="查看报价金额或响应文件下载前，必须有有效审批记录。">
    <div class="eds-form-section">
      <label>
        查看审批
        <select v-model="selectedApprovalId">
          <option v-if="!approvals.length" value="">暂无可处理审批</option>
          <option v-for="(approval, index) in approvals" :key="approval.id" :value="approval.id">
            {{ approvalLabel(approval, index) }} / {{ VIEW_CONTENT_LABELS[approval.viewContent] ?? approval.viewContent }}
          </option>
        </select>
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton :disabled="!selectedApprovalId" @click="emit('submitApproval')">提交审批</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedApprovalId" @click="emit('approveSelectedApproval')">审批通过</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedApprovalId" @click="emit('validateApproval')">校验查看权限</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>

  <EnterpriseSurface title="保密查看审批台账" description="当前仍在有效期内的报价查看授权。">
    <DataTable :columns="APPROVAL_COLUMNS" :rows="approvals" row-key="id" empty-text="暂无有效查看审批">
      <template #approval="{ row }">{{ row.id }}</template>
      <template #supplier="{ row }">{{ supplierName(row.targetSupplierId) }}</template>
      <template #viewContent="{ row }">{{ VIEW_CONTENT_LABELS[row.viewContent] ?? row.viewContent }}</template>
      <template #download="{ row }">{{ row.allowDownload ? "允许" : "不允许" }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.approvalStatus)">{{ APPROVAL_STATUS_LABELS[row.approvalStatus] ?? row.approvalStatus }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
