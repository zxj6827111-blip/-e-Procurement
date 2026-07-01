<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { apiDelete, apiGet, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { labelStatus } from "../utils/status-labels";
import { loadWorkflowTasks, type R8WorkflowTaskView } from "../api/workflow";

interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

interface ProcurementRequestLineItem {
  id: string;
  itemName: string;
  category?: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

interface ProcurementRequest {
  id: string;
  code?: string;
  title: string;
  orgId: string;
  createdBy?: string;
  category?: string;
  status?: string;
  approvalStatus: string;
  methodSuggestion: string;
  externalTradeFlag: boolean;
  projectId: string | null;
  description?: string;
  requestDepartment?: string;
  requesterName?: string;
  budgetLabel?: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  approvalOpinion?: string;
  approvalBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: ProcurementRequestLineItem[];
  attachments?: Attachment[];
}

interface MethodRule {
  id: string;
  ruleName: string;
  resultMethod: string;
}

interface ProjectRow {
  id: string;
  code?: string;
  name?: string;
}

const session = useSessionStore();
const requests = ref<ProcurementRequest[]>([]);
const rules = ref<MethodRule[]>([]);
const projects = ref<ProjectRow[]>([]);
const selectedRuleId = ref("");
const attachmentFile = ref<File | null>(null);
const attachmentFileName = ref("");
const auditLogId = ref("");
const error = ref("");
const workflowTasks = ref<R8WorkflowTaskView[]>([]);
const methodRuleSelections = ref<Record<string, string>>({});
const projectNameInputs = ref<Record<string, string>>({});

const title = ref("采购申请");
const category = ref("客房一次性用品");
const requestDepartment = ref("客房部");
const requesterName = ref("刘明");
const budgetAmount = ref<number | null>(200000);
const purpose = ref("用于门店运营物资采购");
const expectedArrivalAt = ref("2026-07-10");
const receivingLocation = ref("上海滨江华丽酒店后勤仓");
const externalTradeFlag = ref(false);

const lineItemName = ref("环保牙具套装");
const lineItemCategory = ref("客房一次性用品");
const lineItemSpec = ref("竹柄");
const lineItemQuantity = ref(500);
const lineItemUnit = ref("套");
const lineItemEstimatedUnitPrice = ref<number | null>(7.2);
const lineItemBudgetAmount = ref<number | null>(3600);
const lineItemRequiredByDate = ref("2026-07-10");
const lineItemRemark = ref("首批采购");

const canCreateRequest = computed(() => session.roleId === "hotel_buyer");
const canApproveRequest = computed(() => session.roleId === "group_manager");
const canDecideMethod = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const visibleRequests = computed(() => requests.value.filter((item) => item.status !== "cancelled" && !isTestRecord([item.title, item.requestDepartment, item.requesterName])));
const pageTitle = computed(() => {
  if (session.roleId === "group_manager") return "需求审批";
  if (canDecideMethod.value) return "需求转项目";
  if (session.roleId === "auditor") return "需求监督";
  return "采购申请";
});
const flowDescription = computed(() => {
  if (canCreateRequest.value) return "当前账号负责提交酒店采购申请；提交后由集团审批，审批通过后交由采购经办承接。";
  if (session.roleId === "group_manager") return "当前账号只处理酒店提交后的需求审批，不发起采购申请。";
  if (canDecideMethod.value) return "当前账号处理已审批需求，在同一页面完成采购方式判定并发起采购项目。";
  return "当前账号仅查看授权范围内的采购申请和需求流转。";
});

function pendingApprovalTaskFor(request: ProcurementRequest) {
  return workflowTasks.value.find(
    (task) => task.businessType === "procurement_request" && task.businessId === request.id && task.status === "pending" && task.canComplete
  );
}

function canSubmitRequestRow(request: ProcurementRequest) {
  return Boolean(canCreateRequest.value && request.status === "draft" && request.createdBy === session.user?.id);
}

function canApproveRequestRow(request: ProcurementRequest) {
  return Boolean(canApproveRequest.value && request.approvalStatus === "submitted" && request.createdBy !== session.user?.id && pendingApprovalTaskFor(request));
}

function canDecideMethodRow(request: ProcurementRequest) {
  return Boolean(canDecideMethod.value && request.status === "submitted" && request.approvalStatus === "approved");
}

function canCreateProjectRow(request: ProcurementRequest) {
  return Boolean(canDecideMethod.value && request.status === "method_decided" && request.approvalStatus === "approved" && !request.projectId);
}

function canDeleteRequestRow(request: ProcurementRequest) {
  return Boolean(request.status === "draft" && canCreateRequest.value && request.createdBy === session.user?.id);
}

function canCancelRequestRow(request: ProcurementRequest) {
  return Boolean(request.status !== "project_created" && request.status !== "cancelled" && canCreateRequest.value && request.createdBy === session.user?.id);
}

function hasRowActions(request: ProcurementRequest) {
  return (
    canSubmitRequestRow(request) ||
    canApproveRequestRow(request) ||
    canDecideMethodRow(request) ||
    canCreateProjectRow(request) ||
    canDeleteRequestRow(request) ||
    canCancelRequestRow(request)
  );
}

function rowReadonlyLabel(request: ProcurementRequest) {
  if (request.status === "project_created") return "已锁定";
  if (request.status === "cancelled") return "已取消";
  if (request.approvalStatus === "submitted") return "待对应审批人处理";
  if (canDecideMethod.value && request.approvalStatus !== "approved") return "待审批通过后承接";
  return "只读";
}

function isGenericRequestTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

function defaultProjectName(request: ProcurementRequest) {
  const title = request.title.trim();
  const firstItemName = request.lineItems?.[0]?.itemName?.trim();
  if (isGenericRequestTitle(title)) {
    return firstItemName ? `${firstItemName}采购项目` : "";
  }
  if (title.endsWith("采购项目")) return title;
  if (title.endsWith("采购申请")) return title.replace(/采购申请$/, "采购项目");
  return `${title}项目`;
}

function projectNameInput(request: ProcurementRequest) {
  return projectNameInputs.value[request.id] || defaultProjectName(request);
}

function setProjectNameInput(requestId: string, event: Event) {
  projectNameInputs.value = { ...projectNameInputs.value, [requestId]: (event.target as HTMLInputElement).value };
}

function methodRuleIdFor(requestId: string) {
  return methodRuleSelections.value[requestId] || selectedRuleId.value || rules.value[0]?.id || "";
}

function setMethodRule(requestId: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  methodRuleSelections.value = { ...methodRuleSelections.value, [requestId]: value };
  selectedRuleId.value = value;
}

function isTestRecord(values: Array<string | undefined | null>) {
  return values.some((value) => /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? "")));
}

function onAttachmentChange(event: Event) {
  const target = event.target as HTMLInputElement;
  attachmentFile.value = target.files?.[0] ?? null;
  attachmentFileName.value = attachmentFile.value?.name ?? "";
}

async function buildAttachments() {
  if (!attachmentFile.value) return [];
  const suffix = `${Date.now()}`;
  const uploaded = await uploadFile(attachmentFile.value, {
    attachmentKind: "procurement_request_attachment",
    objectType: "procurement_request",
    objectId: `pending-request-${suffix}`
  });
  return [uploaded.file] satisfies UploadedFileMetadata[];
}

function buildLineItems() {
  return [
    {
      itemName: lineItemName.value,
      category: lineItemCategory.value,
      specification: lineItemSpec.value,
      quantity: lineItemQuantity.value,
      unit: lineItemUnit.value,
      estimatedUnitPrice: lineItemEstimatedUnitPrice.value ?? undefined,
      budgetAmount: lineItemBudgetAmount.value ?? undefined,
      requiredByDate: lineItemRequiredByDate.value,
      remark: lineItemRemark.value
    }
  ];
}

async function load() {
  const [requestData, ruleData, projectData, taskData] = await Promise.all([
    apiGet<{ procurementRequests: ProcurementRequest[] }>("/api/procurement-requests"),
    apiGet<{ procurementMethodRules: MethodRule[] }>("/api/procurement-method-rules"),
    apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })),
    loadWorkflowTasks(session, "procurement_request").catch(() => [])
  ]);
  requests.value = requestData.procurementRequests;
  rules.value = ruleData.procurementMethodRules;
  projects.value = projectData.projects;
  workflowTasks.value = taskData;
  selectedRuleId.value ||= rules.value[0]?.id ?? "";
}

function projectName(projectId: string | null) {
  if (!projectId) return "待发起";
  const project = projects.value.find((item) => item.id === projectId);
  return project ? project.name || project.code || "已发起项目" : "已发起项目";
}

function projectExecutionLink(projectId: string | null) {
  return projectId ? { path: "/project-workbench", query: { projectId } } : "/project-workbench";
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

async function createRequest() {
  await run(async () =>
    apiPost("/api/procurement-requests", {
      title: title.value,
      orgId: "org-hotel",
      category: category.value,
      requestDepartment: requestDepartment.value,
      requesterName: requesterName.value,
      budgetLabel: "按酒店制度执行",
      budgetAmount: budgetAmount.value ?? undefined,
      purpose: purpose.value,
      expectedArrivalAt: expectedArrivalAt.value,
      receivingLocation: receivingLocation.value,
      externalTradeFlag: externalTradeFlag.value,
      lineItems: buildLineItems(),
      attachments: await buildAttachments()
    })
  );
  attachmentFile.value = null;
  attachmentFileName.value = "";
}

async function createProjectFromRequest(request: ProcurementRequest) {
  const name = projectNameInput(request);
  await run(async () =>
    apiPost("/api/projects", {
      requestId: request.id,
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
  <section class="panel">
    <h2>{{ pageTitle }}</h2>

    <div class="flow-guide">
      <div class="flow-guide-head">
        <strong>标准流程：酒店提交采购申请 → 集团审批需求 → 采购经办判定方式并发起项目</strong>
        <span>{{ flowDescription }}</span>
      </div>
      <div class="step-strip" aria-label="采购申请职责流程">
        <span class="step-chip done">1 酒店提需求</span>
        <span class="step-chip pending">2 集团审批</span>
        <span class="step-chip ready">3 经办转项目</span>
        <span class="step-chip">4 进入项目执行</span>
      </div>
    </div>

    <div v-if="canCreateRequest" class="form-grid">
      <label>
        申请标题
        <input v-model="title" />
      </label>
      <label>
        使用部门
        <input v-model="requestDepartment" />
      </label>
      <label>
        申请人
        <input v-model="requesterName" />
      </label>
      <label>
        采购品类
        <input v-model="category" />
      </label>
      <label>
        预算金额
        <input v-model.number="budgetAmount" type="number" />
      </label>
      <label>
        需求用途
        <input v-model="purpose" />
      </label>
      <label>
        需求日期
        <input v-model="expectedArrivalAt" type="date" />
      </label>
      <label>
        收货地点
        <input v-model="receivingLocation" />
      </label>
      <label class="check-row">
        <input v-model="externalTradeFlag" type="checkbox" />
        外部交易备案路径
      </label>
    </div>

    <div v-if="canCreateRequest" class="form-grid">
      <label>
        明细名称
        <input v-model="lineItemName" />
      </label>
      <label>
        明细品类
        <input v-model="lineItemCategory" />
      </label>
      <label>
        规格
        <input v-model="lineItemSpec" />
      </label>
      <label>
        数量
        <input v-model.number="lineItemQuantity" type="number" />
      </label>
      <label>
        单位
        <input v-model="lineItemUnit" />
      </label>
      <label>
        预估单价
        <input v-model.number="lineItemEstimatedUnitPrice" type="number" step="0.01" />
      </label>
      <label>
        行预算
        <input v-model.number="lineItemBudgetAmount" type="number" />
      </label>
      <label>
        行需求日期
        <input v-model="lineItemRequiredByDate" type="date" />
      </label>
      <label>
        备注
        <input v-model="lineItemRemark" />
      </label>
    </div>

    <div v-if="canCreateRequest" class="form-grid">
      <label>
        申请附件
        <input type="file" @change="onAttachmentChange" />
      </label>
      <div class="notice">{{ attachmentFileName || "未选择文件" }}</div>
      <button type="button" @click="createRequest">创建采购申请</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>编号</th>
          <th>标题</th>
          <th>部门 / 申请人</th>
          <th>状态</th>
          <th>审批</th>
          <th>方式</th>
          <th>预算</th>
          <th>附件</th>
          <th>项目</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in visibleRequests" :key="item.id">
          <td>{{ item.code || item.id }}</td>
          <td>{{ item.title }}</td>
          <td>{{ item.requestDepartment || "-" }} / {{ item.requesterName || "-" }}</td>
          <td>{{ labelStatus(item.status || "draft") }}</td>
          <td>{{ labelStatus(item.approvalStatus) }}</td>
          <td>{{ labelStatus(item.methodSuggestion) }}</td>
          <td>{{ item.budgetAmount === undefined ? "-" : `¥${Number(item.budgetAmount).toLocaleString("zh-CN")}` }}</td>
          <td>
            <AttachmentList :attachments="item.attachments" compact />
          </td>
          <td>
            <RouterLink v-if="item.projectId" class="text-link" :to="projectExecutionLink(item.projectId)">
              {{ projectName(item.projectId) }}
            </RouterLink>
            <span v-else>{{ projectName(item.projectId) }}</span>
          </td>
          <td>
            <RouterLink class="secondary-button link-button" :to="`/procurement-requests/${encodeURIComponent(item.id)}`">查看详情</RouterLink>
            <div v-if="hasRowActions(item)" class="row-actions">
              <button v-if="canSubmitRequestRow(item)" type="button" @click="run(() => apiPost(`/api/procurement-requests/${item.id}/submit`))">提交审批</button>
              <button v-if="canApproveRequestRow(item)" type="button" @click="run(() => apiPost(`/api/procurement-requests/${item.id}/approve`, { approved: true, opinion: '页面审批通过' }))">
                审批通过
              </button>
              <button
                v-if="canApproveRequestRow(item)"
                type="button"
                class="secondary-button"
                @click="run(() => apiPost(`/api/procurement-requests/${item.id}/approve`, { approved: false, opinion: '页面审批驳回' }))"
              >
                审批驳回
              </button>
              <select v-if="canDecideMethodRow(item)" class="compact-select" :value="methodRuleIdFor(item.id)" @change="setMethodRule(item.id, $event)">
                <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.ruleName || rule.resultMethod }}</option>
              </select>
              <button
                v-if="canDecideMethodRow(item)"
                type="button"
                :disabled="!methodRuleIdFor(item.id)"
                @click="run(() => apiPost(`/api/procurement-requests/${item.id}/method-decision`, { ruleId: methodRuleIdFor(item.id), externalTradeFlag }))"
              >
                方式判定
              </button>
              <input
                v-if="canCreateProjectRow(item)"
                class="compact-input"
                :value="projectNameInput(item)"
                aria-label="项目名称"
                @input="setProjectNameInput(item.id, $event)"
              />
              <button v-if="canCreateProjectRow(item)" type="button" @click="createProjectFromRequest(item)">发起项目</button>
              <button v-if="canDeleteRequestRow(item)" type="button" class="secondary-button" @click="run(() => apiDelete(`/api/procurement-requests/${item.id}`))">删除</button>
              <button
                v-else-if="canCancelRequestRow(item)"
                type="button"
                class="secondary-button"
                @click="run(() => apiPost(`/api/procurement-requests/${item.id}/cancel`, { reason: '页面撤销采购申请' }))"
              >
                取消
              </button>
            </div>
            <span v-else class="notice">{{ rowReadonlyLabel(item) }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
