export type StatusTone = "default" | "primary" | "success" | "warning" | "error";

export interface ArchiveItem {
  id: string;
  projectId: string;
  itemName: string;
  requiredFlag: boolean;
  collectedFlag: boolean;
  sealed: boolean;
  status: string;
}

export interface SupplementRequest {
  id: string;
  projectId: string;
  archiveItemId: string;
  reason: string;
  approvalStatus: string;
}

export interface AuditLog {
  id: string;
  action: string;
  objectType: string;
  result: string;
  createdAt: string;
}
