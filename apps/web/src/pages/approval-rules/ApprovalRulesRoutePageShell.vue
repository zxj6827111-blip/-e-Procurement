<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ApprovalRuleFormPanel from "./ApprovalRuleFormPanel.vue";
import ApprovalRulesPageShell from "./ApprovalRulesPageShell.vue";
import ApprovalRulesTable from "./ApprovalRulesTable.vue";
import { useApprovalRulesPage } from "./useApprovalRulesPage";

const {
  allBusinessTypeOptions,
  auditLogId,
  businessTypeFilter,
  businessTypeOptions,
  busyRuleId,
  canMaintainRules,
  editRule,
  editingRuleId,
  error,
  filteredRules,
  loading,
  readonlyReason,
  resetRuleForm,
  ruleForm,
  saveRule,
  summaryItems,
  toggleRule
} = useApprovalRulesPage();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-approval-rules-page">
    <ApprovalRulesPageShell
      v-model:business-type-filter="businessTypeFilter"
      :business-type-options="businessTypeOptions"
      :can-maintain-rules="canMaintainRules"
      :loading="loading"
      :readonly-reason="readonlyReason"
      :summary-items="summaryItems"
    />

    <ApprovalRuleFormPanel
      v-model:form="ruleForm"
      :all-business-type-options="allBusinessTypeOptions"
      :busy-rule-id="busyRuleId"
      :can-maintain-rules="canMaintainRules"
      :editing-rule-id="editingRuleId"
      @reset-rule-form="resetRuleForm"
      @save-rule="saveRule"
    />

    <ApprovalRulesTable
      :busy-rule-id="busyRuleId"
      :can-maintain-rules="canMaintainRules"
      :loading="loading"
      :rules="filteredRules"
      @edit-rule="editRule"
      @toggle-rule="toggleRule"
    />

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>

