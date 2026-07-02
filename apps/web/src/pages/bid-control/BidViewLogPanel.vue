<script setup lang="ts">
import { DataTable, EnterpriseSurface, PaginationBar } from "../../components/base";
import { BID_RESULT_LABELS, LOG_COLUMNS, VIEW_CONTENT_LABELS } from "./constants";
import type { BidViewLog } from "./types";

defineProps<{
  logs: BidViewLog[];
  supplierName: (supplierId?: unknown) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="保密查看日志" description="每次查看报价金额或响应文件都会记录结果。">
    <DataTable :columns="LOG_COLUMNS" :rows="logs" empty-text="暂无查看日志">
      <template #approval="{ row }">{{ row.approvalId ? "查看审批记录" : "-" }}</template>
      <template #actor="{ row }">{{ row.actorId ? "已授权人员" : "-" }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #content="{ row }">{{ VIEW_CONTENT_LABELS[String(row.content)] ?? row.content }}</template>
      <template #result="{ row }">{{ BID_RESULT_LABELS[String(row.result)] ?? row.result }}</template>
    </DataTable>
    <PaginationBar :total="logs.length" />
  </EnterpriseSurface>
</template>
