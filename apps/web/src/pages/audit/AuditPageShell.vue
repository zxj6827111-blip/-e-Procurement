<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet } from "../../api/http";
import { DataTable, EnterpriseSurface, FilterBar, PageHeader, PaginationBar, StatusTag } from "../../components/base";
import { labelAuditAction, labelAuditReason, labelObjectType, labelStatus } from "../../utils/status-labels";

interface AuditLog {
  id: string;
  action: string;
  objectType: string;
  result: string;
  reason?: string;
}

const logs = ref<AuditLog[]>([]);
const columns = [
  { key: "id", label: "日志号" },
  { key: "action", label: "动作" },
  { key: "objectType", label: "对象" },
  { key: "result", label: "结果" },
  { key: "reason", label: "原因" }
];

onMounted(async () => {
  logs.value = (await apiGet<{ auditLogs: AuditLog[] }>("/api/audit-logs")).auditLogs.slice(-8).reverse();
});
</script>

<template>
  <section class="eds-section">
    <PageHeader title="审计日志" eyebrow="审计追踪" description="查看当前角色可见的近期审计记录。" />
    <FilterBar>
      <label>
        日志范围
        <select value="recent" disabled>
          <option value="recent">近期可见审计日志</option>
        </select>
      </label>
    </FilterBar>
    <EnterpriseSurface title="近期日志" :description="`最近 ${logs.length} 条记录。`">
      <DataTable :columns="columns" :rows="logs" row-key="id" empty-text="暂无可见审计日志。">
        <template #action="{ row }">{{ labelAuditAction(row.action) }}</template>
        <template #objectType="{ row }">{{ labelObjectType(row.objectType) }}</template>
        <template #result="{ row }">
          <StatusTag :tone="row.result === 'denied' ? 'error' : 'success'">{{ labelStatus(row.result) }}</StatusTag>
        </template>
        <template #reason="{ row }">{{ labelAuditReason(row.reason) }}</template>
      </DataTable>
      <PaginationBar :total="logs.length" />
    </EnterpriseSurface>
  </section>
</template>

