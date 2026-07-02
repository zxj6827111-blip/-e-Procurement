import type { RouteLocationRaw } from "vue-router";

export interface Attachment {
  id: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface SourcingWorkbench {
  project: {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    displayStatus: string;
    beforeDeadline?: boolean;
    category: string;
    buyer: string;
    quoteDeadlineAt: string | null;
    qualificationRequirements?: string[];
    quoteRequirements?: string[];
    clarificationRecords?: Array<{ id: string; question: string; answer: string }>;
    externalTradeFlag?: boolean;
  };
  procurementDocuments?: Array<{ id: string; status: string }>;
  announcements?: Array<{ id: string; title?: string; status: string; publishedAt?: string | null }>;
  invitations?: Array<{ id: string; supplierId?: string; status: string; notifiedAt?: string | null }>;
  registrations?: Array<{
    id: string;
    supplierId: string;
    announcementId: string;
    status: string;
    submittedAt?: string;
    qualifiedAt?: string;
    qualificationReason?: string;
    materialMetadata?: Attachment[];
    supplementMaterialMetadata?: Attachment[];
  }>;
  procurementRequest: {
    title: string;
    requestDepartment?: string;
    requesterName?: string;
    budgetLabel: string;
    budgetAmount?: number;
    expectedArrivalAt?: string;
    receivingLocation?: string;
    attachments?: Attachment[];
    lineItems?: Array<{ id: string; itemName: string; specification: string; quantity: number; unit: string; estimatedUnitPrice?: number }>;
  } | null;
  suppliers: Array<{
    id: string;
    name: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    admissionStatus?: string;
    qualification: string;
    risk: string;
    evaluationScore: number | null;
    serviceRegions: Array<{ id: string; region: string; storeName: string; category: string; status: string }>;
    sealSamples: Array<{ id: string; sampleName: string; specification: string }>;
  }>;
  bids: Array<{
    id: string;
    supplierId: string;
    supplierName?: string;
    status: string;
    amount?: number;
    taxRate?: number | null;
    submittedAt?: string | null;
    lockedAt?: string | null;
    deliveryDays?: number;
    responseSummary?: string;
    serviceCommitment?: string;
    fileName?: string;
    lineItems?: Array<{ id: string; itemName: string; quantity: number; unit: string; unitPrice: number; taxRate: number; totalPrice: number; deliveryDays: number }>;
    responseFileMetadata?: Attachment[];
  }>;
  comparisonReport: null | {
    id?: string;
    reportNo: string;
    status?: string;
    recommendedSupplierId: string;
    awardReason: string;
    nonLowestPriceReason?: string;
    generatedAt?: string;
    frozenAt?: string | null;
    comparisonRows?: ComparisonRow[];
  };
  scoringSheets?: ScoringSheet[];
  reviewReports?: Array<{
    id: string;
    reportNo: string;
    status: string;
    generatedAt: string;
    frozenAt: string | null;
  }>;
  awardApprovals: Array<{
    id: string;
    recommendedSupplierId?: string;
    selectedSupplierId: string;
    approvalStatus: string;
    isLowestPrice?: boolean;
    nonLowestPriceReason?: string;
    createdAt?: string;
    submittedAt?: string | null;
    approvedAt?: string | null;
  }>;
  pricingReports?: Array<{
    id: string;
    reportNo: string;
    selectedSupplierId: string;
    status: string;
    items: Array<{ id: string; itemName: string; specification?: string; purchasePrice: number; salePrice: number; unit: string; effectiveFrom: string; effectiveTo?: string }>;
    createdAt: string;
    approvedAt?: string | null;
  }>;
  resultNotifications?: Array<{ id: string; supplierId?: string; status: string; contentSummary: string; sentAt: string | null }>;
}

export type StepState = "current" | "done" | "upcoming";

export interface SourcingStep {
  label: string;
  description: string;
  count: string;
  state: StepState;
  to: RouteLocationRaw;
}

export interface SupplierEngagementRow {
  supplierId: string;
  supplierName: string;
  contact: string;
  invitationStatus: string;
  registrationStatus: string;
  registrationSubmittedAt?: string;
  registrationQualifiedAt?: string;
  bidStatus: string;
  bidSubmittedAt?: string | null;
  bidAmount?: number;
  scoreAverage: number | null;
  scoreCount: number;
}

export interface QuoteRow {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  totalPrice: number;
  deliveryDays: number;
  bidId: string;
  supplier: string;
  bidStatus: string;
  serviceCommitment: string;
}

export interface ScoringSheet {
  id: string;
  expertId: string;
  expertName?: string;
  supplierId: string;
  supplierName?: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  status: string;
  opinion: string;
  submittedAt: string | null;
  lockedAt: string | null;
}

export interface ScoringSummary {
  assigned: number;
  submitted: number;
  average: number | null;
}

export interface ReviewReportSummary {
  id: string;
  reportNo: string;
  status: string;
  generatedAt: string;
  frozenAt: string | null;
}

export interface ComparisonRow {
  supplierId: string;
  supplierName: string;
  amount: number;
  deliveryDays: number;
  serviceCommitment?: string;
  technicalScore?: number;
  serviceScore?: number;
  priceScore?: number;
  expertTotalScore?: number;
  finalScore?: number;
  rank: number;
  isLowestPrice: boolean;
}

export interface AwardApprovalSummary {
  id: string;
  recommendedSupplierId?: string;
  selectedSupplierId: string;
  approvalStatus: string;
  isLowestPrice?: boolean;
  nonLowestPriceReason?: string;
  createdAt?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

export interface PricingReportSummary {
  id: string;
  reportNo: string;
  selectedSupplierId: string;
  status: string;
  items: Array<{ id: string; itemName: string; specification?: string; purchasePrice: number; salePrice: number; unit: string; effectiveFrom: string; effectiveTo?: string }>;
  createdAt: string;
  approvedAt?: string | null;
}

export interface BidAttachmentRow {
  id: string;
  supplier: string;
  status: string;
  amount?: number;
  deliveryDays?: number;
  responseFileMetadata?: Attachment[];
  fileName?: string;
}

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
