import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import type { ActionResult, ProcurementDocument, Project, StatusTone } from "./types";

export function useProcurementDocumentsPage() {
  const route = useRoute();
  const session = useSessionStore();
  const projects = ref<Project[]>([]);
  const documents = ref<ProcurementDocument[]>([]);
  const selectedProjectId = ref("");
  const selectedDocumentId = ref("");
  const title = ref("客房一次性用品采购文件");
  const contentSummary = ref("供应商资格要求、报价要求、交付周期及评审规则。");
  const selectedFile = ref<File | null>(null);
  const selectedFileName = ref("");
  const auditLogId = ref("");
  const error = ref("");

  const internalProjects = computed(() => projects.value.filter((item) => !item.externalTradeFlag));
  const canMaintainDocuments = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
  const lockedDocuments = computed(() => documents.value.filter((item) => item.status === "locked"));
  const voidedDocuments = computed(() => documents.value.filter((item) => item.status === "voided"));
  const pendingPublicationDocuments = computed(() => documents.value.filter((item) => !["locked", "voided"].includes(item.status)));
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "内部采购项目", value: internalProjects.value.length, meta: "不包含外部交易项目" },
    { label: "采购文件", value: documents.value.length, meta: "全部版本" },
    { label: "已锁定", value: lockedDocuments.value.length, meta: "可用于公告发布" },
    { label: "待发布锁定", value: pendingPublicationDocuments.value.length, meta: "需采购经办处理" }
  ]);

  function projectLabel(projectId: string) {
    const project = projects.value.find((item) => item.id === projectId);
    return project ? `${project.code} / ${project.name}` : projectId;
  }

  function onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedFile.value = target.files?.[0] ?? null;
    selectedFileName.value = selectedFile.value?.name ?? "";
  }

  async function load() {
    const [projectData, documentData] = await Promise.all([
      apiGet<{ projects: Project[] }>("/api/projects"),
      apiGet<{ procurementDocuments: ProcurementDocument[] }>("/api/procurement-documents")
    ]);
    projects.value = projectData.projects;
    documents.value = documentData.procurementDocuments;
    const queryProjectId = String(route.query.projectId ?? "");
    if (queryProjectId && internalProjects.value.some((project) => project.id === queryProjectId)) selectedProjectId.value = queryProjectId;
    selectedProjectId.value ||= internalProjects.value[0]?.id ?? "";
    const queryDocumentId = route.query.businessType === "procurement_document" ? String(route.query.businessId ?? "") : "";
    selectedDocumentId.value = documents.value.some((document) => document.id === queryDocumentId)
      ? queryDocumentId
      : selectedDocumentId.value || documents.value[0]?.id || "";
  }

  async function buildAttachments(objectId?: string) {
    if (!selectedFile.value) return [];
    const uploaded = await uploadFile(selectedFile.value, {
      attachmentKind: "procurement_document_attachment",
      objectType: "procurement_document",
      objectId: objectId || selectedDocumentId.value || `pending-document-${Date.now()}`,
      projectId: selectedProjectId.value
    });
    return [uploaded.file] satisfies UploadedFileMetadata[];
  }

  async function run(action: () => Promise<ActionResult>) {
    error.value = "";
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      selectedDocumentId.value = result.procurementDocument?.id ?? selectedDocumentId.value;
      selectedFile.value = null;
      selectedFileName.value = "";
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    }
  }

  function canPublishDocument(document: ProcurementDocument) {
    return canMaintainDocuments.value && document.status !== "locked" && document.status !== "voided";
  }

  function canVoidDocument(document: ProcurementDocument) {
    return canMaintainDocuments.value && document.status !== "locked" && document.status !== "voided";
  }

  function canReviseDocument(document: ProcurementDocument) {
    return canMaintainDocuments.value && document.status === "locked";
  }

  function hasAvailableAction(document: ProcurementDocument) {
    return Boolean(canPublishDocument(document) || canVoidDocument(document) || canReviseDocument(document) || document.status === "locked");
  }

  function nextStepLabel(document: ProcurementDocument) {
    if (document.status === "voided") return "已停用";
    if (document.status === "locked") return "可创建公告";
    return canMaintainDocuments.value ? "发布并锁定" : "等待采购经办发布";
  }

  function nextStepDetail(document: ProcurementDocument) {
    if (document.status === "voided") return "该版本已停用，不能继续用于公告。";
    if (document.status === "locked") return "公告与邀请页可以选择这份已锁定文件。";
    if (canMaintainDocuments.value) return "确认文件内容后发布并锁定，随后即可创建公告。";
    return "当前账号仅查看文件状态，发布锁定由采购经办处理。";
  }

  function nextStepTone(document: ProcurementDocument): StatusTone {
    if (document.status === "locked") return "success";
    if (document.status === "voided") return "error";
    return canMaintainDocuments.value ? "primary" : "warning";
  }

  async function createDocument() {
    await run(async () =>
      apiPost<ActionResult>(`/api/projects/${selectedProjectId.value}/procurement-documents`, {
        title: title.value,
        contentSummary: contentSummary.value,
        attachmentMetadata: await buildAttachments()
      })
    );
  }

  async function publishDocument(document: ProcurementDocument) {
    selectedDocumentId.value = document.id;
    selectedProjectId.value = document.projectId;
    await run(() => apiPost<ActionResult>(`/api/procurement-documents/${document.id}/publish`));
  }

  async function voidDocument(document: ProcurementDocument) {
    selectedDocumentId.value = document.id;
    selectedProjectId.value = document.projectId;
    await run(() => apiPost<ActionResult>(`/api/procurement-documents/${document.id}/void`, { reason: "页面停用采购文件" }));
  }

  async function reviseDocument(document: ProcurementDocument) {
    selectedDocumentId.value = document.id;
    selectedProjectId.value = document.projectId;
    await run(async () =>
      apiPatch<ActionResult>(`/api/procurement-documents/${document.id}`, {
        title: `${document.title}（修订版）`,
        contentSummary: document.contentSummary,
        attachmentMetadata: await buildAttachments(document.id)
      })
    );
  }

  onMounted(async () => {
    if (!session.user) await session.loadMe();
    await load();
  });

  return {
    auditLogId,
    canMaintainDocuments,
    canPublishDocument,
    canReviseDocument,
    canVoidDocument,
    contentSummary,
    createDocument,
    documents,
    error,
    hasAvailableAction,
    internalProjects,
    nextStepDetail,
    nextStepLabel,
    nextStepTone,
    onFileChange,
    pendingPublicationDocuments,
    projectLabel,
    publishDocument,
    reviseDocument,
    selectedFileName,
    selectedProjectId,
    summaryItems,
    title,
    voidDocument,
    voidedDocuments
  };
}
