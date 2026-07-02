<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag, SubmitPanel } from "../../components/base";
import { CONTRACT_COLUMNS, CONTRACT_STATUS_LABELS, PRICING_ITEM_COLUMNS, SUPPLIER_RESULT_COLUMNS, currency, formatDateTime, statusTone } from "./constants";
import type { ContractLedger, PricingReport, ResultNotification, StatusTone } from "./types";

defineProps<{
  supplierResults: ResultNotification[];
  currentContract: ContractLedger | null;
  currentContractRows: ContractLedger[];
  pricingReports: PricingReport[];
  canConfirmContract: boolean;
  notificationSelected: (result: ResultNotification) => boolean;
  notificationLabel: (index: number) => string;
}>();

const emit = defineEmits<{
  confirmContract: [];
}>();
</script>

<template>
  <EnterpriseSurface title="我的结果通知" :description="`共 ${supplierResults.length} 条。`">
    <DataTable :columns="SUPPLIER_RESULT_COLUMNS" :rows="supplierResults" row-key="id" empty-text="当前账号暂无可见的中标结果通知。">
      <template #notification="{ index }">{{ notificationLabel(index) }}</template>
      <template #result="{ row }">
        <StatusTag :tone="notificationSelected(row) ? 'success' : 'default'">{{ notificationSelected(row) ? "中选" : "未中选" }}</StatusTag>
      </template>
      <template #summary="{ row }">{{ row.contentSummary }}</template>
      <template #sentAt="{ row }">{{ formatDateTime(row.sentAt) }}</template>
    </DataTable>
    <p v-if="supplierResults.some(notificationSelected)" class="eds-meta">
      后续工作：等待采购经办生成采购订单；收到订单后到“订单履约”确认订单、发货、上传结算材料。
    </p>
    <p v-else-if="supplierResults.length" class="eds-meta">当前项目未中选，可保留报价记录，等待后续采购公告或邀请。</p>
  </EnterpriseSurface>

  <EnterpriseSurface v-if="supplierResults.some(notificationSelected)" title="合同签订" description="采购经办发起合同后，中选供应商在本页确认。">
    <DataTable :columns="CONTRACT_COLUMNS" :rows="currentContractRows" row-key="id" empty-text="采购经办尚未发起合同签订。">
      <template #amount="{ row }">{{ currency(row.amount) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ CONTRACT_STATUS_LABELS[row.status] ?? row.status }}</StatusTag>
      </template>
      <template #updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
    </DataTable>
    <SubmitPanel>
      <EnterpriseButton v-if="canConfirmContract" type="primary" @click="emit('confirmContract')">确认合同</EnterpriseButton>
      <span v-else-if="currentContract" class="eds-meta">合同状态为“{{ CONTRACT_STATUS_LABELS[currentContract.status] ?? currentContract.status }}”，当前无需重复确认。</span>
    </SubmitPanel>
  </EnterpriseSurface>

  <EnterpriseSurface v-for="report in pricingReports" :key="`${report.id}-supplier-items`" :title="`价格报告 ${report.reportNo}`" description="中选后可见的价格报告明细。">
    <DataTable :columns="PRICING_ITEM_COLUMNS" :rows="report.items" row-key="id" empty-text="暂无价格明细">
      <template #specification="{ row }">{{ row.specification || "-" }}</template>
      <template #purchasePrice="{ row }">{{ currency(row.purchasePrice) }}</template>
      <template #salePrice="{ row }">{{ currency(row.salePrice) }}</template>
      <template #effective="{ row }">{{ row.effectiveFrom }} 至 {{ row.effectiveTo || "长期" }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
