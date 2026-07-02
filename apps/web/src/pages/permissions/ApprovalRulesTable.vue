<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { actionText, approvalRuleColumns, businessTypeText, roleText } from "./display";
import type { ApprovalRuleRow } from "./types";

defineProps<{
  rows: ApprovalRuleRow[];
}>();
</script>

<template>
  <EnterpriseSurface title="审批规则" description="按业务类型维护审批节点、角色和可执行动作。">
    <DataTable :columns="approvalRuleColumns" :rows="rows" row-key="id" empty-text="暂无审批规则">
      <template #businessType="{ row }">{{ businessTypeText(row.businessType) }}</template>
      <template #nodeRoleIds="{ row }">{{ row.nodeRoleIds.map((role: string) => roleText(role)).join(" / ") }}</template>
      <template #actions="{ row }">{{ row.actions.map((action: string) => actionText(action)).join(" / ") }}</template>
      <template #status="{ row }"><StatusTag tone="success">{{ labelStatus(row.status) }}</StatusTag></template>
    </DataTable>
  </EnterpriseSurface>
</template>
