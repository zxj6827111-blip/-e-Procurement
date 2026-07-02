import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost, uploadFile } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";
import { BLOCK_ACTIONS } from "./display";
import type { BlockResult, ExternalMaterialKind, ExternalTradeDetail, ExternalTradeFormState, ExternalTradeListItem } from "./types";

export function useExternalTradePage() {
  const selectedProjectId = ref("p-ext");
  const externalPlatformName = ref("上海公共资源交易平台");
  const externalProjectCode = ref("SHGGZY-2026-0001");
  const materialFile = ref<File | null>(null);
  const materialFileName = ref("");
  const externalTrades = ref<ExternalTradeListItem[]>([]);
  const detail = ref<ExternalTradeDetail>({});
  const blockResult = ref<BlockResult>({});
  const auditLogId = ref("");
  const error = ref("");
  const loading = ref(false);
  const session = useSessionStore();
  const route = useRoute();
  const externalTradeForm = ref<ExternalTradeFormState>({
    projectName: "外部交易备案项目",
    orgId: "",
    orgName: "酒店集团",
    category: "按集团制度备案",
    internalApprovalOpinion: "内部审批已备案",
    resultRecordNote: "外部结果已备案"
  });

  const canMaintainExternalTrade = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
  const selectedTrade = computed(() => externalTrades.value.find((trade) => trade.project.id === selectedProjectId.value));
  const selectedRecord = computed(() => detail.value.record ?? selectedTrade.value?.record ?? null);
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "备案项目", value: externalTrades.value.length, meta: "当前角色可见" },
    { label: "内部审批", value: externalTrades.value.filter((item) => item.record?.internalApprovalStatus === "recorded").length, meta: "已登记" },
    { label: "结果备案", value: externalTrades.value.filter((item) => item.record?.resultRecordStatus === "recorded").length, meta: "已完成" },
    { label: "当前权限", value: canMaintainExternalTrade.value ? "可维护" : "只读", meta: "采购经办维护备案" }
  ]);

  const detailRows = computed(() => [
    {
      id: selectedProjectId.value,
      project: detail.value.project?.name || selectedProjectId.value,
      internalApproval: selectedRecord.value?.internalApprovalStatus ?? "draft",
      announcementMaterials: selectedRecord.value?.announcementMaterialMetadata?.length ?? 0,
      resultMaterials: selectedRecord.value?.resultMaterialMetadata?.length ?? 0,
      resultRecord: selectedRecord.value?.resultRecordStatus ?? "draft"
    }
  ]);

  const blockRows = computed(() => [
    {
      id: "block-result",
      project: projectLabel(blockResult.value.projectId || selectedProjectId.value),
      externalFlag: blockResult.value.externalTradeFlag ? "是" : "-",
      result: blockResult.value.allowed ? "允许" : error.value ? "已拦截" : "-"
    }
  ]);

  function projectLabel(projectId?: string) {
    if (!projectId) return detail.value.project?.name ?? "外部交易项目";
    const item = externalTrades.value.find((trade) => trade.project.id === projectId);
    return item?.project.name ?? detail.value.project?.name ?? "外部交易项目";
  }

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      externalTrades.value = (await apiGet<{ externalTrades: ExternalTradeListItem[] }>("/api/external-trades")).externalTrades;
      detail.value = await apiGet<ExternalTradeDetail>(`/api/external-trades/${selectedProjectId.value}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "外部交易备案数据加载失败";
      detail.value = {};
    } finally {
      loading.value = false;
    }
  }

  function onMaterialFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    materialFile.value = target.files?.[0] ?? null;
    materialFileName.value = materialFile.value?.name ?? "";
  }

  async function run(action: () => Promise<{ auditLogId?: string } & Record<string, unknown>>) {
    error.value = "";
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    }
  }

  async function checkBlock(action: string) {
    error.value = "";
    try {
      blockResult.value = await apiPost<BlockResult>(`/api/external-trades/${selectedProjectId.value}/block-check`, { action });
    } catch (err) {
      const typed = err as Error & { auditLogId?: string; status?: number };
      error.value = `${typed.message}${typed.auditLogId ? ` (${typed.auditLogId})` : ""}`;
    }
  }

  async function uploadExternalMaterial(kind: ExternalMaterialKind) {
    if (!materialFile.value) {
      error.value = "请选择备案材料文件。";
      return;
    }
    await run(async () => {
      const fileResult = await uploadFile(materialFile.value as File, {
        attachmentKind: kind === "announcement" ? "external_announcement_material" : "external_result_material",
        objectType: "external_trade_record",
        objectId: selectedProjectId.value,
        projectId: selectedProjectId.value
      });
      const path = kind === "announcement" ? "announcement-materials" : "result-materials";
      const result = await apiPost<{ auditLogId?: string }>(`/api/external-trades/${selectedProjectId.value}/${path}`, { material: fileResult.file });
      materialFile.value = null;
      materialFileName.value = "";
      return { auditLogId: result.auditLogId ?? fileResult.auditLogId };
    });
  }

  function createExternalProject() {
    return run(() =>
      apiPost("/api/external-trades/projects", {
        name: externalTradeForm.value.projectName,
        orgId: externalTradeForm.value.orgId || undefined,
        orgName: externalTradeForm.value.orgName,
        category: externalTradeForm.value.category,
        internalApprovalOpinion: externalTradeForm.value.internalApprovalOpinion
      })
    );
  }

  function recordInternalApproval() {
    return run(() =>
      apiPost(`/api/external-trades/${selectedProjectId.value}/internal-approval`, {
        opinion: externalTradeForm.value.internalApprovalOpinion
      })
    );
  }

  function saveExternalProjectCode() {
    return run(() =>
      apiPost(`/api/external-trades/${selectedProjectId.value}/external-project`, {
        externalPlatformName: externalPlatformName.value,
        externalProjectCode: externalProjectCode.value
      })
    );
  }

  function recordExternalResult() {
    return run(() =>
      apiPost(`/api/external-trades/${selectedProjectId.value}/result-record`, {
        note: externalTradeForm.value.resultRecordNote
      })
    );
  }

  function statusLabel(value?: string) {
    return labelStatus(value || "draft");
  }

  onMounted(async () => {
    if (!session.user) await session.loadMe();
    selectedProjectId.value = String(route.query.projectId ?? selectedProjectId.value);
    await load();
  });

  watch(
    () => route.query.projectId,
    (projectId) => {
      if (!projectId || String(projectId) === selectedProjectId.value) return;
      selectedProjectId.value = String(projectId);
      void load();
    }
  );

  return {
    auditLogId,
    blockActions: BLOCK_ACTIONS,
    blockResult,
    blockRows,
    canMaintainExternalTrade,
    checkBlock,
    createExternalProject,
    detail,
    detailRows,
    error,
    externalPlatformName,
    externalProjectCode,
    externalTradeForm,
    externalTrades,
    labelStatus: statusLabel,
    load,
    loading,
    materialFile,
    materialFileName,
    onMaterialFileChange,
    recordExternalResult,
    recordInternalApproval,
    saveExternalProjectCode,
    selectedProjectId,
    summaryItems,
    uploadExternalMaterial
  };
}
