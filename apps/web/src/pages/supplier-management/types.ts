export interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  qualificationType?: string;
  validUntil?: string;
}

export interface ServiceRegion {
  id: string;
  region: string;
  storeName: string;
  category: string;
  status: string;
}

export interface AdmissionReview {
  id: string;
  reviewType: string;
  status: string;
  score?: number;
  opinion: string;
  reviewedAt: string;
  reviewer?: string;
}

export interface SealSample {
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

export interface SupplierOnboardingProfile {
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

export interface Supplier {
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

export interface SupplierLoginAccount {
  userId: string;
  username: string;
  initialPassword?: string;
}

export interface SupplierAccessAccounts {
  admin?: SupplierLoginAccount;
  quotation?: SupplierLoginAccount;
}

export interface SupplierManagedAccount {
  type: string;
  label: string;
  userId: string;
  username: string;
  status: string;
  credentialSetupRequired?: boolean;
  lastLoginAt?: string | null;
  temporaryPassword?: string;
}

export type SupplierTab = "basic" | "onboarding" | "qualifications" | "samples" | "reviews" | "evaluations";

export type SupplierActionMode = "profile" | "review" | "sample" | "deactivate" | "reactivate";
