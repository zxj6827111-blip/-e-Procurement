<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { apiGet, apiPost } from "../api/http";
import { loadWorkflowTasks, type R8WorkflowTaskView } from "../api/workflow";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

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
  methodRuleId?: string;
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
  ruleCode?: string;
  ruleName: string;
  resultMethod: string;
}

interface ProjectRow {
  id: string;
  code?: string;
  name?: string;
  displayName?: string;
}

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const request = ref<ProcurementRequest | null>(null);
const rules = ref<MethodRule[]>([]);
const projects = ref<ProjectRow[]>([]);
const workflowTasks = ref<R8WorkflowTaskView[]>([]);
const loading = ref(false);
const error = ref("");
const auditLogId = ref("");
const processRefreshKey = ref(0);
const selectedRuleId = ref("");
const projectNameDraft = ref("");

const requestId = computed(() => String(route.params.requestId ?? ""));
const lineItems = computed(() => request.value?.lineItems ?? []);
const attachments = computed(() => request.value?.attachments ?? []);
const canApproveRequest = computed(() => session.roleId === "group_manager");
const canDecideMethod = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const detailEyebrow = computed(() => {
  if (session.roleId === "group_manager") return "需求审批详情";
  if (session.roleId === "buyer" || session.roleId === "platform_operator") return "需求转项目详情";
  if (session.roleId === "auditor") return "需求监督详情";
  return "采购申请详情";
});

const pendingApprovalTask = computed(() =>
  workflowTasks.value.find(
    (task) =>
      task.businessType === "procurement_request" &&
      task.businessId === requestId.value &&
      task.status === "pending" &&
      task.canComplete
  )
);

const canApprove = computed(() =>
  Boolean(request.value && canApproveRequest.value && request.value.approvalStatus === "submitted" && request.value.createdBy !== session.user?.id && pendingApprovalTask.value)
);

const selectedRule = computed(() => rules.value.find((rule) => rule.id === selectedRuleId.value) ?? rules.value[0]);
const selectedRuleDescription = computed(() => methodRuleSummary(selectedRule.value));
const canDecideMethodDetail = computed(() =>
  Boolean(request.value && canDecideMethod.value && request.value.status === "submitted" && request.value.approvalStatus === "approved")
);
const canCreateProjectDetail = computed(() =>
  Boolean(request.value && canDecideMethod.value && request.value.status === "method_decided" && request.value.approvalStatus === "approved" && !request.value.projectId)
);
const linkedProject = computed(() => {
  if (!request.value?.projectId) return null;
  return projects.value.find((project) => project.id === request.value?.projectId) ?? null;
});
const projectExecutionLink = computed(() =>
  request.value?.projectId ? { path: "/project-workbench", query: { projectId: request.value.projectId } } : "/project-workbench"
);
const showNextStepPanel = computed(() =>
  Boolean(canDecideMethod.value && request.value && (canDecideMethodDetail.value || canCreateProjectDetail.value || request.value.projectId))
);

function money(value: number | undefined) {
  return value === undefined ? "-" : `¥${Number(value).toLocaleString("zh-CN")}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return value.slice(0, 10);
}

function isGenericRequestTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

function defaultProjectName(source: ProcurementRequest) {
  const title = source.title.trim();
  const firstItemName = source.lineItems?.[0]?.itemName?.trim();
  if (isGenericRequestTitle(title)) {
    return firstItemName ? `${firstItemName}采购项目` : "";
  }
  if (title.endsWith("采购项目")) return title;
  if (title.endsWith("采购申请")) return title.replace(/采购申请$/, "采购项目");
  return `${title}项目`;
}

function methodRuleId() {
  return selectedRuleId.value || rules.value[0]?.id || "";
}

function isExternalRule(rule: MethodRule | undefined) {
  return Boolean(rule && (rule.ruleCode?.includes("external") || rule.resultMethod.includes("外部") || rule.resultMethod === "external_trade"));
}

function methodRuleSummary(rule: MethodRule | undefined) {
  const method = rule?.resultMethod ?? "";
  const code = rule?.ruleCode ?? "";
  if (method.includes("外部") || code.includes("external")) {
    return "适用于依法必须进外部交易平台、或集团制度要求外部备案的采购；判定后进入外部采购备案链路。";
  }
  if (method.includes("询价") || method.includes("比选") || code.includes("comparison")) {
    return "适用于金额较小、品类清晰、制度允许通过多家询价或比选确定供应商的内部采购。";
  }
  return "适用于需要在内部平台公开发布公告、接受供应商报名或邀请、再进入报价和评审的采购。";
}

function ruleResultLabel(rule: MethodRule | undefined) {
  return rule ? labelStatus(rule.resultMethod) : "-";
}

function projectDisplayName(project: ProjectRow | null) {
  if (!project) return "采购项目";
  return project.displayName || [project.code, project.name].filter(Boolean).join(" / ") || project.id;
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
  try {
    const [requestData, taskData, ruleData, projectData] = await Promise.all([
      apiGet<{ procurementRequests: ProcurementRequest[] }>("/api/procurement-requests"),
      loadWorkflowTasks(session, "procurement_request").catch(() => []),
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
  <section class="panel">
    <div class="page-head">
      <div>
        <p class="eyebrow">{{ detailEyebrow }}</p>
        <h2>{{ request?.code || requestId }}{{ request ? ` / ${request.title}` : "" }}</h2>
      </div>
      <div class="topbar-actions">
        <RouterLink class="secondary-button link-button" to="/procurement-requests">返回列表</RouterLink>
        <button type="button" class="secondary-button" @click="router.back()">返回上一页</button>
      </div>
    </div>

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
    <div v-if="loading" class="notice">正在加载采购申请详情...</div>

    <template v-if="request">
      <div v-if="showNextStepPanel" class="detail-panel action-panel request-next-step-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">经办下一步</p>
            <h3>{{ canDecideMethodDetail ? "判定采购方式" : canCreateProjectDetail ? "发起采购项目" : "项目已发起" }}</h3>
          </div>
          <span class="tag">{{ labelStatus(request.status || "draft") }}</span>
        </div>

        <div v-if="canDecideMethodDetail" class="request-next-step-grid">
          <div class="next-step-copy">
            <strong>该需求已审批通过，当前需要先选择适用的采购方式规则。</strong>
            <p>判定后，系统会把需求推进到“已定采购方式”；如果选择外部交易规则，会进入外部采购备案路径。</p>
          </div>
          <div class="request-action-box">
            <label>
              选择采购方式规则
              <select v-model="selectedRuleId">
                <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.ruleName || rule.resultMethod }}</option>
              </select>
            </label>
            <div class="rule-explain">
              <strong>{{ selectedRule?.ruleName || "暂无可用规则" }}</strong>
              <span>判定结果：{{ ruleResultLabel(selectedRule) }}</span>
              <p>{{ selectedRuleDescription }}</p>
            </div>
            <button type="button" :disabled="!methodRuleId()" @click="runMethodDecision">方式判定</button>
          </div>
        </div>

        <div v-else-if="canCreateProjectDetail" class="request-next-step-grid">
          <div class="next-step-copy">
            <strong>采购方式已判定，可以从该需求直接发起采购项目。</strong>
            <p>项目名称默认取采购申请标题；如果标题过于泛化，会优先使用第一条采购明细，避免项目列表里出现一堆“采购项目”。</p>
          </div>
          <div class="request-action-box">
            <label>
              项目名称
              <input v-model="projectNameDraft" />
            </label>
            <button type="button" :disabled="!projectNameDraft.trim()" @click="createProjectFromRequest">发起项目</button>
          </div>
        </div>

        <div v-else-if="request.projectId" class="request-next-step-grid">
          <div class="next-step-copy">
            <strong>该需求已经转为采购项目。</strong>
            <p>{{ projectDisplayName(linkedProject) }}</p>
          </div>
          <div class="request-action-box">
            <RouterLink class="secondary-button link-button" :to="projectExecutionLink">进入项目执行</RouterLink>
          </div>
        </div>
      </div>

      <div class="detail-panel detail-panel-standalone">
        <div class="panel-head">
          <div>
            <p class="eyebrow">{{ detailEyebrow }}</p>
            <h3>{{ request.code || request.id }} / {{ request.title }}</h3>
          </div>
          <span class="tag">{{ labelStatus(request.approvalStatus) }}</span>
        </div>

        <div class="detail-grid">
          <div>
            <span>使用部门</span>
            <strong>{{ request.requestDepartment || "-" }}</strong>
          </div>
          <div>
            <span>申请人</span>
            <strong>{{ request.requesterName || "-" }}</strong>
          </div>
          <div>
            <span>采购品类</span>
            <strong>{{ request.category || "-" }}</strong>
          </div>
          <div>
            <span>预算金额</span>
            <strong>{{ money(request.budgetAmount) }}</strong>
          </div>
          <div>
            <span>预算口径</span>
            <strong>{{ request.budgetLabel || "-" }}</strong>
          </div>
          <div>
            <span>需求日期</span>
            <strong>{{ formatDate(request.expectedArrivalAt) }}</strong>
          </div>
          <div>
            <span>收货地点</span>
            <strong>{{ request.receivingLocation || "-" }}</strong>
          </div>
          <div>
            <span>采购方式</span>
            <strong>{{ labelStatus(request.methodSuggestion) }}</strong>
          </div>
          <div>
            <span>外部交易</span>
            <strong>{{ request.externalTradeFlag ? "需要外部备案" : "内部采购" }}</strong>
          </div>
          <div>
            <span>创建时间</span>
            <strong>{{ formatDateTime(request.createdAt) }}</strong>
          </div>
          <div>
            <span>更新时间</span>
            <strong>{{ formatDateTime(request.updatedAt) }}</strong>
          </div>
          <div>
            <span>审批人</span>
            <strong>{{ request.approvalBy || "-" }}</strong>
          </div>
          <div>
            <span>审批时间</span>
            <strong>{{ formatDateTime(request.approvedAt) }}</strong>
          </div>
        </div>

        <div class="detail-block">
          <h4>需求用途</h4>
          <p>{{ request.purpose || "-" }}</p>
        </div>

        <div class="detail-block">
          <h4>申请说明</h4>
          <p>{{ request.description || "-" }}</p>
        </div>

        <div class="detail-block">
          <h4>审批意见</h4>
          <p>{{ request.approvalOpinion || "-" }}</p>
        </div>

        <div class="detail-block">
          <h4>采购明细</h4>
          <table v-if="lineItems.length" class="compact-table">
            <thead>
              <tr>
                <th>明细名称</th>
                <th>品类</th>
                <th>规格</th>
                <th>数量</th>
                <th>单位</th>
                <th>预估单价</th>
                <th>行预算</th>
                <th>需求日期</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in lineItems" :key="line.id">
                <td>{{ line.itemName || "-" }}</td>
                <td>{{ line.category || "-" }}</td>
                <td>{{ line.specification || "-" }}</td>
                <td>{{ line.quantity }}</td>
                <td>{{ line.unit || "-" }}</td>
                <td>{{ money(line.estimatedUnitPrice) }}</td>
                <td>{{ money(line.budgetAmount) }}</td>
                <td>{{ formatDate(line.requiredByDate) }}</td>
                <td>{{ line.remark || "-" }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="notice">暂无采购明细。</p>
        </div>

        <div class="detail-block">
          <h4>申请附件</h4>
          <AttachmentList :attachments="attachments" empty-text="未提交附件" variant="document" show-meta show-download />
        </div>

        <div v-if="canApprove" class="actions">
          <button type="button" @click="runApproval(true)">审批通过</button>
          <button type="button" class="secondary-button" @click="runApproval(false)">审批驳回</button>
        </div>
      </div>
    </template>
  </section>

  <ProcessTimeline
    v-if="request"
    business-type="procurement_request"
    :business-id="request.id"
    title="采购需求流程进度"
    :refresh-key="processRefreshKey"
  />
</template>
