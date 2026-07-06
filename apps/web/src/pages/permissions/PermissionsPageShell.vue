<script setup lang="ts">
import { EnterpriseSurface, FilterBar, PaginationBar, SummaryCards } from "../../components/base";
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
  <section class="eds-section g-hotel-page g-hotel-system-page">
    <header class="g-hotel-page-header">
      <div>
        <p>系统设置 / 权限与流程</p>
        <h2><span aria-hidden="true">设</span>系统配置与权限管理</h2>
        <small>集中维护审批规则、权限矩阵、组织账号与流程配置，确保系统管理员只处理基础配置，不进入业务流。</small>
      </div>
    </header>

    <div class="g-hotel-system-layout">
      <aside class="g-hotel-settings-nav" aria-label="系统配置导航">
        <strong>配置导航</strong>
        <span class="active">权限矩阵</span>
        <span>审批规则</span>
        <span>流程引擎</span>
        <span>组织账号</span>
        <small>仅展示当前角色有权查看的配置项。</small>
      </aside>

      <div class="eds-template-d-shell g-hotel-system-content">
        <EnterpriseSurface class="g-hotel-ledger-card" title="权限矩阵概览" description="集中查看菜单、操作、审批规则和组织账号的配置状态。">
          <SummaryCards :items="state.summaryItems.value" />
        </EnterpriseSurface>

        <FilterBar class="g-hotel-filter-bar">
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
      </div>
    </div>
  </section>
</template>
