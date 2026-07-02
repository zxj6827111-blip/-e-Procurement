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
}

export interface ScoringDetailValue {
  score: number;
  comment?: string;
}

export interface AttachmentMeta {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface ScoringSheet {
  id: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  supplierId: string;
  supplierName?: string;
  templateId: string;
  templateName?: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  status: string;
  opinion: string;
  versionNo: number;
  scoringItems?: ScoringItem[];
  details?: Record<string, number | (ScoringDetailValue & Partial<ScoringItem>)>;
  materials?: {
    registrationMaterials: AttachmentMeta[];
    supplementMaterials: AttachmentMeta[];
    bidMaterials: AttachmentMeta[];
    bidSummary?: {
      amount: number;
      deliveryDays?: number | null;
      responseSummary?: string;
      serviceCommitment?: string;
      fileName?: string;
    } | null;
  };
}

export interface Assignment {
  id: string;
  projectId: string;
  expertName?: string;
  status: string;
  avoidanceConfirmed: boolean;
  disciplineConfirmed: boolean;
  confidentialityConfirmed: boolean;
}

export interface ScoreInputValue {
  score: number;
  comment: string;
}

export interface ScoreTotals {
  technical: number;
  service: number;
  price: number;
  total: number;
}

export interface AttachmentGroup {
  label: string;
  items: AttachmentMeta[];
}
