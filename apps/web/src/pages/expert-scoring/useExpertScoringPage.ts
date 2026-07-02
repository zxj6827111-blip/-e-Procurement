import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { assignmentStatusLabel, sheetStatusLabel, sheetStatusTone } from "./display";
import type { Assignment, AttachmentGroup, ScoreInputValue, ScoringCategory, ScoringDetailValue, ScoringSheet, StatusTone } from "./types";

export function useExpertScoringPage() {
  const selectedProjectId = ref("");
  const sheets = ref<ScoringSheet[]>([]);
  const assignments = ref<Assignment[]>([]);
  const selectedSheetId = ref("");
  const selectedSheetDetail = ref<ScoringSheet | null>(null);
  const scoreInputs = ref<Record<string, ScoreInputValue>>({});
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
  const attachmentGroups = computed<AttachmentGroup[]>(() => [
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
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "评分任务", value: sheets.value.length, meta: "当前专家可见" },
    { label: "待确认", value: pendingAssignments.value.length, meta: "回避/纪律/保密" },
    { label: "当前状态", value: selectedSheet.value ? sheetStatusLabel(selectedSheet.value.status) : "未选择", meta: selectedSheet.value?.projectCode ?? "评分单" },
    { label: "当前总分", value: categoryTotals.value.total, meta: "逐项评分汇总" }
  ]);

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
    const next: Record<string, ScoreInputValue> = {};
    for (const item of sheet.scoringItems ?? []) {
      const raw = sheet.details?.[item.id];
      const detail = raw && typeof raw === "object" ? (raw as ScoringDetailValue) : null;
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

  async function viewMaterials() {
    await run(() => apiPost(`/api/expert-review/${selectedProjectId.value}/materials/view-check`, {}));
  }

  async function saveScore() {
    await run(() => apiPost(`/api/scoring-sheets/${selectedSheetId.value}/save`, scorePayload()));
  }

  async function submitScore() {
    await run(() => apiPost(`/api/scoring-sheets/${selectedSheetId.value}/submit-lock`, scorePayload()));
  }

  onMounted(load);

  return {
    assignmentStatusLabel,
    attachmentGroups,
    auditLogId,
    canEditSheet,
    categoryTotals,
    confirmationCompleted,
    confirmAll,
    currentAssignment,
    error,
    loadSelectedSheet,
    opinion,
    pendingAssignments,
    printSheet,
    processRefreshKey,
    scoreInputs,
    scoringItems,
    selectedProjectId,
    selectedSheet,
    selectedSheetDetail,
    selectedSheetId,
    sheetStatusLabel,
    sheetStatusTone: sheetStatusTone as (status: string) => StatusTone,
    sheets,
    assignments,
    saveScore,
    submitScore,
    summaryItems,
    viewMaterials
  };
}
