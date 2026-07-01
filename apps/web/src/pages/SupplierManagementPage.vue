<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { apiDelete, apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  qualificationType?: string;
  validUntil?: string;
}

interface ServiceRegion {
  id: string;
  region: string;
  storeName: string;
  category: string;
  status: string;
}

interface AdmissionReview {
  id: string;
  reviewType: string;
  status: string;
  score?: number;
  opinion: string;
  reviewedAt: string;
  reviewer?: string;
}

interface SealSample {
  id: string;
  sampleName: string;
  specification: string;
  confirmedBy: string;
  confirmedAt?: string;
  uploadedAt?: string;
  fileId?: string;
  fileName?: string;
  contentType?: string;
  imageFileName?: string;
}

interface SupplierOnboardingProfile {
  account?: { mobile?: string; agreementAccepted?: boolean; agreementVersion?: string; submittedFrom?: string };
  basic?: {
    companyName?: string;
    socialCreditCode?: string;
    businessLicenseNo?: string;
    legalRepresentative?: string;
    registeredAddress?: string;
    detailAddress?: string;
    website?: string;
    businessScope?: string;
    supplierType?: string;
    supplierSource?: string;
  };
  contacts?: Array<{ id: string; name: string; position?: string; email?: string; mobile?: string; phone?: string; fax?: string; primary?: boolean }>;
  products?: Array<{ id: string; category: string; name: string; specification?: string; monthlyCapacity?: string; description?: string; attachments?: Attachment[] }>;
  sites?: Array<{ id: string; siteType: string; name: string; address?: string; description?: string; attachments?: Attachment[] }>;
  companyMaterials?: {
    enterpriseNature?: string;
    taxpayerType?: string;
    registeredCapital?: string;
    employeeScale?: string;
    annualRevenue?: string;
    qualitySystem?: string;
    qualityDescription?: string;
    cooperationCases?: string;
    developmentPlan?: string;
    sunshineCommitmentAccepted?: boolean;
    attachments?: Attachment[];
  };
  questionnaire?: {
    cooperationScope?: string;
    serviceCapability?: string;
    deliveryCoverage?: string;
    afterSalesCommitment?: string;
    complianceCommitment?: string;
    remark?: string;
  };
  submittedAt?: string;
}

interface Supplier {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  admissionLevel?: "trial" | "regular" | "preferred" | "blacklisted" | string;
  categoryAuth: string[];
  qualification: string;
  risk: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  supplierSource?: string;
  socialCreditCode?: string;
  businessLicenseNo?: string;
  legalRepresentative?: string;
  registeredAddress?: string;
  businessScope?: string;
  serviceRegions?: ServiceRegion[];
  qualificationAttachments?: Attachment[];
  admissionReviews?: AdmissionReview[];
  sealSamples?: SealSample[];
  onboardingProfile?: SupplierOnboardingProfile;
  periodicAssessment?: {
    cycle: "monthly" | "quarterly" | "yearly" | string;
    lastAssessedAt?: string;
    nextDueAt?: string;
    latestScore?: number;
    latestResult?: "pending" | "passed" | "warning" | "blacklisted" | string;
  };
  evaluationScore?: number | null;
}

interface SupplierLoginAccount {
  userId: string;
  username: string;
  initialPassword?: string;
}

interface SupplierAccessAccounts {
  admin?: SupplierLoginAccount;
  quotation?: SupplierLoginAccount;
}

interface SupplierManagedAccount {
  type: string;
  label: string;
  userId: string;
  username: string;
  status: string;
  credentialSetupRequired?: boolean;
  lastLoginAt?: string | null;
  temporaryPassword?: string;
}

type SupplierTab = "basic" | "onboarding" | "qualifications" | "samples" | "reviews" | "evaluations";

const session = useSessionStore();
const suppliers = ref<Supplier[]>([]);
const selectedSupplierId = ref("");
const activeTab = ref<SupplierTab>("basic");
const showActionPanel = ref(false);
const actionMode = ref<"supplier" | "profile" | "review" | "sample" | "deactivate" | "reactivate">("profile");
const auditLogId = ref("");
const error = ref("");
const processRefreshKey = ref(0);
const showAdmissionProcess = ref(false);
const searchText = ref("");
const statusFilter = ref("正常/待准入");
const createSupplierPanelRef = ref<HTMLElement | null>(null);

const newSupplierName = ref("");
const newSupplierCategory = ref("");
const newSupplierContactName = ref("");
const newSupplierContactPhone = ref("");
const newSupplierContactEmail = ref("");
const newSupplierRegion = ref("");
const newSupplierStore = ref("");
const qualificationFiles = ref<File[]>([]);
const qualificationFileName = ref("");

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

const sealSampleName = ref("封样图片");
const sealSampleSpec = ref("标准样");
const sealSampleFiles = ref<File[]>([]);
const sealSampleFileName = ref("");
const deactivateReason = ref("误新增，需要作废停用");
const pendingSelectedSupplierId = ref("");
const recentCreatedSupplierId = ref("");
const latestCreatedAccounts = ref<SupplierAccessAccounts | null>(null);
const supplierAccounts = ref<SupplierManagedAccount[]>([]);
const latestResetPassword = ref<{ userId: string; temporaryPassword: string } | null>(null);
const accountLoading = ref(false);

const supplierGovernanceRoles = new Set(["group_manager"]);
const supplierPortalRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const supplierSelfMaintainerRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const canMaintainSupplier = computed(() => supplierGovernanceRoles.has(session.roleId));
const isSupplierPortal = computed(() => supplierPortalRoles.has(session.roleId) && !canMaintainSupplier.value);
const canEditOwnSupplier = computed(() => supplierSelfMaintainerRoles.has(session.roleId) || canMaintainSupplier.value);
const pageTitle = computed(() => (isSupplierPortal.value ? "我的供应商档案" : canMaintainSupplier.value ? "供应商治理中心" : "供应商档案中心"));

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

const reviewTypeLabels: Record<string, string> = {
  qualification_initial_review: "资质初审",
  admission_assessment: "准入评审",
  regularization_review: "转正评审",
  periodic_assessment: "周期考核"
};

const tabs: Array<{ key: SupplierTab; label: string }> = [
  { key: "basic", label: "基础信息" },
  { key: "qualifications", label: "资质证照" },
  { key: "samples", label: "封样样品" },
  { key: "reviews", label: "准入评审" },
  { key: "evaluations", label: "评价记录" }
];

tabs.splice(1, 0, { key: "onboarding", label: "入驻资料" });

async function scrollToCreateSupplierPanel() {
  await nextTick();
  createSupplierPanelRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openAction(mode: "supplier" | "profile" | "review" | "sample" | "deactivate" | "reactivate") {
  actionMode.value = mode;
  showActionPanel.value = true;
  if (mode === "review" && selectedSupplier.value && !isAdmittedSupplier(selectedSupplier.value)) {
    const qualificationPassed = hasPassedQualificationReview(selectedSupplier.value);
    reviewType.value = qualificationPassed ? "admission_assessment" : "qualification_initial_review";
    reviewStatus.value = "passed";
    reviewScore.value = 90;
    reviewOpinion.value = qualificationPassed ? "准入资料符合要求，同意纳入合格供应商库" : "资质资料符合要求，同意进入准入评审";
  }
  if (mode === "supplier") {
    latestCreatedAccounts.value = null;
    void scrollToCreateSupplierPanel();
  }
}

function resetProfileForm(supplier: Supplier | null) {
  profileName.value = supplier?.name ?? "";
  profileContactName.value = supplier?.contactName ?? "";
  profileContactPhone.value = supplier?.contactPhone ?? "";
  profileContactEmail.value = supplier?.contactEmail ?? "";
  profileSocialCreditCode.value = supplier?.onboardingProfile?.basic?.socialCreditCode ?? supplier?.socialCreditCode ?? "";
  profileBusinessLicenseNo.value = supplier?.onboardingProfile?.basic?.businessLicenseNo ?? supplier?.businessLicenseNo ?? "";
  profileLegalRepresentative.value = supplier?.onboardingProfile?.basic?.legalRepresentative ?? supplier?.legalRepresentative ?? "";
  profileRegisteredAddress.value = onboardingRegisteredAddress(supplier?.onboardingProfile).replace("-", "") || supplier?.registeredAddress || "";
  profileBusinessScope.value = supplier?.onboardingProfile?.basic?.businessScope ?? supplier?.businessScope ?? "";
  profileCategory.value = supplier?.categoryAuth?.[0] ?? "";
  profileRegion.value = supplier?.serviceRegions?.[0]?.region ?? "";
  profileStore.value = supplier?.serviceRegions?.[0]?.storeName ?? "";
  profileQualificationFiles.value = [];
  profileQualificationFileName.value = "";
}

function syncSelectedSupplier() {
  if (pendingSelectedSupplierId.value && visibleSuppliers.value.some((item) => item.id === pendingSelectedSupplierId.value)) {
    selectedSupplierId.value = pendingSelectedSupplierId.value;
    pendingSelectedSupplierId.value = "";
  } else if (!visibleSuppliers.value.some((item) => item.id === selectedSupplierId.value)) {
    selectedSupplierId.value = visibleSuppliers.value[0]?.id ?? "";
  }
  resetProfileForm(selectedSupplier.value);
}

function selectSupplier(supplier: Supplier) {
  selectedSupplierId.value = supplier.id;
  activeTab.value = "basic";
  latestResetPassword.value = null;
  resetProfileForm(supplier);
  void loadSupplierAccounts();
}

function isTestSupplier(supplier: Supplier) {
  return [supplier.name, supplier.contactName, supplier.contactPhone].some((value) => /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? "")));
}

function serviceRegionSummary(supplier: Supplier | null) {
  if (!supplier?.serviceRegions?.length) return "暂无服务区域";
  return supplier.serviceRegions.map((item) => `${item.region}/${item.storeName}`).join("，");
}

function sealSampleAttachments(sample: SealSample): Attachment[] {
  const id = sample.fileId ?? "";
  if (!id) return [];
  return [
    {
      id,
      fileName: sample.fileName ?? sample.imageFileName ?? `${sample.sampleName}.png`,
      contentType: sample.contentType ?? "image/png",
      uploadedAt: sample.uploadedAt ?? sample.confirmedAt ?? ""
    }
  ];
}

function fieldValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function booleanLabel(value: boolean | undefined, trueLabel = "已确认", falseLabel = "未确认") {
  return value ? trueLabel : falseLabel;
}

function siteTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    office: "办公室",
    factory: "工厂",
    showroom: "展厅",
    warehouse: "仓库",
    other: "其他场所"
  };
  return labels[value ?? ""] ?? fieldValue(value);
}

function submittedFromLabel(value?: string) {
  if (value === "supplier_self_registration") return "供应商自助注册";
  return fieldValue(value);
}

function onboardingProductSummary(supplier: Supplier | null) {
  const products = supplier?.onboardingProfile?.products ?? [];
  if (!products.length) return supplier?.categoryAuth?.join("，") || "-";
  return products.map((item) => [item.category, item.name].filter(Boolean).join(" / ")).filter(Boolean).join("，") || "-";
}

function onboardingSiteSummary(supplier: Supplier | null) {
  const sites = supplier?.onboardingProfile?.sites ?? [];
  if (!sites.length) return serviceRegionSummary(supplier);
  return sites.map((item) => [siteTypeLabel(item.siteType), item.name, item.address].filter((value) => value && value !== "-").join(" / ")).filter(Boolean).join("，") || "-";
}

function onboardingRegisteredAddress(profile?: SupplierOnboardingProfile) {
  return [profile?.basic?.registeredAddress, profile?.basic?.detailAddress].map(fieldValue).filter((value) => value !== "-").join(" ") || "-";
}

function supplierOnboardingAttachmentCount(supplier: Supplier | null) {
  const profile = supplier?.onboardingProfile;
  const productAttachments = profile?.products?.reduce((sum, item) => sum + (item.attachments?.length ?? 0), 0) ?? 0;
  const siteAttachments = profile?.sites?.reduce((sum, item) => sum + (item.attachments?.length ?? 0), 0) ?? 0;
  const companyAttachments = profile?.companyMaterials?.attachments?.length ?? 0;
  return (supplier?.qualificationAttachments?.length ?? 0) + productAttachments + siteAttachments + companyAttachments;
}

function hasPassedQualificationReview(supplier: Supplier | null) {
  return (
    supplier?.qualification === "initial_review_passed" ||
    Boolean(supplier?.admissionReviews?.some((review) => review.reviewType === "qualification_initial_review" && review.status === "passed"))
  );
}

function supplierMaterialIssues(supplier: Supplier | null) {
  if (!supplier) return ["未选择供应商"];
  const issues: string[] = [];
  if (supplierOnboardingAttachmentCount(supplier) === 0) issues.push("未上传营业执照、企业资料或资质证明附件");
  if (!fieldValue(supplier.onboardingProfile?.basic?.socialCreditCode || supplier.socialCreditCode).replace("-", "").trim()) issues.push("缺少统一社会信用代码");
  if (!fieldValue(supplier.onboardingProfile?.basic?.legalRepresentative || supplier.legalRepresentative).replace("-", "").trim()) issues.push("缺少法定代表人");
  if (!fieldValue(supplier.contactName || supplier.onboardingProfile?.contacts?.[0]?.name).replace("-", "").trim()) issues.push("缺少联系人");
  if (!fieldValue(supplier.contactPhone || supplier.onboardingProfile?.contacts?.[0]?.mobile).replace("-", "").trim()) issues.push("缺少联系电话");
  if (!supplier.categoryAuth.length && !(supplier.onboardingProfile?.products?.length ?? 0)) issues.push("缺少主营产品或授权品类");
  return issues;
}

function reviewBlockReason(supplier: Supplier | null, type: string, status: string) {
  if (!supplier || status !== "passed") return "";
  if (type === "qualification_initial_review" && supplierOnboardingAttachmentCount(supplier) === 0) {
    return "供应商尚未上传资质附件，请先通知供应商补充营业执照、企业资料或资质证明后再通过资质初审。";
  }
  if (type === "admission_assessment") {
    if (!hasPassedQualificationReview(supplier)) return "请先完成资质初审通过，再提交准入评审。";
    if (supplierOnboardingAttachmentCount(supplier) === 0) return "供应商尚未上传资质附件，请先补齐资料后再通过准入评审。";
  }
  return "";
}

function openSupplierOnboardingPrompt(supplier: Supplier) {
  selectSupplier(supplier);
  activeTab.value = "onboarding";
  showActionPanel.value = false;
}

function supplierStatus(supplier: Supplier | null) {
  const status = supplier?.admissionStatus || supplier?.status;
  if (status === "pending") return "待准入";
  if (status === "admitted") return "已准入";
  if (status === "inactive") return "停用";
  if (status === "restricted") return "受限";
  if (status === "rejected") return "已驳回";
  return labelStatus(status);
}

function selectedFileSummary(files: File[]) {
  if (!files.length) return "";
  return `已选择 ${files.length} 份：${files.map((file) => file.name).join("、")}`;
}

function isInactiveSupplier(supplier: Supplier | null) {
  return (supplier?.admissionStatus || supplier?.status) === "inactive";
}

function isAdmittedSupplier(supplier: Supplier | null) {
  return (supplier?.admissionStatus || supplier?.status) === "admitted";
}

function supplierAvailabilityLabel(supplier: Supplier | null) {
  const status = supplier?.admissionStatus || supplier?.status;
  if (status === "inactive") return "状态：停用";
  if (status === "restricted") return "状态：受限";
  if (status === "rejected") return "状态：已驳回";
  if (status !== "admitted") return "状态：待准入";
  return "状态：正常";
}

function qualificationStatusLabel(supplier: Supplier | null) {
  return labelStatus(supplier?.qualification);
}

function admissionLevelLabel(supplier: Supplier | null) {
  return labelStatus(supplier?.admissionLevel);
}

function periodicAssessmentLabel(supplier: Supplier | null) {
  const result = supplier?.periodicAssessment?.latestResult;
  const score = supplier?.periodicAssessment?.latestScore;
  const label = labelStatus(result);
  return score === undefined || score === null ? label : `${label} / ${score}分`;
}

function riskLabel(value?: string) {
  if (!value) return "-";
  if (value === "pending_review") return "待复核";
  const labeled = labelStatus(value);
  return labeled === "待确认" ? value : labeled;
}

function onQualificationChange(event: Event, mode: "create" | "profile" | "seal") {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  const fileNames = selectedFileSummary(files);
  if (mode === "create") {
    qualificationFiles.value = files;
    qualificationFileName.value = fileNames;
  } else if (mode === "profile") {
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

async function createSupplier() {
  await run(async () => {
    const result = await apiPost<{ supplier?: Supplier; accounts?: SupplierAccessAccounts; auditLogId?: string }>("/api/suppliers/admissions", {
      name: newSupplierName.value,
      category: newSupplierCategory.value,
      contactName: newSupplierContactName.value,
      contactPhone: newSupplierContactPhone.value,
      contactEmail: newSupplierContactEmail.value,
      serviceRegions: [
        {
          region: newSupplierRegion.value,
          storeName: newSupplierStore.value,
          category: newSupplierCategory.value
        }
      ],
      qualificationAttachments: await uploadList(qualificationFiles.value, `pending-supplier-${Date.now()}`, "supplier_qualification"),
      qualification: "pending_initial_review",
      admissionStatus: "pending"
    });
    statusFilter.value = "全部";
    pendingSelectedSupplierId.value = result.supplier?.id ?? "";
    recentCreatedSupplierId.value = result.supplier?.id ?? "";
    latestCreatedAccounts.value = result.accounts ?? null;
    return result;
  });
  qualificationFiles.value = [];
  qualificationFileName.value = "";
  await scrollToCreateSupplierPanel();
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
      reason: "集团供应商治理重新启用"
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
  activeTab.value = "basic";
  latestResetPassword.value = null;
  void loadSupplierAccounts();
});

onMounted(async () => {
  if (!session.user) await session.loadMe();
  await load();
});
</script>

<template>
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">供应商档案</p>
        <h2>{{ pageTitle }}</h2>
      </div>
      <div v-if="!isSupplierPortal" class="summary-strip">
        <span><strong>{{ supplierStats.total }}</strong> 档案</span>
        <span><strong>{{ supplierStats.admitted }}</strong> 已准入</span>
        <span><strong>{{ supplierStats.pending }}</strong> 待准入</span>
        <span><strong>{{ supplierStats.qualifications }}</strong> 资质</span>
        <span><strong>{{ supplierStats.samples }}</strong> 封样</span>
      </div>
    </div>

    <div v-if="!isSupplierPortal" class="filter-bar">
      <label>
        状态
        <select v-model="statusFilter">
          <option v-for="status in statusOptions" :key="status">{{ status }}</option>
        </select>
      </label>
      <label class="filter-keyword">
        关键词
        <input v-model="searchText" placeholder="供应商、联系人、品类" />
      </label>
      <button v-if="canMaintainSupplier" type="button" @click="openAction('supplier')">新增供应商</button>
    </div>

    <div v-if="!isSupplierPortal" class="flow-guide supplier-role-guide">
      <div class="flow-guide-head">
        <strong>职责边界：集团负责供应商治理，采购经办负责项目执行</strong>
        <span v-if="canMaintainSupplier">当前账号可以新增供应商、开通供应商账号、记录准入评审、作废停用、重新启用和维护档案；账号开通不等于准入完成。</span>
        <span v-else>当前账号只查看供应商档案和项目关联信息；供应商新增、账号开设、准入停用和重新启用由集团采购管理处理。</span>
      </div>
      <div class="step-strip" aria-label="供应商职责流程">
        <span class="step-chip done">1 集团建档开户</span>
        <span class="step-chip pending">2 集团准入评审</span>
        <span class="step-chip ready">3 经办邀请参与项目</span>
        <span class="step-chip">4 供应商报名报价</span>
      </div>
    </div>

    <div v-if="canMaintainSupplier && groupOnboardingPrompts.length" class="supplier-onboarding-alert">
      <div class="flow-guide-head">
        <strong>供应商自助注册待处理</strong>
        <span>
          当前有 {{ groupOnboardingStats.total }} 家自助注册供应商待处理，其中
          {{ groupOnboardingStats.materialIncomplete }} 家资料需补齐，
          {{ groupOnboardingStats.qualificationReview }} 家待资质初审，
          {{ groupOnboardingStats.admissionReview }} 家待准入评审。
        </span>
      </div>
      <div class="supplier-onboarding-alert-grid">
        <button
          v-for="item in groupOnboardingPrompts"
          :key="item.supplier.id"
          type="button"
          class="supplier-onboarding-alert-card"
          @click="openSupplierOnboardingPrompt(item.supplier)"
        >
          <span class="tag" :class="{ 'supplier-material-blocked': item.issues.length }">{{ item.nextAction }}</span>
          <strong>{{ item.supplier.name }}</strong>
          <small>{{ item.supplier.contactName || item.supplier.onboardingProfile?.contacts?.[0]?.name || "暂无联系人" }} / {{ item.supplier.contactPhone || item.supplier.onboardingProfile?.contacts?.[0]?.mobile || "暂无电话" }}</small>
          <small>附件 {{ item.attachmentCount }} 份；信用代码 {{ item.supplier.onboardingProfile?.basic?.socialCreditCode || item.supplier.socialCreditCode || "-" }}</small>
          <small v-if="item.issues.length">缺口：{{ item.issues.join("、") }}</small>
        </button>
      </div>
    </div>
  </section>

  <section
    v-if="showActionPanel && actionMode === 'supplier'"
    ref="createSupplierPanelRef"
    class="business-panel action-panel supplier-create-panel"
  >
    <div class="panel-head">
      <div>
        <p class="eyebrow">独立录入区</p>
        <h3>新增供应商</h3>
      </div>
      <button type="button" class="secondary-button" @click="showActionPanel = false">收起</button>
    </div>

    <div class="create-panel-body">
      <div class="form-grid supplier-create-form">
        <label>供应商名称<input v-model="newSupplierName" placeholder="例如：杭州鲜达供应链有限公司" /></label>
        <label>业务品类<input v-model="newSupplierCategory" placeholder="例如：客房一次性用品" /></label>
        <label>联系人<input v-model="newSupplierContactName" placeholder="例如：张三" /></label>
        <label>联系电话<input v-model="newSupplierContactPhone" placeholder="例如：13900000001" /></label>
        <label>联系邮箱<input v-model="newSupplierContactEmail" placeholder="例如：supplier@example.com" /></label>
        <label>服务区域<input v-model="newSupplierRegion" placeholder="例如：上海" /></label>
        <label>门店 / 服务点<input v-model="newSupplierStore" placeholder="例如：滨江店" /></label>
        <label>资质附件<input type="file" multiple @change="(event) => onQualificationChange(event, 'create')" /></label>
        <div class="notice">{{ qualificationFileName || "可一次选择营业执照、食品经营许可、检测报告等多份文件" }}</div>
        <button type="button" @click="createSupplier">新增供应商</button>
      </div>

      <div class="supplier-create-context">
        <strong>当前填写的是新供应商资料</strong>
        <span>新增成功后会先标记为“待准入”。供应商账号可以登录补资料，但通过集团准入评审前，采购经办不能邀请其参与项目。</span>
      </div>
    </div>

    <div v-if="latestCreatedAccounts" class="notice supplier-account-notice">
      <strong>供应商账号已开通</strong>
      <span v-if="latestCreatedAccounts.admin">
        管理员账号：{{ latestCreatedAccounts.admin.username }}
        <template v-if="latestCreatedAccounts.admin.initialPassword"> / 初始密码：{{ latestCreatedAccounts.admin.initialPassword }}</template>
      </span>
      <span v-if="latestCreatedAccounts.quotation">
        报价员账号：{{ latestCreatedAccounts.quotation.username }}
        <template v-if="latestCreatedAccounts.quotation.initialPassword"> / 初始密码：{{ latestCreatedAccounts.quotation.initialPassword }}</template>
      </span>
      <small>账号已开通仅表示供应商可登录补充资料；通过集团准入评审后，才可参与公告报名、报价和商品上架。</small>
    </div>
  </section>

  <section class="supplier-layout formal-supplier-layout" :class="{ 'supplier-single-layout': isSupplierPortal }">
    <aside v-if="!isSupplierPortal" class="supplier-card-list">
      <button
        v-for="supplier in visibleSuppliers"
        :key="supplier.id"
        type="button"
        class="supplier-card"
        :class="{ selected: supplier.id === selectedSupplier?.id }"
        @click="selectSupplier(supplier)"
      >
        <strong>{{ supplier.name }}</strong>
        <small>{{ supplier.contactName || "暂无联系人" }} / {{ supplier.contactPhone || "暂无电话" }}</small>
        <div class="supplier-card-status-row">
          <span v-if="supplier.id === recentCreatedSupplierId" class="tag supplier-recent-tag">刚新增</span>
          <span v-if="supplier.onboardingProfile" class="tag supplier-recent-tag">自助注册</span>
          <span class="tag">{{ supplierStatus(supplier) }}</span>
          <span class="tag supplier-availability-tag" :class="{ inactive: isInactiveSupplier(supplier), pending: !isAdmittedSupplier(supplier) && !isInactiveSupplier(supplier) }">
            {{ supplierAvailabilityLabel(supplier) }}
          </span>
        </div>
        <div class="supplier-card-tags">
          <span v-for="category in supplier.categoryAuth" :key="category" class="tag">{{ category }}</span>
        </div>
        <small>信用代码：{{ supplier.onboardingProfile?.basic?.socialCreditCode || supplier.socialCreditCode || "-" }}</small>
        <small>主营：{{ onboardingProductSummary(supplier) }}</small>
        <small>场所：{{ onboardingSiteSummary(supplier) }}</small>
      </button>
    </aside>

    <div v-if="selectedSupplier" class="supplier-detail">
      <template v-if="selectedSupplier">
        <section class="business-panel">
          <div class="detail-header">
            <div>
              <p class="eyebrow">当前档案</p>
              <h2>{{ selectedSupplier.name }}</h2>
            </div>
            <div class="actions">
              <span v-if="selectedSupplier.id === recentCreatedSupplierId" class="tag supplier-recent-tag">刚新增</span>
              <span class="tag">{{ supplierStatus(selectedSupplier) }}</span>
              <button v-if="canEditOwnSupplier && !isInactiveSupplier(selectedSupplier)" type="button" class="secondary-button" @click="openAction('profile')">维护资料</button>
              <button v-if="canMaintainSupplier && !isInactiveSupplier(selectedSupplier)" type="button" class="secondary-button" @click="openAction('review')">记录评审</button>
              <button v-if="canEditOwnSupplier && !isInactiveSupplier(selectedSupplier)" type="button" class="secondary-button" @click="openAction('sample')">上传封样</button>
              <button v-if="canMaintainSupplier && !isInactiveSupplier(selectedSupplier)" type="button" class="secondary-button" @click="openAction('deactivate')">作废停用</button>
              <button v-if="canMaintainSupplier && isInactiveSupplier(selectedSupplier)" type="button" @click="openAction('reactivate')">重新启用</button>
            </div>
          </div>

          <div class="detail-summary-grid">
            <div><span>联系人</span><strong>{{ selectedSupplier.contactName || "-" }}</strong></div>
            <div><span>联系电话</span><strong>{{ selectedSupplier.contactPhone || "-" }}</strong></div>
            <div><span>主营品类</span><strong>{{ selectedSupplier.categoryAuth.join("，") || "-" }}</strong></div>
            <div><span>服务范围</span><strong>{{ serviceRegionSummary(selectedSupplier) }}</strong></div>
            <div><span>统一社会信用代码</span><strong>{{ selectedSupplier.onboardingProfile?.basic?.socialCreditCode || selectedSupplier.socialCreditCode || "-" }}</strong></div>
            <div><span>法定代表人</span><strong>{{ selectedSupplier.onboardingProfile?.basic?.legalRepresentative || selectedSupplier.legalRepresentative || "-" }}</strong></div>
            <div><span>注册来源</span><strong>{{ selectedSupplier.onboardingProfile ? "供应商自助注册" : selectedSupplier.supplierSource || "-" }}</strong></div>
            <div><span>资料提交时间</span><strong>{{ selectedSupplier.onboardingProfile?.submittedAt ? formatDateTime(selectedSupplier.onboardingProfile.submittedAt) : "-" }}</strong></div>
          </div>
        </section>

        <section class="process-disclosure">
          <div class="process-disclosure-head">
            <div>
              <strong>准入流程</strong>
              <span>用于审计追溯和查看供应商准入节点，日常维护可不展开。</span>
            </div>
            <button type="button" class="secondary-button" @click="showAdmissionProcess = !showAdmissionProcess">
              {{ showAdmissionProcess ? "隐藏流程" : "查看流程" }}
            </button>
          </div>
          <ProcessTimeline
            v-if="showAdmissionProcess"
            business-type="supplier_onboarding"
            :business-id="selectedSupplier.id"
            title="供应商准入流程进度"
            :refresh-key="processRefreshKey"
          />
        </section>
      </template>

      <section v-if="showActionPanel && actionMode !== 'supplier'" class="business-panel action-panel">
        <div class="panel-head">
          <h3>
            {{
              actionMode === "profile"
                ? "档案资料维护"
                : actionMode === "review"
                  ? "记录准入评审"
                : actionMode === "sample"
                  ? "上传封样样品"
                  : actionMode === "deactivate"
                    ? "作废停用供应商"
                    : "重新启用供应商"
            }}
          </h3>
          <button type="button" class="secondary-button" @click="showActionPanel = false">收起</button>
        </div>

        <div v-if="actionMode === 'profile'" class="form-grid">
          <div v-if="isSupplierPortal" class="notice supplier-review-gate">
            <strong>供应商资料补充</strong>
            <span>这里保存的基础信息、资质附件会同步到集团供应商治理页，用于资质初审和准入评审。</span>
          </div>
          <label>供应商名称<input v-model="profileName" /></label>
          <label>联系人<input v-model="profileContactName" /></label>
          <label>联系电话<input v-model="profileContactPhone" /></label>
          <label>联系邮箱<input v-model="profileContactEmail" /></label>
          <label>统一社会信用代码<input v-model="profileSocialCreditCode" /></label>
          <label>营业执照编号<input v-model="profileBusinessLicenseNo" /></label>
          <label>法定代表人<input v-model="profileLegalRepresentative" /></label>
          <label>注册地址<input v-model="profileRegisteredAddress" /></label>
          <label class="full-row">经营范围<textarea v-model="profileBusinessScope" /></label>
          <label>主营品类<input v-model="profileCategory" /></label>
          <label>服务区域<input v-model="profileRegion" /></label>
          <label>门店 / 服务点<input v-model="profileStore" /></label>
          <label>追加资质附件<input type="file" multiple @change="(event) => onQualificationChange(event, 'profile')" /></label>
          <div class="notice">{{ profileQualificationFileName || "点击浏览后可按 Ctrl 或 Shift 一次选择多份资质，保存后会追加到现有资质证照中" }}</div>
          <button type="button" :disabled="!selectedSupplierId" @click="saveProfile">保存资料</button>
        </div>

        <div v-else-if="actionMode === 'review'" class="form-grid">
          <div class="notice supplier-review-gate" :class="{ blocked: currentReviewBlockReason }">
            <strong>{{ currentReviewBlockReason ? "暂不能通过该评审" : "资料状态可进入当前评审" }}</strong>
            <span v-if="currentReviewBlockReason">{{ currentReviewBlockReason }}</span>
            <span v-else>
              已收集 {{ supplierOnboardingAttachmentCount(selectedSupplier) }} 份资质/企业/产品/场所附件；
              {{ hasPassedQualificationReview(selectedSupplier) ? "资质初审已通过，可继续准入评审。" : "可先完成资质初审。" }}
            </span>
          </div>
          <label>
            评审类型
            <select v-model="reviewType">
              <option value="qualification_initial_review">资质初审</option>
              <option value="admission_assessment">准入评审</option>
              <option value="regularization_review">转正评审</option>
              <option value="periodic_assessment">周期考核</option>
            </select>
          </label>
          <label>
            评审结果
            <select v-model="reviewStatus">
              <option value="passed">通过</option>
              <option value="rejected">驳回</option>
              <option value="pending">待定</option>
            </select>
          </label>
          <label>评分<input v-model.number="reviewScore" type="number" /></label>
          <label>评审意见<input v-model="reviewOpinion" /></label>
          <button type="button" :disabled="Boolean(currentReviewBlockReason)" @click="submitReview">提交评审</button>
        </div>

        <div v-else-if="actionMode === 'sample'" class="form-grid">
          <label>封样名称<input v-model="sealSampleName" /></label>
          <label>规格说明<input v-model="sealSampleSpec" /></label>
          <label>封样附件<input type="file" accept="image/*" multiple @change="(event) => onQualificationChange(event, 'seal')" /></label>
          <div class="notice">{{ sealSampleFileName || "点击浏览后可按 Ctrl 或 Shift 一次选择多张图片，每张图片会生成一条封样记录" }}</div>
          <button type="button" @click="submitSealSample">上传封样</button>
        </div>

        <div v-else-if="actionMode === 'deactivate'" class="form-grid">
          <label>供应商名称<input :value="selectedSupplier?.name || ''" disabled /></label>
          <label>作废停用原因<input v-model="deactivateReason" placeholder="例如：误新增、资料录入错误" /></label>
          <div class="notice">停用后该供应商会从默认列表隐藏，但审计留痕和历史档案仍保留；可通过状态筛选“停用”查回。</div>
          <button type="button" :disabled="!deactivateReason.trim()" @click="deactivateSupplier">确认作废停用</button>
        </div>

        <div v-else class="form-grid">
          <label>供应商名称<input :value="selectedSupplier?.name || ''" disabled /></label>
          <label>当前状态<input :value="supplierStatus(selectedSupplier)" disabled /></label>
          <div class="notice">重新启用后，该供应商会恢复为已准入状态，并重新出现在默认“正常”列表；历史停用记录和审计留痕仍会保留。</div>
          <button type="button" @click="reactivateSupplier">确认重新启用</button>
        </div>
      </section>

      <section v-if="selectedSupplier" class="business-panel">
        <div class="tabbar">
          <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
            {{ tab.label }}
          </button>
        </div>

        <div v-if="activeTab === 'basic'" class="tab-content">
          <div class="detail-summary-grid">
            <div><span>联系邮箱</span><strong>{{ selectedSupplier.contactEmail || "-" }}</strong></div>
            <div><span>风险提示</span><strong>{{ riskLabel(selectedSupplier.risk) }}</strong></div>
            <div><span>资质状态</span><strong>{{ qualificationStatusLabel(selectedSupplier) }}</strong></div>
            <div><span>准入状态</span><strong>{{ supplierStatus(selectedSupplier) }}</strong></div>
            <div><span>供应商等级</span><strong>{{ admissionLevelLabel(selectedSupplier) }}</strong></div>
            <div><span>周期考核</span><strong>{{ periodicAssessmentLabel(selectedSupplier) }}</strong></div>
            <div><span>下次考核</span><strong>{{ formatDateTime(selectedSupplier.periodicAssessment?.nextDueAt) }}</strong></div>
            <div><span>评价分</span><strong>{{ selectedSupplier.evaluationScore ?? "-" }}</strong></div>
          </div>
          <section v-if="canMaintainSupplier" class="supplier-account-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">后台账号管理</p>
                <h3>供应商登录账号</h3>
              </div>
              <button type="button" class="secondary-button" :disabled="accountLoading" @click="loadSupplierAccounts">刷新账号</button>
            </div>
            <div class="account-reset-note">
              后台不显示旧密码；供应商忘记密码时，请重置生成临时密码并交给供应商首次登录后修改。
            </div>
            <div v-if="supplierAccounts.length" class="supplier-account-grid">
              <article v-for="account in supplierAccounts" :key="account.userId" class="supplier-account-card">
                <div>
                  <span class="tag">{{ account.label }}</span>
                  <strong>{{ account.username }}</strong>
                  <small>用户ID：{{ account.userId }}</small>
                </div>
                <div class="account-meta">
                  <span>状态：{{ labelStatus(account.status) }}</span>
                  <span>密码状态：{{ account.credentialSetupRequired ? "需首次修改" : "已完成设置" }}</span>
                  <span>最近登录：{{ account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "暂无" }}</span>
                </div>
                <button type="button" class="secondary-button" @click="resetSupplierPassword(account)">重置密码</button>
                <div v-if="latestResetPassword?.userId === account.userId" class="temporary-password-box">
                  <span>新的临时密码</span>
                  <strong>{{ latestResetPassword.temporaryPassword }}</strong>
                </div>
              </article>
            </div>
            <p v-else class="notice">暂无可管理账号。</p>
          </section>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>区域</th>
                  <th>门店 / 服务点</th>
                  <th>品类</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="region in selectedSupplier.serviceRegions" :key="region.id">
                  <td>{{ region.region }}</td>
                  <td>{{ region.storeName }}</td>
                  <td>{{ region.category }}</td>
                  <td>{{ labelStatus(region.status) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="activeTab === 'onboarding'" class="tab-content supplier-onboarding-profile">
          <div class="panel-head">
            <h3>供应商入驻资料</h3>
            <span class="tag">{{ selectedSupplier.onboardingProfile?.submittedAt ? formatDateTime(selectedSupplier.onboardingProfile.submittedAt) : "暂无提交时间" }}</span>
          </div>
          <template v-if="selectedSupplier.onboardingProfile">
            <section class="detail-panel">
              <h3>账号注册</h3>
              <div class="detail-summary-grid">
                <div><span>注册手机号</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.account?.mobile) }}</strong></div>
                <div><span>注册协议</span><strong>{{ booleanLabel(selectedSupplier.onboardingProfile.account?.agreementAccepted, "已同意", "未同意") }}</strong></div>
                <div><span>协议版本</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.account?.agreementVersion) }}</strong></div>
                <div><span>提交来源</span><strong>{{ submittedFromLabel(selectedSupplier.onboardingProfile.account?.submittedFrom) }}</strong></div>
              </div>
            </section>

            <section class="detail-panel">
              <h3>基础信息</h3>
              <div class="detail-summary-grid">
                <div><span>公司全称</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.companyName || selectedSupplier.name) }}</strong></div>
                <div><span>统一社会信用代码</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.socialCreditCode || selectedSupplier.socialCreditCode) }}</strong></div>
                <div><span>营业执照编号</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.businessLicenseNo) }}</strong></div>
                <div><span>法定代表人</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.legalRepresentative || selectedSupplier.legalRepresentative) }}</strong></div>
                <div><span>注册地址</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.registeredAddress) }}</strong></div>
                <div><span>详细地址</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.detailAddress) }}</strong></div>
                <div><span>公司网址</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.website) }}</strong></div>
                <div><span>供应商类型</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.supplierType) }}</strong></div>
                <div><span>供应商来源</span><strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.supplierSource || selectedSupplier.supplierSource) }}</strong></div>
                <div><span>完整注册地址</span><strong>{{ onboardingRegisteredAddress(selectedSupplier.onboardingProfile) }}</strong></div>
              </div>
              <div class="detail-block">
                <p><strong>经营范围：</strong>{{ fieldValue(selectedSupplier.onboardingProfile.basic?.businessScope) }}</p>
              </div>
            </section>

            <div class="detail-summary-grid">
              <div><span>企业名称</span><strong>{{ selectedSupplier.onboardingProfile.basic?.companyName || selectedSupplier.name }}</strong></div>
              <div><span>统一社会信用代码</span><strong>{{ selectedSupplier.onboardingProfile.basic?.socialCreditCode || selectedSupplier.socialCreditCode || "-" }}</strong></div>
              <div><span>法定代表人</span><strong>{{ selectedSupplier.onboardingProfile.basic?.legalRepresentative || selectedSupplier.legalRepresentative || "-" }}</strong></div>
              <div><span>供应商来源</span><strong>{{ selectedSupplier.onboardingProfile.basic?.supplierSource || selectedSupplier.supplierSource || "-" }}</strong></div>
              <div><span>纳税人形式</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.taxpayerType || "-" }}</strong></div>
              <div><span>注册资金</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.registeredCapital || "-" }}</strong></div>
              <div><span>员工规模</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.employeeScale || "-" }}</strong></div>
              <div><span>年营业额</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.annualRevenue || "-" }}</strong></div>
            </div>

            <section class="detail-panel">
              <h3>联系人</h3>
              <table>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>职位</th>
                    <th>手机</th>
                    <th>Email</th>
                    <th>固定电话</th>
                    <th>传真</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="contactItem in selectedSupplier.onboardingProfile.contacts" :key="contactItem.id">
                    <td>{{ contactItem.name }}</td>
                    <td>{{ contactItem.position || "-" }}</td>
                    <td>{{ contactItem.mobile || "-" }}</td>
                    <td>{{ contactItem.email || "-" }}</td>
                    <td>{{ contactItem.phone || "-" }}</td>
                    <td>{{ contactItem.fax || "-" }}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="detail-panel">
              <h3>主营产品</h3>
              <div class="supplier-onboarding-grid">
                <article v-for="product in selectedSupplier.onboardingProfile.products" :key="product.id" class="draft-card">
                  <strong>{{ product.name }}</strong>
                  <span>{{ product.category }} / {{ product.specification || "暂无规格" }}</span>
                  <small>供货能力：{{ product.monthlyCapacity || "-" }}</small>
                  <p>{{ product.description || "-" }}</p>
                  <AttachmentList :attachments="product.attachments" compact empty-text="暂无产品附件" />
                </article>
              </div>
            </section>

            <section class="detail-panel">
              <h3>办公室、工厂及展厅</h3>
              <div class="supplier-onboarding-grid">
                <article v-for="site in selectedSupplier.onboardingProfile.sites" :key="site.id" class="draft-card">
                  <strong>{{ site.name }}</strong>
                  <span>{{ siteTypeLabel(site.siteType) }} / {{ site.address || "-" }}</span>
                  <p>{{ site.description || "-" }}</p>
                  <AttachmentList :attachments="site.attachments" compact empty-text="暂无场所附件" />
                </article>
              </div>
            </section>

            <section class="detail-panel">
              <h3>企业资料与入驻问卷</h3>
              <div class="detail-summary-grid">
                <div><span>企业性质</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.enterpriseNature || "-" }}</strong></div>
                <div><span>质量体系</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.qualitySystem || "-" }}</strong></div>
                <div><span>廉洁承诺</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.sunshineCommitmentAccepted ? "已承诺" : "未确认" }}</strong></div>
                <div><span>合作范围</span><strong>{{ selectedSupplier.onboardingProfile.questionnaire?.cooperationScope || "-" }}</strong></div>
                <div><span>服务能力</span><strong>{{ selectedSupplier.onboardingProfile.questionnaire?.serviceCapability || "-" }}</strong></div>
                <div><span>配送覆盖</span><strong>{{ selectedSupplier.onboardingProfile.questionnaire?.deliveryCoverage || "-" }}</strong></div>
                <div><span>发展计划</span><strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.developmentPlan || "-" }}</strong></div>
                <div><span>备注</span><strong>{{ selectedSupplier.onboardingProfile.questionnaire?.remark || "-" }}</strong></div>
              </div>
              <div class="detail-block">
                <p><strong>质量管理说明：</strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.qualityDescription || "-" }}</p>
                <p><strong>合作案例：</strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.cooperationCases || "-" }}</p>
                <p><strong>发展计划：</strong>{{ selectedSupplier.onboardingProfile.companyMaterials?.developmentPlan || "-" }}</p>
                <p><strong>售后承诺：</strong>{{ selectedSupplier.onboardingProfile.questionnaire?.afterSalesCommitment || "-" }}</p>
                <p><strong>合规承诺：</strong>{{ selectedSupplier.onboardingProfile.questionnaire?.complianceCommitment || "-" }}</p>
                <p><strong>备注：</strong>{{ selectedSupplier.onboardingProfile.questionnaire?.remark || "-" }}</p>
              </div>
              <AttachmentList :attachments="selectedSupplier.onboardingProfile.companyMaterials?.attachments" variant="document" empty-text="暂无企业资料附件" />
            </section>
          </template>
          <p v-else class="notice">该供应商暂无自助入驻资料，可能由集团后台手工新增。</p>
        </div>

        <div v-else-if="activeTab === 'qualifications'" class="tab-content">
          <div class="panel-head">
            <h3>资质证照</h3>
            <div class="actions">
              <span class="tag">共 {{ selectedSupplier.qualificationAttachments?.length ?? 0 }} 份</span>
              <button v-if="canEditOwnSupplier && !isInactiveSupplier(selectedSupplier)" type="button" class="secondary-button" @click="openAction('profile')">追加资质</button>
            </div>
          </div>
          <AttachmentList
            :attachments="selectedSupplier.qualificationAttachments"
            variant="document"
            empty-text="暂无资质文件"
            deletable
            @delete="deleteQualification"
          />
        </div>

        <div v-else-if="activeTab === 'samples'" class="tab-content">
          <div class="panel-head">
            <h3>封样样品</h3>
            <div class="actions">
              <span class="tag">共 {{ selectedSupplier.sealSamples?.length ?? 0 }} 件</span>
              <button v-if="canEditOwnSupplier && !isInactiveSupplier(selectedSupplier)" type="button" class="secondary-button" @click="openAction('sample')">上传封样</button>
            </div>
          </div>
          <div v-if="selectedSupplier.sealSamples?.length" class="seal-sample-grid">
            <article v-for="sample in selectedSupplier.sealSamples" :key="sample.id" class="seal-sample-card">
              <div class="sample-visual">
                <AttachmentList
                  v-if="sealSampleAttachments(sample).length"
                  :attachments="sealSampleAttachments(sample)"
                  variant="gallery"
                  image-only
                  empty-text="暂无封样图片"
                />
                <div v-else class="visual-placeholder">
                  <strong>封样</strong>
                  <span>{{ sample.sampleName }}</span>
                </div>
              </div>
              <strong>{{ sample.sampleName }}</strong>
              <span>{{ sample.specification || "-" }}</span>
              <small>{{ sample.confirmedBy }} / {{ formatDateTime(sample.uploadedAt ?? sample.confirmedAt) }}</small>
              <button type="button" class="secondary-button danger-button" @click="deleteSealSample(sample)">删除封样</button>
            </article>
          </div>
          <p v-else class="notice">暂无封样资料。</p>
        </div>

        <div v-else-if="activeTab === 'reviews'" class="tab-content">
          <div v-if="selectedSupplier.admissionReviews?.length" class="timeline-list">
            <article v-for="review in selectedSupplier.admissionReviews" :key="review.id" class="timeline-row">
              <span class="tag">{{ labelStatus(review.status) }}</span>
              <strong>{{ reviewTypeLabels[review.reviewType] ?? review.reviewType }}</strong>
              <p>{{ review.opinion || "-" }}</p>
              <small>{{ review.reviewer || "评审人" }} / {{ formatDateTime(review.reviewedAt) }} / 评分 {{ review.score ?? "-" }}</small>
            </article>
          </div>
          <p v-else class="notice">暂无评审记录。</p>
        </div>

        <div v-else class="tab-content">
          <div class="detail-summary-grid">
            <div><span>综合评分</span><strong>{{ selectedSupplier.evaluationScore ?? "-" }}</strong></div>
            <div><span>准入状态</span><strong>{{ supplierStatus(selectedSupplier) }}</strong></div>
            <div><span>风险状态</span><strong>{{ selectedSupplier.risk || "-" }}</strong></div>
            <div><span>最近评审</span><strong>{{ formatDateTime(selectedSupplier.admissionReviews?.[0]?.reviewedAt) }}</strong></div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="empty">当前角色暂无可见供应商档案。</div>
  </section>

  <AuditLogRef :audit-log-id="auditLogId" />
  <ErrorAlert v-if="error" :message="error" />
</template>
