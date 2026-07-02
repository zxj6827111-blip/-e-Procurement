import { formatDateTime, labelStatus } from "../../utils/status-labels";
import type { Attachment, SealSample, Supplier, SupplierOnboardingProfile, SupplierTab } from "./types";

export const supplierGovernanceRoles = new Set(["group_manager"]);
export const supplierPortalRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
export const supplierSelfMaintainerRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);

export const supplierTabs: Array<{ key: SupplierTab; label: string }> = [
  { key: "basic", label: "基础信息" },
  { key: "onboarding", label: "入驻资料" },
  { key: "qualifications", label: "资质证照" },
  { key: "samples", label: "封样样品" },
  { key: "reviews", label: "准入评审" },
  { key: "evaluations", label: "评价记录" }
];

export const supplierTabKeys = new Set<SupplierTab>(supplierTabs.map((tab) => tab.key));

export const reviewTypeLabels: Record<string, string> = {
  qualification_initial_review: "资质初审",
  admission_assessment: "准入评审",
  regularization_review: "转正评审",
  periodic_assessment: "周期考核"
};

export function isTestSupplier(supplier: Supplier) {
  return [supplier.name, supplier.contactName, supplier.contactPhone].some((value) => /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? "")));
}

export function serviceRegionSummary(supplier: Supplier | null) {
  if (!supplier?.serviceRegions?.length) return "暂无服务区域";
  return supplier.serviceRegions.map((item) => `${item.region}/${item.storeName}`).join("，");
}

export function sealSampleAttachments(sample: SealSample): Attachment[] {
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

export function fieldValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

export function booleanLabel(value: boolean | undefined, trueLabel = "已确认", falseLabel = "未确认") {
  return value ? trueLabel : falseLabel;
}

export function siteTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    office: "办公室",
    factory: "工厂",
    showroom: "展厅",
    warehouse: "仓库",
    other: "其他场所"
  };
  return labels[value ?? ""] ?? fieldValue(value);
}

export function submittedFromLabel(value?: string) {
  if (value === "supplier_self_registration") return "供应商自助注册";
  return fieldValue(value);
}

export function onboardingProductSummary(supplier: Supplier | null) {
  const products = supplier?.onboardingProfile?.products ?? [];
  if (!products.length) return supplier?.categoryAuth?.join("，") || "-";
  return products.map((item) => [item.category, item.name].filter(Boolean).join(" / ")).filter(Boolean).join("，") || "-";
}

export function onboardingSiteSummary(supplier: Supplier | null) {
  const sites = supplier?.onboardingProfile?.sites ?? [];
  if (!sites.length) return serviceRegionSummary(supplier);
  return sites.map((item) => [siteTypeLabel(item.siteType), item.name, item.address].filter((value) => value && value !== "-").join(" / ")).filter(Boolean).join("，") || "-";
}

export function onboardingRegisteredAddress(profile?: SupplierOnboardingProfile) {
  return [profile?.basic?.registeredAddress, profile?.basic?.detailAddress].map(fieldValue).filter((value) => value !== "-").join(" ") || "-";
}

export function supplierOnboardingAttachmentCount(supplier: Supplier | null) {
  const profile = supplier?.onboardingProfile;
  const productAttachments = profile?.products?.reduce((sum, item) => sum + (item.attachments?.length ?? 0), 0) ?? 0;
  const siteAttachments = profile?.sites?.reduce((sum, item) => sum + (item.attachments?.length ?? 0), 0) ?? 0;
  const companyAttachments = profile?.companyMaterials?.attachments?.length ?? 0;
  return (supplier?.qualificationAttachments?.length ?? 0) + productAttachments + siteAttachments + companyAttachments;
}

export function hasPassedQualificationReview(supplier: Supplier | null) {
  return (
    supplier?.qualification === "initial_review_passed" ||
    Boolean(supplier?.admissionReviews?.some((review) => review.reviewType === "qualification_initial_review" && review.status === "passed"))
  );
}

export function supplierMaterialIssues(supplier: Supplier | null) {
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

export function reviewBlockReason(supplier: Supplier | null, type: string, status: string) {
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

export function supplierStatus(supplier: Supplier | null) {
  const status = supplier?.admissionStatus || supplier?.status;
  if (status === "pending") return "待准入";
  if (status === "admitted") return "已准入";
  if (status === "inactive") return "停用";
  if (status === "restricted") return "受限";
  if (status === "rejected") return "已驳回";
  return labelStatus(status);
}

export function selectedFileSummary(files: File[]) {
  if (!files.length) return "";
  return `已选择 ${files.length} 份：${files.map((file) => file.name).join("、")}`;
}

export function isInactiveSupplier(supplier: Supplier | null) {
  return (supplier?.admissionStatus || supplier?.status) === "inactive";
}

export function isAdmittedSupplier(supplier: Supplier | null) {
  return (supplier?.admissionStatus || supplier?.status) === "admitted";
}

export function supplierAvailabilityLabel(supplier: Supplier | null) {
  const status = supplier?.admissionStatus || supplier?.status;
  if (status === "inactive") return "状态：停用";
  if (status === "restricted") return "状态：受限";
  if (status === "rejected") return "状态：已驳回";
  if (status !== "admitted") return "状态：待准入";
  return "状态：正常";
}

export function qualificationStatusLabel(supplier: Supplier | null) {
  return labelStatus(supplier?.qualification);
}

export function admissionLevelLabel(supplier: Supplier | null) {
  return labelStatus(supplier?.admissionLevel);
}

export function periodicAssessmentLabel(supplier: Supplier | null) {
  const result = supplier?.periodicAssessment?.latestResult;
  const score = supplier?.periodicAssessment?.latestScore;
  const label = labelStatus(result);
  return score === undefined || score === null ? label : `${label} / ${score}分`;
}

export function riskLabel(value?: string) {
  if (!value) return "-";
  if (value === "pending_review") return "待复核";
  const labeled = labelStatus(value);
  return labeled === "待确认" ? value : labeled;
}

export const basicPanelLabels = {
  risk: riskLabel,
  qualificationStatus: qualificationStatusLabel,
  supplierStatus,
  admissionLevel: admissionLevelLabel,
  periodicAssessment: periodicAssessmentLabel,
  dateTime: formatDateTime
};

export const onboardingPanelLabels = {
  field: fieldValue,
  boolean: booleanLabel,
  submittedFrom: submittedFromLabel,
  siteType: siteTypeLabel,
  registeredAddress: onboardingRegisteredAddress,
  dateTime: formatDateTime
};

export const samplesPanelLabels = {
  dateTime: formatDateTime,
  sealSampleAttachments
};
