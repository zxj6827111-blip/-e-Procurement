<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiGet, apiPost } from "../../api/http";
import { loadWorkflowTasks, type R8WorkflowTaskView } from "../../api/workflow";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";
import {
  canApproveRequest,
  canDecideMethod,
  defaultProjectName,
  isExternalRule,
  money
} from "./display";
import ProcurementRequestApprovalPanel from "./ProcurementRequestApprovalPanel.vue";
import ProcurementRequestAttachmentsPanel from "./ProcurementRequestAttachmentsPanel.vue";
import ProcurementRequestDetailShell from "./ProcurementRequestDetailShell.vue";
import ProcurementRequestInfoPanel from "./ProcurementRequestInfoPanel.vue";
import ProcurementRequestLineItemsTable from "./ProcurementRequestLineItemsTable.vue";
import ProcurementRequestNextStepPanel from "./ProcurementRequestNextStepPanel.vue";
import type { Attachment, MethodRule, ProcurementRequest, ProjectRow } from "./types";
import type { SummaryCardItem } from "../../components/base";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const request = ref<ProcurementRequest | null>(null);
const rules = ref<MethodRule[]>([]);
const projects = ref<ProjectRow[]>([]);
const workflowTasks = ref<R8WorkflowTaskView[]>([]);
const loading = ref(false);
const error = ref("");
const workflowTaskError = ref("");
const auditLogId = ref("");
const processRefreshKey = ref(0);
const selectedRuleId = ref("");
const projectNameDraft = ref("");

const requestId = computed(() => String(route.params.requestId ?? ""));
const lineItems = computed(() => request.value?.lineItems ?? []);
const attachments = computed<Attachment[]>(() => request.value?.attachments ?? []);
const detailEyebrow = computed(() => {
  if (session.roleId === "group_manager") return "需求审批详情";
  if (session.roleId === "buyer" || session.roleId === "platform_operator") return "需求转项目详情";
  if (session.roleId === "auditor") return "需求监督详情";
  return "采购申请详情";
});
const title = computed(() => (request.value ? `${request.value.code || request.value.id} / ${request.value.title}` : requestId.value));
const pendingApprovalTask = computed(() =>
  workflowTasks.value.find(
    (task) => task.businessType === "procurement_request" && task.businessId === requestId.value && task.status === "pending" && task.canComplete
  )
);
const canApprove = computed(() =>
  Boolean(request.value && canApproveRequest(session.roleId) && request.value.approvalStatus === "submitted" && request.value.createdBy !== session.user?.id && pendingApprovalTask.value)
);
const selectedRule = computed(() => rules.value.find((rule) => rule.id === selectedRuleId.value) ?? rules.value[0]);
const canDecideMethodDetail = computed(() =>
  Boolean(request.value && canDecideMethod(session.roleId) && request.value.status === "submitted" && request.value.approvalStatus === "approved")
);
const canCreateProjectDetail = computed(() =>
  Boolean(request.value && canDecideMethod(session.roleId) && request.value.status === "method_decided" && request.value.approvalStatus === "approved" && !request.value.projectId)
);
const linkedProject = computed(() => {
  if (!request.value?.projectId) return null;
  return projects.value.find((project) => project.id === request.value?.projectId) ?? null;
});
const summaryItems = computed<SummaryCardItem[]>(() => {
  if (!request.value) return [];
  return [
    { label: "申请状态", value: labelStatus(request.value.status || "draft") },
    { label: "审批状态", value: labelStatus(request.value.approvalStatus) },
    { label: "采购方式", value: labelStatus(request.value.methodSuggestion) },
    { label: "预算金额", value: money(request.value.budgetAmount) },
    { label: "明细数量", value: lineItems.value.length },
    { label: "附件数量", value: attachments.value.length }
  ];
});

function methodRuleId() {
  return selectedRuleId.value || rules.value[0]?.id || "";
}

async function runDetailAction(action: () => Promise<{ auditLogId?: string }>) {
  error.value = "";
  auditLogId.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    processRefreshKey.value += 1;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function load() {
  loading.value = true;
  error.value = "";
  workflowTaskError.value = "";
  try {
    const [requestData, taskData, ruleData, projectData] = await Promise.all([
      apiGet<{ procurementRequests: ProcurementRequest[] }>("/api/procurement-requests"),
      loadWorkflowTasks(session, "procurement_request").catch((err) => {
        workflowTaskError.value = err instanceof Error ? `待办任务加载失败：${err.message}` : "待办任务加载失败，审批入口暂不可用。";
        return [];
      }),
      apiGet<{ procurementMethodRules: MethodRule[] }>("/api/procurement-method-rules"),
      apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] }))
    ]);
    request.value = requestData.procurementRequests.find((item) => item.id === requestId.value || item.code === requestId.value) ?? null;
    workflowTasks.value = taskData;
    rules.value = ruleData.procurementMethodRules;
    projects.value = projectData.projects;
    selectedRuleId.value = request.value?.methodRuleId || selectedRuleId.value || rules.value[0]?.id || "";
    if (request.value && !projectNameDraft.value.trim()) projectNameDraft.value = defaultProjectName(request.value);
    if (!request.value) error.value = "未找到该采购申请，或当前账号无权查看。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "采购申请详情加载失败";
    request.value = null;
  } finally {
    loading.value = false;
  }
}

async function runApproval(approved: boolean) {
  if (!request.value) return;
  const currentRequest = request.value;
  await runDetailAction(() =>
    apiPost<{ auditLogId?: string }>(`/api/procurement-requests/${currentRequest.id}/approve`, {
      approved,
      opinion: approved ? "详情页审批通过" : "详情页审批驳回"
    })
  );
}

async function runMethodDecision() {
  if (!request.value) return;
  const currentRequest = request.value;
  const ruleId = methodRuleId();
  if (!ruleId) return;
  await runDetailAction(() =>
    apiPost<{ auditLogId?: string }>(`/api/procurement-requests/${currentRequest.id}/method-decision`, {
      ruleId,
      externalTradeFlag: isExternalRule(selectedRule.value)
    })
  );
}

async function createProjectFromRequest() {
  if (!request.value) return;
  const currentRequest = request.value;
  const name = projectNameDraft.value.trim() || defaultProjectName(currentRequest);
  await runDetailAction(() =>
    apiPost<{ auditLogId?: string }>("/api/projects", {
      requestId: currentRequest.id,
      name
    })
  );
}

onMounted(async () => {
  await session.loadMe(session.user?.id);
  await load();
});
</script>

<template>
  <ProcurementRequestDetailShell
    :title="title"
    :eyebrow="detailEyebrow"
    :loading="loading"
    :error="error"
    :workflow-task-error="workflowTaskError"
    :audit-log-id="auditLogId"
    :request-id="request?.id"
    :process-refresh-key="processRefreshKey"
    :summary-items="summaryItems"
    @back="router.back()"
  >
    <template v-if="request">
      <ProcurementRequestNextStepPanel
        v-model:selected-rule-id="selectedRuleId"
        v-model:project-name-draft="projectNameDraft"
        :request="request"
        :rules="rules"
        :linked-project="linkedProject"
        :can-decide-method="canDecideMethodDetail"
        :can-create-project="canCreateProjectDetail"
        @decide-method="runMethodDecision"
        @create-project="createProjectFromRequest"
      />

      <ProcurementRequestInfoPanel :request="request" />
      <ProcurementRequestLineItemsTable :line-items="lineItems" />
      <ProcurementRequestAttachmentsPanel :attachments="attachments" />
      <ProcurementRequestApprovalPanel v-if="canApprove" @approve="runApproval" />
    </template>
  </ProcurementRequestDetailShell>
</template>

