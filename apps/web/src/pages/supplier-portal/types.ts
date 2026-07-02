export interface Attachment {
  id?: string;
  fileId?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  qualificationType?: string;
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

export interface Supplier {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  categoryAuth: string[];
  qualification: string;
  risk: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  socialCreditCode?: string;
  businessLicenseNo?: string;
  legalRepresentative?: string;
  registeredAddress?: string;
  businessScope?: string;
  serviceRegions?: ServiceRegion[];
  qualificationAttachments?: Attachment[];
  admissionReviews?: AdmissionReview[];
  sealSamples?: SealSample[];
  onboardingProfile?: {
    basic?: {
      companyName?: string;
      socialCreditCode?: string;
      legalRepresentative?: string;
      businessLicenseNo?: string;
      registeredAddress?: string;
      detailAddress?: string;
      businessScope?: string;
    };
    companyMaterials?: { attachments?: Attachment[] };
    submittedAt?: string;
  };
  evaluationScore?: number | null;
}

export interface SupplierPortalProfileForm {
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  socialCreditCode: string;
  businessLicenseNo: string;
  legalRepresentative: string;
  registeredAddress: string;
  businessScope: string;
  category: string;
  region: string;
  storeName: string;
}

export type SupplierPortalTab = "profile" | "qualifications" | "samples" | "reviews";
