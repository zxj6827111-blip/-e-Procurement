<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintain: boolean;
  summaryItems: SummaryCardItem[];
}>();

const emit = defineEmits<{
  resetForm: [];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>评审定标配置 / 标准化模板</p>
      <h2><span aria-hidden="true">模</span>评分模板</h2>
      <small>专家评审打分维度的标准化模板管理。</small>
    </div>
    <div class="g-hotel-page-actions">
      <EnterpriseButton :disabled="!canMaintain" @click="emit('resetForm')">新建模板</EnterpriseButton>
      <StatusTag :tone="canMaintain ? 'success' : 'warning'">{{ canMaintain ? "可维护" : "只读" }}</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="评分模板概览" description="当前评分模板数量、启用状态和表单分值校验。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
