export interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  beforeDeadline: boolean;
  externalTradeFlag: boolean;
}

export interface Bid {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName?: string;
  amount?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  taxNote?: string;
  deliveryDays?: number;
  responseSummary?: string;
  serviceCommitment?: string;
  status: string;
  submittedAt: string | null;
  lockedAt: string | null;
  versionNo?: number;
}

export interface Registration {
  projectId: string;
  status: string;
}

export interface SupplierRow {
  id: string;
  name: string;
}

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
