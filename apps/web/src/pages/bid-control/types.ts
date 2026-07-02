export interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  beforeDeadline: boolean;
  status: string;
  externalTradeFlag: boolean;
}

export interface Approval {
  id: string;
  projectId: string;
  targetSupplierId: string;
  viewContent: string;
  allowDownload: boolean;
  approvalStatus: string;
}

export interface SupplierRow {
  id: string;
  name: string;
}

export interface BidProgress {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  submittedAt: string | null;
  lockedAt: string | null;
  withdrawnAt?: string | null;
  versionNo?: number;
}

export interface BidSummary {
  projectId?: string;
  beforeDeadline?: boolean;
  draftCount?: number;
  submittedCount?: number;
  lockedCount?: number;
  withdrawnCount?: number;
  effectiveSubmittedCount?: number;
  totalBidCount?: number;
  totalInvitedSuppliers?: number;
  bidProgress?: BidProgress[];
  bids?: BidProgress[];
}

export interface BidViewLog {
  approvalId?: string;
  actorId?: string;
  supplierId?: string;
  content?: string;
  result?: string;
}

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
