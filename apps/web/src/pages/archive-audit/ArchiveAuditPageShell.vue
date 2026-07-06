<script setup lang="ts">
import { EnterpriseSurface, FilterBar, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintainArchive: boolean;
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>档案归集 / 合规审计</p>
      <h2><span aria-hidden="true">档</span>项目档案审计</h2>
      <small>集中查看项目档案材料、补档申请、审计记录和敏感操作日志。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainArchive ? 'success' : 'warning'">{{ canMaintainArchive ? "可维护" : "只读" }}</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="档案材料概览" description="采购项目归档以快照、完整性检查、补档审批和审计日志形成闭环。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      档案范围
      <select value="current" disabled>
        <option value="current">当前项目档案与审计</option>
      </select>
    </label>
  </FilterBar>
</template>
