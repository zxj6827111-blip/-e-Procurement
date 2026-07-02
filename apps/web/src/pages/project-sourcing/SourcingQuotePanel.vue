<script setup lang="ts">
import { DataTable, EnterpriseSurface, FeedbackMessage } from "../../components/base";
import { QUOTE_COLUMNS } from "./constants";
import type { QuoteRow } from "./types";

defineProps<{
  canReadBidBody: boolean;
  quoteRows: QuoteRow[];
  currency: (value: number | undefined) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="报价明细">
    <FeedbackMessage v-if="!canReadBidBody">报价截止和锁定前只展示提交进度，不提前展示金额、明细和响应文件。</FeedbackMessage>
    <DataTable v-else :columns="QUOTE_COLUMNS" :rows="quoteRows" row-key="id" empty-text="当前还没有可查看的报价明细">
      <template #item="{ row }">
        <strong>{{ row.itemName }}</strong>
        <p class="eds-meta">{{ row.serviceCommitment }}</p>
      </template>
      <template #quantity="{ row }">{{ row.quantity }} {{ row.unit }}</template>
      <template #unitPrice="{ row }">{{ currency(row.unitPrice) }}</template>
      <template #totalPrice="{ row }">{{ currency(row.totalPrice) }}</template>
      <template #deliveryDays="{ row }">{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
