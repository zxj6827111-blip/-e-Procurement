<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPatch, apiPost } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import {
  assignmentColumns,
  assignmentStatusLabels,
  categoryLabel,
  createExpertFormDefaults,
  expertAssignmentStatuses,
  expertColumns,
  formatReviewDateTime,
  projectLabel,
  reportColumns,
  reviewReadableStatuses,
  reviewScopeOptions,
  reviewStageHint as resolveReviewStageHint,
  scoreDetailColumns,
  statusTone,
  supplierScoreColumns
} from "./display";
import ExpertAssignmentPanel from "./ExpertAssignmentPanel.vue";
import ExpertDirectoryPanel from "./ExpertDirectoryPanel.vue";
import ExpertReviewShell from "./ExpertReviewShell.vue";
import ReviewRecordPanel from "./ReviewRecordPanel.vue";
import type { Assignment, Expert, ProjectOption, ReviewRecordDetail, ReviewReport } from "./types";
import { useSessionStore } from "../../stores/session";

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

const canMaintainExpertReview = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const canMaintainExpertDirectory = computed(() => session.roleId === "group_manager");
const drawableExperts = computed(() => experts.value.filter((item) => item.active !== false && item.status.includes("可")));
const selectedProject = computed(() => projects.value.find((item) => item.id === selectedProjectId.value) ?? null);
const assignedExpertIds = computed(() => new Set(assignments.value.map((item) => item.expertId)));
const assignableExperts = computed(() => drawableExperts.value.filter((item) => !assignedExpertIds.value.has(item.id)));
const replacementExperts = computed(() => drawableExperts.value.filter((item) => !assignedExpertIds.value.has(item.id)));
const canOperateExpertAssignment = computed(() => Boolean(selectedProject.value && expertAssignmentStatuses.has(selectedProject.value.status)));
const canViewExpertReviewProgress = computed(() => Boolean(selectedProject.value && reviewReadableStatuses.has(selectedProject.value.status)));
const expertSummaryItems = computed<SummaryCardItem[]>(() => [
  { label: "专家库人数", value: experts.value.length, meta: "当前可见专家" },
  { label: "可抽取专家", value: drawableExperts.value.length, meta: "未停用且状态可抽取" },
  { label: "当前项目任务", value: assignments.value.length, meta: selectedProject.value ? selectedProject.value.code : "未选择项目" },
  { label: "评审报告", value: reports.value.length, meta: reports.value.find((report) => report.status === "frozen") ? "已冻结" : "未冻结" }
]);
const reviewDetailSummaryItems = computed<SummaryCardItem[]>(() =>
  reviewDetail.value
    ? [
        { label: "供应商数", value: reviewDetail.value.supplierRecords.length, meta: "进入评审汇总" },
        { label: "评分单数", value: reviewDetail.value.sheetRecords.length, meta: "专家提交记录" },
        { label: "专家提交", value: `${reviewDetail.value.summary.submittedExpertCount}/${reviewDetail.value.summary.totalExpertCount}`, meta: "已提交/应提交" },
        { label: "最高最低分差", value: reviewDetail.value.summary.anomalies?.scoreSpread ?? 0, meta: "异常分析" }
      ]
    : []
);
const reviewStageHint = computed(() => {
  return resolveReviewStageHint(selectedProject.value);
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

function routeProjectId() {
  const value = route.query.projectId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
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
  const defaults = createExpertFormDefaults(session.user?.orgId ?? "org-group");
  expertFormMode.value = "create";
  editingExpertId.value = "";
  libraryOwnerOrgId.value = defaults.ownerOrgId;
  libraryBranchOrgId.value = defaults.branchOrgId;
  libraryAccountUserIds.value = defaults.accountUserIds;
  libraryName.value = defaults.name;
  libraryCategory.value = defaults.category;
  libraryStatus.value = defaults.status;
  libraryReviewScopes.value = defaults.reviewScopes;
  librarySupplierAssessmentScopes.value = defaults.supplierAssessmentScopes;
  librarySharedAccount.value = defaults.sharedAccount;
  libraryActive.value = defaults.active;
  libraryMaintenanceLog.value = defaults.maintenanceLog;
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
  <ExpertReviewShell
    :can-maintain-expert-directory="canMaintainExpertDirectory"
    :can-view-expert-review-progress="canViewExpertReviewProgress"
    :selected-project="selectedProject"
    :summary-items="expertSummaryItems"
    :audit-log-id="auditLogId"
    :error="error"
    :selected-project-id="selectedProjectId"
    :process-refresh-key="processRefreshKey"
    @reset-expert-form="resetExpertForm"
  >
    <ExpertDirectoryPanel
      v-model:library-owner-org-id="libraryOwnerOrgId"
      v-model:library-branch-org-id="libraryBranchOrgId"
      v-model:library-account-user-ids="libraryAccountUserIds"
      v-model:library-name="libraryName"
      v-model:library-category="libraryCategory"
      v-model:library-status="libraryStatus"
      v-model:library-review-scopes="libraryReviewScopes"
      v-model:library-supplier-assessment-scopes="librarySupplierAssessmentScopes"
      v-model:library-shared-account="librarySharedAccount"
      v-model:library-active="libraryActive"
      v-model:library-maintenance-log="libraryMaintenanceLog"
      :can-maintain-expert-directory="canMaintainExpertDirectory"
      :review-scope-options="reviewScopeOptions"
      :expert-columns="expertColumns"
      :experts="experts"
      :expert-form-mode="expertFormMode"
      :status-tone="statusTone"
      @save-expert="saveExpert"
      @edit-expert="editExpert"
    />

    <ExpertAssignmentPanel
      v-model:selected-project-id="selectedProjectId"
      v-model:draw-review-scopes="drawReviewScopes"
      v-model:expert-id="expertId"
      v-model:reason="reason"
      v-model:selected-assignment-id="selectedAssignmentId"
      v-model:replacement-expert-id="replacementExpertId"
      :can-maintain-expert-review="canMaintainExpertReview"
      :can-operate-expert-assignment="canOperateExpertAssignment"
      :review-stage-hint="reviewStageHint"
      :projects="projects"
      :review-scope-options="reviewScopeOptions"
      :assignable-experts="assignableExperts"
      :replacement-experts="replacementExperts"
      :assignments="assignments"
      :assignment-columns="assignmentColumns"
      :assignment-status-labels="assignmentStatusLabels"
      :project-label="projectLabel"
      :status-tone="statusTone"
      @project-change="onProjectChange"
      @draw-expert="run(() => apiPost(`/api/projects/${selectedProjectId}/expert-assignments/draw`, { count: 1, reason, reviewScopes: drawReviewScopes }))"
      @appoint-expert="run(() => apiPost(`/api/projects/${selectedProjectId}/expert-assignments/appoint`, { expertId, reason }))"
      @replace-expert="run(() => apiPost(`/api/expert-assignments/${selectedAssignmentId}/replace`, { replacementExpertId, reason }))"
    />

    <ReviewRecordPanel
      v-model:report-note="reportNote"
      :can-view-expert-review-progress="canViewExpertReviewProgress"
      :can-maintain-expert-review="canMaintainExpertReview"
      :review-stage-hint="reviewStageHint"
      :review-detail="reviewDetail"
      :review-detail-summary-items="reviewDetailSummaryItems"
      :reports="reports"
      :supplier-score-columns="supplierScoreColumns"
      :score-detail-columns="scoreDetailColumns"
      :report-columns="reportColumns"
      :format-date-time="formatReviewDateTime"
      :category-label="categoryLabel"
      :status-tone="statusTone"
      @print-review-detail="printReviewDetail"
      @generate-report="reviewAction(() => apiPost(`/api/projects/${selectedProjectId}/review-report`, { note: reportNote }))"
      @freeze-report="reviewAction(() => apiPost(`/api/projects/${selectedProjectId}/review-report/freeze`, {}))"
    />
  </ExpertReviewShell>
</template>

