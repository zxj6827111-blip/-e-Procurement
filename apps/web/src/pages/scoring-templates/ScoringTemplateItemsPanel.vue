<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, SummaryCards } from "../../components/base";
import { CATEGORY_OPTIONS, SCORE_ITEM_COLUMNS } from "./display";
import type { ScoringItem, TemplateFormState } from "./types";

const form = defineModel<TemplateFormState>("form", { required: true });

defineProps<{
  canEditItems: boolean;
  categoryTotals: { technical: number; service: number; price: number };
  hasScoreError: boolean;
  totalScore: number;
}>();

const emit = defineEmits<{
  addItem: [];
  removeItem: [index: number];
  syncCategoryLabel: [item: ScoringItem];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="评分项" description="评分项用于生成专家逐项评分表，启用前总分必须等于 100 分。">
    <SummaryCards
      :items="[
        { label: '技术分', value: categoryTotals.technical, meta: '技术响应' },
        { label: '商务分', value: categoryTotals.service, meta: '服务履约' },
        { label: '价格分', value: categoryTotals.price, meta: '报价合理性' },
        { label: '总分', value: totalScore, meta: hasScoreError ? '需等于 100' : '校验通过' }
      ]"
    />
    <div class="eds-actions">
      <EnterpriseButton :disabled="!canEditItems" @click="emit('addItem')">新增评分项</EnterpriseButton>
    </div>
    <DataTable :columns="SCORE_ITEM_COLUMNS" :rows="form.items" empty-text="暂无评分项。">
      <template #id="{ row }">
        <input v-model="row.id" :disabled="!canEditItems" />
      </template>
      <template #category="{ row }">
        <select v-model="row.category" :disabled="!canEditItems" @change="emit('syncCategoryLabel', row)">
          <option v-for="option in CATEGORY_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </template>
      <template #maxScore="{ row }">
        <input v-model.number="row.maxScore" type="number" min="0" max="100" step="1" :disabled="!canEditItems" />
      </template>
      <template #label="{ row }">
        <input v-model="row.label" :disabled="!canEditItems" />
      </template>
      <template #reference="{ row }">
        <textarea v-model="row.reference" rows="2" :disabled="!canEditItems" />
      </template>
      <template #evidence="{ row }">
        <textarea v-model="row.evidence" rows="2" :disabled="!canEditItems" />
      </template>
      <template #actions="{ index }">
        <EnterpriseButton type="text" :disabled="!canEditItems || form.items.length <= 1" @click="emit('removeItem', index)">删除</EnterpriseButton>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
