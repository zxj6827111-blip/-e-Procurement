import { onboardingRegisteredAddress } from "./display";
import type { Supplier } from "./types";

export function createProfileForm(supplier: Supplier | null) {
  return {
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    contactPhone: supplier?.contactPhone ?? "",
    contactEmail: supplier?.contactEmail ?? "",
    socialCreditCode: supplier?.onboardingProfile?.basic?.socialCreditCode ?? supplier?.socialCreditCode ?? "",
    businessLicenseNo: supplier?.onboardingProfile?.basic?.businessLicenseNo ?? supplier?.businessLicenseNo ?? "",
    legalRepresentative: supplier?.onboardingProfile?.basic?.legalRepresentative ?? supplier?.legalRepresentative ?? "",
    registeredAddress: onboardingRegisteredAddress(supplier?.onboardingProfile).replace("-", "") || supplier?.registeredAddress || "",
    businessScope: supplier?.onboardingProfile?.basic?.businessScope ?? supplier?.businessScope ?? "",
    category: supplier?.categoryAuth?.[0] ?? "",
    region: supplier?.serviceRegions?.[0]?.region ?? "",
    store: supplier?.serviceRegions?.[0]?.storeName ?? "",
    qualificationFiles: [] as File[],
    qualificationFileName: ""
  };
}

export function createReviewDefaults(options: { qualificationPassed: boolean }) {
  return {
    type: options.qualificationPassed ? "admission_assessment" : "qualification_initial_review",
    status: "passed",
    score: 90,
    opinion: options.qualificationPassed ? "准入资料符合要求，同意纳入合格供应商库" : "资质资料符合要求，同意进入准入评审"
  };
}

export function createSealSampleDefaults() {
  return {
    sampleName: "封样图片",
    specification: "标准样",
    files: [] as File[],
    fileName: ""
  };
}
