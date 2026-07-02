<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { bpmnPilotColumns, businessTypeText, pilotScopeText, shortId } from "./display";
import type { BpmnPilotRow } from "./types";

defineProps<{
  rows: BpmnPilotRow[];
}>();
</script>

<template>
  <EnterpriseSurface title="BPMN 试点" description="按组织、环境和业务对象控制流程灰度范围。">
    <DataTable :columns="bpmnPilotColumns" :rows="rows" row-key="id" empty-text="暂无 BPMN 试点">
      <template #businessType="{ row }">{{ businessTypeText(row.businessType) }}</template>
      <template #mode="{ row }"><StatusTag>{{ labelStatus(row.mode) }}</StatusTag></template>
      <template #status="{ row }"><StatusTag tone="primary">{{ labelStatus(row.status) }}</StatusTag></template>
      <template #scope="{ row }">{{ pilotScopeText(row.scope) }}</template>
      <template #definition="{ row }">{{ shortId(row.definitionId) }} / {{ shortId(row.previousDefinitionId) }}</template>
      <template #fallbackTo="{ row }">{{ labelStatus(row.fallbackTo) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
