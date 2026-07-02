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
  <PageHeader title="公告与邀请" eyebrow="采购发布" description="选择已锁定采购文件，起草并发布公告，再向符合条件的供应商发送邀请。">
    <template #actions>
      <RouterLink class="eds-button eds-button-text" :to="{ path: '/procurement-documents', query: { projectId: selectedProjectId } }">
        采购文件
      </RouterLink>
      <StatusTag v-if="lockedDocumentCount" tone="success">可发布文件 {{ lockedDocumentCount }}</StatusTag>
      <StatusTag v-else tone="warning">等待锁定文件</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="公告概览" description="公告发布以项目和已锁定采购文件为前置条件。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <FilterBar>
    <label>
      发布范围
      <select value="current" disabled>
        <option value="current">当前项目公告与邀请</option>
      </select>
    </label>
  </FilterBar>
</template>
