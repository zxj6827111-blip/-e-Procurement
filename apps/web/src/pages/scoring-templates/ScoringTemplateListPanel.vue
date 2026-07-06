<script setup lang="ts">
import { computed, ref } from "vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { statusLabel, TEMPLATE_COLUMNS } from "./display";
import type { ScoringTemplate, StatusTone } from "./types";

const props = defineProps<{
  loading: boolean;
  selectedTemplateId: string;
  statusTone: (status: ScoringTemplate["status"]) => StatusTone;
  templates: ScoringTemplate[];
}>();

const emit = defineEmits<{
  editTemplate: [template: ScoringTemplate];
  enableTemplate: [templateId: string];
}>();

const keyword = ref("");
const statusFilter = ref("全部状态");
const statusOptions = computed(() => ["全部状态", ...Array.from(new Set(props.templates.map((item) => statusLabel(item.status))))]);
const filteredTemplates = computed(() =>
  props.templates.filter((template) => {
    const text = [template.templateName, template.templateCode, ...template.items.map((item) => item.categoryLabel)].join(" ").toLowerCase();
    return text.includes(keyword.value.trim().toLowerCase()) && (statusFilter.value === "全部状态" || statusLabel(template.status) === statusFilter.value);
  })
);

function categoryText(template: ScoringTemplate) {
  const categories = Array.from(new Set(template.items.map((item) => item.categoryLabel).filter(Boolean)));
  return categories.length ? categories.join(" / ") : "通用货物类";
}

function ratioText(template: ScoringTemplate) {
  const technical = template.items.filter((item) => item.category === "technical").reduce((sum, item) => sum + Number(item.maxScore || 0), 0);
  const service = template.items.filter((item) => item.category === "service").reduce((sum, item) => sum + Number(item.maxScore || 0), 0);
  return `${technical}% / ${service}%`;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="模板列表" :description="loading ? '模板加载中。' : `共 ${filteredTemplates.length} 条记录`">
    <div class="g-hotel-filter-bar g-hotel-inline-filter">
      <label>
        关键字
        <input v-model="keyword" placeholder="输入关键字搜索..." />
      </label>
      <label>
        状态筛选
        <select v-model="statusFilter">
          <option v-for="status in statusOptions" :key="status">{{ status }}</option>
        </select>
      </label>
    </div>

    <DataTable :columns="TEMPLATE_COLUMNS" :rows="filteredTemplates" row-key="id" empty-text="暂无评分模板。">
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ statusLabel(row.status) }}</StatusTag>
      </template>
      <template #template="{ row }">
        <strong>{{ row.templateName }}</strong>
        <p class="eds-meta">{{ row.templateCode }}</p>
      </template>
      <template #category="{ row }">{{ categoryText(row) }}</template>
      <template #itemCount="{ row }">{{ row.items.length }}</template>
      <template #ratio="{ row }">{{ ratioText(row) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton type="text" @click="emit('editTemplate', row)">预览打分表</EnterpriseButton>
          <EnterpriseButton :type="row.id === selectedTemplateId ? 'primary' : 'default'" @click="emit('editTemplate', row)">编辑</EnterpriseButton>
          <EnterpriseButton :disabled="row.status === 'enabled'" @click="emit('enableTemplate', row.id)">启用</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
