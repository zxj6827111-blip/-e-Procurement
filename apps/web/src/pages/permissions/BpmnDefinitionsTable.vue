<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { bpmnDefinitionColumns, businessTypeText } from "./display";
import type { BpmnDefinitionRow } from "./types";

defineProps<{
  rows: BpmnDefinitionRow[];
}>();
</script>

<template>
  <EnterpriseSurface title="规则版本库" description="规则版本以版本号、校验状态和签名摘要作为治理字段。">
    <DataTable :columns="bpmnDefinitionColumns" :rows="rows" row-key="id" empty-text="暂无规则版本">
      <template #ruleVersion="{ row }">{{ row.processName }} / {{ row.processCode }}</template>
      <template #businessType="{ row }">{{ businessTypeText(row.businessType) }}</template>
      <template #status="{ row }"><StatusTag>{{ labelStatus(row.status) }}</StatusTag></template>
      <template #validationStatus="{ row }"><StatusTag tone="success">{{ labelStatus(row.validationStatus) }}</StatusTag></template>
      <template #xmlSha256="{ row }">{{ row.xmlSha256.slice(0, 12) }}</template>
    </DataTable>
  </EnterpriseSurface>
</template>
