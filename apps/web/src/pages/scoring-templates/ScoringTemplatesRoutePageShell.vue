<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ScoringTemplateFormPanel from "./ScoringTemplateFormPanel.vue";
import ScoringTemplateItemsPanel from "./ScoringTemplateItemsPanel.vue";
import ScoringTemplateListPanel from "./ScoringTemplateListPanel.vue";
import ScoringTemplatesPageShell from "./ScoringTemplatesPageShell.vue";
import { useScoringTemplatesPage } from "./useScoringTemplatesPage";

const {
  addItem,
  auditLogId,
  canEditItems,
  canMaintain,
  categoryTotals,
  cloneTemplate,
  editTemplate,
  enableTemplate,
  error,
  form,
  hasScoreError,
  loading,
  removeItem,
  resetForm,
  saveTemplate,
  saving,
  selectedTemplate,
  selectedTemplateId,
  statusTone,
  summaryItems,
  syncCategoryLabel,
  templates,
  totalScore
} = useScoringTemplatesPage();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-template-page">
    <ScoringTemplatesPageShell :can-maintain="canMaintain" :summary-items="summaryItems" @reset-form="resetForm" />

    <ScoringTemplateListPanel
      :loading="loading"
      :selected-template-id="selectedTemplateId"
      :status-tone="statusTone"
      :templates="templates"
      @edit-template="editTemplate"
      @enable-template="enableTemplate"
    />

    <ScoringTemplateFormPanel
      v-model:form="form"
      :can-maintain="canMaintain"
      :has-score-error="hasScoreError"
      :saving="saving"
      :selected-template="selectedTemplate"
      @clone-template="cloneTemplate"
      @enable-template="enableTemplate"
      @save-template="saveTemplate"
    />

    <ScoringTemplateItemsPanel
      v-model:form="form"
      :can-edit-items="canEditItems"
      :category-totals="categoryTotals"
      :has-score-error="hasScoreError"
      :total-score="totalScore"
      @add-item="addItem"
      @remove-item="removeItem"
      @sync-category-label="syncCategoryLabel"
    />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

