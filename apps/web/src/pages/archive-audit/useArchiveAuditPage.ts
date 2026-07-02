import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost, uploadFile } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { businessRecordLabel } from "../../utils/business-display";
import type { ArchiveItem, AuditLog, SupplementRequest } from "./types";

export function useArchiveAuditPage() {
  const selectedProjectId = ref("p-food");
  const session = useSessionStore();
  const selectedArchiveItemId = ref("ai-ext-result");
  const selectedSupplementRequestId = ref("asr-1");
  const supplementFile = ref<File | null>(null);
  const supplementFileName = ref("");
  const archiveItems = ref<ArchiveItem[]>([]);
  const supplementRequests = ref<SupplementRequest[]>([]);
  const projectAuditLogs = ref<AuditLog[]>([]);
  const sensitiveLogs = ref<AuditLog[]>([]);
  const auditLogId = ref("");
  const error = ref("");
  const loading = ref(false);
  const processRefreshKey = ref(0);

  const archiveItemNames = computed(() => new Map(archiveItems.value.map((item) => [item.id, item.itemName])));
  const supplementRequestLabels = computed(() => new Map(supplementRequests.value.map((item, index) => [item.id, `补档申请 ${index + 1}`])));
  const canMaintainArchive = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "档案项", value: archiveItems.value.length, meta: "当前项目" },
    { label: "已收集", value: archiveItems.value.filter((item) => item.collectedFlag).length, meta: "材料归集" },
    { label: "已封存", value: archiveItems.value.filter((item) => item.sealed).length, meta: "不可直接修改" },
    { label: "补档申请", value: supplementRequests.value.length, meta: "当前可见" }
  ]);

  function supplementRequestLabel(requestId: string) {
    return supplementRequestLabels.value.get(requestId) ?? businessRecordLabel(requestId, "补档申请");
  }

  function archiveItemLabel(itemId: string) {
    return archiveItemNames.value.get(itemId) ?? "档案材料";
  }

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      archiveItems.value = (await apiGet<{ archiveItems: ArchiveItem[] }>(`/api/projects/${selectedProjectId.value}/archive-items`)).archiveItems;
      selectedArchiveItemId.value = archiveItems.value[0]?.id ?? selectedArchiveItemId.value;
      supplementRequests.value = (await apiGet<{ archiveSupplementRequests: SupplementRequest[] }>("/api/archive-supplement-requests")).archiveSupplementRequests;
      selectedSupplementRequestId.value = supplementRequests.value[0]?.id ?? selectedSupplementRequestId.value;
      projectAuditLogs.value = (await apiGet<{ auditLogs: AuditLog[] }>(`/api/projects/${selectedProjectId.value}/audit-trail`)).auditLogs;
      sensitiveLogs.value = (await apiGet<{ auditLogs: AuditLog[] }>("/api/sensitive-action-logs")).auditLogs;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "档案与审计数据加载失败";
    } finally {
      loading.value = false;
    }
  }

  function onSupplementFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    supplementFile.value = target.files?.[0] ?? null;
    supplementFileName.value = supplementFile.value?.name ?? "";
  }

  async function run(action: () => Promise<{ auditLogId?: string; supplementRequest?: { id: string } }>) {
    error.value = "";
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      selectedSupplementRequestId.value = result.supplementRequest?.id ?? selectedSupplementRequestId.value;
      await load();
      processRefreshKey.value += 1;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    }
  }

  async function createArchiveSnapshot() {
    return run(() => apiPost(`/api/projects/${selectedProjectId.value}/archive-snapshot`));
  }

  async function checkArchive() {
    return run(() => apiPost(`/api/projects/${selectedProjectId.value}/archive-check`));
  }

  async function sealArchive() {
    return run(() => apiPost(`/api/projects/${selectedProjectId.value}/archive-seal`));
  }

  async function createSupplementRequest() {
    return run(() => apiPost(`/api/archive-items/${selectedArchiveItemId.value}/supplement-requests`, { reason: "档案材料需补充" }));
  }

  async function approveSupplementRequest() {
    return run(() => apiPost(`/api/archive-supplement-requests/${selectedSupplementRequestId.value}/approve`, { approved: true }));
  }

  async function applySupplement() {
    if (!selectedSupplementRequestId.value || !supplementFile.value) {
      error.value = "请选择补档申请和补档材料文件。";
      return;
    }
    await run(async () => {
      const fileResult = await uploadFile(supplementFile.value as File, {
        attachmentKind: "archive_supplement_material",
        objectType: "archive_supplement_request",
        objectId: selectedSupplementRequestId.value,
        projectId: selectedProjectId.value
      });
      const result = await apiPost<{ auditLogId?: string; supplementRequest?: { id: string } }>(`/api/archive-supplement-requests/${selectedSupplementRequestId.value}/apply`, {
        fileId: fileResult.file.id,
        fileName: fileResult.file.fileName,
        contentType: fileResult.file.contentType,
        sizeBytes: fileResult.file.sizeBytes,
        uploadedAt: fileResult.file.uploadedAt
      });
      supplementFile.value = null;
      supplementFileName.value = "";
      return { ...result, auditLogId: result.auditLogId ?? fileResult.auditLogId };
    });
  }

  onMounted(load);

  return {
    applySupplement,
    approveSupplementRequest,
    archiveItemLabel,
    archiveItems,
    auditLogId,
    canMaintainArchive,
    checkArchive,
    createArchiveSnapshot,
    createSupplementRequest,
    error,
    load,
    loading,
    onSupplementFileChange,
    processRefreshKey,
    projectAuditLogs,
    sealArchive,
    selectedArchiveItemId,
    selectedProjectId,
    selectedSupplementRequestId,
    sensitiveLogs,
    summaryItems,
    supplementFile,
    supplementFileName,
    supplementRequestLabel,
    supplementRequests
  };
}
