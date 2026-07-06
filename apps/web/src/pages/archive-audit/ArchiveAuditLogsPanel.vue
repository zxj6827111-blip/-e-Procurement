<script setup lang="ts">
import { DataTable, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime, labelAuditAction, labelObjectType, labelStatus } from "../../utils/status-labels";
import { AUDIT_COLUMNS, auditResultTone } from "./display";
import type { AuditLog } from "./types";

defineProps<{
  projectAuditLogs: AuditLog[];
  sensitiveLogs: AuditLog[];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="项目审计记录" :description="`当前项目 ${projectAuditLogs.length} 条审计记录。`">
    <DataTable :columns="AUDIT_COLUMNS" :rows="projectAuditLogs" row-key="id" empty-text="当前项目暂无审计记录。">
      <template #action="{ row }">{{ labelAuditAction(row.action) }}</template>
      <template #objectType="{ row }">{{ labelObjectType(row.objectType) }}</template>
      <template #result="{ row }">
        <StatusTag :tone="auditResultTone(row.result)">{{ labelStatus(row.result) }}</StatusTag>
      </template>
      <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </DataTable>
    <PaginationBar :total="projectAuditLogs.length" />
  </EnterpriseSurface>

  <EnterpriseSurface class="g-hotel-table-card" title="敏感操作日志" :description="`当前角色可见 ${sensitiveLogs.length} 条敏感操作记录。`">
    <DataTable :columns="AUDIT_COLUMNS" :rows="sensitiveLogs" row-key="id" empty-text="当前角色暂无敏感操作日志。">
      <template #action="{ row }">{{ labelAuditAction(row.action) }}</template>
      <template #objectType="{ row }">{{ labelObjectType(row.objectType) }}</template>
      <template #result="{ row }">
        <StatusTag :tone="auditResultTone(row.result)">{{ labelStatus(row.result) }}</StatusTag>
      </template>
      <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </DataTable>
    <PaginationBar :total="sensitiveLogs.length" />
  </EnterpriseSurface>
</template>
