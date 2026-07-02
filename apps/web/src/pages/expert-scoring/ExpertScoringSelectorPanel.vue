<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { Assignment, ScoringSheet } from "./types";

const selectedSheetId = defineModel<string>("selectedSheetId", { required: true });

defineProps<{
  assignmentStatusLabel: (status: string) => string;
  confirmationCompleted: boolean;
  currentAssignment?: Assignment;
  selectedProjectId: string;
  sheetStatusLabel: (status: string) => string;
  sheets: ScoringSheet[];
}>();

const emit = defineEmits<{
  confirmAll: [];
  loadSelectedSheet: [];
  viewMaterials: [];
}>();
</script>

<template>
  <EnterpriseSurface title="评分单选择" description="选择供应商评分单后，先记录材料查看，再暂存或提交评分。">
    <p v-if="!sheets.length" class="eds-meta">当前专家暂无可评分任务，完成确认后系统会生成评分单。</p>
    <div v-else class="eds-form-section">
      <label>
        选择评分单
        <select v-model="selectedSheetId" @change="emit('loadSelectedSheet')">
          <option v-for="sheet in sheets" :key="sheet.id" :value="sheet.id">
            {{ sheet.projectCode || sheet.projectId }} / {{ sheet.supplierName || sheet.supplierId }} / {{ sheetStatusLabel(sheet.status) }}
          </option>
        </select>
      </label>
      <label>
        专家确认状态
        <input :value="currentAssignment ? assignmentStatusLabel(currentAssignment.status) : '未分配'" disabled />
      </label>
    </div>
    <SubmitPanel v-if="sheets.length">
      <EnterpriseButton :disabled="!currentAssignment || confirmationCompleted" @click="emit('confirmAll')">确认回避、纪律和保密承诺</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedProjectId || !confirmationCompleted" @click="emit('viewMaterials')">记录材料查看</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
