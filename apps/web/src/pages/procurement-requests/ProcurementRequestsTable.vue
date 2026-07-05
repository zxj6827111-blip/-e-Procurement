<script setup lang="ts">
import { RouterLink } from "vue-router";
import { DataTable, EnterpriseButton, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import {
  canApproveRequestRow,
  canCancelRequestRow,
  canCreateProjectRow,
  canDecideMethodRow,
  canDeleteRequestRow,
  canSubmitRequestRow,
  hasRowActions,
  money,
  projectExecutionLink,
  requestColumns,
  rowReadonlyLabel
} from "./display";
import type { MethodRule, ProcurementRequest, RequestActionContext } from "./types";

defineProps<{
  requests: ProcurementRequest[];
  rules: MethodRule[];
  actionContext: RequestActionContext;
  projectName: (projectId: string | null) => string;
  projectNameInput: (request: ProcurementRequest) => string;
  methodRuleIdFor: (requestId: string) => string;
}>();

defineEmits<{
  submit: [request: ProcurementRequest];
  approve: [request: ProcurementRequest, approved: boolean];
  "set-method-rule": [requestId: string, event: Event];
  "decide-method": [request: ProcurementRequest];
  "set-project-name": [requestId: string, event: Event];
  "create-project": [request: ProcurementRequest];
  delete: [request: ProcurementRequest];
  cancel: [request: ProcurementRequest];
}>();
</script>

<template>
  <EnterpriseSurface class="eds-procurement-list-surface" title="申请流转台账">
    <DataTable :columns="requestColumns" :rows="requests" empty-text="暂无采购申请">
      <template #request="{ row }">
        <div class="eds-table-primary-cell">
          <strong>{{ row.title }}</strong>
          <span>{{ row.code || row.id }}</span>
          <RouterLink v-if="row.projectId" class="eds-action-link" :to="projectExecutionLink(row.projectId)">
            {{ projectName(row.projectId) }}
          </RouterLink>
        </div>
      </template>

      <template #owner="{ row }">
        <div class="eds-stack-tight">
          <span>{{ row.requestDepartment || "-" }} / {{ row.requesterName || "-" }}</span>
          <span class="eds-table-muted">{{ labelStatus(row.methodSuggestion) }}</span>
        </div>
      </template>

      <template #state="{ row }">
        <div class="eds-stack-tight">
          <StatusTag tone="primary">{{ labelStatus(row.status || "draft") }}</StatusTag>
          <StatusTag :tone="row.approvalStatus === 'submitted' ? 'warning' : row.approvalStatus === 'approved' ? 'success' : 'default'">
            {{ labelStatus(row.approvalStatus) }}
          </StatusTag>
        </div>
      </template>

      <template #amount="{ row }">
        <div class="eds-stack-tight">
          <strong>{{ money(row.budgetAmount) }}</strong>
          <span class="eds-table-muted">附件 {{ row.attachments?.length ?? 0 }} 份</span>
        </div>
      </template>

      <template #actions="{ row }">
        <div class="eds-actions eds-actions-table">
          <RouterLink class="eds-button" :to="`/procurement-requests/${encodeURIComponent(row.id)}`">查看</RouterLink>
          <EnterpriseButton v-if="canSubmitRequestRow(row, actionContext)" type="primary" @click="$emit('submit', row)">提交审批</EnterpriseButton>
          <EnterpriseButton v-if="canApproveRequestRow(row, actionContext)" type="primary" @click="$emit('approve', row, true)">
            审批通过
          </EnterpriseButton>
          <EnterpriseButton v-if="canApproveRequestRow(row, actionContext)" @click="$emit('approve', row, false)">
            审批驳回
          </EnterpriseButton>
          <select v-if="canDecideMethodRow(row, actionContext)" class="eds-compact-select" :value="methodRuleIdFor(row.id)" @change="$emit('set-method-rule', row.id, $event)">
            <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.ruleName || rule.resultMethod }}</option>
          </select>
          <EnterpriseButton
            v-if="canDecideMethodRow(row, actionContext)"
            type="primary"
            :disabled="!methodRuleIdFor(row.id)"
            @click="$emit('decide-method', row)"
          >
            方式判定
          </EnterpriseButton>
          <input
            v-if="canCreateProjectRow(row, actionContext)"
            class="eds-compact-input"
            :value="projectNameInput(row)"
            aria-label="项目名称"
            @input="$emit('set-project-name', row.id, $event)"
          />
          <EnterpriseButton v-if="canCreateProjectRow(row, actionContext)" type="primary" @click="$emit('create-project', row)">发起项目</EnterpriseButton>
          <EnterpriseButton v-if="canDeleteRequestRow(row, actionContext)" @click="$emit('delete', row)">删除</EnterpriseButton>
          <EnterpriseButton v-else-if="canCancelRequestRow(row, actionContext)" @click="$emit('cancel', row)">取消</EnterpriseButton>
          <span v-if="!hasRowActions(row, actionContext)" class="eds-meta">{{ rowReadonlyLabel(row, actionContext) }}</span>
        </div>
      </template>
    </DataTable>
    <PaginationBar :total="requests.length" />
  </EnterpriseSurface>
</template>
