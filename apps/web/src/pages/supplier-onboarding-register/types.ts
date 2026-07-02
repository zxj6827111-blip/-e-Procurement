import type { UploadPayload } from "../../api/http";

export type SiteType = "office" | "factory" | "showroom" | "warehouse" | "other";

export interface SupplierAccount {
  username: string;
  initialPassword?: string;
}

export interface RegisterResult {
  supplier: { id: string; name: string; admissionStatus?: string };
  accounts: {
    admin?: SupplierAccount;
    quotation?: SupplierAccount;
  };
  adapterBoundary: string;
  auditLogId?: string;
}

export interface AccountDraft {
  mobile: string;
  captchaCode: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
}

export interface BasicDraft {
  companyName: string;
  socialCreditCode: string;
  businessLicenseNo: string;
  legalRepresentative: string;
  registeredAddress: string;
  detailAddress: string;
  website: string;
  businessScope: string;
  supplierType: string;
  supplierSource: string;
}

export interface ContactDraft {
  name: string;
  position: string;
  email: string;
  mobile: string;
  phone: string;
  fax: string;
}

export interface ProductDraft {
  category: string;
  name: string;
  specification: string;
  monthlyCapacity: string;
  description: string;
  attachments: UploadPayload[];
}

export interface SiteDraft {
  siteType: SiteType;
  name: string;
  address: string;
  description: string;
  attachments: UploadPayload[];
}

export interface CompanyMaterialsDraft {
  enterpriseNature: string;
  taxpayerType: string;
  registeredCapital: string;
  employeeScale: string;
  annualRevenue: string;
  qualitySystem: string;
  qualityDescription: string;
  cooperationCases: string;
  developmentPlan: string;
  sunshineCommitmentAccepted: boolean;
  attachments: UploadPayload[];
}

export interface QuestionnaireDraft {
  cooperationScope: string;
  serviceCapability: string;
  deliveryCoverage: string;
  afterSalesCommitment: string;
  complianceCommitment: string;
  remark: string;
}
