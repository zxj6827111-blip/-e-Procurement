<script setup lang="ts">
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintainArchive: boolean;
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="项目档案与审计" eyebrow="档案归集" description="集中查看项目档案项、补档申请、项目审计记录和敏感操作日志。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainArchive ? 'success' : 'warning'">{{ canMaintainArchive ? "可维护" : "只读" }}</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="档案概览" description="采购项目归档以快照、完整性检查、补档审批和审计日志形成闭环。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar>
    <label>
      档案范围
      <select value="current" disabled>
        <option value="current">当前项目档案与审计</option>
      </select>
    </label>
  </FilterBar>
</template>
