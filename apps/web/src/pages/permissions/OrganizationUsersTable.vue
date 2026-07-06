<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { roleText, userColumns } from "./display";
import type { UserRow } from "./types";

defineProps<{
  rows: UserRow[];
  adminLoadError: string;
  orgName: (orgId: string) => string;
}>();
</script>

<template>
  <EnterpriseSurface v-if="rows.length || adminLoadError" class="g-hotel-table-card" title="组织账号" description="管理员可查看组织用户、角色、部门、岗位和账号状态。">
    <p v-if="adminLoadError" class="eds-meta">{{ adminLoadError }}；当前角色只展示个人权限和审批规则。</p>
    <DataTable v-else :columns="userColumns" :rows="rows" row-key="id" empty-text="暂无组织账号">
      <template #roleId="{ row }">{{ roleText(row.roleId) }}</template>
      <template #orgId="{ row }">{{ orgName(row.orgId) }}</template>
      <template #departmentId="{ row }">{{ row.departmentId ?? "-" }}</template>
      <template #position="{ row }">{{ row.position ?? "-" }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status ?? "active") }}</StatusTag></template>
    </DataTable>
  </EnterpriseSurface>
</template>
