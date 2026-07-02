import { formatDateTime, labelStatus } from "../../utils/status-labels";
import type { Attachment, SealSample, Supplier, SupplierPortalProfileForm, SupplierPortalTab } from "./types";

export const supplierPortalTabs: Array<{ key: SupplierPortalTab; label: string }> = [
  { key: "profile", label: "档案资料" },
  { key: "qualifications", label: "资质证照" },
  { key: "samples", label: "封样样品" },
  { key: "reviews", label: "准入记录" }
];

const tabKeys = supplierPortalTabs.map((tab) => tab.key);

export function normalizeTab(value: unknown): SupplierPortalTab {
  const key = String(value ?? "");
  return (tabKeys.includes(key as SupplierPortalTab) ? key : "profile") as SupplierPortalTab;
}

export function statusLabel(status?: string) {
  if (status === "pending") return "待准入";
  if (status === "admitted") return "已准入";
  if (status === "inactive") return "停用";
  if (status === "restricted") return "受限";
  if (status === "rejected") return "已驳回";
  return labelStatus(status);
}

export function statusTone(status?: string) {
  if (status === "admitted") return "success";
  if (status === "pending") return "warning";
  if (["inactive", "suspended", "rejected"].includes(String(status))) return "error";
  return "default";
}

export function reviewTypeLabel(value: string) {
  const labels: Record<string, string> = {
    qualification_initial_review: "资质初审",
    admission_assessment: "准入评审",
    regularization_review: "转正评审",
    periodic_assessment: "周期考核"
  };
  return labels[value] ?? value;
}

export function selectedFileSummary(files: File[]) {
  if (!files.length) return "";
  return `已选择 ${files.length} 份：${files.map((file) => file.name).join("、")}`;
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

export function supplierSummaryItems(supplier: Supplier | null) {
  return [
    { label: "准入状态", value: statusLabel(supplier?.admissionStatus || supplier?.status) },
    { label: "资质文件", value: supplier?.qualificationAttachments?.length ?? 0 },
    { label: "封样样品", value: supplier?.sealSamples?.length ?? 0 },
    { label: "最近提交", value: supplier?.onboardingProfile?.submittedAt ? formatDateTime(supplier.onboardingProfile.submittedAt) : "-" }
  ];
}

export function createProfileForm(supplier: Supplier | null): SupplierPortalProfileForm {
  return {
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    contactPhone: supplier?.contactPhone ?? "",
    contactEmail: supplier?.contactEmail ?? "",
    socialCreditCode: supplier?.onboardingProfile?.basic?.socialCreditCode ?? supplier?.socialCreditCode ?? "",
    businessLicenseNo: supplier?.onboardingProfile?.basic?.businessLicenseNo ?? supplier?.businessLicenseNo ?? "",
    legalRepresentative: supplier?.onboardingProfile?.basic?.legalRepresentative ?? supplier?.legalRepresentative ?? "",
    registeredAddress: [supplier?.onboardingProfile?.basic?.registeredAddress, supplier?.onboardingProfile?.basic?.detailAddress].filter(Boolean).join(" ") || supplier?.registeredAddress || "",
    businessScope: supplier?.onboardingProfile?.basic?.businessScope ?? supplier?.businessScope ?? "",
    category: supplier?.categoryAuth?.[0] ?? "",
    region: supplier?.serviceRegions?.[0]?.region ?? "",
    storeName: supplier?.serviceRegions?.[0]?.storeName ?? ""
  };
}

export function profilePayload(form: SupplierPortalProfileForm, supplier: Supplier) {
  return {
    name: form.name,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    contactEmail: form.contactEmail,
    socialCreditCode: form.socialCreditCode,
    businessLicenseNo: form.businessLicenseNo,
    legalRepresentative: form.legalRepresentative,
    registeredAddress: form.registeredAddress,
    businessScope: form.businessScope,
    categoryAuth: form.category ? [form.category] : [],
    serviceRegions: [
      {
        region: form.region,
        storeName: form.storeName,
        category: form.category || supplier.categoryAuth?.[0] || "",
        status: "active"
      }
    ]
  };
}
