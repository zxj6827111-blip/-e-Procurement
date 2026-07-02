export interface SupplierRow {
  id: string;
  name: string;
}

export interface ProjectRow {
  id: string;
  name?: string;
  orgName?: string;
}

export interface PurchaseOrderLine {
  id: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  supplierId: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  expectedDeliveryAt: string;
  receivingLocation: string;
  statusRemark?: string;
  updatedAt?: string;
  lineItems: PurchaseOrderLine[];
}

export interface ReceiptRecord {
  id: string;
  purchaseOrderId: string;
  receiptType: string;
  exceptionType?: string;
  acceptanceResult: string;
  handlingStatus: string;
  summary: string;
  receiptAt: string;
}

export interface WorkbenchPayload {
  project: ProjectRow;
  purchaseOrders: PurchaseOrder[];
  receiptRecords: ReceiptRecord[];
}

export interface ProcurementOrderRow extends PurchaseOrder {
  projectName: string;
  receipts: ReceiptRecord[];
}

export interface MallOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
  lineItems: Array<{ productName: string; quantity: number; unit: string; totalPrice: number }>;
}

export interface ProcurementReceiptForm {
  receiptType: string;
  exceptionType: string;
  summary: string;
  receiptAt: string;
  receivedItems: string;
}

export interface MallShipmentForm {
  carrier: string;
  trackingNo: string;
  contactName: string;
  contactPhone: string;
  estimatedArrivalAt: string;
  shippedQuantity?: number;
}

export interface MallReceiptForm {
  receiptType: string;
  exceptionType: string;
  summary: string;
  receivedItems: string;
}
