<script setup lang="ts">
import { EnterpriseButton, FeedbackMessage, FormSection, SubmitPanel } from "../../components/base";
import type { ScoringTemplate, TemplateFormState } from "./types";

const form = defineModel<TemplateFormState>("form", { required: true });

defineProps<{
  canMaintain: boolean;
  hasScoreError: boolean;
  saving: boolean;
  selectedTemplate: ScoringTemplate | null;
}>();

const emit = defineEmits<{
  cloneTemplate: [];
  enableTemplate: [];
  saveTemplate: [];
}>();
</script>

<template>
  <FormSection class="g-hotel-form-card" title="模板基础信息" :description="selectedTemplate?.inUse ? '当前模板已被评分单使用，只允许维护基础信息。' : '维护模板编码、名称和状态。'">
    <label>
      模板编码
      <input v-model="form.templateCode" :disabled="Boolean(selectedTemplate) || !canMaintain" placeholder="例如 hotel-linen-v2" />
    </label>
    <label>
      模板名称
      <input v-model="form.templateName" :disabled="!canMaintain" placeholder="例如 客房布草评分模板 V2" />
    </label>
    <label>
      状态
      <select v-model="form.status" :disabled="!canMaintain">
        <option value="draft">草稿</option>
        <option value="disabled">停用</option>
        <option value="enabled">启用</option>
      </select>
    </label>
    <label>
      评分项状态
      <input :value="selectedTemplate?.inUse ? '已使用，评分项锁定' : '可编辑评分项'" disabled />
    </label>
    <FeedbackMessage v-if="hasScoreError" tone="error">评分模板总分必须等于 100 分，保存或启用前请先调整分值。</FeedbackMessage>
    <SubmitPanel>
      <EnterpriseButton :disabled="!canMaintain || saving || hasScoreError" @click="emit('saveTemplate')">保存模板</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedTemplate || !canMaintain || saving || hasScoreError" @click="emit('cloneTemplate')">另存为新模板</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedTemplate || !canMaintain || saving || hasScoreError" @click="emit('enableTemplate')">
        启用为当前模板
      </EnterpriseButton>
    </SubmitPanel>
  </FormSection>
</template>
