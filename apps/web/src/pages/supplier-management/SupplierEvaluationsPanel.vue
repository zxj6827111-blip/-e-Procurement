<script setup lang="ts">
import { SummaryCards } from "../../components/base";
import type { Supplier } from "./types";

defineProps<{
  supplier: Supplier;
  supplierStatus: (supplier: Supplier | null) => string;
  dateTime: (value?: string | null) => string;
}>();
</script>

<template>
  <div class="eds-section">
    <SummaryCards
      :items="[
        { label: '综合评分', value: supplier.evaluationScore ?? '-' },
        { label: '准入状态', value: supplierStatus(supplier) },
        { label: '风险状态', value: supplier.risk || '-' },
        { label: '最近评审', value: dateTime(supplier.admissionReviews?.[0]?.reviewedAt) }
      ]"
    />
  </div>
</template>
