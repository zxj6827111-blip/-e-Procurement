<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import ExpertConfirmationPanel from "./ExpertConfirmationPanel.vue";
import ExpertScoreSheetPanel from "./ExpertScoreSheetPanel.vue";
import ExpertScoringMaterialsPanel from "./ExpertScoringMaterialsPanel.vue";
import ExpertScoringPageShell from "./ExpertScoringPageShell.vue";
import ExpertScoringSelectorPanel from "./ExpertScoringSelectorPanel.vue";
import { useExpertScoringPage } from "./useExpertScoringPage";

const {
  assignmentStatusLabel,
  assignments,
  attachmentGroups,
  auditLogId,
  canEditSheet,
  categoryTotals,
  confirmationCompleted,
  confirmAll,
  currentAssignment,
  error,
  loadSelectedSheet,
  opinion,
  pendingAssignments,
  printSheet,
  processRefreshKey,
  scoreInputs,
  scoringItems,
  selectedProjectId,
  selectedSheet,
  selectedSheetDetail,
  selectedSheetId,
  sheetStatusLabel,
  sheetStatusTone,
  sheets,
  saveScore,
  submitScore,
  summaryItems,
  viewMaterials
} = useExpertScoringPage();
</script>

<template>
  <section class="eds-section eds-print-area">
    <ExpertScoringPageShell
      :selected-sheet="selectedSheet"
      :summary-items="summaryItems"
      :sheet-status-label="sheetStatusLabel"
      :sheet-status-tone="sheetStatusTone"
      @print-sheet="printSheet"
    />

    <ExpertConfirmationPanel
      v-model:selected-project-id="selectedProjectId"
      :assignment-status-label="assignmentStatusLabel"
      :assignments="assignments"
      :confirmation-completed="confirmationCompleted"
      :current-assignment="currentAssignment"
      :pending-assignments="pendingAssignments"
      @confirm-all="confirmAll"
    />

    <ExpertScoringSelectorPanel
      v-model:selected-sheet-id="selectedSheetId"
      :assignment-status-label="assignmentStatusLabel"
      :confirmation-completed="confirmationCompleted"
      :current-assignment="currentAssignment"
      :selected-project-id="selectedProjectId"
      :sheet-status-label="sheetStatusLabel"
      :sheets="sheets"
      @confirm-all="confirmAll"
      @load-selected-sheet="loadSelectedSheet"
      @view-materials="viewMaterials"
    />

    <ExpertScoreSheetPanel
      v-model:opinion="opinion"
      v-model:score-inputs="scoreInputs"
      :can-edit-sheet="canEditSheet"
      :category-totals="categoryTotals"
      :confirmation-completed="confirmationCompleted"
      :scoring-items="scoringItems"
      :selected-sheet-detail="selectedSheetDetail"
      :selected-sheet-id="selectedSheetId"
      :sheet-status-label="sheetStatusLabel"
      @print-sheet="printSheet"
      @save-score="saveScore"
      @submit-score="submitScore"
    />

    <ExpertScoringMaterialsPanel :attachment-groups="attachmentGroups" :selected-sheet-detail="selectedSheetDetail" />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>

  <ActivityRecordPanel
    v-if="selectedProjectId"
    business-type="review_award"
    :business-id="selectedProjectId"
    title="评审定标活动记录"
    :refresh-key="processRefreshKey"
  />
</template>

