export interface SupplierRow {
  id: string;
  name: string;
}

export interface SettlementBill {
  id: string;
  billNo: string;
  purchaseOrderId: string;
  purchaseOrderNo?: string;
  projectId: string;
  supplierId: string;
  period: string;
  orderAmount: number;
  receivedAmount: number;
  returnAmount: number;
  serviceFee: number;
  settlementAmount: number;
  status: string;
  createdAt: string;
}

export interface SettlementMaterial {
  id: string;
  purchaseOrderId: string;
  projectId: string;
  supplierId: string;
  materialType: string;
  status: string;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  verificationOpinion?: string;
}

export interface Invoice {
  id: string;
  settlementBillId?: string;
  orderId?: string;
  supplierId: string;
  invoiceNo?: string;
  fileName?: string;
  amount: number;
  taxAmount?: number;
  status: string;
  uploadedAt: string;
  verificationOpinion?: string;
}

export interface ReconciliationLine {
  id: string;
  sourceType: string;
  sourceId: string;
  supplierId?: string;
  expectedAmount: number;
  actualAmount: number;
  status: string;
  reason?: string;
  updatedAt: string;
}

export interface FundLedgerEntry {
  id: string;
  settlementBillId: string;
  amount: number;
  status: string;
}

export interface Overview {
  settlementBills: SettlementBill[];
  settlementMaterials: SettlementMaterial[];
  invoices: Invoice[];
  reconciliationLines: ReconciliationLine[];
  fundLedgerEntries: FundLedgerEntry[];
}

export interface SettlementOperationForm {
  billApproveOpinion: string;
  billRejectOpinion: string;
  materialType: string;
  materialFileName: string;
  materialApproveOpinion: string;
  materialRejectOpinion: string;
  invoiceApproveOpinion: string;
  invoiceRejectOpinion: string;
}
