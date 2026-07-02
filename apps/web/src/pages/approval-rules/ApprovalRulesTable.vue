<script setup lang="ts">
import type { R8ApprovalRuleView } from "../../api/workflow";
import { DataTable, EnterpriseButton, EnterpriseSurface, FeedbackMessage, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import { RULE_COLUMNS, ruleStatusTone } from "./display";

defineProps<{
  busyRuleId: string;
  canMaintainRules: boolean;
  loading: boolean;
  rules: R8ApprovalRuleView[];
}>();

defineEmits<{
  editRule: [rule: R8ApprovalRuleView];
  toggleRule: [rule: R8ApprovalRuleView];
}>();
</script>

<template>
  <EnterpriseSurface title="审批规则列表" :description="loading ? '正在加载审批规则。' : `当前筛选 ${rules.length} 条规则。`">
    <FeedbackMessage v-if="loading" align="center">正在加载审批规则...</FeedbackMessage>
    <DataTable v-else :columns="RULE_COLUMNS" :rows="rules" row-key="id" empty-text="当前筛选条件下没有可查看规则。">
      <template #rule="{ row }">
        <strong>{{ row.ruleName }}</strong>
        <p class="eds-meta">{{ row.ruleCode }} / {{ formatDateTime(row.updatedAt) }}</p>
      </template>
      <template #businessType="{ row }">{{ row.businessTypeLabel }}</template>
      <template #amountRange="{ row }">{{ row.amountRangeLabel }}</template>
      <template #nodeRoles="{ row }">{{ row.nodeRoleLabels }}</template>
      <template #actions="{ row }">{{ row.actionLabels }}</template>
      <template #strategy="{ row }">{{ row.strategyLabel }}</template>
      <template #status="{ row }">
        <StatusTag :tone="ruleStatusTone(row)">{{ row.statusLabel }}</StatusTag>
      </template>
      <template #version="{ row }">{{ row.versionNo }}</template>
      <template #operations="{ row }">
        <div class="eds-actions">
          <EnterpriseButton :disabled="!canMaintainRules || busyRuleId === row.id" @click="$emit('editRule', row)">编辑</EnterpriseButton>
          <EnterpriseButton type="primary" :disabled="!canMaintainRules || busyRuleId === row.id" @click="$emit('toggleRule', row)">
            {{ row.status === "enabled" ? "停用" : "启用" }}
          </EnterpriseButton>
          <StatusTag v-if="!canMaintainRules">只读</StatusTag>
        </div>
      </template>
    </DataTable>
    <PaginationBar v-if="!loading" :total="rules.length" />
  </EnterpriseSurface>
</template>
