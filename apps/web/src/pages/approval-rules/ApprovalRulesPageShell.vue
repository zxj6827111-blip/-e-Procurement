<script setup lang="ts">
import type { R8ApprovalBusinessType } from "../../api/workflow";
import { EnterpriseSurface, FilterBar, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
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
  <PageHeader title="审批规则维护" eyebrow="系统治理" description="维护采购申请、供应商准入、评审定标、结算付款等业务的审批匹配规则。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <StatusTag :tone="canMaintainRules ? 'success' : 'warning'">{{ canMaintainRules ? "可维护" : "只读" }}</StatusTag>
    </template>
  </PageHeader>

  <EnterpriseSurface title="规则启用情况" description="规则由系统管理员维护，业务角色仅查看授权范围内的配置结果。">
    <SummaryCards :items="summaryItems" />
    <p v-if="readonlyReason" class="eds-meta">{{ readonlyReason }}</p>
  </EnterpriseSurface>

  <FilterBar>
    <label>
      业务类型
      <select v-model="businessTypeFilter">
        <option value="all">全部规则</option>
        <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
  </FilterBar>
</template>
