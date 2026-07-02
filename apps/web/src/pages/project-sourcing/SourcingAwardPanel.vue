<script setup lang="ts">
import { computed } from "vue";
import { DataTable, EnterpriseSurface, StatusTag, SummaryCards, type DataTableColumn } from "../../components/base";
import { COMPARISON_COLUMNS } from "./constants";
import type { AwardApprovalSummary, ComparisonRow, PricingReportSummary, SourcingWorkbench } from "./types";

const props = defineProps<{
  comparisonRows: ComparisonRow[];
  comparisonReport: SourcingWorkbench["comparisonReport"];
  latestAwardApproval: AwardApprovalSummary | null;
  latestPricingReport: PricingReportSummary | null;
  sentNotificationCount: number;
  supplierName: (supplierId: string) => string;
  label: (value: string | undefined | null) => string;
  currency: (value: number | undefined) => string;
}>();

const decisionColumns: DataTableColumn[] = [
  { key: "item", label: "事项" },
  { key: "value", label: "结果" },
  { key: "status", label: "状态" }
];

const decisionRows = computed(() => [
  {
    id: "recommended",
    item: "推荐供应商",
    value: props.comparisonReport ? props.supplierName(props.comparisonReport.recommendedSupplierId) : "尚未形成比价报告",
    status: props.comparisonReport ? "已形成" : "待形成"
  },
  {
    id: "reason",
    item: "定标理由",
    value: props.comparisonReport?.awardReason || "-",
    status: props.comparisonReport?.nonLowestPriceReason ? "非最低价" : "常规"
  },
  {
    id: "nonLowestPriceReason",
    item: "非最低价说明",
    value: props.comparisonReport?.nonLowestPriceReason || "-",
    status: props.comparisonReport?.nonLowestPriceReason ? "需审查" : "无"
  }
]);
</script>

<template>
  <EnterpriseSurface title="定标与价格结果">
    <DataTable :columns="COMPARISON_COLUMNS" :rows="comparisonRows" row-key="supplierId" empty-text="报价锁定并形成比价报告后显示排序结果">
      <template #amount="{ row }">{{ currency(row.amount) }}</template>
      <template #deliveryDays="{ row }">{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</template>
      <template #remark="{ row }">{{ row.isLowestPrice ? "最低价" : row.serviceCommitment || "-" }}</template>
    </DataTable>

    <DataTable :columns="decisionColumns" :rows="decisionRows" row-key="id">
      <template #status="{ value }">
        <StatusTag :tone="value === '需审查' ? 'warning' : value === '待形成' ? 'default' : 'primary'">{{ value }}</StatusTag>
      </template>
    </DataTable>

    <SummaryCards
      :items="[
        {
          label: '定标审批',
          value: latestAwardApproval ? `${supplierName(latestAwardApproval.selectedSupplierId)} / ${label(latestAwardApproval.approvalStatus)}` : '尚未发起定标审批'
        },
        {
          label: '价格报告',
          value: latestPricingReport ? `${latestPricingReport.reportNo} / ${label(latestPricingReport.status)} / ${latestPricingReport.items.length} 项` : '定标审批通过后生成价格报告'
        },
        { label: '结果通知', value: `${sentNotificationCount} 条已发送` }
      ]"
    />
  </EnterpriseSurface>
</template>
