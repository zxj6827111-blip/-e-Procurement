<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { QuestionnaireDraft } from "./types";

const questionnaire = defineModel<QuestionnaireDraft>("questionnaire", { required: true });

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <EnterpriseSurface title="入驻问卷" :description="`第 ${stepSummary} 步。补充服务范围、履约能力和合规承诺。`">
    <div class="eds-form-section">
      <label>合作范围<textarea v-model="questionnaire.cooperationScope" rows="3" /></label>
      <label>服务能力<textarea v-model="questionnaire.serviceCapability" rows="3" /></label>
      <label>配送覆盖<textarea v-model="questionnaire.deliveryCoverage" rows="3" /></label>
      <label>售后承诺<textarea v-model="questionnaire.afterSalesCommitment" rows="3" /></label>
      <label>合规承诺<textarea v-model="questionnaire.complianceCommitment" rows="3" /></label>
      <label>备注<textarea v-model="questionnaire.remark" rows="3" /></label>
    </div>
  </EnterpriseSurface>
</template>
