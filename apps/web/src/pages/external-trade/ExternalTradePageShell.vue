<script setup lang="ts">
import { EnterpriseSurface, EnterpriseTabs, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "备案历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];

defineProps<{
  canMaintainExternalTrade: boolean;
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="外部交易备案" eyebrow="采购方式承接" description="依法或制度要求进入外部交易平台的项目，在本页完成内部审批、外部编号、公告材料和结果材料备案。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainExternalTrade ? 'success' : 'warning'">{{ canMaintainExternalTrade ? "可维护" : "只读" }}</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseTabs :tabs="detailTabs" active-key="details" />

  <EnterpriseSurface title="备案概览" description="外部交易项目不走内部公告、报名、报价、评审和定标链路，只保留备案与审计证据。">
    <SummaryCards :items="summaryItems" />
    <p v-if="!canMaintainExternalTrade" class="eds-meta">当前账号仅查看外部备案状态；新建、登记和上传备案材料由采购经办操作。</p>
  </EnterpriseSurface>
</template>
