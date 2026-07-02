<script setup lang="ts">
import { computed } from "vue";
import { DataTable, StatusTag, type DataTableColumn } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { Supplier } from "./types";

const props = defineProps<{
  supplier: Supplier;
  reviewTypeLabels: Record<string, string>;
  dateTime: (value?: string | null) => string;
}>();

const reviewColumns: DataTableColumn[] = [
  { key: "status", label: "状态" },
  { key: "reviewType", label: "评审类型" },
  { key: "opinion", label: "评审意见" },
  { key: "reviewer", label: "评审人" },
  { key: "score", label: "评分" },
  { key: "reviewedAt", label: "评审时间" }
];

const reviewRows = computed(() =>
  (props.supplier.admissionReviews ?? []).map((review) => ({
    ...review,
    statusLabel: labelStatus(review.status),
    reviewTypeLabel: props.reviewTypeLabels[review.reviewType] ?? review.reviewType,
    opinion: review.opinion || "-",
    reviewer: review.reviewer || "评审人",
    score: review.score ?? "-",
    reviewedAt: props.dateTime(review.reviewedAt)
  }))
);
</script>

<template>
  <div class="eds-section">
    <DataTable :columns="reviewColumns" :rows="reviewRows" row-key="id" empty-text="暂无评审记录。">
      <template #status="{ row }">
        <StatusTag>{{ row.statusLabel }}</StatusTag>
      </template>
      <template #reviewType="{ row }">{{ row.reviewTypeLabel }}</template>
    </DataTable>
  </div>
</template>
