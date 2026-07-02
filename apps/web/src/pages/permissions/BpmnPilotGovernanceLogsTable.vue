<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { bpmnChangeLogColumns, logSummary, roleText, shortId } from "./display";
import type { BpmnPilotChangeLogRow } from "./types";

defineProps<{
  rows: BpmnPilotChangeLogRow[];
}>();
</script>

<template>
  <EnterpriseSurface title="BPMN 试点治理日志" description="展示最近的试点治理动作、执行角色和治理摘要。">
    <DataTable :columns="bpmnChangeLogColumns" :rows="rows.slice(0, 8)" row-key="id" empty-text="暂无治理日志">
      <template #actionCode="{ row }"><StatusTag>{{ labelStatus(row.actionCode) }}</StatusTag></template>
      <template #pilotId="{ row }">{{ shortId(row.pilotId) }}</template>
      <template #actorRoleId="{ row }">{{ row.actorRoleId ? roleText(row.actorRoleId) : "-" }}</template>
      <template #summary="{ row }">{{ logSummary(row) }}</template>
      <template #createdAt="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
