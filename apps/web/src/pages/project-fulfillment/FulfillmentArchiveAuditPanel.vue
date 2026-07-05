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
  <EnterpriseSurface title="归档与审计" description="归档项、补档申请和审计流水作为履约收口证据统一查看。">
    <div class="eds-page-section">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>归档项</span>
          <strong>{{ archiveItems.length }} 项</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>补档申请</span>
          <strong>{{ supplementRequests.length }} 条</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>审计流水</span>
          <strong>{{ auditLogs.length }} 条</strong>
        </article>
      </div>

      <DataTable :columns="ARCHIVE_COLUMNS" :rows="archiveItems" row-key="id" empty-mode="compact" empty-text="履约推进后，这里集中查看项目归档项和收集状态。">
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
    </div>

    <div class="eds-page-section">
      <header class="eds-page-header">
        <div>
          <p class="eds-meta">追溯流水</p>
          <h3>审计日志</h3>
          <p>重点查看敏感动作、结果和时间顺序，确认履约链路没有脱节。</p>
        </div>
      </header>

      <DataTable :columns="AUDIT_COLUMNS" :rows="auditLogs" row-key="id" empty-mode="compact" empty-text="当前角色没有可查看的审计日志。">
        <template #action="{ row }">{{ labelAuditAction(row.action) }}</template>
        <template #result="{ row }"><StatusTag :tone="statusTone(row.result)">{{ label(row.result) }}</StatusTag></template>
        <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </DataTable>
    </div>
  </EnterpriseSurface>
</template>
