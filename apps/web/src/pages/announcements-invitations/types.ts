export interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  category?: string;
  status?: string;
  externalTradeFlag: boolean;
}

export interface ProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: string;
  reviewStatus: string;
  lockedAt?: string | null;
}

export interface Announcement {
  id: string;
  projectId: string;
  documentId: string;
  title: string;
  procurementMethod: string;
  scope: string;
  status: "draft" | "published" | "closed" | string;
  registrationDeadlineAt: string;
  quoteDeadlineAt: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface SupplierInvitation {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  notificationStatus: string;
  notifiedAt?: string | null;
  createdAt?: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  status?: string;
  admissionStatus?: string;
  categoryAuth?: string[];
  categoryAuthorizations?: Array<{
    category: string;
    status: string;
    expiresAt?: string;
  }>;
}

export interface ActionResult {
  auditLogId?: string;
  announcement?: Announcement;
}

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
