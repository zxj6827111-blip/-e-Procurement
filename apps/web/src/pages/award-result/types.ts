export interface AwardApproval {
  id: string;
  recommendedSupplierId?: string;
  selectedSupplierId: string;
  approvalStatus: string;
  isLowestPrice: boolean;
  nonLowestPriceReason?: string;
}

export interface AwardRecommendation {
  recommendedSupplierId?: string;
  recommendedSupplierName?: string;
  isLowestPrice?: boolean;
  sourceReportId?: string | null;
  candidateSupplierIds?: string[];
  note?: string;
}

export interface ResultNotification {
  id: string;
  awardApprovalId?: string;
  supplierId?: string;
  scope?: "supplier_self" | "internal_publicity";
  status: string;
  visibilityConfig: string;
  contentSummary: string;
  sentAt: string | null;
  selected?: boolean;
  winnerName?: string;
}

export interface PublicityRecord {
  id: string;
  awardApprovalId?: string;
  status: string;
  contentSummary: string;
  publishedAt: string | null;
}

export interface PricingReport {
  id: string;
  reportNo: string;
  awardApprovalId?: string;
  selectedSupplierId: string;
  status: string;
  items: Array<{
    id: string;
    itemName: string;
    specification?: string;
    purchasePrice: number;
    salePrice: number;
    unit: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }>;
  createdAt: string;
  approvedAt?: string | null;
}

export interface ContractLedger {
  id: string;
  projectId: string;
  supplierId: string;
  contractNo: string;
  amount: number;
  status: string;
  updatedAt: string;
}

export interface MallProduct {
  id: string;
  name: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  sourceProjectId?: string;
  sourcePricingReportId?: string;
  sourcePricingReportItemId?: string;
  activePrice?: { price?: number; salePrice?: number };
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface AwardProjectOption {
  id: string;
  code: string;
  name: string;
  externalTradeFlag?: boolean;
}

export interface AwardOperationForm {
  notificationScope: string;
  visibilityConfig: string;
  publicitySummary: string;
}

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
