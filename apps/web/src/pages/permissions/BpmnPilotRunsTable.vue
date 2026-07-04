<script setup lang="ts">
import { computed } from "vue";
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { bpmnRunColumns, businessTypeText } from "./display";
import type { BpmnPilotRunRow } from "./types";

const props = defineProps<{
  rows: BpmnPilotRunRow[];
}>();

const recentRows = computed(() => props.rows.slice().reverse().slice(0, 8));
</script>

<template>
  <EnterpriseSurface title="规则试点观察" description="展示最近的试点观察活动、预测环节、停止原因和回退策略。">
    <DataTable :columns="bpmnRunColumns" :rows="recentRows" row-key="id" empty-text="暂无试点观察记录">
      <template #eventCode="{ row }">{{ labelStatus(row.eventCode) }}</template>
      <template #business="{ row }">{{ businessTypeText(row.businessType) }} / {{ row.businessRef }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #predictedNodeKey="{ row }">{{ row.predictedNodeKey ? labelStatus(row.predictedNodeKey) : "-" }}</template>
      <template #stoppedReason="{ row }">{{ labelStatus(row.stoppedReason) }}</template>
      <template #fallbackTo="{ row }">{{ labelStatus(row.fallbackTo) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
