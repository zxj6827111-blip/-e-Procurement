<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  selectedProjectId: string;
  lockedDocumentCount: number;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="公告邀请" eyebrow="采购发布" description="发布与管理采购公告和邀请函">
    <template #actions>
      <RouterLink class="eds-button eds-button-text" :to="{ path: '/procurement-documents', query: { projectId: selectedProjectId } }">
        采购文件
      </RouterLink>
      <StatusTag v-if="lockedDocumentCount" tone="success">可发布文件 {{ lockedDocumentCount }}</StatusTag>
      <StatusTag v-else tone="warning">等待锁定文件</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface class="g-hotel-ledger-card" title="公告邀请概览" description="公告发布以项目和已锁定采购文件为前置条件。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      搜索
      <input placeholder="搜索公告标题或项目..." />
    </label>
    <label>
      状态
      <select>
        <option>全部状态</option>
        <option>待发布</option>
        <option>发布中</option>
        <option>已关闭</option>
      </select>
    </label>
  </FilterBar>
</template>
