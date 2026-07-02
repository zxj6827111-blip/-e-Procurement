<script setup lang="ts">
import { FilterBar, PageHeader, PaginationBar, SummaryCards } from "../../components/base";
import ApprovalRulesTable from "./ApprovalRulesTable.vue";
import BpmnDefinitionsTable from "./BpmnDefinitionsTable.vue";
import BpmnPilotGovernanceLogsTable from "./BpmnPilotGovernanceLogsTable.vue";
import BpmnPilotHealthTable from "./BpmnPilotHealthTable.vue";
import BpmnPilotRunsTable from "./BpmnPilotRunsTable.vue";
import BpmnPilotsTable from "./BpmnPilotsTable.vue";
import OrganizationUsersTable from "./OrganizationUsersTable.vue";
import PermissionScopePanel from "./PermissionScopePanel.vue";
import { usePermissionsPage } from "./usePermissionsPage";

const state = usePermissionsPage();
</script>

<template>
  <PageHeader
    title="权限与基础配置"
    eyebrow="SYSTEM CONFIGURATION"
    description="集中查看菜单权限、动作授权、审批规则、BPMN 版本管理与组织账号。"
  />
  <SummaryCards :items="state.summaryItems.value" />
  <FilterBar>
    <label>
      配置范围
      <select value="all" disabled>
        <option value="all">全部权限配置</option>
      </select>
    </label>
  </FilterBar>
  <p v-if="state.loading.value" class="eds-meta">正在加载权限与基础配置...</p>
  <PermissionScopePanel :menus="state.menus.value" :actions="state.actions.value" />
  <ApprovalRulesTable :rows="state.approvalRules.value" />
  <BpmnDefinitionsTable :rows="state.bpmnDefinitions.value" />
  <BpmnPilotsTable :rows="state.bpmnPilots.value" />
  <BpmnPilotHealthTable :rows="state.bpmnPilotHealth.value" :summary="state.bpmnHealthSummary.value" />
  <BpmnPilotGovernanceLogsTable :rows="state.bpmnPilotChangeLogs.value" />
  <BpmnPilotRunsTable :rows="state.bpmnPilotRuns.value" />
  <OrganizationUsersTable :rows="state.users.value" :admin-load-error="state.adminLoadError.value" :org-name="state.orgName" />
  <PaginationBar
    :total="
      state.users.value.length +
      state.approvalRules.value.length +
      state.bpmnDefinitions.value.length +
      state.bpmnPilots.value.length +
      state.bpmnPilotRuns.value.length
    "
  />
</template>
