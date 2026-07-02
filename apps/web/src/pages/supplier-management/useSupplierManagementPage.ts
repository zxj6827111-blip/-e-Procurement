import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDelete, apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../../api/http";
import { useSessionStore } from "../../stores/session";
import { formatDateTime, labelStatus } from "../../utils/status-labels";
import {
  basicPanelLabels,
  hasPassedQualificationReview,
  isAdmittedSupplier,
  isInactiveSupplier,
  isTestSupplier,
  onboardingPanelLabels,
  onboardingProductSummary,
  onboardingSiteSummary,
  reviewBlockReason,
  reviewTypeLabels,
  samplesPanelLabels,
  selectedFileSummary,
  serviceRegionSummary,
  supplierAvailabilityLabel,
  supplierGovernanceRoles,
  supplierMaterialIssues,
  supplierOnboardingAttachmentCount,
  supplierPortalRoles,
  supplierSelfMaintainerRoles,
  supplierStatus,
  supplierTabKeys as tabKeys,
  supplierTabs as tabs
} from "./display";
import { createProfileForm, createReviewDefaults, createSealSampleDefaults } from "./form-state";
import type { SealSample, Supplier, SupplierActionMode, SupplierManagedAccount, SupplierTab } from "./types";

export function useSupplierManagementPage() {
  const session = useSessionStore();
  const route = useRoute();
  const router = useRouter();
  const suppliers = ref<Supplier[]>([]);
  const selectedSupplierId = ref("");
  const activeTab = ref<SupplierTab>("basic");
  const showActionPanel = ref(false);
  const actionMode = ref<SupplierActionMode>("profile");
  const auditLogId = ref("");
  const error = ref("");
  const processRefreshKey = ref(0);
  const showAdmissionProcess = ref(false);
  const searchText = ref("");
  const statusFilter = ref("正常/待准入");

  const profileName = ref("");
  const profileContactName = ref("");
  const profileContactPhone = ref("");
  const profileContactEmail = ref("");
  const profileSocialCreditCode = ref("");
  const profileBusinessLicenseNo = ref("");
  const profileLegalRepresentative = ref("");
  const profileRegisteredAddress = ref("");
  const profileBusinessScope = ref("");
  const profileCategory = ref("");
  const profileRegion = ref("");
  const profileStore = ref("");
  const profileQualificationFiles = ref<File[]>([]);
  const profileQualificationFileName = ref("");

  const reviewType = ref("qualification_initial_review");
  const reviewStatus = ref("passed");
  const reviewScore = ref<number | null>(90);
  const reviewOpinion = ref("资料完整，允许进入下一环节");

  const sealDefaults = createSealSampleDefaults();
  const sealSampleName = ref(sealDefaults.sampleName);
  const sealSampleSpec = ref(sealDefaults.specification);
  const sealSampleFiles = ref<File[]>(sealDefaults.files);
  const sealSampleFileName = ref(sealDefaults.fileName);
  const deactivateReason = ref("误新增，需要作废停用");
  const pendingSelectedSupplierId = ref("");
  const recentCreatedSupplierId = ref("");
  const supplierAccounts = ref<SupplierManagedAccount[]>([]);
  const latestResetPassword = ref<{ userId: string; temporaryPassword: string } | null>(null);
  const accountLoading = ref(false);

  const routeSupplierId = computed(() => String(route.params.supplierId ?? ""));
  const routeSection = computed(() => String(route.params.section ?? ""));
  const canMaintainSupplier = computed(() => supplierGovernanceRoles.has(session.roleId));
  const isSupplierPortal = computed(() => supplierPortalRoles.has(session.roleId) && !canMaintainSupplier.value);
  const canEditOwnSupplier = computed(() => supplierSelfMaintainerRoles.has(session.roleId) || canMaintainSupplier.value);
  const showEmbeddedSupplierList = computed(() => isSupplierPortal.value);
  const pageTitle = computed(() => (isSupplierPortal.value ? "我的供应商档案" : canMaintainSupplier.value ? "供应商管理中心" : "供应商档案中心"));

  const statusOptions = computed(() => [
    "全部",
    "正常/待准入",
    "正常",
    "待准入",
    "停用",
    ...Array.from(new Set(suppliers.value.map((item) => labelStatus(item.admissionStatus || item.status)))).filter(
      (status) => !["全部", "正常/待准入", "正常", "待准入", "停用"].includes(status)
    )
  ]);

  const visibleSuppliers = computed(() =>
    suppliers.value.filter((supplier) => {
      if (isTestSupplier(supplier)) return false;
      if (isSupplierPortal.value) return session.user?.supplierId ? supplier.id === session.user.supplierId : true;
      const keywordMatched = [supplier.name, supplier.contactName, supplier.contactPhone, supplier.categoryAuth.join(" "), serviceRegionSummary(supplier)]
        .join(" ")
        .toLowerCase()
        .includes(searchText.value.trim().toLowerCase());
      const currentStatus = supplier.admissionStatus || supplier.status;
      const statusMatched =
        statusFilter.value === "全部" ||
        (statusFilter.value === "正常/待准入" && ["admitted", "pending"].includes(currentStatus)) ||
        (statusFilter.value === "正常" && currentStatus === "admitted") ||
        (statusFilter.value === "待准入" && currentStatus === "pending") ||
        labelStatus(currentStatus) === statusFilter.value;
      return keywordMatched && statusMatched;
    })
  );

  const selectedSupplier = computed(() => visibleSuppliers.value.find((item) => item.id === selectedSupplierId.value) ?? visibleSuppliers.value[0] ?? null);

  const supplierStats = computed(() => {
    const list = visibleSuppliers.value;
    return {
      total: list.length,
      admitted: list.filter((item) => ["admitted", "已准入"].includes(item.admissionStatus || item.status)).length,
      pending: list.filter((item) => ["pending", "待准入"].includes(item.admissionStatus || item.status)).length,
      qualifications: list.reduce((sum, item) => sum + (item.qualificationAttachments?.length ?? 0), 0),
      samples: list.reduce((sum, item) => sum + (item.sealSamples?.length ?? 0), 0)
    };
  });

  const groupOnboardingPrompts = computed(() =>
    suppliers.value
      .filter((supplier) => !isTestSupplier(supplier) && supplier.onboardingProfile && !isInactiveSupplier(supplier) && !isAdmittedSupplier(supplier))
      .map((supplier) => {
        const issues = supplierMaterialIssues(supplier);
        const qualificationPassed = hasPassedQualificationReview(supplier);
        return {
          supplier,
          issues,
          attachmentCount: supplierOnboardingAttachmentCount(supplier),
          nextAction: issues.length ? "请通知供应商补充资质附件" : qualificationPassed ? "待集团提交准入评审" : "待集团完成资质初审"
        };
      })
  );

  const groupOnboardingStats = computed(() => ({
    total: groupOnboardingPrompts.value.length,
    materialIncomplete: groupOnboardingPrompts.value.filter((item) => item.issues.length > 0).length,
    qualificationReview: groupOnboardingPrompts.value.filter((item) => item.issues.length === 0 && !hasPassedQualificationReview(item.supplier)).length,
    admissionReview: groupOnboardingPrompts.value.filter((item) => item.issues.length === 0 && hasPassedQualificationReview(item.supplier)).length
  }));

  const currentReviewBlockReason = computed(() => reviewBlockReason(selectedSupplier.value, reviewType.value, reviewStatus.value));

  function routeTab() {
    const section = routeSection.value as SupplierTab;
    return tabKeys.has(section) ? section : "basic";
  }

  function supplierTabPath(supplierId: string, tab: SupplierTab) {
    const encodedSupplierId = encodeURIComponent(supplierId);
    return tab === "basic" ? `/suppliers/${encodedSupplierId}` : `/suppliers/${encodedSupplierId}/${tab}`;
  }

  function setActiveTabFromRoute() {
    activeTab.value = routeTab();
  }

  function selectTab(tab: SupplierTab) {
    activeTab.value = tab;
    if (!selectedSupplierId.value) return;
    const nextPath = supplierTabPath(selectedSupplierId.value, tab);
    if (route.path !== nextPath) {
      void router.replace(nextPath);
    }
  }

  function openAction(mode: SupplierActionMode) {
    actionMode.value = mode;
    showActionPanel.value = true;
    if (mode === "review" && selectedSupplier.value && !isAdmittedSupplier(selectedSupplier.value)) {
      const defaults = createReviewDefaults({ qualificationPassed: hasPassedQualificationReview(selectedSupplier.value) });
      reviewType.value = defaults.type;
      reviewStatus.value = defaults.status;
      reviewScore.value = defaults.score;
      reviewOpinion.value = defaults.opinion;
    }
  }

  function resetProfileForm(supplier: Supplier | null) {
    const form = createProfileForm(supplier);
    profileName.value = form.name;
    profileContactName.value = form.contactName;
    profileContactPhone.value = form.contactPhone;
    profileContactEmail.value = form.contactEmail;
    profileSocialCreditCode.value = form.socialCreditCode;
    profileBusinessLicenseNo.value = form.businessLicenseNo;
    profileLegalRepresentative.value = form.legalRepresentative;
    profileRegisteredAddress.value = form.registeredAddress;
    profileBusinessScope.value = form.businessScope;
    profileCategory.value = form.category;
    profileRegion.value = form.region;
    profileStore.value = form.store;
    profileQualificationFiles.value = form.qualificationFiles;
    profileQualificationFileName.value = form.qualificationFileName;
  }

  function syncSelectedSupplier() {
    if (pendingSelectedSupplierId.value && visibleSuppliers.value.some((item) => item.id === pendingSelectedSupplierId.value)) {
      selectedSupplierId.value = pendingSelectedSupplierId.value;
      pendingSelectedSupplierId.value = "";
    } else if (routeSupplierId.value && visibleSuppliers.value.some((item) => item.id === routeSupplierId.value)) {
      selectedSupplierId.value = routeSupplierId.value;
    } else if (!visibleSuppliers.value.some((item) => item.id === selectedSupplierId.value)) {
      selectedSupplierId.value = visibleSuppliers.value[0]?.id ?? "";
    }
    resetProfileForm(selectedSupplier.value);
    setActiveTabFromRoute();
  }

  function selectSupplier(supplier: Supplier) {
    selectedSupplierId.value = supplier.id;
    selectTab("basic");
    latestResetPassword.value = null;
    resetProfileForm(supplier);
    void loadSupplierAccounts();
  }

  function openSupplierOnboardingPrompt(supplier: Supplier) {
    selectSupplier(supplier);
    selectTab("onboarding");
    showActionPanel.value = false;
  }

  function onQualificationChange(event: Event, mode: "profile" | "seal") {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    const fileNames = selectedFileSummary(files);
    if (mode === "profile") {
      profileQualificationFiles.value = files;
      profileQualificationFileName.value = fileNames;
    } else {
      sealSampleFiles.value = files;
      sealSampleFileName.value = fileNames;
    }
  }

  async function uploadList(files: File[], objectId: string, attachmentKind: string) {
    if (files.length === 0) return undefined;
    const uploaded = await Promise.all(
      files.map((file) =>
        uploadFile(file, {
          attachmentKind,
          objectType: "supplier",
          objectId
        })
      )
    );
    return uploaded.map((item) => item.file) satisfies UploadedFileMetadata[];
  }

  async function load() {
    const data = await apiGet<{ suppliers: Supplier[] }>("/api/suppliers");
    suppliers.value = data.suppliers;
    syncSelectedSupplier();
    await loadSupplierAccounts();
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

  async function loadSupplierAccounts() {
    if (!selectedSupplier.value || !canMaintainSupplier.value) {
      supplierAccounts.value = [];
      latestResetPassword.value = null;
      return;
    }
    accountLoading.value = true;
    try {
      const data = await apiGet<{ accounts: SupplierManagedAccount[]; auditLogId?: string }>(`/api/suppliers/${selectedSupplier.value.id}/accounts`);
      supplierAccounts.value = data.accounts;
      auditLogId.value = data.auditLogId ?? auditLogId.value;
    } catch {
      supplierAccounts.value = [];
    } finally {
      accountLoading.value = false;
    }
  }

  async function resetSupplierPassword(account: SupplierManagedAccount) {
    if (!selectedSupplier.value) return;
    await run(async () => {
      const result = await apiPost<{ account: SupplierManagedAccount; auditLogId?: string }>(
        `/api/suppliers/${selectedSupplier.value?.id}/accounts/${account.userId}/reset-password`
      );
      latestResetPassword.value = { userId: account.userId, temporaryPassword: result.account.temporaryPassword ?? "" };
      await loadSupplierAccounts();
      return result;
    });
  }

  async function saveProfile() {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId) return;
    await run(async () =>
      apiPatch(`/api/suppliers/${supplierId}/profile`, {
        name: profileName.value,
        contactName: profileContactName.value,
        contactPhone: profileContactPhone.value,
        contactEmail: profileContactEmail.value,
        socialCreditCode: profileSocialCreditCode.value,
        businessLicenseNo: profileBusinessLicenseNo.value,
        legalRepresentative: profileLegalRepresentative.value,
        registeredAddress: profileRegisteredAddress.value,
        businessScope: profileBusinessScope.value,
        categoryAuth: profileCategory.value ? [profileCategory.value] : [],
        serviceRegions: [
          {
            region: profileRegion.value,
            storeName: profileStore.value,
            category: profileCategory.value || selectedSupplier.value?.categoryAuth?.[0] || "",
            status: "active"
          }
        ],
        qualificationAttachments: profileQualificationFiles.value.length
          ? await uploadList(profileQualificationFiles.value, supplierId, "supplier_qualification")
          : undefined
      })
    );
    profileQualificationFiles.value = [];
    profileQualificationFileName.value = "";
  }

  async function submitReview() {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId) return;
    if (currentReviewBlockReason.value) {
      error.value = currentReviewBlockReason.value;
      return;
    }
    await run(() =>
      apiPost(`/api/suppliers/${supplierId}/reviews`, {
        reviewType: reviewType.value,
        status: reviewStatus.value,
        score: reviewScore.value,
        opinion: reviewOpinion.value
      })
    );
  }

  async function submitSealSample() {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId) return;
    await run(async () =>
      apiPost(`/api/suppliers/${supplierId}/seal-samples`, {
        sampleName: sealSampleName.value,
        specification: sealSampleSpec.value,
        attachments: await uploadList(sealSampleFiles.value, supplierId, "supplier_seal_sample")
      })
    );
    sealSampleFiles.value = [];
    sealSampleFileName.value = "";
  }

  async function deleteQualification(attachment: { id?: string }) {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId || !attachment.id) return;
    if (!window.confirm("确认删除这份资质证照吗？")) return;
    await run(() => apiDelete(`/api/suppliers/${supplierId}/qualifications/${attachment.id}`));
  }

  async function deleteSealSample(sample: SealSample) {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId) return;
    if (!window.confirm("确认删除这个封样样品吗？")) return;
    await run(() => apiDelete(`/api/suppliers/${supplierId}/seal-samples/${sample.id}`));
  }

  async function deactivateSupplier() {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId || !deactivateReason.value.trim()) return;
    await run(() =>
      apiPost(`/api/suppliers/${supplierId}/status`, {
        admissionStatus: "inactive",
        reason: deactivateReason.value.trim()
      })
    );
    if (error.value) return;
    deactivateReason.value = "误新增，需要作废停用";
    showActionPanel.value = false;
  }

  async function reactivateSupplier() {
    const supplierId = selectedSupplier.value?.id;
    if (!supplierId) return;
    await run(() =>
      apiPost(`/api/suppliers/${supplierId}/status`, {
        admissionStatus: "admitted",
        reason: "集团供应商管理重新启用"
      })
    );
    if (error.value) return;
    pendingSelectedSupplierId.value = supplierId;
    statusFilter.value = "正常";
    syncSelectedSupplier();
    showActionPanel.value = false;
  }

  watch([statusFilter, searchText], () => {
    syncSelectedSupplier();
    selectTab("basic");
    latestResetPassword.value = null;
    void loadSupplierAccounts();
  });

  watch(
    () => [route.params.supplierId, route.params.section],
    () => {
      syncSelectedSupplier();
      latestResetPassword.value = null;
      void loadSupplierAccounts();
    }
  );

  onMounted(async () => {
    if (!session.user) await session.loadMe();
    await load();
  });

  return {
    accountLoading,
    actionMode,
    activeTab,
    auditLogId,
    basicPanelLabels,
    canEditOwnSupplier,
    canMaintainSupplier,
    currentReviewBlockReason,
    deactivateReason,
    deactivateSupplier,
    deleteQualification,
    deleteSealSample,
    error,
    formatDateTime,
    groupOnboardingPrompts,
    groupOnboardingStats,
    hasPassedQualificationReview,
    isAdmittedSupplier,
    isInactiveSupplier,
    isSupplierPortal,
    latestResetPassword,
    loadSupplierAccounts,
    onboardingPanelLabels,
    onboardingProductSummary,
    onboardingSiteSummary,
    onQualificationChange,
    openAction,
    openSupplierOnboardingPrompt,
    pageTitle,
    processRefreshKey,
    profileBusinessLicenseNo,
    profileBusinessScope,
    profileCategory,
    profileContactEmail,
    profileContactName,
    profileContactPhone,
    profileLegalRepresentative,
    profileName,
    profileQualificationFileName,
    profileRegion,
    profileRegisteredAddress,
    profileSocialCreditCode,
    profileStore,
    reactivateSupplier,
    recentCreatedSupplierId,
    resetSupplierPassword,
    reviewOpinion,
    reviewScore,
    reviewStatus,
    reviewType,
    reviewTypeLabels,
    samplesPanelLabels,
    saveProfile,
    sealSampleFileName,
    sealSampleName,
    sealSampleSpec,
    selectSupplier,
    selectTab,
    selectedSupplier,
    serviceRegionSummary,
    showActionPanel,
    showAdmissionProcess,
    showEmbeddedSupplierList,
    statusFilter,
    statusOptions,
    submitReview,
    submitSealSample,
    supplierAccounts,
    supplierAvailabilityLabel,
    supplierOnboardingAttachmentCount,
    supplierStats,
    supplierStatus,
    tabs,
    visibleSuppliers,
    searchText
  };
}
