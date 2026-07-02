<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag, SummaryCards } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { bpmnHealthColumns, businessTypeText, healthState, percent, pilotScopeText } from "./display";
import type { BpmnPilotHealthRow } from "./types";

defineProps<{
  rows: BpmnPilotHealthRow[];
  summary: {
    pilotCount: number;
    compatibleRate: number | null;
    fallbackCount: number;
    attentionCount: number;
  };
}>();
</script>

<template>
  <EnterpriseSurface title="BPMN 试点健康" description="集中查看兼容率、回退、失败和需关注状态。">
    <SummaryCards
      :items="[
        { label: '试点数', value: summary.pilotCount },
        { label: '兼容率', value: percent(summary.compatibleRate) },
        { label: '回退 / 失败', value: summary.fallbackCount },
        { label: '需关注', value: summary.attentionCount }
      ]"
    />
    <DataTable :columns="bpmnHealthColumns" :rows="rows" row-key="id" empty-text="暂无试点健康数据">
      <template #pilot="{ row }">{{ row.pilotName }} / {{ businessTypeText(row.businessType) }}</template>
      <template #scope="{ row }">{{ pilotScopeText(row.scope) }}</template>
      <template #compatibilityRate="{ row }">{{ percent(row.compatibilityRate) }}</template>
      <template #stats="{ row }">{{ row.compatibleCount }} 兼容 / {{ row.fallbackCount }} 回退 / {{ row.failedCount }} 失败 / {{ row.skippedCount }} 跳过</template>
      <template #latestRun="{ row }">
        {{ row.latestRunStatus ? `${labelStatus(row.latestRunStatus)} / ${labelStatus(row.latestStoppedReason)} / ${row.latestRunAt ? new Date(row.latestRunAt).toLocaleString() : "-"}` : "-" }}
      </template>
      <template #fallback="{ row }">{{ row.fallbackActive ? `${labelStatus(row.fallbackTo)} / ${labelStatus(row.latestFallbackReason ?? row.lastRollbackReason)}` : "未触发" }}</template>
      <template #health="{ row }"><StatusTag :tone="row.needsAttention ? 'warning' : 'success'">{{ healthState(row) }}</StatusTag></template>
    </DataTable>
  </EnterpriseSurface>
</template>
