<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiDelete, apiGet, apiPost } from "../../api/http";
import { loadWorkflowTasks, type R8WorkflowTaskView } from "../../api/workflow";
import { useSessionStore } from "../../stores/session";
import { EnterpriseSurface } from "../../components/base";
import {
  canCreateRequest,
  defaultProjectName,
  flowDescription as resolveFlowDescription,
  methodDecisionPayload as resolveMethodDecisionPayload,
  methodRuleIdFor as resolveMethodRuleIdFor,
  pageTitle as resolvePageTitle,
  procurementRequestSummaryItems,
  projectName as resolveProjectName,
  visibleProcurementRequests
} from "./display";
import ProcurementRequestsFilter from "./ProcurementRequestsFilter.vue";
import ProcurementRequestsShell from "./ProcurementRequestsShell.vue";
import ProcurementRequestsTable from "./ProcurementRequestsTable.vue";
import type { MethodRule, ProcurementRequest, ProjectRow, RequestActionContext } from "./types";

const session = useSessionStore();
const requests = ref<ProcurementRequest[]>([]);
const rules = ref<MethodRule[]>([]);
const projects = ref<ProjectRow[]>([]);
const selectedRuleId = ref("");
const auditLogId = ref("");
const error = ref("");
const workflowTaskError = ref("");
const workflowTasks = ref<R8WorkflowTaskView[]>([]);
const methodRuleSelections = ref<Record<string, string>>({});
const projectNameInputs = ref<Record<string, string>>({});

const actionContext = computed<RequestActionContext>(() => ({
  roleId: session.roleId,
  userId: session.user?.id,
  workflowTasks: workflowTasks.value
}));
const canCreateRequestAction = computed(() => canCreateRequest(session.roleId));
const visibleRequests = computed(() => visibleProcurementRequests(requests.value));
const summaryItems = computed(() => procurementRequestSummaryItems(visibleRequests.value));
const pageTitle = computed(() => resolvePageTitle(session.roleId));
const flowDescription = computed(() => resolveFlowDescription(session.roleId));

function projectNameInput(request: ProcurementRequest) {
  return projectNameInputs.value[request.id] || defaultProjectName(request);
}

function setProjectNameInput(requestId: string, event: Event) {
  projectNameInputs.value = { ...projectNameInputs.value, [requestId]: (event.target as HTMLInputElement).value };
}

function methodRuleIdFor(requestId: string) {
  return resolveMethodRuleIdFor(requestId, methodRuleSelections.value, selectedRuleId.value, rules.value);
}

function methodDecisionPayload(requestId: string) {
  return resolveMethodDecisionPayload(requestId, methodRuleSelections.value, selectedRuleId.value, rules.value);
}

function setMethodRule(requestId: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  methodRuleSelections.value = { ...methodRuleSelections.value, [requestId]: value };
  selectedRuleId.value = value;
}

function projectName(projectId: string | null) {
  return resolveProjectName(projectId, projects.value);
}

async function load() {
  workflowTaskError.value = "";
  const [requestData, ruleData, projectData, taskData] = await Promise.all([
    apiGet<{ procurementRequests: ProcurementRequest[] }>("/api/procurement-requests"),
    apiGet<{ procurementMethodRules: MethodRule[] }>("/api/procurement-method-rules"),
    apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })),
    loadWorkflowTasks(session, "procurement_request").catch((err) => {
      workflowTaskError.value = err instanceof Error ? `待办任务加载失败：${err.message}` : "待办任务加载失败，审批入口暂不可用。";
      return [];
    })
  ]);
  requests.value = requestData.procurementRequests;
  rules.value = ruleData.procurementMethodRules;
  projects.value = projectData.projects;
  workflowTasks.value = taskData;
  selectedRuleId.value ||= rules.value[0]?.id ?? "";
}

async function run(action: () => Promise<{ auditLogId?: string }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function submitRequest(request: ProcurementRequest) {
  return run(() => apiPost(`/api/procurement-requests/${request.id}/submit`));
}

function approveRequest(request: ProcurementRequest, approved: boolean) {
  return run(() =>
    apiPost(`/api/procurement-requests/${request.id}/approve`, {
      approved,
      opinion: approved ? "页面审批通过" : "页面审批驳回"
    })
  );
}

function decideMethod(request: ProcurementRequest) {
  return run(() => apiPost(`/api/procurement-requests/${request.id}/method-decision`, methodDecisionPayload(request.id)));
}

async function createProjectFromRequest(request: ProcurementRequest) {
  await run(async () =>
    apiPost("/api/projects", {
      requestId: request.id,
      name: projectNameInput(request)
    })
  );
}

function deleteRequest(request: ProcurementRequest) {
  return run(() => apiDelete(`/api/procurement-requests/${request.id}`));
}

function cancelRequest(request: ProcurementRequest) {
  return run(() => apiPost(`/api/procurement-requests/${request.id}/cancel`, { reason: "页面撤销采购申请" }));
}

onMounted(async () => {
  await session.loadMe(session.user?.id);
  await load();
});
</script>

<template>
  <ProcurementRequestsShell
    :page-title="pageTitle"
    :flow-description="flowDescription"
    :can-create-request="canCreateRequestAction"
    :workflow-task-error="workflowTaskError"
    :error="error"
    :audit-log-id="auditLogId"
    :summary-items="summaryItems"
  >
    <div class="eds-template-b-workspace">
      <section class="eds-template-b-primary">
        <ProcurementRequestsFilter :page-title="pageTitle" :total="visibleRequests.length" />

        <ProcurementRequestsTable
          :requests="visibleRequests"
          :rules="rules"
          :action-context="actionContext"
          :project-name="projectName"
          :project-name-input="projectNameInput"
          :method-rule-id-for="methodRuleIdFor"
          @submit="submitRequest"
          @approve="approveRequest"
          @set-method-rule="setMethodRule"
          @decide-method="decideMethod"
          @set-project-name="setProjectNameInput"
          @create-project="createProjectFromRequest"
          @delete="deleteRequest"
          @cancel="cancelRequest"
        />
      </section>

      <aside class="eds-template-b-rail">
        <EnterpriseSurface title="列表处理规则" description="按状态、审批节点和承接条件批量处理，不从仪表盘跳转。">
          <div class="eds-workflow-rule-list">
            <article>
              <span>01</span>
              <strong>先处理待审批</strong>
              <p>集团角色先确认需求必要性，避免后续项目承接无依据。</p>
            </article>
            <article>
              <span>02</span>
              <strong>再判定采购方式</strong>
              <p>采购经办只在审批通过后选择规则，保持流程可追溯。</p>
            </article>
            <article>
              <span>03</span>
              <strong>最后承接项目</strong>
              <p>只有方式已判定且未生成项目时，才允许创建采购项目。</p>
            </article>
          </div>
        </EnterpriseSurface>
      </aside>
    </div>
  </ProcurementRequestsShell>
</template>

