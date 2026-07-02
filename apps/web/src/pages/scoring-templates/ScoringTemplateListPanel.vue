<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { statusLabel, TEMPLATE_COLUMNS } from "./display";
import type { ScoringTemplate, StatusTone } from "./types";

defineProps<{
  loading: boolean;
  selectedTemplateId: string;
  statusTone: (status: ScoringTemplate["status"]) => StatusTone;
  templates: ScoringTemplate[];
}>();

const emit = defineEmits<{
  editTemplate: [template: ScoringTemplate];
  enableTemplate: [templateId: string];
}>();
</script>

<template>
  <EnterpriseSurface title="模板列表" :description="loading ? '模板加载中。' : `共 ${templates.length} 个评分模板。`">
    <DataTable :columns="TEMPLATE_COLUMNS" :rows="templates" row-key="id" empty-text="暂无评分模板。">
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ statusLabel(row.status) }}</StatusTag>
      </template>
      <template #template="{ row }">
        <strong>{{ row.templateName }}</strong>
        <p class="eds-meta">{{ row.templateCode }}</p>
      </template>
      <template #version="{ row }">v{{ row.versionNo }}</template>
      <template #usage="{ row }">{{ row.inUse ? `已用于 ${row.sheetCount} 张评分单` : "未被使用" }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton :type="row.id === selectedTemplateId ? 'primary' : 'default'" @click="emit('editTemplate', row)">编辑</EnterpriseButton>
          <EnterpriseButton :disabled="row.status === 'enabled'" @click="emit('enableTemplate', row.id)">启用</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
