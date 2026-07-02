<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ExternalBlockCheckPanel from "./ExternalBlockCheckPanel.vue";
import ExternalMaterialPanel from "./ExternalMaterialPanel.vue";
import ExternalTradeControlPanel from "./ExternalTradeControlPanel.vue";
import ExternalTradeDetailPanel from "./ExternalTradeDetailPanel.vue";
import ExternalTradePageShell from "./ExternalTradePageShell.vue";
import ExternalTradesTable from "./ExternalTradesTable.vue";
import { useExternalTradePage } from "./useExternalTradePage";

const {
  auditLogId,
  blockActions,
  blockRows,
  canMaintainExternalTrade,
  checkBlock,
  createExternalProject,
  detail,
  detailRows,
  error,
  externalPlatformName,
  externalProjectCode,
  externalTradeForm,
  externalTrades,
  load,
  loading,
  materialFile,
  materialFileName,
  onMaterialFileChange,
  recordExternalResult,
  recordInternalApproval,
  saveExternalProjectCode,
  selectedProjectId,
  summaryItems,
  uploadExternalMaterial
} = useExternalTradePage();
</script>

<template>
  <section class="eds-section">
    <ExternalTradePageShell :can-maintain-external-trade="canMaintainExternalTrade" :loading="loading" :summary-items="summaryItems" />

    <ExternalTradeControlPanel
      v-model:external-platform-name="externalPlatformName"
      v-model:external-project-code="externalProjectCode"
      v-model:form="externalTradeForm"
      v-model:selected-project-id="selectedProjectId"
      :can-maintain-external-trade="canMaintainExternalTrade"
      @create-external-project="createExternalProject"
      @load="load"
      @record-internal-approval="recordInternalApproval"
      @save-external-project-code="saveExternalProjectCode"
    />

    <ExternalMaterialPanel
      :announcement-materials="detail.record?.announcementMaterialMetadata"
      :can-maintain-external-trade="canMaintainExternalTrade"
      :material-file="materialFile"
      :material-file-name="materialFileName"
      :result-materials="detail.record?.resultMaterialMetadata"
      @file-change="onMaterialFileChange"
      @record-external-result="recordExternalResult"
      @upload-announcement="uploadExternalMaterial('announcement')"
      @upload-result="uploadExternalMaterial('result')"
    />

    <ExternalTradesTable :external-trades="externalTrades" :loading="loading" />

    <ExternalTradeDetailPanel :rows="detailRows" />

    <ExternalBlockCheckPanel :actions="blockActions" :rows="blockRows" @check-block="checkBlock" />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

