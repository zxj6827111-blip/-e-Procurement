<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface } from "../../components/base";
import MyTasksFilterPanel from "./MyTasksFilterPanel.vue";
import MyTasksPageShell from "./MyTasksPageShell.vue";
import MyTasksTable from "./MyTasksTable.vue";
import { useMyTasksPage } from "./useMyTasksPage";

const {
  actionBusy,
  auditLogId,
  businessTypeFilter,
  businessTypeOptions,
  dateFilter,
  error,
  filteredTasks,
  loading,
  opinion,
  runTaskAction,
  statusFilter,
  summaryItems
} = useMyTasksPage();
</script>

<template>
  <section class="eds-section">
    <MyTasksPageShell :loading="loading" :summary-items="summaryItems" />

    <div class="eds-process-shell">
      <section class="eds-panel-stack">
        <MyTasksFilterPanel
          v-model:business-type-filter="businessTypeFilter"
          v-model:date-filter="dateFilter"
          v-model:opinion="opinion"
          v-model:status-filter="statusFilter"
          :business-type-options="businessTypeOptions"
        />

        <ErrorAlert v-if="error" :message="error" />

        <MyTasksTable :action-busy="actionBusy" :loading="loading" :tasks="filteredTasks" @run-task-action="runTaskAction" />
      </section>

      <aside class="eds-panel-stack">
        <EnterpriseSurface title="当前处理边界" description="本页强调按筛选条件批量处理，不在这里重复业务详情录入。">
          <p class="eds-meta">当前可见任务：{{ filteredTasks.length }}</p>
          <p class="eds-meta">填写处理意见后再执行审批类动作，方便后续审计追踪。</p>
        </EnterpriseSurface>
        <AuditLogRef :audit-log-id="auditLogId" />
      </aside>
    </div>
  </section>
</template>
