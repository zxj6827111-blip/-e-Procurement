export interface Announcement {
  id: string;
  projectId: string;
  title: string;
  status: string;
  registrationDeadlineAt: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Registration {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  submittedAt: string;
  qualifiedAt?: string;
  qualificationReason?: string;
  materialMetadata?: Attachment[];
  supplementMaterialMetadata?: Attachment[];
}

export interface SupplierCategoryAuthorization {
  category: string;
  status: string;
  expiresAt?: string;
}

export interface SupplierProfile {
  id: string;
  name?: string;
  admissionStatus?: string;
  status: string;
  restrictionReason?: string;
  categoryAuth?: string[];
  categoryAuthorizations?: SupplierCategoryAuthorization[];
}

export interface ProjectRow {
  id: string;
  code?: string;
  name?: string;
  category?: string;
}

export interface SupplierRow {
  id: string;
  name: string;
}

export type RegistrationStatus = "submitted" | "qualified" | "rejected";
export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
