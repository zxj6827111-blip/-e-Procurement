<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";

type ScoringCategory = "technical" | "service" | "price";

interface ScoringItem {
  id: string;
  category: ScoringCategory;
  categoryLabel: string;
  label: string;
  reference: string;
  evidence: string;
  maxScore: number;
}

interface ScoringDetailValue {
  score: number;
  comment?: string;
}

interface AttachmentMeta {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

interface ScoringSheet {
  id: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  supplierId: string;
  supplierName?: string;
  templateId: string;
  templateName?: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  status: string;
  opinion: string;
  versionNo: number;
  scoringItems?: ScoringItem[];
  details?: Record<string, number | (ScoringDetailValue & Partial<ScoringItem>)>;
  materials?: {
    registrationMaterials: AttachmentMeta[];
    supplementMaterials: AttachmentMeta[];
    bidMaterials: AttachmentMeta[];
    bidSummary?: {
      amount: number;
      deliveryDays?: number | null;
      responseSummary?: string;
      serviceCommitment?: string;
      fileName?: string;
    } | null;
  };
}

interface Assignment {
  id: string;
  projectId: string;
  expertName?: string;
  status: string;
  avoidanceConfirmed: boolean;
  disciplineConfirmed: boolean;
  confidentialityConfirmed: boolean;
}

const selectedProjectId = ref("");
const sheets = ref<ScoringSheet[]>([]);
const assignments = ref<Assignment[]>([]);
const selectedSheetId = ref("");
const selectedSheetDetail = ref<ScoringSheet | null>(null);
const scoreInputs = ref<Record<string, { score: number; comment: string }>>({});
const opinion = ref("供应商响应文件完整，服务承诺和交付能力满足采购要求。");
const auditLogId = ref("");
const error = ref("");
const processRefreshKey = ref(0);

const selectedSheet = computed(() => selectedSheetDetail.value ?? sheets.value.find((item) => item.id === selectedSheetId.value));
const currentAssignment = computed(() => assignments.value.find((item) => item.projectId === selectedProjectId.value));
const pendingAssignments = computed(() => assignments.value.filter((item) => item.status === "assigned"));
const confirmationCompleted = computed(
  () => Boolean(currentAssignment.value?.avoidanceConfirmed && currentAssignment.value?.disciplineConfirmed && currentAssignment.value?.confidentialityConfirmed)
);
const scoringItems = computed(() => selectedSheetDetail.value?.scoringItems ?? []);
const attachmentGroups = computed(() => [
  { label: "报名资料", items: selectedSheetDetail.value?.materials?.registrationMaterials ?? [] },
  { label: "补充资料", items: selectedSheetDetail.value?.materials?.supplementMaterials ?? [] },
  { label: "响应文件", items: selectedSheetDetail.value?.materials?.bidMaterials ?? [] }
]);
const categoryTotals = computed(() => {
  const totals: Record<ScoringCategory, number> = { technical: 0, service: 0, price: 0 };
  for (const item of scoringItems.value) {
    totals[item.category] += Number(scoreInputs.value[item.id]?.score ?? 0);
  }
  return {
    technical: Number(totals.technical.toFixed(2)),
    service: Number(totals.service.toFixed(2)),
    price: Number(totals.price.toFixed(2)),
    total: Number((totals.technical + totals.service + totals.price).toFixed(2))
  };
});

const sheetStatusLabels: Record<string, string> = {
  assigned: "已分配",
  avoidance_pending: "待确认回避",
  discipline_pending: "待确认评审纪律",
  confidentiality_pending: "待确认保密承诺",
  scoring: "评分中",
  saved: "已暂存",
  submitted_locked: "已提交并锁定",
  reevaluation_requested: "复评申请中",
  reevaluation_approved: "复评已批准",
  resubmitted_locked: "复评已提交并锁定",
  replaced: "已替换",
  archived: "已归档"
};

const assignmentStatusLabels: Record<string, string> = {
  assigned: "待确认",
  confirmed: "已确认",
  submitted_locked: "已提交并锁定",
  replaced: "已替换"
};

async function load() {
  const [sheetResult, assignmentResult] = await Promise.all([
    apiGet<{ scoringSheets: ScoringSheet[] }>("/api/expert-review/my-scoring-sheets"),
    apiGet<{ assignments: Assignment[] }>("/api/expert-review/my-assignments")
  ]);
  sheets.value = sheetResult.scoringSheets;
  assignments.value = assignmentResult.assignments;
  if (!selectedSheetId.value || !sheets.value.some((item) => item.id === selectedSheetId.value)) {
    selectedSheetId.value = sheets.value[0]?.id ?? "";
  }
  if (!selectedProjectId.value || !assignments.value.some((item) => item.projectId === selectedProjectId.value)) {
    selectedProjectId.value = sheets.value.find((item) => item.id === selectedSheetId.value)?.projectId ?? pendingAssignments.value[0]?.projectId ?? assignments.value[0]?.projectId ?? "";
  }
  await loadSelectedSheet();
}

async function run(action: () => Promise<{ auditLogId?: string }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    await load();
    processRefreshKey.value += 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function hydrateScoreInputs(sheet: ScoringSheet) {
  const next: Record<string, { score: number; comment: string }> = {};
  for (const item of sheet.scoringItems ?? []) {
    const raw = sheet.details?.[item.id];
    const detail = raw && typeof raw === "object" ? raw : null;
    next[item.id] = {
      score: Number(detail?.score ?? 0),
      comment: String(detail?.comment ?? "")
    };
  }
  scoreInputs.value = next;
  opinion.value = sheet.opinion || "供应商响应文件完整，服务承诺和交付能力满足采购要求。";
}

async function loadSelectedSheet() {
  if (!selectedSheetId.value) {
    selectedSheetDetail.value = null;
    if (!selectedProjectId.value && assignments.value.length) {
      selectedProjectId.value = pendingAssignments.value[0]?.projectId ?? assignments.value[0].projectId;
    }
    return;
  }
  const result = await apiGet<{ scoringSheet: ScoringSheet }>(`/api/scoring-sheets/${selectedSheetId.value}`);
  selectedSheetDetail.value = result.scoringSheet;
  selectedProjectId.value = result.scoringSheet.projectId;
  hydrateScoreInputs(result.scoringSheet);
}

function confirmAll() {
  const assignment = currentAssignment.value ?? pendingAssignments.value[0] ?? assignments.value[0];
  if (!assignment) return;
  selectedProjectId.value = assignment.projectId;
  void run(async () => {
    let last = "";
    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const response = await apiPost<{ auditLogId?: string }>(`/api/expert-assignments/${assignment.id}/confirm`, { type });
      last = response.auditLogId ?? last;
    }
    return { auditLogId: last };
  });
}

function canEditSheet(sheet?: ScoringSheet | null) {
  return Boolean(sheet && ["scoring", "saved", "reevaluation_approved"].includes(sheet.status));
}

function statusLabel(status: string) {
  return sheetStatusLabels[status] ?? status;
}

function scorePayload() {
  const details = Object.fromEntries(
    scoringItems.value.map((item) => [
      item.id,
      {
        score: Number(scoreInputs.value[item.id]?.score ?? 0),
        comment: scoreInputs.value[item.id]?.comment ?? ""
      }
    ])
  );
  return {
    details,
    technical: categoryTotals.value.technical,
    service: categoryTotals.value.service,
    price: categoryTotals.value.price,
    opinion: opinion.value
  };
}

function printSheet() {
  window.print();
}

onMounted(load);
</script>

<template>
  <section class="panel score-print-area">
    <div class="panel-head">
      <div>
        <h2>专家逐项评分表</h2>
        <p class="notice">按供应商逐项评分，提交并锁定后进入采购经办的评标记录汇总。</p>
      </div>
      <button type="button" class="secondary-button no-print" :disabled="!selectedSheet" @click="printSheet">打印评分表</button>
    </div>

    <WorkflowSurfaceSummary title="专家评审待办" :business-types="['review_award', 'expert_scoring']" compact />

    <div v-if="pendingAssignments.length && !confirmationCompleted" class="notice">
      已收到专家评审确认任务，请先确认回避、评审纪律和保密承诺，再查看材料并评分。
    </div>

    <section v-if="assignments.length" class="sub-panel no-print">
      <h3>专家确认</h3>
      <table>
        <thead>
          <tr>
            <th>项目</th>
            <th>状态</th>
            <th>回避确认</th>
            <th>纪律确认</th>
            <th>保密承诺</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="assignment in assignments" :key="assignment.id" :class="{ selected: assignment.projectId === selectedProjectId }" @click="selectedProjectId = assignment.projectId">
            <td>{{ assignment.projectId }}</td>
            <td>{{ assignmentStatusLabels[assignment.status] ?? assignment.status }}</td>
            <td>{{ assignment.avoidanceConfirmed ? "已确认" : "未确认" }}</td>
            <td>{{ assignment.disciplineConfirmed ? "已确认" : "未确认" }}</td>
            <td>{{ assignment.confidentialityConfirmed ? "已确认" : "未确认" }}</td>
          </tr>
        </tbody>
      </table>
      <button type="button" :disabled="!currentAssignment || confirmationCompleted" @click="confirmAll">确认回避、纪律和保密承诺</button>
    </section>

    <p v-if="!sheets.length" class="muted">当前专家暂无可评分任务，完成确认后系统会生成评分单。</p>

    <template v-else>
      <div class="form-grid no-print">
        <label>
          选择评分单
          <select v-model="selectedSheetId" @change="loadSelectedSheet">
            <option v-for="sheet in sheets" :key="sheet.id" :value="sheet.id">
              {{ sheet.projectCode || sheet.projectId }} / {{ sheet.supplierName || sheet.supplierId }} / {{ statusLabel(sheet.status) }}
            </option>
          </select>
        </label>
        <label>
          专家确认状态
          <input :value="currentAssignment ? assignmentStatusLabels[currentAssignment.status] ?? currentAssignment.status : '未分配'" disabled />
        </label>
        <button type="button" :disabled="!currentAssignment || confirmationCompleted" @click="confirmAll">确认回避、纪律和保密承诺</button>
        <button type="button" :disabled="!selectedProjectId || !confirmationCompleted" @click="run(() => apiPost(`/api/expert-review/${selectedProjectId}/materials/view-check`, {}))">
          记录材料查看
        </button>
      </div>

      <section v-if="selectedSheetDetail" class="sub-panel">
        <div class="score-sheet-header">
          <div>
            <p class="eyebrow">项目</p>
            <h3>{{ selectedSheetDetail.projectCode }} / {{ selectedSheetDetail.projectName }}</h3>
          </div>
          <div>
            <p class="eyebrow">供应商</p>
            <strong>{{ selectedSheetDetail.supplierName }}</strong>
          </div>
          <div>
            <p class="eyebrow">模板</p>
            <strong>{{ selectedSheetDetail.templateName || selectedSheetDetail.templateId }}</strong>
          </div>
          <div>
            <p class="eyebrow">状态</p>
            <strong>{{ statusLabel(selectedSheetDetail.status) }}</strong>
          </div>
        </div>

        <div class="score-summary-grid">
          <div><span>技术分</span><strong>{{ categoryTotals.technical }}</strong></div>
          <div><span>商务分</span><strong>{{ categoryTotals.service }}</strong></div>
          <div><span>价格分</span><strong>{{ categoryTotals.price }}</strong></div>
          <div><span>总分</span><strong>{{ categoryTotals.total }}</strong></div>
        </div>

        <div class="table-wrap">
          <table class="score-table">
            <thead>
              <tr>
                <th>评分项</th>
                <th>参考标准</th>
                <th>需查看材料</th>
                <th>分值</th>
                <th>评分</th>
                <th>专家意见</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in scoringItems" :key="item.id">
                <td>
                  <strong>{{ item.categoryLabel }}</strong>
                  <p>{{ item.label }}</p>
                </td>
                <td>{{ item.reference }}</td>
                <td>{{ item.evidence }}</td>
                <td>{{ item.maxScore }}</td>
                <td>
                  <input
                    v-model.number="scoreInputs[item.id].score"
                    type="number"
                    min="0"
                    :max="item.maxScore"
                    :disabled="!canEditSheet(selectedSheetDetail)"
                    class="score-input"
                  />
                </td>
                <td>
                  <textarea
                    v-model="scoreInputs[item.id].comment"
                    rows="2"
                    :disabled="!canEditSheet(selectedSheetDetail)"
                    placeholder="填写扣分、加分或风险说明"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="review-materials-grid">
          <section v-for="group in attachmentGroups" :key="group.label" class="mini-card">
            <h4>{{ group.label }}</h4>
            <ul v-if="group.items.length" class="plain-list">
              <li v-for="file in group.items" :key="file.id">{{ file.fileName }}</li>
            </ul>
            <p v-else class="muted">暂无材料</p>
          </section>
          <section class="mini-card">
            <h4>报价摘要</h4>
            <p v-if="selectedSheetDetail.materials?.bidSummary">
              金额：￥{{ selectedSheetDetail.materials.bidSummary.amount.toLocaleString() }}；
              交期：{{ selectedSheetDetail.materials.bidSummary.deliveryDays ?? "-" }} 天
            </p>
            <p v-else class="muted">暂无报价摘要</p>
          </section>
        </div>

        <label class="full-row">
          评审总意见
          <textarea v-model="opinion" rows="4" :disabled="!canEditSheet(selectedSheetDetail)" />
        </label>

        <div class="action-row no-print">
          <button
            type="button"
            :disabled="!selectedSheetId || !confirmationCompleted || !canEditSheet(selectedSheetDetail)"
            @click="run(() => apiPost(`/api/scoring-sheets/${selectedSheetId}/save`, scorePayload()))"
          >
            暂存评分
          </button>
          <button
            type="button"
            :disabled="!selectedSheetId || !confirmationCompleted || !canEditSheet(selectedSheetDetail)"
            @click="run(() => apiPost(`/api/scoring-sheets/${selectedSheetId}/submit-lock`, scorePayload()))"
          >
            提交并锁定
          </button>
          <button type="button" class="secondary-button" @click="printSheet">打印评分表</button>
        </div>
      </section>
    </template>

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
