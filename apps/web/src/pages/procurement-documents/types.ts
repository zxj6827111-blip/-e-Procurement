export interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  externalTradeFlag: boolean;
}

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: string;
  reviewStatus: string;
  contentSummary: string;
  lockedAt: string | null;
  attachmentMetadata?: Attachment[];
}

export type ActionResult = { auditLogId?: string; procurementDocument?: ProcurementDocument };
export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
