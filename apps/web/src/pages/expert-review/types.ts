export interface Expert {
  id: string;
  name: string;
  category: string;
  status: string;
  accountUserIds?: string[];
  ownerOrgId?: string;
  branchOrgId?: string;
  reviewScopes?: string[];
  supplierAssessmentScopes?: string[];
  sharedAccount?: boolean;
  active?: boolean;
  maintenanceLog?: string;
}

export interface Assignment {
  id: string;
  expertId: string;
  expertName?: string;
  method: string;
  status: string;
  avoidanceConfirmed: boolean;
  disciplineConfirmed: boolean;
  confidentialityConfirmed: boolean;
}

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
  externalTradeFlag?: boolean;
  displayStatus?: string;
  procurementMethod?: string;
  quoteDeadlineAt?: string;
  budgetAmount?: number;
}

export type ScoringCategory = "technical" | "service" | "price";
export type StatusTone = "default" | "primary" | "success" | "warning" | "error";

export interface ScoringItem {
  id: string;
  category: ScoringCategory;
  categoryLabel: string;
  label: string;
  reference: string;
  evidence: string;
  maxScore: number;
  score?: number;
  comment?: string;
}

export interface ReviewSheetRecord {
  sheetId: string;
  expertName: string;
  supplierId: string;
  supplierName: string;
  templateName: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  opinion: string;
  status: string;
  versionNo: number;
  submittedAt: string | null;
  lockedAt: string | null;
  details: ScoringItem[];
  materials: {
    registrationMaterials: { id: string; fileName: string }[];
    supplementMaterials: { id: string; fileName: string }[];
    bidMaterials: { id: string; fileName: string }[];
    bidSummary?: { amount: number; deliveryDays?: number | null; responseSummary?: string; serviceCommitment?: string; fileName?: string } | null;
  };
}

export interface SupplierScoreRecord {
  supplierId: string;
  supplierName: string;
  submittedCount: number;
  technical: number;
  service: number;
  price: number;
  total: number;
  rank: number;
  sheets: ReviewSheetRecord[];
}

export interface ReviewRecordDetail {
  project: ProjectOption;
  generatedAt: string;
  template: { id: string; templateName: string; versionNo: number } | null;
  scoringItems: ScoringItem[];
  summary: {
    submittedExpertCount: number;
    totalExpertCount: number;
    allSubmitted: boolean;
    anomalies?: { scoreSpread?: number; priceWarning?: boolean; nonLowestPriceRecommended?: boolean };
    recommendation?: { supplierId: string; isLowestPrice: boolean; note: string } | null;
  };
  supplierRecords: SupplierScoreRecord[];
  sheetRecords: ReviewSheetRecord[];
  reports: ReviewReport[];
}

export interface ReviewReport {
  id: string;
  reportNo: string;
  status: string;
  generatedAt: string;
  frozenAt: string | null;
  createdBy: string;
}
