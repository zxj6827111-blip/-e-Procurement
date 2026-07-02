<script setup lang="ts">
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  canMaintainFiles: boolean;
  message: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="文件与图片中心" eyebrow="附件治理" description="统一查看业务附件、图片预览、下载审计、替换和作废记录。">
    <template #actions>
      <StatusTag :tone="canMaintainFiles ? 'success' : 'warning'">{{ canMaintainFiles ? "可维护" : "只读" }}</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="文件概览" description="附件权限由业务对象、角色和供应商归属共同控制。">
    <SummaryCards :items="summaryItems" />
    <p v-if="message" class="eds-meta">{{ message }}</p>
  </EnterpriseSurface>

  <FilterBar>
    <label>
      文件范围
      <select value="visible" disabled>
        <option value="visible">当前角色可见文件</option>
      </select>
    </label>
  </FilterBar>
</template>
