<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { ARCHIVE_COLUMNS, AUDIT_COLUMNS } from "./constants";
import type { ArchiveItem, ArchiveSupplementRequest, AuditLogRow, StatusTone } from "./types";

defineProps<{
  archiveItems: ArchiveItem[];
  supplementRequests: ArchiveSupplementRequest[];
  auditLogs: AuditLogRow[];
  label: (value: string | undefined | null) => string;
  statusTone: (value: string | undefined | null) => StatusTone;
  labelAuditAction: (action: string) => string;
  formatDateTime: (value?: string | null) => string;
}>();
</script>

<template>
  <EnterpriseSurface title="档案归集">
    <DataTable :columns="ARCHIVE_COLUMNS" :rows="archiveItems" row-key="id" empty-text="暂无归档项">
      <template #requiredFlag="{ row }">{{ row.requiredFlag ? "必需" : "可选" }}</template>
      <template #status="{ row }"><StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag></template>
      <template #sealed="{ row }">{{ row.sealed ? "已封存" : row.collectedFlag ? "已归集" : "未归集" }}</template>
    </DataTable>
    <div v-if="supplementRequests.length" class="eds-record-grid">
      <article v-for="request in supplementRequests" :key="request.id" class="eds-record">
        <strong>补档申请</strong>
        <span>{{ request.reason }}</span>
        <small>{{ label(request.approvalStatus) }}</small>
      </article>
    </div>
  </EnterpriseSurface>

  <EnterpriseSurface title="审计日志">
    <DataTable :columns="AUDIT_COLUMNS" :rows="auditLogs" row-key="id" empty-text="当前角色没有审计日志视图。">
      <template #action="{ row }">{{ labelAuditAction(row.action) }}</template>
      <template #result="{ row }"><StatusTag :tone="statusTone(row.result)">{{ label(row.result) }}</StatusTag></template>
      <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
