<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="待办中心" eyebrow="业务待办" description="集中处理当前岗位可办理的采购申请、供应商、评审、履约和结算事项。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <RouterLink class="eds-button eds-button-text" to="/messages">消息中心</RouterLink>
    </template>
  </PageHeader>

  <EnterpriseSurface title="待办处理情况" description="展示当前账号可处理和已流转的业务事项。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
