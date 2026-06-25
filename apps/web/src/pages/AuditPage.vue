<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet } from "../api/http";
import { labelAuditAction, labelAuditReason, labelObjectType, labelStatus } from "../utils/status-labels";

interface AuditLog {
  id: string;
  action: string;
  objectType: string;
  result: string;
  reason?: string;
}

const logs = ref<AuditLog[]>([]);

onMounted(async () => {
  logs.value = (await apiGet<{ auditLogs: AuditLog[] }>("/api/audit-logs")).auditLogs.slice(-8).reverse();
});
</script>

<template>
  <section class="panel">
    <h2>审计日志</h2>
    <table>
      <thead>
        <tr>
          <th>日志号</th>
          <th>动作</th>
          <th>对象</th>
          <th>结果</th>
          <th>原因</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ log.id }}</td>
          <td>{{ labelAuditAction(log.action) }}</td>
          <td>{{ labelObjectType(log.objectType) }}</td>
          <td>{{ labelStatus(log.result) }}</td>
          <td>{{ labelAuditReason(log.reason) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
