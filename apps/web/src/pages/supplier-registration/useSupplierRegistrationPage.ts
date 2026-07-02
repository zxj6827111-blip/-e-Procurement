import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost, uploadFile } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { businessRecordLabel, isTestLikeText } from "../../utils/business-display";
import { formatDateTime } from "../../utils/status-labels";
import { REGISTRATION_ENTRY_HINT, REGISTRATION_STATUS_LABELS, REVIEW_ENTRY_HINT } from "./constants";
import type { Announcement, ProjectRow, Registration, RegistrationStatus, StatusTone, SupplierProfile, SupplierRow } from "./types";

const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const supplierQuotationRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const procurementReviewRoles = new Set(["buyer", "platform_operator"]);

export function useSupplierRegistrationPage() {
  const announcements = ref<Announcement[]>([]);
  const registrations = ref<Registration[]>([]);
  const currentSupplier = ref<SupplierProfile | null>(null);
  const projects = ref<ProjectRow[]>([]);
  const suppliers = ref<SupplierRow[]>([]);
  const selectedAnnouncementId = ref("");
  const materialFile = ref<File | null>(null);
  const materialName = ref("");
  const supplementFile = ref<File | null>(null);
  const supplementName = ref("");
  const auditLogId = ref("");
  const error = ref("");
  const busy = ref(false);
  const session = useSessionStore();
  const route = useRoute();

  const isSupplierView = computed(() => supplierRoles.has(session.roleId));
  const canReviewRegistration = computed(() => procurementReviewRoles.has(session.roleId));
  const canSubmitRegistration = computed(() => supplierQuotationRoles.has(session.roleId));
  const selectedProjectId = computed(() => String(route.query.projectId ?? ""));
  const pageTitle = computed(() => (canReviewRegistration.value ? "报名资格审核" : "供应商报名"));
  const pageHint = computed(() => (canReviewRegistration.value ? REVIEW_ENTRY_HINT : REGISTRATION_ENTRY_HINT));

  const visibleAnnouncements = computed(() => announcements.value.filter((announcement) => !isTestAnnouncement(announcement)));
  const visibleRegistrations = computed(() =>
    registrations.value.filter((registration) => {
      const announcement = announcements.value.find((item) => item.id === registration.announcementId);
      const project = projects.value.find((item) => item.id === registration.projectId);
      return !isTestLikeText(announcement?.title) && !isTestLikeText(project?.name) && !isTestLikeText(project?.code);
    })
  );
  const projectFilteredAnnouncements = computed(() =>
    visibleAnnouncements.value.filter((announcement) => !selectedProjectId.value || announcement.projectId === selectedProjectId.value)
  );
  const projectFilteredRegistrations = computed(() =>
    visibleRegistrations.value.filter((registration) => !selectedProjectId.value || registration.projectId === selectedProjectId.value)
  );
  const pendingReviewCount = computed(() => projectFilteredRegistrations.value.filter((item) => item.status === "submitted").length);
  const qualifiedCount = computed(() => projectFilteredRegistrations.value.filter((item) => item.status === "qualified").length);
  const rejectedCount = computed(() => projectFilteredRegistrations.value.filter((item) => item.status === "rejected").length);
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "可报名公告", value: projectFilteredAnnouncements.value.length, meta: selectedProjectId.value ? "当前项目" : "全部项目" },
    { label: "待审核", value: pendingReviewCount.value, meta: "已提交报名资料" },
    { label: "资格通过", value: qualifiedCount.value, meta: "可进入报价响应" },
    { label: "未通过", value: rejectedCount.value, meta: "需补正或退出" }
  ]);
  const restrictedMessage = computed(() => {
    if (!currentSupplier.value || currentSupplier.value.admissionStatus !== "restricted") return "";
    return `当前供应商已列入限制名单，不能继续参与报名。${currentSupplier.value.restrictionReason ? `原因：${currentSupplier.value.restrictionReason}` : ""}`;
  });
  const emptyAnnouncementHint = computed(() => {
    if (projectFilteredAnnouncements.value.length > 0) return "";
    if (selectedProjectId.value) return "当前项目暂无可报名公告。采购方需要先在“公告与邀请”发布公告，并将范围设为公开或邀请当前供应商。";
    return "暂无可报名公告。采购文件不会直接显示在供应商报名页；采购方需要先在“公告与邀请”发布公告，并将范围设为公开或邀请当前供应商，公告才会出现在这里。";
  });
  const selectedAnnouncement = computed(() => announcements.value.find((item) => item.id === selectedAnnouncementId.value) ?? null);
  const selectedProject = computed(() => projects.value.find((item) => item.id === selectedAnnouncement.value?.projectId) ?? null);
  const supplierAuthorizedCategories = computed(() => {
    const supplier = currentSupplier.value;
    if (!supplier) return [];
    if (!supplier.categoryAuthorizations) return supplier.categoryAuth ?? [];

    const now = Date.now();
    return supplier.categoryAuthorizations
      .filter((item) => {
        const expiresAt = item.expiresAt ? new Date(item.expiresAt).getTime() : undefined;
        return item.status === "active" && (expiresAt === undefined || (Number.isFinite(expiresAt) && expiresAt >= now));
      })
      .map((item) => item.category)
      .filter(Boolean);
  });
  const categoryMismatchMessage = computed(() => {
    const category = selectedProject.value?.category?.trim();
    if (!supplierRoles.has(session.roleId) || !currentSupplier.value || !category) return "";
    if (supplierAuthorizedCategories.value.includes(category)) return "";
    const authorizedText = supplierAuthorizedCategories.value.length ? supplierAuthorizedCategories.value.join("、") : "暂无有效品类授权";
    return `当前项目采购品类为“${category}”，当前供应商有效授权品类为“${authorizedText}”，暂不能报名。请联系采购方在供应商档案中补充该品类授权。`;
  });

  function announcementTitle(announcementId: string) {
    return businessRecordLabel(announcements.value.find((item) => item.id === announcementId)?.title ?? announcementId, "采购公告");
  }

  function projectLabel(projectId: string) {
    const project = projects.value.find((item) => item.id === projectId);
    if (!project || isTestLikeText(project.name) || isTestLikeText(project.code)) return "采购项目";
    return [project.code, project.name].filter(Boolean).join(" / ") || "采购项目";
  }

  function supplierName(supplierId: string) {
    return suppliers.value.find((item) => item.id === supplierId)?.name ?? currentSupplier.value?.name ?? "供应商";
  }

  function isTestAnnouncement(announcement: Announcement) {
    const project = projects.value.find((item) => item.id === announcement.projectId);
    return isTestLikeText(announcement.title) || isTestLikeText(project?.name) || isTestLikeText(project?.code);
  }

  function registrationStatusLabel(status: string) {
    return REGISTRATION_STATUS_LABELS[status] ?? status;
  }

  function registrationStatusTone(status: string): StatusTone {
    if (status === "qualified") return "success";
    if (status === "rejected") return "error";
    if (status === "submitted") return "warning";
    return "default";
  }

  function onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    materialFile.value = target.files?.[0] ?? null;
    materialName.value = materialFile.value?.name ?? "";
  }

  function onSupplementFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    supplementFile.value = target.files?.[0] ?? null;
    supplementName.value = supplementFile.value?.name ?? "";
  }

  async function load() {
    const [announcementData, registrationData, projectData, supplierData] = await Promise.all([
      apiGet<{ announcements: Announcement[] }>("/api/announcements"),
      apiGet<{ registrations: Registration[] }>("/api/registrations"),
      apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })),
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] }))
    ]);
    announcements.value = announcementData.announcements;
    registrations.value = registrationData.registrations;
    projects.value = projectData.projects;
    suppliers.value = supplierData.suppliers;
    selectedAnnouncementId.value = projectFilteredAnnouncements.value.some((item) => item.id === selectedAnnouncementId.value)
      ? selectedAnnouncementId.value
      : projectFilteredAnnouncements.value[0]?.id ?? "";
    if (supplierRoles.has(session.roleId) && session.user?.supplierId) {
      const supplierData = await apiGet<{ supplier: SupplierProfile }>(`/api/suppliers/${session.user.supplierId}`);
      currentSupplier.value = supplierData.supplier;
    } else {
      currentSupplier.value = null;
    }
  }

  async function reviewRegistration(registrationId: string, status: Exclude<RegistrationStatus, "submitted">) {
    error.value = "";
    busy.value = true;
    try {
      const result = await apiPost<{ registration: Registration; auditLogId: string }>(`/api/registrations/${registrationId}/qualify`, {
        status,
        reason: status === "qualified" ? "报名材料符合当前项目要求。" : "报名材料不符合当前项目要求，请供应商补正后再参与。"
      });
      auditLogId.value = result.auditLogId;
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "审核失败";
    } finally {
      busy.value = false;
    }
  }

  async function submitRegistration() {
    if (restrictedMessage.value) {
      error.value = restrictedMessage.value;
      return;
    }
    if (categoryMismatchMessage.value) {
      error.value = categoryMismatchMessage.value;
      return;
    }
    if (!selectedAnnouncementId.value || !materialFile.value) {
      error.value = "请选择公告并上传报名资料。";
      return;
    }

    error.value = "";
    busy.value = true;
    try {
      const filePayload = await uploadFile(materialFile.value, {
        attachmentKind: "registration_material",
        objectType: "supplier_registration",
        objectId: selectedAnnouncementId.value,
        projectId: announcements.value.find((item) => item.id === selectedAnnouncementId.value)?.projectId,
        supplierId: session.user?.supplierId
      });
      const supplementPayload = supplementFile.value
        ? await uploadFile(supplementFile.value, {
            attachmentKind: "registration_supplement_material",
            objectType: "supplier_registration",
            objectId: selectedAnnouncementId.value,
            projectId: announcements.value.find((item) => item.id === selectedAnnouncementId.value)?.projectId,
            supplierId: session.user?.supplierId
          })
        : null;
      const result = await apiPost<{ registration: Registration; auditLogId: string }>(`/api/announcements/${selectedAnnouncementId.value}/registrations`, {
        materialMetadata: [filePayload.file],
        supplementMaterialMetadata: supplementPayload ? [supplementPayload.file] : []
      });
      auditLogId.value = result.auditLogId;
      materialFile.value = null;
      materialName.value = "";
      supplementFile.value = null;
      supplementName.value = "";
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    } finally {
      busy.value = false;
    }
  }

  onMounted(async () => {
    if (!session.user) await session.loadMe();
    await load();
  });

  return {
    announcementTitle,
    auditLogId,
    busy,
    canReviewRegistration,
    canSubmitRegistration,
    categoryMismatchMessage,
    emptyAnnouncementHint,
    error,
    formatDateTime,
    isSupplierView,
    materialName,
    onFileChange,
    onSupplementFileChange,
    pageHint,
    pageTitle,
    projectFilteredAnnouncements,
    projectFilteredRegistrations,
    projectLabel,
    registrationStatusLabel,
    registrationStatusTone,
    restrictedMessage,
    reviewRegistration,
    selectedAnnouncementId,
    submitRegistration,
    summaryItems,
    supplementName,
    supplierName
  };
}
