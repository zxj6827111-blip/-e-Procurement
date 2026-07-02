import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiDelete, apiGet, apiPost } from "../../api/http";
import type { ProcessBusinessType } from "../../api/process";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";
import type { ActionResult, Announcement, ProcurementDocument, Project, StatusTone, SupplierInvitation, SupplierRow } from "./types";

export function useAnnouncementsInvitationsPage() {
  const projects = ref<Project[]>([]);
  const documents = ref<ProcurementDocument[]>([]);
  const announcements = ref<Announcement[]>([]);
  const invitations = ref<SupplierInvitation[]>([]);
  const suppliers = ref<SupplierRow[]>([]);
  const selectedProjectId = ref("");
  const selectedDocumentId = ref("");
  const selectedAnnouncementId = ref("");
  const title = ref("内部采购公告");
  const procurementMethod = ref("internal_open");
  const scope = ref("public_internal");
  const registrationDeadlineAt = ref("2099-12-20T17:00");
  const quoteDeadlineAt = ref("2099-12-31T17:00");
  const deliveryWindow = ref("7天");
  const openingLocation = ref("华东区域集采中心");
  const selectedSupplierIds = ref<string[]>([]);
  const closeReason = ref("公告内容有误，需要重新发布");
  const auditLogId = ref("");
  const error = ref("");
  const busyAction = ref("");
  const processRefreshKey = ref(0);
  const session = useSessionStore();
  const route = useRoute();

  const internalProjects = computed(() => projects.value.filter((item) => !item.externalTradeFlag));
  const selectedProject = computed(() => projects.value.find((item) => item.id === selectedProjectId.value));
  const projectDocuments = computed(() => documents.value.filter((item) => item.projectId === selectedProjectId.value && item.status !== "voided"));
  const lockedDocuments = computed(() => projectDocuments.value.filter((item) => item.status === "locked"));
  const projectAnnouncements = computed(() =>
    announcements.value
      .filter((item) => item.projectId === selectedProjectId.value)
      .sort((a, b) => (b.createdAt ?? b.publishedAt ?? b.id).localeCompare(a.createdAt ?? a.publishedAt ?? a.id))
  );
  const selectedAnnouncement = computed(() => projectAnnouncements.value.find((item) => item.id === selectedAnnouncementId.value) ?? null);
  const selectedDocument = computed(() => lockedDocuments.value.find((item) => item.id === selectedDocumentId.value) ?? null);
  const projectInvitations = computed(() => invitations.value.filter((item) => item.projectId === selectedProjectId.value));
  const selectedAnnouncementInvitations = computed(() =>
    selectedAnnouncementId.value ? projectInvitations.value.filter((item) => item.announcementId === selectedAnnouncementId.value) : []
  );
  const displayedInvitations = computed(() => (selectedAnnouncementId.value ? selectedAnnouncementInvitations.value : projectInvitations.value));
  const reviewPendingDocuments = computed(() => projectDocuments.value.filter((item) => item.status === "reviewing" || item.reviewStatus === "submitted"));
  const approvedUnpublishedDocuments = computed(() => projectDocuments.value.filter((item) => item.reviewStatus === "approved" && item.status !== "locked"));
  const draftAnnouncements = computed(() => projectAnnouncements.value.filter((item) => item.status === "draft"));
  const publishedAnnouncements = computed(() => projectAnnouncements.value.filter((item) => item.status === "published"));
  const canMaintainSourcing = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
  const canCreateAnnouncement = computed(() => Boolean(selectedProjectId.value && selectedDocumentId.value && selectedDocument.value));
  const selectedSupplierCount = computed(() => selectedSupplierIds.value.length);
  const selectedAnnouncementRequiresSupplier = computed(() => (selectedAnnouncement.value?.scope ?? scope.value) === "invited_suppliers");
  const canPublishSelectedAnnouncement = computed(() => {
    if (!selectedAnnouncement.value || selectedAnnouncement.value.status !== "draft") return false;
    return !selectedAnnouncementRequiresSupplier.value || selectedSupplierIds.value.length > 0;
  });
  const canSendSelectedInvitations = computed(() => Boolean(selectedAnnouncement.value?.status === "published" && selectedSupplierIds.value.length > 0));
  const canDeleteSelectedAnnouncement = computed(() => selectedAnnouncement.value?.status === "draft");
  const canCloseSelectedAnnouncement = computed(() => selectedAnnouncement.value?.status === "published");
  const shouldShowCloseReason = computed(() => selectedAnnouncement.value?.status === "published");
  const selectedProjectLabel = computed(() => (selectedProject.value ? `${selectedProject.value.code} / ${selectedProject.value.name}` : "未选择"));
  const selectedProjectProcessType = computed(() => projectProcessType(selectedProjectId.value));
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "当前项目", value: selectedProjectLabel.value, meta: "公告按项目维护" },
    { label: "公告草稿", value: draftAnnouncements.value.length, meta: "可删除或发布" },
    { label: "已发布公告", value: publishedAnnouncements.value.length, meta: "供应商可报名报价" },
    { label: "邀请记录", value: projectInvitations.value.length, meta: "当前项目累计" }
  ]);
  const announcementPrerequisiteMessage = computed(() => {
    if (!selectedProjectId.value) return "请先选择采购项目。";
    if (lockedDocuments.value.length) return "";
    if (!projectDocuments.value.length) return "该项目还没有采购文件。请先创建采购文件并发布锁定。";
    if (approvedUnpublishedDocuments.value.length || reviewPendingDocuments.value.length) return "采购文件尚未发布锁定。请到采购文件页点击“发布并锁定”。";
    return "采购文件尚未满足公告前置条件。请先发布并锁定采购文件。";
  });
  const nextActionHint = computed(() => {
    if (!selectedAnnouncement.value) return "先起草公告，公告创建后会出现在当前动作区。";
    if (!eligibleSuppliers.value.length) return "当前项目暂无已准入且品类匹配的供应商，请先完成供应商准入评审和品类授权。";
    if (selectedAnnouncement.value.status === "draft") {
      if (selectedAnnouncementRequiresSupplier.value && selectedSupplierIds.value.length === 0) return "这是一条定向邀请公告，请先选择供应商，再发布。";
      return "公告仍为草稿。确认标题、截止时间和供应商后，可以发布公告。";
    }
    if (selectedAnnouncement.value.status === "published") return "公告已发布，可补发供应商邀请；如内容有误且尚无供应商参与，可关闭后重新起草。";
    if (selectedAnnouncement.value.status === "closed") return "公告已关闭，供应商端不再显示，也不能继续报名。";
    return "请根据公告状态处理下一步。";
  });
  const eligibleSuppliers = computed(() => suppliers.value.filter((supplier) => supplierEligibleForProject(supplier, selectedProject.value)));

  function documentLabel(documentId: string) {
    const document = documents.value.find((item) => item.id === documentId);
    return document ? `${document.title} / v${document.versionNo}` : documentId;
  }

  function announcementLabel(announcementId: string) {
    return announcements.value.find((item) => item.id === announcementId)?.title ?? `关联公告不可见（${announcementId}）`;
  }

  function announcementStatus(announcementId: string) {
    return announcements.value.find((item) => item.id === announcementId)?.status ?? "missing";
  }

  function supplierName(supplierId: string) {
    return suppliers.value.find((item) => item.id === supplierId)?.name ?? "供应商";
  }

  function supplierEligibleForProject(supplier: SupplierRow, project: Project | undefined) {
    const status = supplier.admissionStatus ?? supplier.status;
    if (status !== "admitted") return false;
    const category = project?.category;
    if (!category) return true;
    const now = Date.now();
    if (supplier.categoryAuthorizations?.length) {
      return supplier.categoryAuthorizations.some(
        (item) => item.category === category && item.status === "active" && (!item.expiresAt || new Date(item.expiresAt).getTime() >= now)
      );
    }
    return supplier.categoryAuth?.includes(category) ?? false;
  }

  function formatDateTime(value?: string | null) {
    return value ? value.replace("T", " ").replace(".000Z", "").slice(0, 16) : "-";
  }

  function statusTone(status: string): StatusTone {
    if (status === "published" || status === "sent" || status === "registered") return "success";
    if (status === "draft" || status === "pending") return "warning";
    if (status === "closed" || status === "voided" || status === "missing") return "error";
    return "default";
  }

  function projectProcessType(projectId: string): ProcessBusinessType {
    const project = projects.value.find((item) => item.id === projectId);
    const method = `${project?.type ?? ""}`.toLowerCase();
    if (method.includes("direct") || method.includes("直接")) return "direct_purchase";
    if (method.includes("comparison") || method.includes("rfq") || method.includes("询价") || method.includes("比选")) return "rfq";
    return "tender";
  }

  function syncSelectedProjectDefaults() {
    const currentProject = internalProjects.value.find((item) => item.id === selectedProjectId.value);
    procurementMethod.value = currentProject?.type === "comparison" ? "comparison" : "internal_open";
    if (currentProject?.name && title.value === "内部采购公告") title.value = `${currentProject.name}采购公告`;
    selectedDocumentId.value = lockedDocuments.value.some((document) => document.id === selectedDocumentId.value) ? selectedDocumentId.value : lockedDocuments.value[0]?.id ?? "";
    selectedAnnouncementId.value = projectAnnouncements.value.some((item) => item.id === selectedAnnouncementId.value)
      ? selectedAnnouncementId.value
      : projectAnnouncements.value[0]?.id ?? "";
    selectedSupplierIds.value = [];
  }

  function onProjectChange() {
    syncSelectedProjectDefaults();
  }

  async function load() {
    const [projectData, documentData, announcementData, invitationData, supplierData] = await Promise.all([
      apiGet<{ projects: Project[] }>("/api/projects"),
      apiGet<{ procurementDocuments: ProcurementDocument[] }>("/api/procurement-documents"),
      apiGet<{ announcements: Announcement[] }>("/api/announcements"),
      apiGet<{ supplierInvitations: SupplierInvitation[] }>("/api/supplier-invitations"),
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] }))
    ]);
    projects.value = projectData.projects;
    documents.value = documentData.procurementDocuments;
    announcements.value = announcementData.announcements;
    invitations.value = invitationData.supplierInvitations;
    suppliers.value = supplierData.suppliers;
    const queryProjectId = String(route.query.projectId ?? route.query.businessId ?? "");
    if (queryProjectId && internalProjects.value.some((project) => project.id === queryProjectId)) selectedProjectId.value = queryProjectId;
    selectedProjectId.value ||= internalProjects.value[0]?.id ?? "";
    syncSelectedProjectDefaults();
  }

  async function run(actionName: string, action: () => Promise<ActionResult>) {
    error.value = "";
    busyAction.value = actionName;
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      selectedAnnouncementId.value = result.announcement?.id ?? selectedAnnouncementId.value;
      processRefreshKey.value += 1;
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    } finally {
      busyAction.value = "";
    }
  }

  async function createAnnouncement() {
    if (!canCreateAnnouncement.value) {
      error.value = announcementPrerequisiteMessage.value;
      return;
    }
    await run("create", () =>
      apiPost(`/api/projects/${selectedProjectId.value}/announcements`, {
        documentId: selectedDocumentId.value,
        title: title.value,
        procurementMethod: procurementMethod.value,
        methodFields:
          procurementMethod.value === "comparison"
            ? { priceRounds: 1, deliveryWindow: deliveryWindow.value }
            : { bidBondRequired: false, openingLocation: openingLocation.value },
        scope: scope.value,
        registrationDeadlineAt: registrationDeadlineAt.value,
        quoteDeadlineAt: quoteDeadlineAt.value
      })
    );
  }

  async function publishAnnouncement() {
    if (!selectedAnnouncement.value) return;
    await run("publish", () =>
      apiPost(`/api/announcements/${selectedAnnouncement.value?.id}/publish`, {
        supplierIds: selectedSupplierIds.value
      })
    );
  }

  async function sendInvitations() {
    if (!selectedAnnouncement.value) return;
    await run("invite", () =>
      apiPost(`/api/announcements/${selectedAnnouncement.value?.id}/invitations`, {
        supplierIds: selectedSupplierIds.value
      })
    );
  }

  async function deleteAnnouncement() {
    if (!selectedAnnouncement.value) return;
    if (!window.confirm("确认删除这条公告草稿吗？删除后不会展示给供应商，也不会保留为已发布公告。")) return;
    const announcementId = selectedAnnouncement.value.id;
    await run("delete", () => apiDelete(`/api/announcements/${announcementId}`));
  }

  async function closeAnnouncement() {
    if (!selectedAnnouncement.value) return;
    const reason = closeReason.value.trim() || "采购经办关闭公告";
    await run("close", () => apiPost(`/api/announcements/${selectedAnnouncement.value?.id}/close`, { reason }));
  }

  onMounted(async () => {
    if (!session.user) await session.loadMe();
    await load();
  });

  watch(eligibleSuppliers, () => {
    const allowed = new Set(eligibleSuppliers.value.map((supplier) => supplier.id));
    selectedSupplierIds.value = selectedSupplierIds.value.filter((supplierId) => allowed.has(supplierId));
  });

  return {
    announcementLabel,
    announcementPrerequisiteMessage,
    announcementStatus,
    auditLogId,
    busyAction,
    canCloseSelectedAnnouncement,
    canCreateAnnouncement,
    canDeleteSelectedAnnouncement,
    canMaintainSourcing,
    canPublishSelectedAnnouncement,
    canSendSelectedInvitations,
    closeAnnouncement,
    closeReason,
    createAnnouncement,
    deleteAnnouncement,
    deliveryWindow,
    displayedInvitations,
    documentLabel,
    eligibleSuppliers,
    error,
    formatDateTime,
    internalProjects,
    labelStatus,
    lockedDocuments,
    nextActionHint,
    onProjectChange,
    openingLocation,
    processRefreshKey,
    procurementMethod,
    projectAnnouncements,
    publishAnnouncement,
    quoteDeadlineAt,
    registrationDeadlineAt,
    scope,
    selectedAnnouncement,
    selectedAnnouncementId,
    selectedAnnouncementInvitations,
    selectedDocumentId,
    selectedProjectId,
    selectedProjectProcessType,
    selectedSupplierCount,
    selectedSupplierIds,
    sendInvitations,
    shouldShowCloseReason,
    statusTone,
    summaryItems,
    supplierName,
    title
  };
}
