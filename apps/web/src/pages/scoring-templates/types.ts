export type ScoringCategory = "technical" | "service" | "price";
export type TemplateStatus = "draft" | "enabled" | "disabled";
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

export interface ScoringTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  versionNo: number;
  status: TemplateStatus;
  items: ScoringItem[];
  totalScore: number;
  inUse: boolean;
  sheetCount: number;
}

export interface TemplateFormState {
  templateCode: string;
  templateName: string;
  status: TemplateStatus;
  items: ScoringItem[];
}

export interface TemplateMutationResponse {
  scoringTemplate: ScoringTemplate;
  auditLogId?: string;
}
