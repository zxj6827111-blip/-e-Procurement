<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import {
  APPROVAL_COLUMNS,
  APPROVAL_STATUS_LABELS,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_STATUS_LABELS,
  PRICING_ITEM_COLUMNS,
  PRICING_REPORT_COLUMNS,
  PRODUCT_COLUMNS,
  PRODUCT_STATUS_LABELS,
  PUBLICITY_COLUMNS,
  SUPPLIER_RESULT_COLUMNS,
  VISIBILITY_LABELS,
  currency,
  formatDateTime,
  statusTone
} from "./constants";
import type { AwardApproval, MallProduct, PricingReport, PublicityRecord, ResultNotification, StatusTone } from "./types";

defineProps<{
  approvals: AwardApproval[];
  pricingReports: PricingReport[];
  awardProducts: MallProduct[];
  notifications: ResultNotification[];
  supplierResults: ResultNotification[];
  publicityRecords: PublicityRecord[];
  approvalLabel: (approval: AwardApproval, index: number) => string;
  supplierName: (supplierId?: string) => string;
  notificationLabel: (index: number) => string;
  notificationSelected: (result: ResultNotification) => boolean;
  publicityLabel: (index: number) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="审批记录" description="当前项目的定标审批历史。">
    <DataTable :columns="APPROVAL_COLUMNS" :rows="approvals" row-key="id" empty-text="暂无定标审批记录">
      <template #approval="{ row, index }">{{ approvalLabel(row, index) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.selectedSupplierId) }}</template>
      <template #lowest="{ row }">{{ row.isLowestPrice ? "是" : "否" }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.approvalStatus)">{{ APPROVAL_STATUS_LABELS[row.approvalStatus] ?? row.approvalStatus }}</StatusTag>
      </template>
      <template #reason="{ row }">{{ row.nonLowestPriceReason || "-" }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface title="价格报告" description="定标审批通过后生成价格报告；商品上架交给采购执行或平台运营。">
    <DataTable :columns="PRICING_REPORT_COLUMNS" :rows="pricingReports" row-key="id" empty-text="暂无价格报告">
      <template #supplier="{ row }">{{ supplierName(row.selectedSupplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ row.status }}</StatusTag>
      </template>
      <template #items="{ row }">{{ row.items.length }}</template>
      <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface v-for="report in pricingReports" :key="`${report.id}-items`" :title="`${report.reportNo} 明细`" description="价格报告物品和价格明细。">
    <DataTable :columns="PRICING_ITEM_COLUMNS" :rows="report.items" row-key="id" empty-text="暂无价格明细">
      <template #specification="{ row }">{{ row.specification || "-" }}</template>
      <template #purchasePrice="{ row }">{{ currency(row.purchasePrice) }}</template>
      <template #salePrice="{ row }">{{ currency(row.salePrice) }}</template>
      <template #effective="{ row }">{{ row.effectiveFrom }} 至 {{ row.effectiveTo || "长期" }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface v-if="awardProducts.length" title="已上架中标商品" :description="`共 ${awardProducts.length} 件。`">
    <DataTable :columns="PRODUCT_COLUMNS" :rows="awardProducts" row-key="id" empty-text="暂无中标商品">
      <template #supplier="{ row }">{{ row.supplierName || supplierName(row.supplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ PRODUCT_STATUS_LABELS[row.status] ?? row.status }}</StatusTag>
      </template>
      <template #price="{ row }">{{ currency(row.activePrice?.salePrice ?? row.activePrice?.price) }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface title="结果通知" description="面向供应商或内部公示的结果通知发送记录。">
    <DataTable :columns="NOTIFICATION_COLUMNS" :rows="notifications" row-key="id" empty-text="暂无结果通知">
      <template #notification="{ index }">{{ notificationLabel(index) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ NOTIFICATION_STATUS_LABELS[row.status] ?? row.status }}</StatusTag>
      </template>
      <template #visibility="{ row }">{{ VISIBILITY_LABELS[row.visibilityConfig] ?? row.visibilityConfig }}</template>
      <template #sentAt="{ row }">{{ formatDateTime(row.sentAt) }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface title="供应商结果通知" description="供应商端收到的中选或未中选通知。">
    <DataTable :columns="SUPPLIER_RESULT_COLUMNS" :rows="supplierResults" row-key="id" empty-text="暂无供应商结果通知">
      <template #notification="{ index }">{{ notificationLabel(index) }}</template>
      <template #result="{ row }">
        <StatusTag :tone="notificationSelected(row) ? 'success' : 'default'">{{ notificationSelected(row) ? "中选" : "未中选" }}</StatusTag>
      </template>
      <template #summary="{ row }">{{ row.contentSummary }}</template>
      <template #sentAt="{ row }">{{ formatDateTime(row.sentAt) }}</template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface title="内部公示" description="内部可见的定标结果公示。">
    <DataTable :columns="PUBLICITY_COLUMNS" :rows="publicityRecords" row-key="id" empty-text="暂无内部公示">
      <template #publicity="{ index }">{{ publicityLabel(index) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ row.status === "published" ? "已发布" : row.status }}</StatusTag>
      </template>
      <template #summary="{ row }">{{ row.contentSummary }}</template>
      <template #publishedAt="{ row }">{{ formatDateTime(row.publishedAt) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
