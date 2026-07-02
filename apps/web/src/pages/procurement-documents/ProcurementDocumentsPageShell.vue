<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  pendingCount: number;
  selectedProjectId: string;
  summaryItems: SummaryCardItem[];
  voidedCount: number;
}>();
</script>

<template>
  <PageHeader title="采购文件管理" eyebrow="采购准备" description="采购经办编制并发布锁定采购文件，公告只能引用已锁定文件。">
    <template #actions>
      <StatusTag v-if="pendingCount" tone="warning">待发布 {{ pendingCount }}</StatusTag>
      <StatusTag v-if="voidedCount" tone="error">已停用 {{ voidedCount }}</StatusTag>
      <RouterLink class="eds-button eds-button-text" :to="{ path: '/announcements-invitations', query: { projectId: selectedProjectId } }">
        公告与邀请
      </RouterLink>
    </template>
  </PageHeader>

  <EnterpriseSurface title="文件概览" description="内部采购文件由采购经办维护，集团审批仍以前置需求审批为准。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar>
    <label>
      文件范围
      <select value="all" disabled>
        <option value="all">全部采购文件</option>
      </select>
    </label>
  </FilterBar>
</template>
