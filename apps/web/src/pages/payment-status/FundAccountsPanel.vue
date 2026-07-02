<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { ACCOUNT_COLUMNS } from "./display";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import type { FundAccount } from "./types";

defineProps<{
  accounts: FundAccount[];
  canMaintainFunds: boolean;
  money: (value?: number) => string;
  orgName: (orgId: string) => string;
}>();

const emit = defineEmits<{
  recharge: [account: FundAccount];
}>();
</script>

<template>
  <EnterpriseSurface title="资金账户" :description="`共 ${accounts.length} 个账户。`">
    <DataTable :columns="ACCOUNT_COLUMNS" :rows="accounts" row-key="id" empty-text="暂无资金账户。">
      <template #account="{ row }">{{ orgName(row.orgId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="row.status === 'active' ? 'success' : 'warning'">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #balance="{ row }">{{ money(row.balance) }}</template>
      <template #credit="{ row }">{{ money(row.creditLimit) }}</template>
      <template #occupied="{ row }">{{ money(row.occupiedAmount) }}</template>
      <template #updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      <template #actions="{ row }">
        <EnterpriseButton v-if="canMaintainFunds" type="primary" @click="emit('recharge', row)">登记充值</EnterpriseButton>
        <span v-else class="eds-meta">只读</span>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
