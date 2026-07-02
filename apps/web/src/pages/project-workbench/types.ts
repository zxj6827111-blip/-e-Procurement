import type { RouteLocationRaw } from "vue-router";

export interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface ProjectOption {
  id: string;
  code?: string;
  name: string;
  type?: string;
  status?: string;
  displayStatus: string;
  displayName?: string;
  sourceRequestTitle?: string;
  requestDepartment?: string;
  budgetAmount?: number;
  category: string;
  externalTradeFlag?: boolean;
}

export interface WorkbenchResponse {
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
    admissionReviews: Array<{ id: string; reviewType: string; status: string; score?: number; opinion: string }>;
    sealSamples: Array<{ id: string; sampleName: string; specification: string }>;
  }>;
  bids: Array<{
    id: string;
    supplierId: string;
    supplierName?: string;
    status: string;
    amount?: number;
    taxRate?: number | null;
    taxInclusive?: boolean;
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
    comparisonRows?: Array<{
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
      submittedScoreCount?: number;
      rank: number;
      isLowestPrice: boolean;
    }>;
  };
  scoringSheets?: Array<{
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
    versionNo: number;
    submittedAt: string | null;
    lockedAt: string | null;
  }>;
  reviewReports?: Array<{
    id: string;
    reportNo: string;
    status: string;
    generatedAt: string;
    frozenAt: string | null;
    summaryJson?: Record<string, unknown>;
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
  purchaseOrders: Array<{
    id: string;
    orderNo: string;
    supplierId: string;
    status: string;
    totalAmount: number;
    expectedDeliveryAt: string;
    receivingLocation: string;
    statusRemark?: string;
    lineItems: Array<{ id: string; itemName: string; quantity: number; unit: string; receivedQuantity: number }>;
  }>;
  receiptRecords: Array<{
    id: string;
    receiptType: string;
    exceptionType?: string;
    summary: string;
    handlingStatus?: string;
    createdAt: string;
  }>;
  supplierEvaluations: Array<{
    id: string;
    supplierId: string;
    score: number;
    description: string;
    status: string;
    versionNo: number;
    dimensions: Record<string, number>;
  }>;
  settlementMaterials: Array<{
    id: string;
    materialType: string;
    status: string;
    fileId?: string;
    fileName?: string;
    uploadedAt?: string;
    contentType?: string;
    verificationOpinion?: string;
  }>;
  archiveItems: Array<{ id: string; itemName: string; requiredFlag: boolean; collectedFlag: boolean; status: string; sealed?: boolean }>;
  archiveSupplementRequests: Array<{ id: string; archiveItemId: string; approvalStatus: string; reason: string }>;
  auditLogs: Array<{ id: string; action: string; actorId: string; result: string; createdAt: string }>;
}

export type WorkbenchStage = "current" | "done" | "upcoming";

export interface ProjectOperationLink {
  label: string;
  to: RouteLocationRaw;
  meta: string;
  count: string;
  state: WorkbenchStage;
}

export interface NextAction {
  title: string;
  detail: string;
  to?: RouteLocationRaw;
  anchor?: string;
}
