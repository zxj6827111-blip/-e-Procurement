import type { UploadedFileMetadata } from "../../api/http";

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
export type ExternalMaterialKind = "announcement" | "result";

export interface ExternalTradeProject {
  id: string;
  code: string;
  name: string;
  orgId?: string;
  orgName?: string;
  category?: string;
  displayStatus: string;
  status?: string;
  externalTradeFlag?: boolean;
}

export interface ExternalTradeRecord {
  id?: string;
  projectId?: string;
  externalPlatformName?: string;
  externalProjectCode?: string;
  internalApprovalStatus?: "draft" | "recorded";
  internalApprovalOpinion?: string;
  announcementMaterialMetadata?: UploadedFileMetadata[];
  resultMaterialMetadata?: UploadedFileMetadata[];
  resultRecordStatus?: "draft" | "recorded";
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExternalTradeListItem {
  project: ExternalTradeProject;
  record: ExternalTradeRecord | null;
}

export interface ExternalTradeDetail {
  project?: ExternalTradeProject;
  record?: ExternalTradeRecord;
}

export interface ExternalTradeFormState {
  projectName: string;
  orgId: string;
  orgName: string;
  category: string;
  internalApprovalOpinion: string;
  resultRecordNote: string;
}

export interface BlockAction {
  value: string;
  label: string;
}

export interface BlockResult {
  allowed?: boolean;
  projectId?: string;
  externalTradeFlag?: boolean;
}
