<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintain: boolean;
  summaryItems: SummaryCardItem[];
}>();

const emit = defineEmits<{
  resetForm: [];
}>();
</script>

<template>
  <PageHeader
    title="专家评分模板配置"
    eyebrow="评审定标配置"
    description="评分模板决定专家逐项评分表的字段、分值和材料要求；已使用模板需要另存新版本后再调整评分项。"
  >
    <template #actions>
      <EnterpriseButton :disabled="!canMaintain" @click="emit('resetForm')">新建模板</EnterpriseButton>
      <StatusTag :tone="canMaintain ? 'success' : 'warning'">{{ canMaintain ? "可维护" : "只读" }}</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="模板概览" description="当前评分模板数量、启用状态和表单分值校验。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
