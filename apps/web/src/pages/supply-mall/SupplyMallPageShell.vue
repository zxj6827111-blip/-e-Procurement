<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { EnterpriseSurface, EnterpriseTabs, FeedbackMessage, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { MallNavigationItem, MallSection } from "./types";

const props = defineProps<{
  summaryItems: SummaryCardItem[];
  sections: MallNavigationItem[];
  routeSection: MallSection;
  sectionVisible: boolean;
  mallRoleHint: string;
  productListingSteps: string[];
  canMaintainProductCatalog: boolean;
  currentSupplierId: string;
  listingOperatorVisible: boolean;
  message: string;
  error: string;
}>();

const router = useRouter();

const navigationTabs = computed(() => {
  const tabs = props.sections.map((section) => ({ key: section.key, label: section.label }));
  if (!props.sectionVisible && !tabs.some((tab) => tab.key === props.routeSection)) {
    return [...tabs, { key: props.routeSection, label: "当前业务区不可访问" }];
  }
  return tabs;
});

function changeSection(key: string) {
  const section = props.sections.find((item) => item.key === key);
  if (section) void router.push(section.path);
}
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>商品目录 / 集采目录与下单</p>
      <h2><span aria-hidden="true">商</span>商品采购目录</h2>
      <small>按供应商、来源、价格和上架状态查看可采购商品，并处理下单、复购、商品维护和定价上架。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="canMaintainProductCatalog && !currentSupplierId" tone="error">缺少供应商归属</StatusTag>
      <StatusTag v-else-if="canMaintainProductCatalog" tone="primary">供应商维护</StatusTag>
      <StatusTag v-else-if="listingOperatorVisible" tone="warning">平台定价上架</StatusTag>
      <StatusTag v-else>采购目录</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>

  <EnterpriseSurface v-if="mallRoleHint || (canMaintainProductCatalog && !listingOperatorVisible)" class="g-hotel-ledger-card">
    <FeedbackMessage v-if="mallRoleHint">{{ mallRoleHint }}</FeedbackMessage>
    <div v-if="canMaintainProductCatalog && !listingOperatorVisible" class="eds-stack-tight">
      <strong>商品上架规则</strong>
      <p class="eds-meta">供应商账号只维护基础商品资料；平台完成来源关联、定价报告和上架后，酒店采购才能下单。</p>
      <div class="eds-actions">
        <StatusTag v-for="(step, index) in productListingSteps" :key="step" :tone="index === 0 ? 'success' : 'default'">
          {{ index + 1 }}. {{ step }}
        </StatusTag>
      </div>
    </div>
  </EnterpriseSurface>

  <EnterpriseSurface class="g-hotel-table-card" title="目录业务分区" description="商品目录、订单复购、采购包、供应商维护和平台定价按角色分开处理。">
    <EnterpriseTabs class="g-hotel-project-tabs" :tabs="navigationTabs" :active-key="routeSection" @change="changeSection" />
  </EnterpriseSurface>

  <EnterpriseSurface v-if="!sectionVisible" title="当前角色不可办理该业务" description="请从本角色可办理的商品目录、订单复购、采购包、商品维护或定价上架入口进入。">
    <p class="eds-meta">当前账号不承担该业务区职责，系统不会展示跨角色操作表单。</p>
  </EnterpriseSurface>

  <FeedbackMessage v-if="message">{{ message }}</FeedbackMessage>
  <FeedbackMessage v-if="error" tone="error">{{ error }}</FeedbackMessage>
</template>
