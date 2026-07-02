export interface Attachment {
  id: string;
  fileName?: string;
  contentType?: string;
  uploadedAt?: string;
}

export interface ProjectWorkbenchFulfillment {
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
    displayStatus: string;
    quoteDeadlineAt?: string | null;
  };
  procurementRequest: {
    expectedArrivalAt?: string;
    receivingLocation?: string;
  } | null;
  suppliers: Array<{ id: string; name: string }>;
  purchaseOrders: PurchaseOrder[];
  receiptRecords: ReceiptRecord[];
  settlementMaterials: SettlementMaterial[];
  supplierEvaluations: SupplierEvaluation[];
  archiveItems: ArchiveItem[];
  archiveSupplementRequests: ArchiveSupplementRequest[];
  auditLogs: AuditLogRow[];
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  expectedDeliveryAt: string;
  receivingLocation: string;
  statusRemark?: string;
  lineItems: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  receivedQuantity: number;
}

export interface ReceiptRecord {
  id: string;
  purchaseOrderId: string;
  receiptType: string;
  exceptionType?: string;
  summary: string;
  handlingStatus?: string;
  handlingNote?: string;
  handledAt?: string;
  receiptAt?: string;
  createdAt: string;
  receivedItems?: ReceiptItem[];
}

export interface ReceiptItem {
  itemName: string;
  receivedQuantity: number;
  unit: string;
  accepted: boolean;
}

export interface SettlementMaterial {
  id: string;
  materialType: string;
  status: string;
  fileId?: string;
  fileName?: string;
  uploadedAt?: string;
  contentType?: string;
  verificationOpinion?: string;
}

export interface SupplierEvaluation {
  id: string;
  supplierId: string;
  score: number;
  description: string;
  status: string;
  versionNo: number;
  dimensions: Record<string, number>;
}

export interface ArchiveItem {
  id: string;
  itemName: string;
  requiredFlag: boolean;
  collectedFlag: boolean;
  status: string;
  sealed?: boolean;
}

export interface ArchiveSupplementRequest {
  id: string;
  archiveItemId: string;
  approvalStatus: string;
  reason: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  actorId: string;
  result: string;
  createdAt: string;
}

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";
