<script setup lang="ts">
import { DataTable, EnterpriseButton, FormSection, SubmitPanel } from "../../components/base";
import { SCORE_ITEM_COLUMNS } from "./display";
import type { ScoreInputValue, ScoreTotals, ScoringItem, ScoringSheet } from "./types";

const opinion = defineModel<string>("opinion", { required: true });
const scoreInputs = defineModel<Record<string, ScoreInputValue>>("scoreInputs", { required: true });

defineProps<{
  canEditSheet: (sheet?: ScoringSheet | null) => boolean;
  categoryTotals: ScoreTotals;
  confirmationCompleted: boolean;
  scoringItems: ScoringItem[];
  selectedSheetDetail: ScoringSheet | null;
  selectedSheetId: string;
  sheetStatusLabel: (status: string) => string;
}>();

const emit = defineEmits<{
  printSheet: [];
  saveScore: [];
  submitScore: [];
}>();
</script>

<template>
  <FormSection v-if="selectedSheetDetail" title="逐项评分" description="按评分模板逐项录入分值和专家意见。">
    <label>
      项目
      <input :value="`${selectedSheetDetail.projectCode || selectedSheetDetail.projectId} / ${selectedSheetDetail.projectName || ''}`" disabled />
    </label>
    <label>
      供应商
      <input :value="selectedSheetDetail.supplierName || selectedSheetDetail.supplierId" disabled />
    </label>
    <label>
      评分模板
      <input :value="selectedSheetDetail.templateName || selectedSheetDetail.templateId" disabled />
    </label>
    <label>
      状态
      <input :value="sheetStatusLabel(selectedSheetDetail.status)" disabled />
    </label>

    <div class="eds-ledger-strip eds-form-full-row">
      <div>
        <span>技术分</span>
        <strong>{{ categoryTotals.technical }}</strong>
      </div>
      <div>
        <span>商务分</span>
        <strong>{{ categoryTotals.service }}</strong>
      </div>
      <div>
        <span>价格分</span>
        <strong>{{ categoryTotals.price }}</strong>
      </div>
      <div>
        <span>总分</span>
        <strong>{{ categoryTotals.total }}</strong>
      </div>
    </div>

    <div class="eds-score-table eds-form-full-row">
      <DataTable :columns="SCORE_ITEM_COLUMNS" :rows="scoringItems" row-key="id" empty-text="当前评分单暂无评分项。">
        <template #item="{ row }">
          <strong>{{ row.categoryLabel }}</strong>
          <p class="eds-meta">{{ row.label }}</p>
        </template>
        <template #score="{ row }">
          <input
            v-model.number="scoreInputs[row.id].score"
            type="number"
            min="0"
            :max="row.maxScore"
            :disabled="!canEditSheet(selectedSheetDetail)"
            class="eds-compact-input"
          />
        </template>
        <template #comment="{ row }">
          <textarea
            v-model="scoreInputs[row.id].comment"
            rows="2"
            :disabled="!canEditSheet(selectedSheetDetail)"
            placeholder="填写扣分、加分或风险说明"
          />
        </template>
      </DataTable>
    </div>

    <label class="eds-form-full-row">
      评审总意见
      <textarea v-model="opinion" rows="4" :disabled="!canEditSheet(selectedSheetDetail)" />
    </label>

    <SubmitPanel>
      <EnterpriseButton :disabled="!selectedSheetId || !confirmationCompleted || !canEditSheet(selectedSheetDetail)" @click="emit('saveScore')">
        暂存评分
      </EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedSheetId || !confirmationCompleted || !canEditSheet(selectedSheetDetail)" @click="emit('submitScore')">
        提交并锁定
      </EnterpriseButton>
      <EnterpriseButton @click="emit('printSheet')">打印评分表</EnterpriseButton>
    </SubmitPanel>
  </FormSection>
</template>
