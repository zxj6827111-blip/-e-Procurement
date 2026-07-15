import type { RuntimeDb } from "../runtime/index.js";
import type { MallSettlementInvoice, PurchaseOrder, PurchaseOrderLineItem, RoleId, SettlementMaterial, SettlementMaterialType, User } from "../types.js";
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
  purchaseOrderNo?: string;
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

  ensureBusinessSettlementSamples() {
    this.ensureSupplierSettlementScenario();
    const order = this.orderRow("po-food-1");
    if (!order) return;
    const hasBill = this.runtimeDb.db.prepare("select id from r2_settlement_bills where id = ?").get("sb-food-202607") as Row | undefined;
    if (hasBill) {
      this.ensureBusinessSettlementMaterials("sb-food-202607");
      this.ensureBusinessSettlementInvoice("sb-food-202607");
      this.ensureBusinessFundLedger("sb-food-202607");
      return;
    }

    const period = "2026-07";
    const timestamp = "2026-07-02T10:00:00.000Z";
    const metrics = this.calculateOrderMetrics("po-food-1", 0);
    if (metrics.settlementAmount <= 0) return;

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
        "sb-food-202607",
        "JS-202607-0003",
        "po-food-1",
        String(order.project_id),
        String(order.supplier_id),
        optionalString(order.org_id) ?? "org-hotel",
        optionalString(order.department_id) ?? null,
        period,
        "approved",
        metrics.orderAmount,
        metrics.receivedAmount,
        metrics.returnAmount,
        metrics.serviceFee,
        metrics.settlementAmount,
        JSON.stringify({ orderNo: order.order_no, source: "business_seed" }),
        "u9",
        timestamp,
        "u11",
        "2026-07-02T10:20:00.000Z",
        "u9",
        "2026-07-02T11:10:00.000Z",
        "资料齐全，金额与验收记录一致",
        "2026-07-02T11:10:00.000Z"
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
        item.id.replace("__bill__", "sb-food-202607"),
        "sb-food-202607",
        "po-food-1",
        item.orderLineItemId,
        item.receiptId ?? "rrc-food-1",
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
        JSON.stringify({ generatedFrom: "seeded received order" }),
        "2026-07-02T10:00:00.000Z"
      ]);
    }

    this.ensureBusinessSettlementMaterials("sb-food-202607");
    this.ensureBusinessSettlementInvoice("sb-food-202607");
    this.ensureBusinessFundLedger("sb-food-202607");
    this.upsertReconciliation("sb-food-202607");
  }

  private ensureSupplierSettlementScenario() {
    const timestamp = "2026-07-03T10:00:00.000Z";
    const order = this.orderRow("po-linen-202607");
    if (!order) {
      run(
        this.runtimeDb.db.prepare(
          `insert into r2_purchase_orders (
            id, project_id, supplier_id, contract_id, source_request_id, award_approval_id,
            selected_bid_id, order_no, order_status, payment_status, buyer_id, org_id,
            department_id, total_amount, expected_delivery_at, receiving_location,
            invoice_title, confirmed_at, created_by, created_at, updated_at, synced_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ),
        [
          "po-linen-202607",
          "p-award",
          "sup-1",
          "cl-award-1",
          "req-award",
          "aa-award-1",
          "bid-award-1",
          "PO-2026-0002",
          "received",
          "payment_reserved",
          "u8",
          "org-hotel",
          null,
          278400,
          "2026-07-05",
          "上海滨江华礼酒店客房仓",
          "华礼酒店集团",
          "2026-06-28T14:00:00.000Z",
          "u8",
          "2026-06-28T13:20:00.000Z",
          "2026-07-03T09:30:00.000Z",
          timestamp
        ]
      );
    }

    const lineStatement = this.runtimeDb.db.prepare(
      `insert into r2_order_line_items (
        id, order_id, product_id, sku_id, item_name, specification, quantity, unit,
        unit_price, tax_rate, total_price, received_quantity, price_source_type,
        price_source_id, price_source_item_id, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        received_quantity = excluded.received_quantity,
        total_price = excluded.total_price,
        updated_at = excluded.updated_at`
    );
    const lines: Array<[string, string, string, number, string, number, number]> = [
      ["po-linen-202607-line-1", "高支纱床品套装", "80s 纯棉床单/被套组合", 800, "套", 198, 158400],
      ["po-linen-202607-line-2", "酒店浴巾", "650g 白色长绒棉", 2000, "条", 60, 120000]
    ];
    for (const [id, itemName, specification, quantity, unit, unitPrice, totalPrice] of lines) {
      run(lineStatement, [
        id,
        "po-linen-202607",
        null,
        null,
        itemName,
        specification,
        quantity,
        unit,
        unitPrice,
        0.13,
        totalPrice,
        quantity,
        "supplier_quotation",
        "bid-award-1",
        null,
        timestamp
      ]);
    }

    const hasReceipt = this.runtimeDb.db.prepare("select id from r2_receipts where id = ?").get("rrc-linen-202607") as Row | undefined;
    if (!hasReceipt) {
      run(
        this.runtimeDb.db.prepare(
          `insert into r2_receipts (
            id, purchase_order_id, project_id, supplier_id, receipt_type, exception_type,
            acceptance_result, handling_status, summary, attachment_file_ids_json, receipt_at,
            operator_id, created_by, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ),
        [
          "rrc-linen-202607",
          "po-linen-202607",
          "p-award",
          "sup-1",
          "full",
          null,
          "accepted",
          "none",
          "床品与浴巾已按订单数量完成验收。",
          JSON.stringify([]),
          "2026-07-03T09:30:00.000Z",
          "u8",
          "u8",
          "2026-07-03T09:30:00.000Z",
          timestamp
        ]
      );
      const receiptLineStatement = this.runtimeDb.db.prepare(
        `insert into r2_receipt_line_items (
          id, receipt_id, order_line_item_id, item_name, received_quantity, unit,
          accepted_flag, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const [id, itemName, , quantity, unit] of lines) {
        run(receiptLineStatement, [`rrc-linen-202607:${id}`, "rrc-linen-202607", id, itemName, quantity, unit, 1, timestamp]);
      }
    }

    const hasBill = this.runtimeDb.db.prepare("select id from r2_settlement_bills where id = ?").get("sb-linen-202607") as Row | undefined;
    if (!hasBill) {
      const currentOrder = this.orderRow("po-linen-202607");
      if (!currentOrder) return;
      const metrics = this.calculateOrderMetrics("po-linen-202607", 0);
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
          "sb-linen-202607",
          "JS-202607-0002",
          "po-linen-202607",
          "p-award",
          "sup-1",
          "org-hotel",
          null,
          "2026-07",
          "submitted",
          metrics.orderAmount,
          metrics.receivedAmount,
          metrics.returnAmount,
          metrics.serviceFee,
          metrics.settlementAmount,
          JSON.stringify({ orderNo: currentOrder.order_no, source: "business_seed" }),
          "u11",
          "2026-07-03T10:10:00.000Z",
          "u11",
          "2026-07-03T10:20:00.000Z",
          null,
          null,
          null,
          "2026-07-03T10:20:00.000Z"
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
          item.id.replace("__bill__", "sb-linen-202607"),
          "sb-linen-202607",
          "po-linen-202607",
          item.orderLineItemId,
          item.receiptId ?? "rrc-linen-202607",
          null,
          item.itemName,
          item.orderedQuantity,
          item.receivedQuantity,
          item.returnedQuantity,
          item.unitPrice,
          item.orderAmount,
          item.receivedAmount,
          item.returnAmount,
          item.payableAmount,
          JSON.stringify({ generatedFrom: "seeded supplier received order" }),
          "2026-07-03T10:10:00.000Z"
        ]);
      }
    }

    this.ensureSupplierSettlementMaterials("sb-linen-202607");
    this.ensureSupplierSettlementInvoice("sb-linen-202607");
    this.upsertReconciliation("sb-linen-202607");
  }

  syncSettlementFinanceState(state: R7StateShape) {
    const purchaseOrders = this.listPurchaseOrdersForSync();
    const purchaseOrderById = new Map(state.purchaseOrders.map((item) => [item.id, item]));
    for (const order of purchaseOrders) {
      const existing = purchaseOrderById.get(order.id);
      if (existing) Object.assign(existing, order);
      else state.purchaseOrders.push(order);
    }

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

  private ensureBusinessSettlementMaterials(settlementBillId: string) {
    const materialRows: Array<[string, SettlementMaterialType, string, string, string, string | null, string | null]> = [
      ["sm-food-invoice-final", "invoice", "verified", "inv-food-202607-file", "鲜达食材增值税发票.pdf", "u9", "发票抬头、金额与结算单一致"],
      ["sm-food-delivery-final", "delivery_note", "verified", "sm-food-delivery-file", "鲜达食材送货单.pdf", "u2", "送货单齐全"],
      ["sm-food-acceptance-final", "acceptance_record", "verified", "sm-food-acceptance-file", "食材验收记录.pdf", "u2", "异常数量已在验收记录中说明"]
    ];
    const timestamp = "2026-07-02T09:40:00.000Z";
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_settlement_materials (
        id, settlement_bill_id, purchase_order_id, project_id, supplier_id, material_type,
        material_status, file_id, file_name, uploaded_by, uploaded_at, verified_by,
        verified_at, verification_opinion, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        settlement_bill_id = excluded.settlement_bill_id,
        material_status = excluded.material_status,
        file_id = excluded.file_id,
        file_name = excluded.file_name,
        verified_by = excluded.verified_by,
        verified_at = excluded.verified_at,
        verification_opinion = excluded.verification_opinion,
        updated_at = excluded.updated_at`
    );
    for (const [id, type, status, fileId, fileName, verifiedBy, opinion] of materialRows) {
      run(statement, [
        id,
        settlementBillId,
        "po-food-1",
        "p-food",
        "sup-3",
        type,
        status,
        fileId,
        fileName,
        "u11",
        timestamp,
        verifiedBy,
        "2026-07-02T11:00:00.000Z",
        opinion,
        "2026-07-02T11:00:00.000Z"
      ]);
    }
  }

  private ensureSupplierSettlementMaterials(settlementBillId: string) {
    const materialRows: Array<[string, SettlementMaterialType, string, string, string, string | null, string | null]> = [
      ["sm-linen-invoice-final", "invoice", "pending_verification", "inv-linen-202607-file", "华礼布草增值税发票.pdf", null, null],
      ["sm-linen-delivery-final", "delivery_note", "verified", "sm-linen-delivery-file", "华礼布草送货单.pdf", "u8", "送货单数量与验收记录一致"],
      ["sm-linen-acceptance-final", "acceptance_record", "verified", "sm-linen-acceptance-file", "华礼布草验收单.pdf", "u8", "验收单已签收"]
    ];
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_settlement_materials (
        id, settlement_bill_id, purchase_order_id, project_id, supplier_id, material_type,
        material_status, file_id, file_name, uploaded_by, uploaded_at, verified_by,
        verified_at, verification_opinion, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        settlement_bill_id = excluded.settlement_bill_id,
        material_status = excluded.material_status,
        file_id = excluded.file_id,
        file_name = excluded.file_name,
        verified_by = excluded.verified_by,
        verified_at = excluded.verified_at,
        verification_opinion = excluded.verification_opinion,
        updated_at = excluded.updated_at`
    );
    for (const [id, type, status, fileId, fileName, verifiedBy, opinion] of materialRows) {
      run(statement, [
        id,
        settlementBillId,
        "po-linen-202607",
        "p-award",
        "sup-1",
        type,
        status,
        fileId,
        fileName,
        "u11",
        "2026-07-03T10:25:00.000Z",
        verifiedBy,
        verifiedBy ? "2026-07-03T11:00:00.000Z" : null,
        opinion,
        "2026-07-03T11:00:00.000Z"
      ]);
    }
  }

  private ensureBusinessSettlementInvoice(settlementBillId: string) {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) return;
    const existing = this.runtimeDb.db.prepare("select id from r2_invoices where id = ?").get("inv-food-202607") as Row | undefined;
    if (existing) return;
    const invoiceAmount = roundMoney(bill.settlementAmount);
    const taxRate = 0.09;
    const taxAmount = roundMoney((invoiceAmount * taxRate) / (1 + taxRate));
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_invoices (
          id, settlement_bill_id, order_id, supplier_id, invoice_no, invoice_type,
          issue_date, invoice_status, file_id, file_name, amount, tax_rate, tax_amount,
          uploaded_by, uploaded_at, verified_by, verified_at, verification_opinion, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        "inv-food-202607",
        settlementBillId,
        bill.purchaseOrderId,
        bill.supplierId,
        "FP-202607-0003",
        "增值税专用发票",
        "2026-07-02",
        "verified",
        "inv-food-202607-file",
        "鲜达食材增值税发票.pdf",
        invoiceAmount,
        taxRate,
        taxAmount,
        "u11",
        "2026-07-02T10:30:00.000Z",
        "u9",
        "2026-07-02T11:20:00.000Z",
        "发票已核验",
        "2026-07-02T11:20:00.000Z"
      ]
    );
    this.ensureBusinessSettlementMaterials(settlementBillId);
    this.upsertReconciliation(settlementBillId);
  }

  private ensureSupplierSettlementInvoice(settlementBillId: string) {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) return;
    const existing = this.runtimeDb.db.prepare("select id from r2_invoices where id = ?").get("inv-linen-202607") as Row | undefined;
    if (existing) return;
    const invoiceAmount = roundMoney(bill.settlementAmount);
    const taxRate = 0.13;
    const taxAmount = roundMoney((invoiceAmount * taxRate) / (1 + taxRate));
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_invoices (
          id, settlement_bill_id, order_id, supplier_id, invoice_no, invoice_type,
          issue_date, invoice_status, file_id, file_name, amount, tax_rate, tax_amount,
          uploaded_by, uploaded_at, verified_by, verified_at, verification_opinion, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        "inv-linen-202607",
        settlementBillId,
        bill.purchaseOrderId,
        bill.supplierId,
        "FP-202607-0002",
        "增值税专用发票",
        "2026-07-03",
        "pending_verification",
        "inv-linen-202607-file",
        "华礼布草增值税发票.pdf",
        invoiceAmount,
        taxRate,
        taxAmount,
        "u11",
        "2026-07-03T10:28:00.000Z",
        null,
        null,
        null,
        "2026-07-03T10:28:00.000Z"
      ]
    );
    this.ensureSupplierSettlementMaterials(settlementBillId);
    this.upsertReconciliation(settlementBillId);
  }

  private ensureBusinessFundLedger(settlementBillId: string) {
    const bill = this.getSettlementBill(settlementBillId);
    if (!bill) return;
    const existing = this.runtimeDb.db.prepare("select id from r2_fund_ledger_entries where id = ?").get("fle-food-202607") as Row | undefined;
    if (existing) return;
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_fund_ledger_entries (
          id, ledger_no, settlement_bill_id, supplier_id, org_id, department_id,
          amount, direction, entry_type, ledger_status, created_by, created_at,
          operated_by, operated_at, note, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        "fle-food-202607",
        "FK-202607-0003",
        settlementBillId,
        bill.supplierId,
        bill.orgId ?? "org-hotel",
        bill.departmentId ?? null,
        bill.settlementAmount,
        "outbound",
        "payment_request",
        "payment_requested",
        "u9",
        "2026-07-02T11:30:00.000Z",
        "u9",
        "2026-07-02T11:30:00.000Z",
        "结算单审核通过，进入付款排程",
        "2026-07-02T11:30:00.000Z"
      ]
    );
    this.runtimeDb.db.prepare("update r2_settlement_bills set bill_status = ?, updated_at = ? where id = ?").run("payable", "2026-07-02T11:30:00.000Z", settlementBillId);
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
    const activeEntry = this.runtimeDb.db
      .prepare("select id from r2_fund_ledger_entries where settlement_bill_id = ? and ledger_status in ('payment_requested', 'pending_payment') limit 1")
      .get(settlementBillId) as Row | undefined;
    if (activeEntry) throw new Error("当前结算单已有审批中或待付款的申请，请勿重复发起。");
    const paid = this.fundPaidAmount(settlementBillId);
    if (roundMoney(paid + bill.settlementAmount) > bill.settlementAmount) throw new Error("付款金额不能超过结算可付金额。");
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
      entryType: "payment_request",
      status: "payment_requested",
      createdBy: actor.id,
      createdAt: timestamp,
      operatedBy: actor.id,
      operatedAt: timestamp,
      note: note ?? "付款申请已发起，等待集团采购管理审批。"
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
    this.runtimeDb.db.prepare("update r2_settlement_bills set bill_status = ?, updated_at = ? where id = ?").run("payable", timestamp, settlementBillId);
    return entry;
  }

  getFundLedgerEntry(id: string): FundLedgerEntry | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_fund_ledger_entries where id = ?").get(id) as Row | undefined;
    return row ? this.fundFromRow(row) : undefined;
  }

  transitionFundLedgerEntry(entryId: string, actor: User, status: FundLedgerEntry["status"], note?: string): FundLedgerEntry {
    const entry = this.getFundLedgerEntry(entryId);
    if (!entry) throw new Error("资金台账不存在。");
    if (!isFundLedgerStatus(status)) throw new Error("资金台账状态无效。");
    if (entry.status === status) return entry;

    const allowedTransitions: Record<FundLedgerEntry["status"], FundLedgerEntry["status"][]> = {
      payment_requested: ["pending_payment", "rejected", "cancelled"],
      pending_payment: ["paid", "rejected", "cancelled"],
      paid: [],
      rejected: [],
      cancelled: []
    };
    if (!allowedTransitions[entry.status].includes(status)) {
      throw new Error(`资金台账不能从 ${entry.status} 变更为 ${status}。`);
    }

    const timestamp = now();
    const transitionNote = note?.trim() ? [entry.note, note.trim()].filter(Boolean).join("\n") : entry.note;
    this.runtimeDb.db
      .prepare("update r2_fund_ledger_entries set ledger_status = ?, operated_by = ?, operated_at = ?, note = ?, updated_at = ? where id = ?")
      .run(status, actor.id, timestamp, transitionNote ?? null, timestamp, entryId);
    this.runtimeDb.db
      .prepare("update r2_settlement_bills set bill_status = ?, updated_at = ? where id = ?")
      .run(status === "paid" ? "paid" : "payable", timestamp, entry.settlementBillId);
    return this.getFundLedgerEntry(entryId)!;
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
    const purchaseOrderId = String(row.purchase_order_id);
    const source = json<{ orderNo?: string }>(row.source_json, {});
    const order = this.orderRow(purchaseOrderId);
    return {
      id,
      billNo: String(row.bill_no ?? row.id),
      purchaseOrderId,
      purchaseOrderNo: optionalString(order?.order_no) ?? source.orderNo,
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

  private listPurchaseOrdersForSync(): PurchaseOrder[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_purchase_orders order by created_at").all() as Row[];
    return rows.map((row) => this.purchaseOrderFromRow(row));
  }

  private purchaseOrderFromRow(row: Row): PurchaseOrder {
    const orderId = String(row.id);
    const lineRows = this.runtimeDb.db.prepare("select * from r2_order_line_items where order_id = ? order by id").all(orderId) as Row[];
    return {
      id: orderId,
      projectId: String(row.project_id),
      supplierId: String(row.supplier_id),
      contractId: optionalString(row.contract_id),
      sourceRequestId: optionalString(row.source_request_id),
      awardApprovalId: optionalString(row.award_approval_id),
      selectedBidId: optionalString(row.selected_bid_id),
      orderNo: String(row.order_no),
      status: String(row.order_status) as PurchaseOrder["status"],
      paymentStatus: optionalString(row.payment_status),
      buyerId: optionalString(row.buyer_id),
      orgId: optionalString(row.org_id),
      departmentId: optionalString(row.department_id),
      totalAmount: Number(row.total_amount),
      lineItems: lineRows.map((line) => this.purchaseOrderLineFromRow(line)),
      expectedDeliveryAt: String(row.expected_delivery_at),
      receivingLocation: String(row.receiving_location),
      invoiceTitle: optionalString(row.invoice_title),
      confirmedAt: row.confirmed_at === null || row.confirmed_at === undefined ? null : String(row.confirmed_at),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private purchaseOrderLineFromRow(row: Row): PurchaseOrderLineItem {
    return {
      id: String(row.id),
      productId: optionalString(row.product_id),
      skuId: optionalString(row.sku_id),
      itemName: String(row.item_name),
      specification: String(row.specification),
      quantity: Number(row.quantity),
      unit: String(row.unit),
      unitPrice: Number(row.unit_price),
      taxRate: Number(row.tax_rate),
      totalPrice: Number(row.total_price),
      receivedQuantity: Number(row.received_quantity),
      priceSourceType: optionalString(row.price_source_type) as PurchaseOrderLineItem["priceSourceType"],
      priceSourceId: optionalString(row.price_source_id),
      priceSourceItemId: optionalString(row.price_source_item_id)
    };
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
      .prepare("select coalesce(sum(amount), 0) as total from r2_fund_ledger_entries where settlement_bill_id = ? and ledger_status = 'paid'")
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
