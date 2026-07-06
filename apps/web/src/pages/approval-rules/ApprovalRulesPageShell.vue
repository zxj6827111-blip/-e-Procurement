<script setup lang="ts">
import type { R8ApprovalBusinessType } from "../../api/workflow";
import { EnterpriseSurface, FilterBar, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { BusinessTypeOption } from "./types";

const businessTypeFilter = defineModel<"all" | R8ApprovalBusinessType>("businessTypeFilter", { required: true });

defineProps<{
  businessTypeOptions: BusinessTypeOption[];
  canMaintainRules: boolean;
  loading: boolean;
  readonlyReason: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>系统治理 / 审批规则</p>
      <h2><span aria-hidden="true">规</span>审批规则配置</h2>
      <small>维护采购申请、供应商准入、评审定标、结算付款等业务的审批匹配规则。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainRules ? 'success' : 'warning'">{{ canMaintainRules ? "可维护" : "只读" }}</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="规则启用概览" description="规则由系统管理员维护，业务角色仅查看授权范围内的配置结果。">
    <SummaryCards :items="summaryItems" />
    <p v-if="readonlyReason" class="eds-meta">{{ readonlyReason }}</p>
  </EnterpriseSurface>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      业务类型
      <select v-model="businessTypeFilter">
        <option value="all">全部规则</option>
        <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
  </FilterBar>
</template>
