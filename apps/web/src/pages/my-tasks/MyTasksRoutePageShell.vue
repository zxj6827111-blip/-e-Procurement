<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
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

    <MyTasksFilterPanel
      v-model:business-type-filter="businessTypeFilter"
      v-model:date-filter="dateFilter"
      v-model:opinion="opinion"
      v-model:status-filter="statusFilter"
      :business-type-options="businessTypeOptions"
    />

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />

    <MyTasksTable :action-busy="actionBusy" :loading="loading" :tasks="filteredTasks" @run-task-action="runTaskAction" />
  </section>
</template>

