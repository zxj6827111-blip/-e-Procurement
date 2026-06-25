import type { RuntimeDb } from "../runtime/index.js";
import type { MallSettlementInvoice, PurchaseOrder, RoleId, SettlementMaterial, SettlementMaterialType, User } from "../types.js";
import { isFinanceReviewRole, isOrgReaderRole, isSupplierRole, supplierIdMatches, userOrgScope } from "../role-groups.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export interface R7StateShape {
  purchaseOrders: PurchaseOrder[];
  settlementMaterials: SettlementMaterial[];
  mallSettlementInvoices: MallSettlementInvoice[];
}

export interface SettlementBillItem {
  id: string;
  settlementBillId: string;
  purchaseOrderId: string;
  orderLineItemId: string;
  receiptId?: string;
  returnId?: string;
  itemName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  returnedQuantity: number;
  unitPrice: number;
  orderAmount: number;
  receivedAmount: number;
  returnAmount: number;
  payableAmount: number;
}

export interface SettlementBill {
  id: string;
  billNo: string;
  purchaseOrderId: string;
  projectId: string;
  supplierId: string;
  orgId?: string;
  departmentId?: string;
  period: string;
  orderAmount: number;
  receivedAmount: number;
  returnAmount: number;
  serviceFee: number;
  settlementAmount: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "payable" | "paid" | "cancelled";
  createdBy: string;
  createdAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalOpinion?: string;
  items: SettlementBillItem[];
}

export interface R7Invoice {
  id: string;
  settlementBillId: string;
  orderId: string;
  supplierId: string;
  invoiceNo: string;
  invoiceType: string;
  issueDate: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  fileId?: string;
  fileName?: string;
  status: "pending_verification" | "verified" | "rejected";
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationOpinion?: string;
}

export interface ReconciliationLine {
  id: string;
  sourceType: string;
  sourceId: string;
  projectId?: string;
  supplierId?: string;
  orderAmount: number;
  receivedAmount: number;
  returnAmount: number;
  serviceFee: number;
  expectedAmount: number;
  actualAmount: number;
  status: "matched" | "mismatched" | "pending";
  reason?: string;
  handledBy?: string;
  handledAt?: string;
  updatedAt: string;
}

export interface FundLedgerEntry {
  id: string;
  ledgerNo: string;
  settlementBillId: string;
  supplierId: string;
  orgId?: string;
  departmentId?: string;
  amount: number;
  direction: "outbound" | "inbound";
  entryType: "simulated_payment" | "payment_request" | "payment_reversal";
  status: "pending_payment" | "payment_requested" | "paid" | "rejected" | "cancelled";
  createdBy: string;
  createdAt: string;
  operatedBy?: string;
  operatedAt?: string;
  note?: string;
}

export interface R7Overview {
  settlementBills: SettlementBill[];
  settlementMaterials: SettlementMaterial[];
  invoices: R7Invoice[];
  reconciliationLines: ReconciliationLine[];
  fundLedgerEntries: FundLedgerEntry[];
}

function now() {
  return new Date().toISOString();
}

function run(statement: RunnableStatement, values: SqlValue[]) {
  statement.run(...values);
}

function optionalString(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : String(value);
}

function json<T>(value: SqlValue | undefined, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toSettlementStatus(status: string): SettlementBill["status"] {
  if (["draft", "submitted", "approved", "rejected", "payable", "paid", "cancelled"].includes(status)) return status as SettlementBill["status"];
  if (status === "ready") return "draft";
  return "draft";
}

function toMaterialStatus(status: string): SettlementMaterial["status"] {
  if (status === "verified" || status === "rejected") return status;
  return "pending_verification";
}

function toInvoiceStatus(status: string): R7Invoice["status"] {
  if (status === "verified" || status === "rejected") return status;
  return "pending_verification";
}

function toFundStatus(status: string): FundLedgerEntry["status"] {
  if (["pending_payment", "payment_requested", "paid", "rejected", "cancelled"].includes(status)) return status as FundLedgerEntry["status"];
  return "pending_payment";
}

export const settlementMaterialTypes = ["invoice", "delivery_note", "acceptance_record", "other"] as const;
export const fundLedgerStatuses = ["pending_payment", "payment_requested", "paid", "rejected", "cancelled"] as const;

export function isSettlementMaterialType(value: string): value is SettlementMaterialType {
  return (settlementMaterialTypes as readonly string[]).includes(value);
}

export function isFundLedgerStatus(value: string): value is FundLedgerEntry["status"] {
  return (fundLedgerStatuses as readonly string[]).includes(value);
}

export class R7SettlementFinanceRepository {
  constructor(private readonly runtimeDb: RuntimeDb) {}

  syncSettlementFinanceState(state: R7StateShape) {
    const materials = this.listSettlementMaterials();
    const materialById = new Map(state.settlementMaterials.map((item) => [item.id, item]));
    for (const material of materials) {
      const existing = materialById.get(material.id);
      if (existing) Object.assign(existing, material);
      else state.settlementMaterials.push(material);
    }
    const invoices = this.listMallSettlementInvoices();
    const invoiceById = new Map(state.mallSettlementInvoices.map((item) => [item.id, item]));
    for (const invoice of invoices) {
      const existing = invoiceById.get(invoice.id);
      if (existing) Object.assign(existing, invoice);
      else state.mallSettlementInvoices.push(invoice);
    }
  }

  listOverview(user: User, roleId: RoleId): R7Overview {
    return {
      settlementBills: this.filterBillsForUser(this.listSettlementBills(), user, roleId),
      settlementMaterials: this.filterMaterialsForUser(this.listSettlementMaterials(), user, roleId),
      invoices: this.filterInvoicesForUser(this.listInvoices(), user, roleId),
      reconciliationLines: this.filterReconciliationForUser(this.listReconciliationLines(), user, roleId),
      fundLedgerEntries: this.filterFundEntriesForUser(this.listFundLedgerEntries(), user, roleId)
    };
  }

  generateSettlementBill(orderId: string, period: string, actor: User, serviceFeeRate = 0): SettlementBill {
    const order = this.orderRow(orderId);
    if (!order) throw new Error("采购订单不存在。");
    if (!this.isOrderSettleable(orderId, String(order.order_status))) throw new Error("未收货订单不能生成结算单。");
    if (!Number.isFinite(serviceFeeRate) || serviceFeeRate < 0 || serviceFeeRate > 1) throw new Error("服务费率必须在 0 到 1 之间。");
    const existing = this.runtimeDb.db
      .prepare("select id from r2_settlement_bills where purchase_order_id = ? and settlement_period = ? and bill_status not in ('cancelled', 'rejected')")
      .get(orderId, period) as Row | undefined;
    if (existing) throw new Error("同一订单同一账期已经存在有效结算单。");

    const timestamp = now();
    const settlementBillId = `sb-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const billNo = `SB-${period.replace(/[^0-9]/g, "") || timestamp.slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
    const metrics = this.calculateOrderMetrics(orderId, serviceFeeRate);
    if (metrics.settlementAmount <= 0) throw new Error("订单无可结算金额，不能生成结算单。");

    run(
      this.runtimeDb.db.prepare(
        `insert into r2_settlement_bills (
          id, bill_no, purchase_order_id, project_id, supplier_id, org_id, department_id,
          settlement_period, bill_status, order_amount, received_amount, return_amount,
          service_fee, settlement_amount, source_json, created_by, created_at, submitted_by,
          submitted_at, approved_by, approved_at, approval_opinion, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        settlementBillId,
        billNo,
        orderId,
        String(order.project_id),
        String(order.supplier_id),
        optionalString(order.org_id) ?? null,
        optionalString(order.department_id) ?? null,
        period,
        "draft",
        metrics.orderAmount,
        metrics.receivedAmount,
        metrics.returnAmount,
        metrics.serviceFee,
        metrics.settlementAmount,
        JSON.stringify({ orderNo: order.order_no, generatedBy: actor.id, serviceFeeRate }),
        actor.id,
        timestamp,
        null,
        null,
        null,
        null,
        null,
        timestamp
      ]
    );

    const itemStatement = this.runtimeDb.db.prepare(
      `insert into r2_settlement_bill_items (
        id, settlement_bill_id, purchase_order_id, order_line_item_id, receipt_id, return_id,
        item_name, ordered_quantity, received_quantity, returned_quantity, unit_price,
        order_amount, received_amount, return_amount, payable_amount, source_json, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of metrics.items) {
      run(itemStatement, [
        item.id.replace("__bill__", settlementBillId),
        settlementBillId,
        orderId,
        item.orderLineItemId,
        item.receiptId ?? null,
        item.returnId ?? null,
        item.itemName,
        item.orderedQuantity,
        item.receivedQuantity,
        item.returnedQuantity,
        item.unitPrice,
        item.orderAmount,
        item.receivedAmount,
        item.returnAmount,
        item.payableAmount,
        JSON.stringify({ generatedFrom: "r2_order_line_items/r2_receipts/r2_returns" }),
        timestamp
      ]);
    }
    this.upsertReconciliation(settlementBillId);
    return this.getSettlementBill(settlementBillId)!;
  }

  submitSettlementBill(settlementBillId: string, actor: User): SettlementBill {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) throw new Error("结算单不存在。");
    if (actor.roleId === "supplier" && actor.supplierId !== bill.supplierId) throw new Error("供应商只能提交本企业结算申请。");
    if (!["draft", "rejected"].includes(bill.status)) throw new Error("只有草稿或驳回结算单可以提交。");
    const timestamp = now();
    this.runtimeDb.db
      .prepare("update r2_settlement_bills set bill_status = ?, submitted_by = ?, submitted_at = ?, updated_at = ? where id = ?")
      .run("submitted", actor.id, timestamp, timestamp, settlementBillId);
    this.upsertReconciliation(settlementBillId);
    return this.getSettlementBill(settlementBillId)!;
  }

  reviewSettlementBill(settlementBillId: string, actor: User, approved: boolean, opinion?: string): SettlementBill {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) throw new Error("结算单不存在。");
    if (bill.status !== "submitted") throw new Error("结算单需先提交后才能审核。");
    const timestamp = now();
    const status = approved ? "approved" : "rejected";
    this.runtimeDb.db
      .prepare("update r2_settlement_bills set bill_status = ?, approved_by = ?, approved_at = ?, approval_opinion = ?, updated_at = ? where id = ?")
      .run(status, actor.id, timestamp, opinion ?? (approved ? "审核通过" : "审核驳回"), timestamp, settlementBillId);
    this.upsertReconciliation(settlementBillId);
    return this.getSettlementBill(settlementBillId)!;
  }

  upsertSettlementMaterial(args: {
    settlementBillId?: string;
    purchaseOrderId: string;
    materialType: SettlementMaterialType;
    fileId?: string;
    fileName?: string;
    uploadedBy: string;
  }): SettlementMaterial {
    const order = this.orderRow(args.purchaseOrderId);
    if (!order) throw new Error("采购订单不存在。");
    if (args.settlementBillId && !this.getSettlementBill(args.settlementBillId)) throw new Error("结算单不存在。");
    if (!isSettlementMaterialType(args.materialType)) throw new Error("结算资料类型无效。");
    const timestamp = now();
    const material: SettlementMaterial = {
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      purchaseOrderId: args.purchaseOrderId,
      projectId: String(order.project_id),
      supplierId: String(order.supplier_id),
      materialType: args.materialType,
      status: "pending_verification",
      fileId: args.fileId,
      fileName: args.fileName ?? `${args.materialType}.pdf`,
      uploadedBy: args.uploadedBy,
      uploadedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_settlement_materials (
          id, settlement_bill_id, purchase_order_id, project_id, supplier_id, material_type,
          material_status, file_id, file_name, uploaded_by, uploaded_at, verified_by,
          verified_at, verification_opinion, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        material.id,
        args.settlementBillId ?? null,
        material.purchaseOrderId,
        material.projectId,
        material.supplierId,
        material.materialType,
        material.status,
        material.fileId ?? null,
        material.fileName ?? null,
        material.uploadedBy ?? null,
        material.uploadedAt ?? null,
        null,
        null,
        null,
        timestamp
      ]
    );
    return material;
  }

  reviewSettlementMaterial(materialId: string, actor: User, approved: boolean, opinion?: string): SettlementMaterial {
    const material = this.getSettlementMaterial(materialId);
    if (!material) throw new Error("结算资料不存在。");
    const timestamp = now();
    this.runtimeDb.db
      .prepare("update r2_settlement_materials set material_status = ?, verified_by = ?, verified_at = ?, verification_opinion = ?, updated_at = ? where id = ?")
      .run(approved ? "verified" : "rejected", actor.id, timestamp, opinion ?? (approved ? "资料核验通过" : "资料核验驳回"), timestamp, materialId);
    return this.getSettlementMaterial(materialId)!;
  }

  uploadInvoice(args: {
    settlementBillId: string;
    invoiceNo: string;
    invoiceType: string;
    issueDate: string;
    amount: number;
    taxRate: number;
    taxAmount?: number;
    fileId?: string;
    fileName?: string;
    uploadedBy: string;
  }): R7Invoice {
    const bill = this.getSettlementBill(args.settlementBillId);
    if (!bill) throw new Error("结算单不存在。");
    if (args.amount <= 0) throw new Error("发票金额必须大于 0。");
    const taxAmount = roundMoney(args.taxAmount ?? (args.amount * args.taxRate) / (1 + args.taxRate));
    if (taxAmount < 0 || taxAmount > args.amount) throw new Error("税额必须大于等于 0 且不能超过发票金额。");
    const approvedOrPendingInvoiceAmount = this.invoiceTotalForBill(args.settlementBillId);
    if (roundMoney(approvedOrPendingInvoiceAmount + args.amount) > bill.settlementAmount) throw new Error("发票累计金额不得超过结算金额。");
    const timestamp = now();
    const invoice: R7Invoice = {
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      settlementBillId: args.settlementBillId,
      orderId: bill.purchaseOrderId,
      supplierId: bill.supplierId,
      invoiceNo: args.invoiceNo,
      invoiceType: args.invoiceType,
      issueDate: args.issueDate,
      amount: roundMoney(args.amount),
      taxRate: args.taxRate,
      taxAmount,
      fileId: args.fileId,
      fileName: args.fileName,
      status: "pending_verification",
      uploadedBy: args.uploadedBy,
      uploadedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_invoices (
          id, settlement_bill_id, order_id, supplier_id, invoice_no, invoice_type,
          issue_date, invoice_status, file_id, file_name, amount, tax_rate, tax_amount,
          uploaded_by, uploaded_at, verified_by, verified_at, verification_opinion, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        invoice.id,
        invoice.settlementBillId,
        invoice.orderId,
        invoice.supplierId,
        invoice.invoiceNo,
        invoice.invoiceType,
        invoice.issueDate,
        invoice.status,
        invoice.fileId ?? null,
        invoice.fileName ?? null,
        invoice.amount,
        invoice.taxRate,
        invoice.taxAmount,
        invoice.uploadedBy,
        invoice.uploadedAt,
        null,
        null,
        null,
        timestamp
      ]
    );
    this.upsertSettlementMaterial({
      settlementBillId: args.settlementBillId,
      purchaseOrderId: bill.purchaseOrderId,
      materialType: "invoice",
      fileId: invoice.fileId,
      fileName: invoice.fileName ?? invoice.invoiceNo,
      uploadedBy: args.uploadedBy
    });
    this.upsertReconciliation(args.settlementBillId);
    return invoice;
  }

  reviewInvoice(invoiceId: string, actor: User, approved: boolean, opinion?: string): R7Invoice {
    const invoice = this.getInvoice(invoiceId);
    if (!invoice) throw new Error("发票不存在。");
    const timestamp = now();
    this.runtimeDb.db
      .prepare("update r2_invoices set invoice_status = ?, verified_by = ?, verified_at = ?, verification_opinion = ?, updated_at = ? where id = ?")
      .run(approved ? "verified" : "rejected", actor.id, timestamp, opinion ?? (approved ? "发票审核通过" : "发票审核驳回"), timestamp, invoiceId);
    this.upsertReconciliation(invoice.settlementBillId);
    return this.getInvoice(invoiceId)!;
  }

  createFundLedgerEntry(settlementBillId: string, actor: User, status: FundLedgerEntry["status"] = "payment_requested", note?: string): FundLedgerEntry {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) throw new Error("结算单不存在。");
    if (!isFundLedgerStatus(status)) throw new Error("资金台账状态无效。");
    if (!["approved", "payable", "paid"].includes(bill.status)) throw new Error("未审核通过结算不能付款。");
    const invoiceAmount = this.verifiedInvoiceTotalForBill(settlementBillId);
    if (invoiceAmount < bill.settlementAmount) throw new Error("已审核通过发票金额不足，不能全额模拟付款。");
    const paid = this.fundPaidAmount(settlementBillId);
    if (roundMoney(paid + bill.settlementAmount) > bill.settlementAmount) throw new Error("模拟付款金额不能超过结算可付金额。");
    const timestamp = now();
    const entry: FundLedgerEntry = {
      id: `fle-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ledgerNo: `FL-${timestamp.slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`,
      settlementBillId,
      supplierId: bill.supplierId,
      orgId: bill.orgId,
      departmentId: bill.departmentId,
      amount: bill.settlementAmount,
      direction: "outbound",
      entryType: "simulated_payment",
      status,
      createdBy: actor.id,
      createdAt: timestamp,
      operatedBy: actor.id,
      operatedAt: timestamp,
      note: note ?? "R7 模拟付款台账，仅作本系统台账留痕，不代表真实资金清算。"
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_fund_ledger_entries (
          id, ledger_no, settlement_bill_id, supplier_id, org_id, department_id,
          amount, direction, entry_type, ledger_status, created_by, created_at,
          operated_by, operated_at, note, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        entry.id,
        entry.ledgerNo,
        entry.settlementBillId,
        entry.supplierId,
        entry.orgId ?? null,
        entry.departmentId ?? null,
        entry.amount,
        entry.direction,
        entry.entryType,
        entry.status,
        entry.createdBy,
        entry.createdAt,
        entry.operatedBy ?? null,
        entry.operatedAt ?? null,
        entry.note ?? null,
        timestamp
      ]
    );
    this.runtimeDb.db.prepare("update r2_settlement_bills set bill_status = ?, updated_at = ? where id = ?").run(status === "paid" ? "paid" : "payable", timestamp, settlementBillId);
    return entry;
  }

  getSettlementBill(id: string): SettlementBill | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_settlement_bills where id = ?").get(id) as Row | undefined;
    return row ? this.billFromRow(row) : undefined;
  }

  getInvoice(id: string): R7Invoice | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_invoices where id = ?").get(id) as Row | undefined;
    return row ? this.invoiceFromRow(row) : undefined;
  }

  getSettlementMaterial(id: string): SettlementMaterial | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_settlement_materials where id = ?").get(id) as Row | undefined;
    return row ? this.materialFromRow(row) : undefined;
  }

  listSettlementBills(): SettlementBill[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_settlement_bills order by created_at desc, updated_at desc").all() as Row[];
    return rows.map((row) => this.billFromRow(row));
  }

  listSettlementMaterials(): SettlementMaterial[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_settlement_materials order by uploaded_at desc, updated_at desc").all() as Row[];
    return rows.map((row) => this.materialFromRow(row));
  }

  listInvoices(): R7Invoice[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_invoices order by uploaded_at desc, updated_at desc").all() as Row[];
    return rows.filter((row) => optionalString(row.settlement_bill_id)).map((row) => this.invoiceFromRow(row));
  }

  listMallSettlementInvoices(): MallSettlementInvoice[] {
    return this.listInvoices().map((invoice) => ({
      id: invoice.id,
      orderId: invoice.orderId,
      supplierId: invoice.supplierId,
      status: invoice.status,
      fileId: invoice.fileId,
      fileName: invoice.fileName,
      amount: invoice.amount,
      uploadedBy: invoice.uploadedBy,
      uploadedAt: invoice.uploadedAt,
      verifiedBy: invoice.verifiedBy,
      verifiedAt: invoice.verifiedAt
    }));
  }

  listReconciliationLines(): ReconciliationLine[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_amount_reconciliation_lines order by updated_at desc").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      sourceType: String(row.source_type),
      sourceId: String(row.source_id),
      projectId: optionalString(row.project_id),
      supplierId: optionalString(row.supplier_id),
      orderAmount: Number(row.order_amount ?? row.expected_amount ?? 0),
      receivedAmount: Number(row.received_amount ?? row.expected_amount ?? 0),
      returnAmount: Number(row.return_amount ?? 0),
      serviceFee: Number(row.service_fee ?? 0),
      expectedAmount: Number(row.expected_amount),
      actualAmount: Number(row.actual_amount),
      status: String(row.reconciliation_status) as ReconciliationLine["status"],
      reason: optionalString(row.reconciliation_reason),
      handledBy: optionalString(row.handled_by),
      handledAt: optionalString(row.handled_at),
      updatedAt: String(row.updated_at)
    }));
  }

  listFundLedgerEntries(): FundLedgerEntry[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_fund_ledger_entries order by created_at desc").all() as Row[];
    return rows.map((row) => this.fundFromRow(row));
  }

  canReadBill(user: User, roleId: RoleId, bill: SettlementBill) {
    if (isSupplierRole(roleId)) return supplierIdMatches(user, bill.supplierId);
    if (roleId === "admin" || roleId === "expert" || roleId === "system") return false;
    if (isOrgReaderRole(roleId)) return !bill.orgId || userOrgScope(user).includes(bill.orgId);
    return false;
  }

  canReviewMaterial(user: User, roleId: RoleId, material: SettlementMaterial) {
    if (!isFinanceReviewRole(roleId)) return false;
    const bill = this.getSettlementBillByMaterial(material);
    return bill ? this.canReadBill(user, roleId, bill) : this.canReadOrder(user, roleId, material.purchaseOrderId);
  }

  private getSettlementBillByMaterial(material: SettlementMaterial) {
    const materialRow = this.runtimeDb.db.prepare("select settlement_bill_id from r2_settlement_materials where id = ?").get(material.id) as Row | undefined;
    const billId = optionalString(materialRow?.settlement_bill_id);
    if (billId) return this.getSettlementBill(billId);
    const row = this.runtimeDb.db.prepare("select id from r2_settlement_bills where purchase_order_id = ? order by updated_at desc limit 1").get(material.purchaseOrderId) as Row | undefined;
    return row ? this.getSettlementBill(String(row.id)) : undefined;
  }

  private canReadOrder(user: User, roleId: RoleId, orderId: string) {
    if (roleId === "admin" || roleId === "expert" || roleId === "system") return false;
    const order = this.orderRow(orderId);
    if (!order) return false;
    if (isSupplierRole(roleId)) return supplierIdMatches(user, optionalString(order.supplier_id));
    if (isOrgReaderRole(roleId)) {
      const orgId = optionalString(order.org_id);
      return !orgId || userOrgScope(user).includes(orgId);
    }
    return false;
  }

  canReviewInvoice(user: User, roleId: RoleId, invoice: R7Invoice) {
    if (!isFinanceReviewRole(roleId)) return false;
    const bill = this.getSettlementBill(invoice.settlementBillId);
    return bill ? this.canReadBill(user, roleId, bill) : false;
  }

  private calculateOrderMetrics(orderId: string, serviceFeeRate: number) {
    const lineRows = this.runtimeDb.db.prepare("select * from r2_order_line_items where order_id = ? order by id").all(orderId) as Row[];
    const orderAmount = roundMoney(lineRows.reduce((sum, line) => sum + Number(line.total_price), 0));
    const items = lineRows.map((line) => {
      const orderLineItemId = String(line.id);
      const receivedQuantity = Number(line.received_quantity ?? 0);
      const returnedQuantity = this.returnedQuantity(orderId, optionalString(line.product_id), orderLineItemId);
      const unitPrice = Number(line.unit_price);
      const receivedAmount = roundMoney(receivedQuantity * unitPrice);
      const returnAmount = roundMoney(returnedQuantity * unitPrice);
      return {
        id: `__bill__:item:${orderLineItemId}`,
        settlementBillId: "__bill__",
        purchaseOrderId: orderId,
        orderLineItemId,
        receiptId: this.latestReceiptId(orderId),
        returnId: this.latestReturnId(orderId, optionalString(line.product_id), orderLineItemId),
        itemName: String(line.item_name),
        orderedQuantity: Number(line.quantity),
        receivedQuantity,
        returnedQuantity,
        unitPrice,
        orderAmount: roundMoney(Number(line.total_price)),
        receivedAmount,
        returnAmount,
        payableAmount: roundMoney(Math.max(0, receivedAmount - returnAmount))
      };
    });
    const receivedAmount = roundMoney(items.reduce((sum, item) => sum + item.receivedAmount, 0));
    const returnAmount = roundMoney(items.reduce((sum, item) => sum + item.returnAmount, 0));
    const serviceFee = roundMoney(Math.max(0, receivedAmount - returnAmount) * serviceFeeRate);
    const settlementAmount = roundMoney(Math.max(0, receivedAmount - returnAmount - serviceFee));
    return { orderAmount, receivedAmount, returnAmount, serviceFee, settlementAmount, items };
  }

  private upsertReconciliation(settlementBillId: string) {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) return;
    const invoiceAmount = this.invoiceTotalForBill(settlementBillId);
    const status: ReconciliationLine["status"] = invoiceAmount <= bill.settlementAmount ? "matched" : "mismatched";
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_amount_reconciliation_lines (
          id, source_type, source_id, project_id, supplier_id, order_amount, received_amount,
          return_amount, service_fee, expected_amount, actual_amount, reconciliation_status,
          reconciliation_reason, handled_by, handled_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          order_amount = excluded.order_amount,
          received_amount = excluded.received_amount,
          return_amount = excluded.return_amount,
          service_fee = excluded.service_fee,
          expected_amount = excluded.expected_amount,
          actual_amount = excluded.actual_amount,
          reconciliation_status = excluded.reconciliation_status,
          reconciliation_reason = excluded.reconciliation_reason,
          updated_at = excluded.updated_at`
      ),
      [
        `settlement:${settlementBillId}`,
        "settlement_bill",
        settlementBillId,
        bill.projectId,
        bill.supplierId,
        bill.orderAmount,
        bill.receivedAmount,
        bill.returnAmount,
        bill.serviceFee,
        bill.settlementAmount,
        roundMoney(invoiceAmount),
        status,
        status === "matched" ? "结算金额与已上传发票金额未超额" : "发票累计金额超过结算金额",
        null,
        null,
        timestamp
      ]
    );
  }

  private billFromRow(row: Row): SettlementBill {
    const id = String(row.id);
    const itemRows = this.runtimeDb.db.prepare("select * from r2_settlement_bill_items where settlement_bill_id = ? order by id").all(id) as Row[];
    return {
      id,
      billNo: String(row.bill_no ?? row.id),
      purchaseOrderId: String(row.purchase_order_id),
      projectId: String(row.project_id),
      supplierId: String(row.supplier_id),
      orgId: optionalString(row.org_id),
      departmentId: optionalString(row.department_id),
      period: String(row.settlement_period ?? ""),
      orderAmount: Number(row.order_amount ?? row.settlement_amount ?? 0),
      receivedAmount: Number(row.received_amount ?? row.settlement_amount ?? 0),
      returnAmount: Number(row.return_amount ?? 0),
      serviceFee: Number(row.service_fee ?? 0),
      settlementAmount: Number(row.settlement_amount),
      status: toSettlementStatus(String(row.bill_status)),
      createdBy: String(row.created_by ?? "system"),
      createdAt: String(row.created_at ?? row.updated_at),
      submittedBy: optionalString(row.submitted_by),
      submittedAt: optionalString(row.submitted_at),
      approvedBy: optionalString(row.approved_by),
      approvedAt: optionalString(row.approved_at),
      approvalOpinion: optionalString(row.approval_opinion),
      items: itemRows.map((item) => ({
        id: String(item.id),
        settlementBillId: String(item.settlement_bill_id),
        purchaseOrderId: String(item.purchase_order_id),
        orderLineItemId: String(item.order_line_item_id),
        receiptId: optionalString(item.receipt_id),
        returnId: optionalString(item.return_id),
        itemName: String(item.item_name),
        orderedQuantity: Number(item.ordered_quantity),
        receivedQuantity: Number(item.received_quantity),
        returnedQuantity: Number(item.returned_quantity),
        unitPrice: Number(item.unit_price),
        orderAmount: Number(item.order_amount),
        receivedAmount: Number(item.received_amount),
        returnAmount: Number(item.return_amount),
        payableAmount: Number(item.payable_amount)
      }))
    };
  }

  private materialFromRow(row: Row): SettlementMaterial {
    return {
      id: String(row.id),
      purchaseOrderId: String(row.purchase_order_id),
      projectId: String(row.project_id),
      supplierId: String(row.supplier_id),
      materialType: String(row.material_type) as SettlementMaterialType,
      status: toMaterialStatus(String(row.material_status)),
      fileId: optionalString(row.file_id),
      fileName: optionalString(row.file_name),
      uploadedBy: optionalString(row.uploaded_by),
      uploadedAt: optionalString(row.uploaded_at),
      verifiedBy: optionalString(row.verified_by),
      verifiedAt: optionalString(row.verified_at),
      verificationOpinion: optionalString(row.verification_opinion)
    };
  }

  private invoiceFromRow(row: Row): R7Invoice {
    return {
      id: String(row.id),
      settlementBillId: String(row.settlement_bill_id),
      orderId: String(row.order_id),
      supplierId: String(row.supplier_id),
      invoiceNo: String(row.invoice_no ?? row.id),
      invoiceType: String(row.invoice_type ?? "special_vat"),
      issueDate: String(row.issue_date ?? row.uploaded_at ?? now().slice(0, 10)),
      amount: Number(row.amount ?? 0),
      taxRate: Number(row.tax_rate ?? 0),
      taxAmount: Number(row.tax_amount ?? 0),
      fileId: optionalString(row.file_id),
      fileName: optionalString(row.file_name),
      status: toInvoiceStatus(String(row.invoice_status)),
      uploadedBy: String(row.uploaded_by ?? "system"),
      uploadedAt: String(row.uploaded_at ?? row.updated_at),
      verifiedBy: optionalString(row.verified_by),
      verifiedAt: optionalString(row.verified_at),
      verificationOpinion: optionalString(row.verification_opinion)
    };
  }

  private fundFromRow(row: Row): FundLedgerEntry {
    return {
      id: String(row.id),
      ledgerNo: String(row.ledger_no),
      settlementBillId: String(row.settlement_bill_id),
      supplierId: String(row.supplier_id),
      orgId: optionalString(row.org_id),
      departmentId: optionalString(row.department_id),
      amount: Number(row.amount),
      direction: String(row.direction) as FundLedgerEntry["direction"],
      entryType: String(row.entry_type) as FundLedgerEntry["entryType"],
      status: toFundStatus(String(row.ledger_status)),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      operatedBy: optionalString(row.operated_by),
      operatedAt: optionalString(row.operated_at),
      note: optionalString(row.note)
    };
  }

  private orderRow(orderId: string) {
    return this.runtimeDb.db.prepare("select * from r2_purchase_orders where id = ?").get(orderId) as Row | undefined;
  }

  private isOrderSettleable(orderId: string, status: string) {
    if (["received", "closed"].includes(status)) return true;
    const row = this.runtimeDb.db.prepare("select id from r2_receipts where purchase_order_id = ? limit 1").get(orderId) as Row | undefined;
    return Boolean(row);
  }

  private returnedQuantity(orderId: string, productId: string | undefined, orderLineItemId: string) {
    const row = productId
      ? (this.runtimeDb.db
          .prepare("select coalesce(sum(quantity), 0) as total from r2_returns where order_id = ? and (product_id = ? or order_line_item_id = ?) and return_status in ('submitted', 'approved', 'processed')")
          .get(orderId, productId, orderLineItemId) as Row | undefined)
      : (this.runtimeDb.db.prepare("select coalesce(sum(quantity), 0) as total from r2_returns where order_id = ? and order_line_item_id = ? and return_status in ('submitted', 'approved', 'processed')").get(orderId, orderLineItemId) as Row | undefined);
    return Number(row?.total ?? 0);
  }

  private latestReceiptId(orderId: string) {
    return optionalString((this.runtimeDb.db.prepare("select id from r2_receipts where purchase_order_id = ? order by receipt_at desc limit 1").get(orderId) as Row | undefined)?.id);
  }

  private latestReturnId(orderId: string, productId: string | undefined, orderLineItemId: string) {
    const row = productId
      ? (this.runtimeDb.db.prepare("select id from r2_returns where order_id = ? and (product_id = ? or order_line_item_id = ?) order by created_at desc limit 1").get(orderId, productId, orderLineItemId) as Row | undefined)
      : (this.runtimeDb.db.prepare("select id from r2_returns where order_id = ? and order_line_item_id = ? order by created_at desc limit 1").get(orderId, orderLineItemId) as Row | undefined);
    return optionalString(row?.id);
  }

  private invoiceTotalForBill(settlementBillId: string) {
    const row = this.runtimeDb.db
      .prepare("select coalesce(sum(amount), 0) as total from r2_invoices where settlement_bill_id = ? and invoice_status in ('pending_verification', 'verified')")
      .get(settlementBillId) as Row | undefined;
    return Number(row?.total ?? 0);
  }

  private verifiedInvoiceTotalForBill(settlementBillId: string) {
    const row = this.runtimeDb.db
      .prepare("select coalesce(sum(amount), 0) as total from r2_invoices where settlement_bill_id = ? and invoice_status = 'verified'")
      .get(settlementBillId) as Row | undefined;
    return Number(row?.total ?? 0);
  }

  private fundPaidAmount(settlementBillId: string) {
    const row = this.runtimeDb.db
      .prepare("select coalesce(sum(amount), 0) as total from r2_fund_ledger_entries where settlement_bill_id = ? and ledger_status in ('payment_requested', 'paid')")
      .get(settlementBillId) as Row | undefined;
    return Number(row?.total ?? 0);
  }

  private filterBillsForUser(items: SettlementBill[], user: User, roleId: RoleId) {
    return items.filter((item) => this.canReadBill(user, roleId, item));
  }

  private filterMaterialsForUser(items: SettlementMaterial[], user: User, roleId: RoleId) {
    if (isSupplierRole(roleId)) return items.filter((item) => supplierIdMatches(user, item.supplierId));
    if (roleId === "admin" || roleId === "expert" || roleId === "system") return [];
    return items.filter((item) => {
      const bill = this.getSettlementBillByOrder(item.purchaseOrderId);
      return !bill || this.canReadBill(user, roleId, bill);
    });
  }

  private filterInvoicesForUser(items: R7Invoice[], user: User, roleId: RoleId) {
    if (isSupplierRole(roleId)) return items.filter((item) => supplierIdMatches(user, item.supplierId));
    if (roleId === "admin" || roleId === "expert" || roleId === "system") return [];
    return items.filter((item) => {
      const bill = this.getSettlementBill(item.settlementBillId);
      return bill ? this.canReadBill(user, roleId, bill) : false;
    });
  }

  private filterReconciliationForUser(items: ReconciliationLine[], user: User, roleId: RoleId) {
    if (isSupplierRole(roleId)) return items.filter((item) => supplierIdMatches(user, item.supplierId));
    if (roleId === "admin" || roleId === "expert" || roleId === "system") return [];
    return items.filter((item) => {
      const bill = this.getSettlementBill(String(item.sourceId));
      return bill ? this.canReadBill(user, roleId, bill) : false;
    });
  }

  private filterFundEntriesForUser(items: FundLedgerEntry[], user: User, roleId: RoleId) {
    if (isSupplierRole(roleId)) return items.filter((item) => supplierIdMatches(user, item.supplierId));
    if (roleId === "admin" || roleId === "expert" || roleId === "system") return [];
    return items.filter((item) => {
      const bill = this.getSettlementBill(item.settlementBillId);
      return bill ? this.canReadBill(user, roleId, bill) : false;
    });
  }

  private getSettlementBillByOrder(orderId: string) {
    const row = this.runtimeDb.db.prepare("select id from r2_settlement_bills where purchase_order_id = ? order by updated_at desc limit 1").get(orderId) as Row | undefined;
    return row ? this.getSettlementBill(String(row.id)) : undefined;
  }
}
