<script setup lang="ts">
import { computed } from "vue";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseButton, EnterpriseDialog } from "../../components/base";
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

const showAvoidanceDialog = computed(() => Boolean(selectedProjectId.value) && Boolean(currentAssignment.value) && !confirmationCompleted.value);

function keepDialogOpen() {
  return;
}
</script>

<template>
  <section class="eds-section eds-print-area">
    <EnterpriseDialog :open="showAvoidanceDialog" title="回避确认" @close="keepDialogOpen">
      <p class="eds-meta">
        专家进入评分前必须先完成回避、纪律与保密确认。确认后才开放材料查看、保存草稿和提交锁定。
      </p>

      <template #actions>
        <EnterpriseButton type="primary" @click="confirmAll">确认并进入评分</EnterpriseButton>
      </template>
    </EnterpriseDialog>

    <ExpertScoringPageShell
      :selected-sheet="selectedSheet"
      :summary-items="summaryItems"
      :sheet-status-label="sheetStatusLabel"
      :sheet-status-tone="sheetStatusTone"
      @print-sheet="printSheet"
    />

    <div class="eds-template-c-scoring-grid">
      <aside class="eds-scoring-side">
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

        <ExpertScoringMaterialsPanel :attachment-groups="attachmentGroups" :selected-sheet-detail="selectedSheetDetail" />
      </aside>

      <section class="eds-scoring-main">
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
      </section>
    </div>

    <ActivityRecordPanel
      v-if="selectedProjectId"
      class="eds-scoring-activity"
      business-type="review_award"
      :business-id="selectedProjectId"
      title="评审定标活动记录"
      :refresh-key="processRefreshKey"
    />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
