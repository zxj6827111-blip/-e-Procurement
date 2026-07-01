<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPatch, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import { useSessionStore } from "../stores/session";
import { labelStatus } from "../utils/status-labels";

interface Expert {
  id: string;
  name: string;
  category: string;
  status: string;
  accountUserIds?: string[];
  ownerOrgId?: string;
  branchOrgId?: string;
  reviewScopes?: string[];
  supplierAssessmentScopes?: string[];
  sharedAccount?: boolean;
  active?: boolean;
  maintenanceLog?: string;
}

interface Assignment {
  id: string;
  expertId: string;
  expertName?: string;
  method: string;
  status: string;
  avoidanceConfirmed: boolean;
  disciplineConfirmed: boolean;
  confidentialityConfirmed: boolean;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
  externalTradeFlag?: boolean;
  displayStatus?: string;
  procurementMethod?: string;
  quoteDeadlineAt?: string;
  budgetAmount?: number;
}

type ScoringCategory = "technical" | "service" | "price";

interface ScoringItem {
  id: string;
  category: ScoringCategory;
  categoryLabel: string;
  label: string;
  reference: string;
  evidence: string;
  maxScore: number;
  score?: number;
  comment?: string;
}

interface ReviewSheetRecord {
  sheetId: string;
  expertName: string;
  supplierId: string;
  supplierName: string;
  templateName: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  opinion: string;
  status: string;
  versionNo: number;
  submittedAt: string | null;
  lockedAt: string | null;
  details: ScoringItem[];
  materials: {
    registrationMaterials: { id: string; fileName: string }[];
    supplementMaterials: { id: string; fileName: string }[];
    bidMaterials: { id: string; fileName: string }[];
    bidSummary?: { amount: number; deliveryDays?: number | null; responseSummary?: string; serviceCommitment?: string; fileName?: string } | null;
  };
}

interface SupplierScoreRecord {
  supplierId: string;
  supplierName: string;
  submittedCount: number;
  technical: number;
  service: number;
  price: number;
  total: number;
  rank: number;
  sheets: ReviewSheetRecord[];
}

interface ReviewRecordDetail {
  project: ProjectOption;
  generatedAt: string;
  template: { id: string; templateName: string; versionNo: number } | null;
  scoringItems: ScoringItem[];
  summary: {
    submittedExpertCount: number;
    totalExpertCount: number;
    allSubmitted: boolean;
    anomalies?: { scoreSpread?: number; priceWarning?: boolean; nonLowestPriceRecommended?: boolean };
    recommendation?: { supplierId: string; isLowestPrice: boolean; note: string } | null;
  };
  supplierRecords: SupplierScoreRecord[];
  sheetRecords: ReviewSheetRecord[];
  reports: ReviewReport[];
}

interface ReviewReport {
  id: string;
  reportNo: string;
  status: string;
  generatedAt: string;
  frozenAt: string | null;
  createdBy: string;
}

const route = useRoute();
const projects = ref<ProjectOption[]>([]);
const experts = ref<Expert[]>([]);
const assignments = ref<Assignment[]>([]);
const reviewDetail = ref<ReviewRecordDetail | null>(null);
const reports = ref<ReviewReport[]>([]);
const selectedProjectId = ref("");
const expertId = ref("exp-1");
const replacementExpertId = ref("exp-3");
const selectedAssignmentId = ref("");
const reason = ref("按项目品类和回避规则抽取");
const reportNote = ref("专家评分均已提交，系统按技术分、商务分、价格分汇总生成评标记录。");
const drawReviewScopes = ref<string[]>(["技术评审"]);
const auditLogId = ref("");
const error = ref("");
const processRefreshKey = ref(0);
const session = useSessionStore();

const reviewScopeOptions = ["技术评审", "商务评审", "财务评审", "供应链评审", "业务部门评审"];
const canMaintainExpertReview = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const canMaintainExpertDirectory = computed(() => session.roleId === "group_manager");
const drawableExperts = computed(() => experts.value.filter((item) => item.active !== false && item.status.includes("可")));
const selectedProject = computed(() => projects.value.find((item) => item.id === selectedProjectId.value) ?? null);
const assignedExpertIds = computed(() => new Set(assignments.value.map((item) => item.expertId)));
const assignableExperts = computed(() => drawableExperts.value.filter((item) => !assignedExpertIds.value.has(item.id)));
const replacementExperts = computed(() => drawableExperts.value.filter((item) => !assignedExpertIds.value.has(item.id)));
const expertAssignmentStatuses = new Set(["bidding_locked", "expert_reviewing"]);
const reviewReadableStatuses = new Set(["bidding_locked", "expert_reviewing", "review_report_frozen", "award_approving", "awarded_pending_order", "result_notified"]);
const canOperateExpertAssignment = computed(() => Boolean(selectedProject.value && expertAssignmentStatuses.has(selectedProject.value.status)));
const canViewExpertReviewProgress = computed(() => Boolean(selectedProject.value && reviewReadableStatuses.has(selectedProject.value.status)));
const reviewStageHint = computed(() => {
  const project = selectedProject.value;
  if (!project) return "请选择采购项目后查看专家评审状态。";
  if (expertAssignmentStatuses.has(project.status)) return "报价已锁定，可以抽取或指定专家，并进入评审确认与评分。";
  if (reviewReadableStatuses.has(project.status)) return "评审已进入后续环节，可以查看专家和评审进度，但不再替换专家。";
  if (project.status === "bidding_open") return "当前仍在报价控制阶段，请先完成报价截止和锁定报价，再组织专家评审。";
  return "当前项目尚未到专家评审阶段，请先完成采购文件、公告报名和报价控制。";
});

const expertFormMode = ref<"create" | "edit">("create");
const editingExpertId = ref("");
const libraryOwnerOrgId = ref("org-group");
const libraryBranchOrgId = ref("org-group");
const libraryAccountUserIds = ref("");
const libraryName = ref("");
const libraryCategory = ref("综合评审");
const libraryStatus = ref("可抽取");
const libraryReviewScopes = ref<string[]>(["技术评审", "商务评审"]);
const librarySupplierAssessmentScopes = ref<string[]>([...reviewScopeOptions]);
const librarySharedAccount = ref(false);
const libraryActive = ref(true);
const libraryMaintenanceLog = ref("");

const assignmentStatusLabels: Record<string, string> = {
  assigned: "待专家确认",
  confirmed: "专家已确认",
  submitted_locked: "评分已提交",
  replaced: "已替换"
};

function routeProjectId() {
  const value = route.query.projectId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function projectLabel(project: ProjectOption) {
  return `${project.code} / ${project.name} / ${labelStatus(project.status)}`;
}

function pickProjectFromRouteOrFallback(preferRoute: boolean) {
  const queryProjectId = routeProjectId();
  if (preferRoute && queryProjectId && projects.value.some((item) => item.id === queryProjectId)) {
    selectedProjectId.value = queryProjectId;
    return;
  }
  if (!projects.value.some((item) => item.id === selectedProjectId.value)) {
    selectedProjectId.value = (queryProjectId && projects.value.some((item) => item.id === queryProjectId) ? queryProjectId : projects.value[0]?.id) ?? "";
  }
}

function syncDefaultExpertSelections() {
  if (!assignableExperts.value.some((item) => item.id === expertId.value)) {
    expertId.value = assignableExperts.value[0]?.id ?? "";
  }
  if (!replacementExperts.value.some((item) => item.id === replacementExpertId.value)) {
    replacementExpertId.value = replacementExperts.value[0]?.id ?? "";
  }
}

async function loadReviewRecords() {
  reviewDetail.value = null;
  reports.value = [];
  if (!selectedProjectId.value || !canViewExpertReviewProgress.value) return;
  try {
    const detailResult = await apiGet<{ detail: ReviewRecordDetail }>(`/api/projects/${selectedProjectId.value}/review-record-detail`);
    reviewDetail.value = detailResult.detail;
    reports.value = detailResult.detail.reports ?? [];
  } catch {
    reviewDetail.value = null;
  }
  try {
    reports.value = (await apiGet<{ reports: ReviewReport[] }>(`/api/projects/${selectedProjectId.value}/review-report`)).reports;
  } catch {
    // 评审未到可读阶段时保留空状态，不影响专家抽取。
  }
}

async function includeRouteProjectIfReadable() {
  const queryProjectId = routeProjectId();
  if (!queryProjectId || projects.value.some((item) => item.id === queryProjectId)) return;
  try {
    const { project } = await apiGet<{ project: ProjectOption }>(`/api/projects/${queryProjectId}`);
    if (!project.externalTradeFlag) projects.value = [project, ...projects.value];
  } catch {
    // 列表页可以继续显示当前账号可见项目；具体无权错误留给后续详情接口提示。
  }
}

async function load(options: { preferRoute?: boolean } = {}) {
  experts.value = (await apiGet<{ experts: Expert[] }>("/api/experts")).experts;
  syncDefaultExpertSelections();
  projects.value = (await apiGet<{ projects: ProjectOption[] }>("/api/projects")).projects.filter((project) => !project.externalTradeFlag);
  await includeRouteProjectIfReadable();
  pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
  if (!selectedProjectId.value) {
    assignments.value = [];
    selectedAssignmentId.value = "";
    return;
  }
  assignments.value = (await apiGet<{ assignments: Assignment[] }>(`/api/projects/${selectedProjectId.value}/expert-assignments`)).assignments;
  if (!assignments.value.some((item) => item.id === selectedAssignmentId.value)) {
    selectedAssignmentId.value = assignments.value[0]?.id ?? "";
  }
  syncDefaultExpertSelections();
  await loadReviewRecords();
}

function onProjectChange() {
  void load();
}

function resetExpertForm() {
  expertFormMode.value = "create";
  editingExpertId.value = "";
  libraryOwnerOrgId.value = session.user?.orgId ?? "org-group";
  libraryBranchOrgId.value = session.user?.orgId ?? "org-group";
  libraryAccountUserIds.value = "";
  libraryName.value = "";
  libraryCategory.value = "综合评审";
  libraryStatus.value = "可抽取";
  libraryReviewScopes.value = ["技术评审", "商务评审"];
  librarySupplierAssessmentScopes.value = [...reviewScopeOptions];
  librarySharedAccount.value = false;
  libraryActive.value = true;
  libraryMaintenanceLog.value = "";
}

function editExpert(expert: Expert) {
  expertFormMode.value = "edit";
  editingExpertId.value = expert.id;
  libraryOwnerOrgId.value = expert.ownerOrgId ?? "org-group";
  libraryBranchOrgId.value = expert.branchOrgId ?? "org-group";
  libraryAccountUserIds.value = (expert.accountUserIds ?? []).join(", ");
  libraryName.value = expert.name;
  libraryCategory.value = expert.category;
  libraryStatus.value = expert.status;
  libraryReviewScopes.value = [...(expert.reviewScopes ?? [])];
  librarySupplierAssessmentScopes.value = [...(expert.supplierAssessmentScopes ?? [])];
  librarySharedAccount.value = Boolean(expert.sharedAccount);
  libraryActive.value = expert.active !== false;
  libraryMaintenanceLog.value = expert.maintenanceLog ?? "";
}

function expertPayload() {
  return {
    ownerOrgId: libraryOwnerOrgId.value,
    branchOrgId: libraryBranchOrgId.value,
    accountUserIds: libraryAccountUserIds.value,
    name: libraryName.value,
    category: libraryCategory.value,
    status: libraryStatus.value,
    reviewScopes: libraryReviewScopes.value,
    supplierAssessmentScopes: librarySupplierAssessmentScopes.value,
    sharedAccount: librarySharedAccount.value,
    active: libraryActive.value,
    maintenanceLog: libraryMaintenanceLog.value
  };
}

async function saveExpert() {
  error.value = "";
  try {
    const result =
      expertFormMode.value === "edit" && editingExpertId.value
        ? await apiPatch<{ expert: Expert; auditLogId?: string }>(`/api/experts/${editingExpertId.value}`, expertPayload())
        : await apiPost<{ expert: Expert; auditLogId?: string }>("/api/experts", expertPayload());
    auditLogId.value = result.auditLogId ?? "";
    await load();
    editExpert(result.expert);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存专家失败";
  }
}

async function run(action: () => Promise<{ auditLogId?: string; assignment?: Assignment; replacement?: Assignment }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedAssignmentId.value = result.assignment?.id ?? result.replacement?.id ?? selectedAssignmentId.value;
    await load();
    processRefreshKey.value += 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function reviewAction(action: () => Promise<{ auditLogId?: string }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    await loadReviewRecords();
    await load();
    processRefreshKey.value += 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "评标记录操作失败";
  }
}

function printReviewDetail() {
  window.print();
}

function formatDateTime(value?: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function categoryLabel(category: ScoringCategory) {
  return category === "technical" ? "技术分" : category === "service" ? "商务分" : "价格分";
}

onMounted(async () => {
  if (!session.user) await session.loadMe();
  resetExpertForm();
  await load({ preferRoute: true });
});

watch(
  () => route.query.projectId,
  () => {
    void load({ preferRoute: true });
  }
);
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div>
        <h2>评审专家库</h2>
        <p class="notice">统一维护专家账号、评审范围和启停状态，评审抽取从这里选取可用专家。</p>
      </div>
      <button v-if="canMaintainExpertDirectory" type="button" class="secondary-button" @click="resetExpertForm">新增专家</button>
    </div>

    <p v-if="!canMaintainExpertDirectory" class="notice">当前账号仅可查看专家库；新增、启停和账号绑定由集团采购管理维护。</p>

    <div v-if="canMaintainExpertDirectory" class="form-grid">
      <label>
        归属
        <input v-model="libraryOwnerOrgId" />
      </label>
      <label>
        所属分店
        <input v-model="libraryBranchOrgId" />
      </label>
      <label>
        用户账号
        <input v-model="libraryAccountUserIds" placeholder="例如 u4，多个账号用逗号分隔" />
      </label>
      <label>
        名称
        <input v-model="libraryName" />
      </label>
      <label>
        专业/分类
        <input v-model="libraryCategory" />
      </label>
      <label>
        状态
        <select v-model="libraryStatus">
          <option value="可抽取">可抽取</option>
          <option value="回避">回避</option>
          <option value="停用">停用</option>
        </select>
      </label>
      <label class="full-row">
        评标范围
        <span class="checkbox-group">
          <span v-for="scope in reviewScopeOptions" :key="scope" class="checkbox-chip">
            <input v-model="libraryReviewScopes" type="checkbox" :value="scope" />
            {{ scope }}
          </span>
        </span>
      </label>
      <label class="full-row">
        供应商考核范围
        <span class="checkbox-group">
          <span v-for="scope in reviewScopeOptions" :key="scope" class="checkbox-chip">
            <input v-model="librarySupplierAssessmentScopes" type="checkbox" :value="scope" />
            {{ scope }}
          </span>
        </span>
      </label>
      <label class="checkbox-line">
        <input v-model="librarySharedAccount" type="checkbox" />
        是否共用账号
      </label>
      <label class="checkbox-line">
        <input v-model="libraryActive" type="checkbox" />
        是否激活
      </label>
      <label>
        维护说明
        <input v-model="libraryMaintenanceLog" placeholder="例如新增专家、调整范围、停用原因" />
      </label>
      <button type="button" :disabled="!libraryName.trim()" @click="saveExpert">
        {{ expertFormMode === "edit" ? "保存专家" : "新增专家" }}
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>专家</th>
            <th>用户账号</th>
            <th>评标范围</th>
            <th>供应商考核范围</th>
            <th>共用账号</th>
            <th>状态</th>
            <th v-if="canMaintainExpertDirectory">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expert in experts" :key="expert.id">
            <td>{{ expert.name }} / {{ expert.category }}</td>
            <td>{{ (expert.accountUserIds ?? []).join("，") || "-" }}</td>
            <td>{{ (expert.reviewScopes ?? []).join("，") || "-" }}</td>
            <td>{{ (expert.supplierAssessmentScopes ?? []).join("，") || "-" }}</td>
            <td>{{ expert.sharedAccount ? "是" : "否" }}</td>
            <td>{{ expert.active === false ? "停用" : expert.status }}</td>
            <td v-if="canMaintainExpertDirectory">
              <button type="button" class="secondary-button" @click="editExpert(expert)">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>专家抽取与评审管理</h2>
    <p v-if="!canMaintainExpertReview" class="notice">当前账号仅查看专家抽取与评审进度；抽取、指定和替换专家由采购经办操作。</p>

    <div class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="onProjectChange">
          <option v-if="!projects.length" value="">暂无可评审项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ projectLabel(project) }}</option>
        </select>
      </label>
      <div class="status-card">
        <span>当前项目状态</span>
        <strong>{{ selectedProject ? labelStatus(selectedProject.status) : "未选择" }}</strong>
        <p>{{ reviewStageHint }}</p>
      </div>
      <label v-if="canMaintainExpertReview">
        抽取范围
        <span class="checkbox-group compact">
          <span v-for="scope in reviewScopeOptions" :key="scope" class="checkbox-chip">
            <input v-model="drawReviewScopes" type="checkbox" :value="scope" />
            {{ scope }}
          </span>
        </span>
      </label>
      <label v-if="canMaintainExpertReview">
        指定专家
        <select v-model="expertId">
          <option v-for="expert in assignableExperts" :key="expert.id" :value="expert.id">{{ expert.name }} / {{ expert.category }} / {{ expert.active === false ? "停用" : expert.status }}</option>
        </select>
      </label>
      <label v-if="canMaintainExpertReview">
        抽取 / 指定理由
        <input v-model="reason" />
      </label>
      <button
        v-if="canMaintainExpertReview"
        type="button"
        :disabled="!selectedProjectId || !canOperateExpertAssignment"
        @click="run(() => apiPost(`/api/projects/${selectedProjectId}/expert-assignments/draw`, { count: 1, reason, reviewScopes: drawReviewScopes }))"
      >
        抽取专家
      </button>
      <button
        v-if="canMaintainExpertReview"
        type="button"
        :disabled="!selectedProjectId || !expertId || !canOperateExpertAssignment"
        @click="run(() => apiPost(`/api/projects/${selectedProjectId}/expert-assignments/appoint`, { expertId, reason }))"
      >
        指定专家
      </button>
    </div>

    <div v-if="canMaintainExpertReview" class="form-grid">
      <label>
        评审任务
        <select v-model="selectedAssignmentId">
          <option v-for="assignment in assignments" :key="assignment.id" :value="assignment.id">{{ assignment.id }} / {{ assignment.expertName || assignment.expertId }}</option>
        </select>
      </label>
      <label>
        替换专家
        <select v-model="replacementExpertId">
          <option v-for="expert in replacementExperts" :key="expert.id" :value="expert.id">{{ expert.name }} / {{ expert.active === false ? "停用" : expert.status }}</option>
        </select>
      </label>
      <button
        type="button"
        :disabled="!selectedAssignmentId || !replacementExpertId || !canOperateExpertAssignment"
        @click="run(() => apiPost(`/api/expert-assignments/${selectedAssignmentId}/replace`, { replacementExpertId, reason }))"
      >
        替换
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>专家</th>
            <th>产生方式</th>
            <th>状态</th>
            <th>回避确认</th>
            <th>纪律确认</th>
            <th>保密承诺</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="assignment in assignments" :key="assignment.id">
            <td>{{ assignment.expertName || assignment.expertId }}</td>
            <td>{{ assignment.method }}</td>
            <td>{{ assignmentStatusLabels[assignment.status] ?? assignment.status }}</td>
            <td>{{ assignment.avoidanceConfirmed ? "已确认" : "未确认" }}</td>
            <td>{{ assignment.disciplineConfirmed ? "已确认" : "未确认" }}</td>
            <td>{{ assignment.confidentialityConfirmed ? "已确认" : "未确认" }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="selectedProjectId && assignments.length === 0" class="empty-state">
        {{ canViewExpertReviewProgress ? "当前项目还没有专家评审任务，请先抽取或指定专家。" : reviewStageHint }}
      </div>
    </div>

    <section class="sub-panel review-print-area">
      <div class="panel-head">
        <div>
          <h3>评标记录明细页</h3>
          <p class="notice">汇总专家逐项评分、供应商排名、附件材料和专家意见，用于生成、冻结和打印评标记录。</p>
        </div>
        <button type="button" class="secondary-button no-print" :disabled="!reviewDetail" @click="printReviewDetail">打印评标表</button>
      </div>

      <div v-if="!canViewExpertReviewProgress" class="empty-state">{{ reviewStageHint }}</div>
      <div v-else-if="!reviewDetail" class="empty-state">报价锁定并进入专家评审后，将显示评标记录明细。</div>
      <template v-else>
        <div class="score-sheet-header">
          <div>
            <p class="eyebrow">项目</p>
            <strong>{{ reviewDetail.project.code }} / {{ reviewDetail.project.name }}</strong>
          </div>
          <div>
            <p class="eyebrow">评分模板</p>
            <strong>{{ reviewDetail.template?.templateName || "默认评标模板" }}</strong>
          </div>
          <div>
            <p class="eyebrow">专家提交</p>
            <strong>{{ reviewDetail.summary.submittedExpertCount }} / {{ reviewDetail.summary.totalExpertCount }}</strong>
          </div>
          <div>
            <p class="eyebrow">报告状态</p>
            <strong>{{ reports.find((report) => report.status === "frozen") ? "已冻结" : reports.length ? "已生成" : "未生成" }}</strong>
          </div>
        </div>

        <div class="score-summary-grid">
          <div><span>供应商数</span><strong>{{ reviewDetail.supplierRecords.length }}</strong></div>
          <div><span>评分单数</span><strong>{{ reviewDetail.sheetRecords.length }}</strong></div>
          <div><span>是否全部提交</span><strong>{{ reviewDetail.summary.allSubmitted ? "是" : "否" }}</strong></div>
          <div><span>最高最低分差</span><strong>{{ reviewDetail.summary.anomalies?.scoreSpread ?? 0 }}</strong></div>
        </div>

        <div class="form-grid no-print">
          <label class="full-row">
            评标记录说明
            <input v-model="reportNote" />
          </label>
          <button
            v-if="canMaintainExpertReview"
            type="button"
            :disabled="!reviewDetail.summary.allSubmitted"
            @click="reviewAction(() => apiPost(`/api/projects/${selectedProjectId}/review-report`, { note: reportNote }))"
          >
            生成评标记录
          </button>
          <button
            v-if="canMaintainExpertReview"
            type="button"
            :disabled="!reports.some((report) => report.status === 'generated')"
            @click="reviewAction(() => apiPost(`/api/projects/${selectedProjectId}/review-report/freeze`, {}))"
          >
            冻结评标记录
          </button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>供应商</th>
                <th>技术分</th>
                <th>商务分</th>
                <th>价格分</th>
                <th>总分</th>
                <th>提交专家</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="supplier in reviewDetail.supplierRecords" :key="supplier.supplierId">
                <td>{{ supplier.rank }}</td>
                <td>{{ supplier.supplierName }}</td>
                <td>{{ supplier.technical }}</td>
                <td>{{ supplier.service }}</td>
                <td>{{ supplier.price }}</td>
                <td><strong>{{ supplier.total }}</strong></td>
                <td>{{ supplier.submittedCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section v-for="record in reviewDetail.sheetRecords" :key="record.sheetId" class="review-record-card">
          <div class="panel-head">
            <div>
              <h4>{{ record.supplierName }} / {{ record.expertName }}</h4>
              <p class="muted">提交：{{ formatDateTime(record.submittedAt) }}；版本：{{ record.versionNo }}；状态：{{ labelStatus(record.status) }}</p>
            </div>
            <div class="score-pill">总分 {{ record.total }}</div>
          </div>

          <div class="score-summary-grid compact-score-grid">
            <div><span>技术分</span><strong>{{ record.technical }}</strong></div>
            <div><span>商务分</span><strong>{{ record.service }}</strong></div>
            <div><span>价格分</span><strong>{{ record.price }}</strong></div>
          </div>

          <div class="table-wrap">
            <table class="score-table">
              <thead>
                <tr>
                  <th>类别</th>
                  <th>评分项</th>
                  <th>分值</th>
                  <th>得分</th>
                  <th>专家意见</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in record.details" :key="`${record.sheetId}-${item.id}`">
                  <td>{{ categoryLabel(item.category) }}</td>
                  <td>{{ item.label }}</td>
                  <td>{{ item.maxScore }}</td>
                  <td>{{ item.score ?? 0 }}</td>
                  <td>{{ item.comment || "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="review-materials-grid">
            <section class="mini-card">
              <h5>报名资料</h5>
              <p>{{ record.materials.registrationMaterials.map((file) => file.fileName).join("，") || "暂无" }}</p>
            </section>
            <section class="mini-card">
              <h5>补充资料</h5>
              <p>{{ record.materials.supplementMaterials.map((file) => file.fileName).join("，") || "暂无" }}</p>
            </section>
            <section class="mini-card">
              <h5>响应文件</h5>
              <p>{{ record.materials.bidMaterials.map((file) => file.fileName).join("，") || record.materials.bidSummary?.fileName || "暂无" }}</p>
            </section>
          </div>

          <div class="opinion-box">
            <strong>专家总意见</strong>
            <p>{{ record.opinion || "-" }}</p>
          </div>
        </section>

        <section class="sub-panel">
          <h4>评标记录历史</h4>
          <table>
            <thead>
              <tr>
                <th>报告编号</th>
                <th>状态</th>
                <th>生成时间</th>
                <th>冻结时间</th>
                <th>创建人</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in reports" :key="report.id">
                <td>{{ report.reportNo }}</td>
                <td>{{ report.status }}</td>
                <td>{{ formatDateTime(report.generatedAt) }}</td>
                <td>{{ formatDateTime(report.frozenAt) }}</td>
                <td>{{ report.createdBy }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!reports.length" class="muted">暂无已生成的评标记录。</p>
        </section>
      </template>
    </section>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>

  <ProcessTimeline
    v-if="selectedProjectId"
    business-type="review_award"
    :business-id="selectedProjectId"
    title="评审定标流程轨迹"
    :refresh-key="processRefreshKey"
  />
</template>
