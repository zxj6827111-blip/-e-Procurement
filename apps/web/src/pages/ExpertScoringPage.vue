<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";

interface ScoringSheet {
  id: string;
  projectId: string;
  supplierId: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  status: string;
  opinion: string;
  versionNo: number;
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
const technical = ref(40);
const service = ref(25);
const price = ref(20);
const opinion = ref("供应商响应文件完整，服务承诺和交付能力满足采购要求。");
const auditLogId = ref("");
const error = ref("");

const selectedSheet = computed(() => sheets.value.find((item) => item.id === selectedSheetId.value));
const currentAssignment = computed(() => assignments.value.find((item) => item.projectId === selectedProjectId.value));
const confirmationCompleted = computed(
  () => Boolean(currentAssignment.value?.avoidanceConfirmed && currentAssignment.value?.disciplineConfirmed && currentAssignment.value?.confidentialityConfirmed)
);

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
  sheets.value = (await apiGet<{ scoringSheets: ScoringSheet[] }>("/api/expert-review/my-scoring-sheets")).scoringSheets;
  if (!selectedSheetId.value || !sheets.value.some((item) => item.id === selectedSheetId.value)) {
    selectedSheetId.value = sheets.value[0]?.id ?? "";
  }
  await loadSelectedSheet();
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

async function loadSelectedSheet() {
  const sheet = selectedSheet.value;
  if (!sheet) {
    assignments.value = [];
    return;
  }
  selectedProjectId.value = sheet.projectId;
  technical.value = sheet.technical || 40;
  service.value = sheet.service || 25;
  price.value = sheet.price || 20;
  opinion.value = sheet.opinion || "供应商响应文件完整，服务承诺和交付能力满足采购要求。";
  assignments.value = (await apiGet<{ assignments: Assignment[] }>(`/api/projects/${selectedProjectId.value}/expert-assignments`)).assignments;
}

function confirmAll() {
  const assignment = assignments.value[0];
  if (!assignment) return;
  void run(async () => {
    let last = "";
    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const response = await apiPost<{ auditLogId?: string }>(`/api/expert-assignments/${assignment.id}/confirm`, { type });
      last = response.auditLogId ?? last;
    }
    return { auditLogId: last };
  });
}

function canEditSheet(sheet?: ScoringSheet) {
  return Boolean(sheet && !["submitted_locked", "resubmitted_locked", "archived", "replaced"].includes(sheet.status));
}

function statusLabel(status: string) {
  return sheetStatusLabels[status] ?? status;
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>专家评分</h2>

    <WorkflowSurfaceSummary title="专家评分待办" :business-types="['expert_scoring']" compact />

    <p v-if="!sheets.length" class="muted">当前专家暂无可评分任务。</p>

    <template v-else>
      <table>
        <thead>
          <tr>
            <th>评分单</th>
            <th>项目编号</th>
            <th>供应商编号</th>
            <th>总分</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sheet in sheets" :key="sheet.id">
            <td>{{ sheet.id }}</td>
            <td>{{ sheet.projectId }}</td>
            <td>{{ sheet.supplierId }}</td>
            <td>{{ sheet.total }}</td>
            <td>{{ statusLabel(sheet.status) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="form-grid">
        <label>
          选择评分单
          <select v-model="selectedSheetId" @change="loadSelectedSheet">
            <option v-for="sheet in sheets" :key="sheet.id" :value="sheet.id">{{ sheet.id }} / {{ sheet.supplierId }} / {{ statusLabel(sheet.status) }}</option>
          </select>
        </label>
        <label>
          专家确认状态
          <input :value="currentAssignment ? assignmentStatusLabels[currentAssignment.status] ?? currentAssignment.status : '未分配'" disabled />
        </label>
        <button type="button" :disabled="!currentAssignment || confirmationCompleted" @click="confirmAll">确认回避、纪律和保密承诺</button>
        <button type="button" :disabled="!selectedProjectId || !confirmationCompleted" @click="run(() => apiPost(`/api/expert-review/${selectedProjectId}/materials/view-check`, {}))">
          查看评审资料
        </button>
      </div>

      <div class="form-grid">
        <label>
          技术评分
          <input v-model.number="technical" type="number" min="0" max="100" />
        </label>
        <label>
          服务评分
          <input v-model.number="service" type="number" min="0" max="100" />
        </label>
        <label>
          价格评分
          <input v-model.number="price" type="number" min="0" max="100" />
        </label>
        <label>
          评审意见
          <input v-model="opinion" />
        </label>
        <button
          type="button"
          :disabled="!selectedSheetId || !confirmationCompleted || !canEditSheet(selectedSheet)"
          @click="run(() => apiPost(`/api/scoring-sheets/${selectedSheetId}/save`, { technical, service, price, opinion }))"
        >
          暂存评分
        </button>
        <button
          type="button"
          :disabled="!selectedSheetId || !confirmationCompleted || !canEditSheet(selectedSheet)"
          @click="run(() => apiPost(`/api/scoring-sheets/${selectedSheetId}/submit-lock`, { technical, service, price, opinion }))"
        >
          提交并锁定
        </button>
      </div>
    </template>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
