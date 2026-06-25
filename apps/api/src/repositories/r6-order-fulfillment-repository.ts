import type { RuntimeDb } from "../runtime/index.js";
import type {
  MallCartItem,
  MallOrder,
  MallPrice,
  MallProduct,
  MallReturnRequest,
  MallShipment,
  PricingReport,
  PricingReportItem,
  ProcurementDocumentAttachment,
  PurchaseOrder,
  PurchaseOrderLineItem,
  ReceiptRecord,
  SupplierEvaluation,
  User
} from "../types.js";
import { isProcurementBuyerRole, userOrgScope } from "../role-groups.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export interface R6StateShape {
  mallProducts: MallProduct[];
  mallPrices: MallPrice[];
  mallCartItems: MallCartItem[];
  mallOrders: MallOrder[];
  mallShipments: MallShipment[];
  mallReturnRequests: MallReturnRequest[];
  purchaseOrders: PurchaseOrder[];
  receiptRecords: ReceiptRecord[];
  supplierEvaluations: SupplierEvaluation[];
}

export interface MallPriceSource {
  type: "pricing_report" | "supplier_quotation";
  sourceId: string;
  sourceItemId?: string;
  label: string;
  price: number;
  purchasePrice?: number;
  taxRate?: number;
  deliveryDays?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  trace: {
    reportNo?: string;
    projectId?: string;
    quotationId?: string;
  };
}

export interface ProductOffer {
  product: MallProduct;
  priceSource: MallPriceSource | null;
  statusLabel: string;
  saleable: boolean;
  blockReasons: string[];
}

export interface CartLine {
  cartItem: MallCartItem;
  product: MallProduct;
  priceSource: MallPriceSource;
  amount: number;
}

function run(statement: RunnableStatement, values: SqlValue[]) {
  statement.run(...values);
}

function now() {
  return new Date().toISOString();
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

function mergeById<T extends { id: string }>(target: T[], source: T[]) {
  const byId = new Map(target.map((item) => [item.id, item]));
  for (const item of source) {
    const existing = byId.get(item.id);
    if (existing) Object.assign(existing, item);
    else target.push(item);
  }
}

function toProjectId(orderId: string) {
  return `mall:${orderId}`;
}

function orderStatusFromMall(status: MallOrder["status"]): PurchaseOrder["status"] {
  if (status === "submitted") return "pending_confirmation";
  if (status === "supplier_confirmed") return "supplier_confirmed";
  if (status === "shipped" || status === "return_requested" || status === "return_approved" || status === "return_rejected") return "performing";
  if (status === "received") return "received";
  return "closed";
}

function mallStatusFromOrder(status: string): MallOrder["status"] {
  if (status === "pending_confirmation") return "submitted";
  if (status === "supplier_confirmed") return "supplier_confirmed";
  if (status === "received") return "received";
  if (status === "closed") return "closed";
  if (status === "exception") return "return_requested";
  return "shipped";
}

function toAttachment(file: { fileId: string; originalName: string; contentType: string; sizeBytes: number; createdAt: string }): ProcurementDocumentAttachment {
  return {
    id: file.fileId,
    fileName: file.originalName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.createdAt
  };
}

export class R6OrderFulfillmentRepository {
  constructor(private readonly runtimeDb: RuntimeDb) {}

  syncOrderFulfillmentState(state: R6StateShape) {
    mergeById(state.purchaseOrders, this.listPurchaseOrders());
    mergeById(state.receiptRecords, this.listReceipts());
    mergeById(state.supplierEvaluations, this.listSupplierEvaluations());
    mergeById(state.mallOrders, this.listMallOrders());
    mergeById(state.mallShipments, this.listMallShipments());
    mergeById(state.mallReturnRequests, this.listReturns());
  }

  listOffers(products: MallProduct[], prices: MallPrice[], user: User): ProductOffer[] {
    return products.map((product) => {
      const priceSource = this.resolvePriceSource(product, prices);
      const blockReasons = this.blockReasons(product, priceSource, user);
      return {
        product,
        priceSource,
        statusLabel: product.status === "listed" ? "已上架" : product.status === "delisted" ? "已下架" : "草稿",
        saleable: blockReasons.length === 0,
        blockReasons
      };
    });
  }

  resolvePriceSource(product: MallProduct, prices: MallPrice[]): MallPriceSource | null {
    const pricingReport = this.findPricingReportSource(product);
    if (pricingReport) return pricingReport;
    const quoted = [...prices]
      .filter((price) => price.productId === product.id && price.approvalStatus === "approved" && this.isEffective(price.effectiveFrom, price.effectiveTo))
      .sort((a, b) => b.versionNo - a.versionNo)[0];
    if (!quoted) return null;
    return {
      type: "supplier_quotation",
      sourceId: quoted.id,
      sourceItemId: `${quoted.id}:line:1`,
      label: "R3 已审批有效供应商报价",
      price: quoted.salePrice ?? quoted.price,
      purchasePrice: quoted.purchasePrice ?? quoted.price,
      taxRate: quoted.taxRate,
      deliveryDays: quoted.deliveryDays,
      effectiveFrom: quoted.effectiveFrom,
      effectiveTo: quoted.effectiveTo,
      trace: { quotationId: quoted.id }
    };
  }

  private findPricingReportSource(product: MallProduct): MallPriceSource | null {
    const rows = this.runtimeDb.db
      .prepare(
        `select
           item.id as item_id, item.pricing_report_id, item.project_id, item.sale_price,
           item.purchase_price, item.effective_from, item.effective_to,
           report.report_no, report.report_status
         from r2_pricing_report_items item
         join r2_pricing_reports report on report.id = item.pricing_report_id
         where item.product_id = ? and item.supplier_id = ?
         order by item.updated_at desc`
      )
      .all(product.id, product.supplierId) as Row[];
    const row = rows.find((item) => ["generated", "approved"].includes(String(item.report_status)) && this.isEffective(String(item.effective_from), optionalString(item.effective_to)));
    if (!row) return null;
    return {
      type: "pricing_report",
      sourceId: String(row.pricing_report_id),
      sourceItemId: String(row.item_id),
      label: "R5 已批准/有效定价报告明细",
      price: Number(row.sale_price),
      purchasePrice: Number(row.purchase_price),
      effectiveFrom: String(row.effective_from),
      effectiveTo: optionalString(row.effective_to),
      trace: { reportNo: optionalString(row.report_no), projectId: optionalString(row.project_id) }
    };
  }

  private isEffective(_effectiveFrom: string, effectiveTo?: string) {
    const current = Date.now();
    if (!effectiveTo) return true;
    return new Date(effectiveTo).getTime() >= current;
  }

  private blockReasons(product: MallProduct, priceSource: MallPriceSource | null, user: User) {
    const reasons: string[] = [];
    if (product.status !== "listed") reasons.push("商品未上架");
    if (!priceSource) reasons.push("缺少有效价格来源");
    if (!this.supplierAdmitted(product.supplierId)) reasons.push("供应商未准入或已受限");
    if (!this.inServiceRegion(product, user.orgId)) reasons.push("超出供货区域");
    return reasons;
  }

  private supplierAdmitted(supplierId: string) {
    const row = this.runtimeDb.db.prepare("select admission_status, supplier_status from r2_suppliers where id = ?").get(supplierId) as Row | undefined;
    if (!row) return false;
    return String(row.admission_status) === "admitted" && String(row.supplier_status) !== "restricted";
  }

  private inServiceRegion(product: MallProduct, orgId: string) {
    if (product.serviceRegions.includes("全国")) return true;
    const org = this.runtimeDb.db.prepare("select name from r2_organizations where id = ?").get(orgId) as Row | undefined;
    const orgName = org ? String(org.name) : orgId;
    return product.serviceRegions.some((region) => orgName.includes(region) || orgId.includes(region));
  }

  upsertCartItem(user: User, product: MallProduct, priceSource: MallPriceSource, quantity: number): MallCartItem {
    if (quantity <= 0) throw new Error("购物车数量必须大于 0。");
    const timestamp = now();
    const existing = this.runtimeDb.db.prepare("select id from r2_cart_items where buyer_id = ? and product_id = ?").get(user.id, product.id) as Row | undefined;
    const cartItem: MallCartItem = {
      id: existing ? String(existing.id) : `mcart-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      buyerId: user.id,
      productId: product.id,
      quantity,
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_cart_items (
          id, buyer_id, org_id, product_id, supplier_id, quantity, unit_price,
          price_source_type, price_source_id, price_source_item_id, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          quantity = excluded.quantity,
          unit_price = excluded.unit_price,
          price_source_type = excluded.price_source_type,
          price_source_id = excluded.price_source_id,
          price_source_item_id = excluded.price_source_item_id,
          updated_at = excluded.updated_at`
      ),
      [cartItem.id, user.id, user.orgId, product.id, product.supplierId, quantity, priceSource.price, priceSource.type, priceSource.sourceId, priceSource.sourceItemId ?? null, timestamp]
    );
    return cartItem;
  }

  deleteCartItem(user: User, cartItemId: string) {
    this.runtimeDb.db.prepare("delete from r2_cart_items where buyer_id = ? and id = ?").run(user.id, cartItemId);
  }

  clearCart(user: User) {
    this.runtimeDb.db.prepare("delete from r2_cart_items where buyer_id = ?").run(user.id);
  }

  listCart(user: User, products: MallProduct[], prices: MallPrice[]): CartLine[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_cart_items where buyer_id = ? order by updated_at").all(user.id) as Row[];
    return rows.flatMap((row) => {
      const product = products.find((item) => item.id === String(row.product_id));
      if (!product) return [];
      const priceSource = this.resolvePriceSource(product, prices);
      if (!priceSource) return [];
      const quantity = Number(row.quantity);
      return [
        {
          cartItem: { id: String(row.id), buyerId: String(row.buyer_id), productId: product.id, quantity, updatedAt: String(row.updated_at) },
          product,
          priceSource,
          amount: quantity * priceSource.price
        }
      ];
    });
  }

  submitOrder(args: {
    user: User;
    products: MallProduct[];
    prices: MallPrice[];
    shippingAddress: string;
    invoiceTitle: string;
    departmentId?: string;
    expectedDeliveryAt?: string;
  }): MallOrder {
    const cartLines = this.listCart(args.user, args.products, args.prices);
    if (cartLines.length === 0) throw new Error("购物车为空或商品缺少有效价格。");
    const supplierIds = new Set(cartLines.map((line) => line.product.supplierId));
    if (supplierIds.size > 1) throw new Error("同一订单暂只支持同一供应商商品。");
    const unavailable = cartLines.find((line) => this.blockReasons(line.product, line.priceSource, args.user).length > 0);
    if (unavailable) throw new Error(this.blockReasons(unavailable.product, unavailable.priceSource, args.user)[0]);
    const timestamp = now();
    const orderId = `mo-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const orderNo = `MO-${timestamp.slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
    const totalAmount = cartLines.reduce((sum, line) => sum + line.amount, 0);
    const supplierId = [...supplierIds][0];
    const order: MallOrder = {
      id: orderId,
      orderNo,
      buyerId: args.user.id,
      orgId: args.user.orgId,
      supplierId,
      status: "submitted",
      lineItems: cartLines.map((line) => ({
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.cartItem.quantity,
        unit: line.product.unit,
        unitPrice: line.priceSource.price,
        totalPrice: line.amount
      })),
      totalAmount,
      shippingAddress: args.shippingAddress,
      invoiceTitle: args.invoiceTitle,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.writeOrder(order, {
      departmentId: args.departmentId,
      expectedDeliveryAt: args.expectedDeliveryAt ?? timestamp.slice(0, 10),
      lineSources: cartLines.map((line) => ({
        product: line.product,
        priceSource: line.priceSource,
        taxRate: line.product.taxRate ?? line.priceSource.taxRate ?? 0
      }))
    });
    this.clearCart(args.user);
    return order;
  }

  confirmOrder(order: MallOrder, user: User): MallOrder {
    if (order.supplierId !== user.supplierId) throw new Error("供应商只能确认本企业订单。");
    if (order.status !== "submitted") throw new Error("只有待确认订单可以确认。");
    const updated = { ...order, status: "supplier_confirmed" as const, updatedAt: now() };
    this.updateOrderStatus(updated.id, "supplier_confirmed", "supplier_confirmed");
    return updated;
  }

  createShipment(order: MallOrder, user: User, body: { carrier: string; trackingNo: string; contactName?: string; contactPhone?: string; estimatedArrivalAt?: string; shippedQuantity?: number }): { shipment: MallShipment; order: MallOrder } {
    if (order.supplierId !== user.supplierId) throw new Error("供应商只能发本企业订单。");
    if (["closed", "return_approved", "return_rejected", "received"].includes(order.status)) throw new Error("已关闭、已收货或售后订单不能发货。");
    if (order.status === "submitted") throw new Error("订单必须先由供应商确认后才能发货。");
    const timestamp = now();
    const shipment: MallShipment = {
      id: `mship-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderId: order.id,
      supplierId: order.supplierId,
      carrier: body.carrier,
      trackingNo: body.trackingNo,
      status: "shipped",
      shippedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_shipments (
          id, order_id, supplier_id, carrier, tracking_no, contact_name, contact_phone,
          estimated_arrival_at, shipped_quantity, shipment_status, shipped_at, received_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        shipment.id,
        shipment.orderId,
        shipment.supplierId,
        shipment.carrier,
        shipment.trackingNo,
        body.contactName ?? null,
        body.contactPhone ?? null,
        body.estimatedArrivalAt ?? null,
        body.shippedQuantity ?? null,
        shipment.status,
        shipment.shippedAt,
        null,
        timestamp
      ]
    );
    const updatedOrder = { ...order, status: "shipped" as const, updatedAt: timestamp };
    this.updateOrderStatus(order.id, "shipped", "performing");
    return { shipment, order: updatedOrder };
  }

  receiveOrder(
    order: MallOrder,
    user: User,
    body: {
      receiptType?: "partial" | "full" | "exception";
      exceptionType?: ReceiptRecord["exceptionType"];
      summary?: string;
      receivedItems?: Array<{ productId?: string; orderLineItemId?: string; itemName?: string; receivedQuantity: number; accepted?: boolean }>;
      attachmentFileIds?: string[];
      fileLookup?: (fileId: string) => ReturnType<typeof import("../runtime/index.js").FileStore.prototype.get>;
    }
  ): { order: MallOrder; receipt: ReceiptRecord } {
    if (!this.canBuyerOperate(user, order)) throw new Error("酒店只能收本酒店订单。");
    if (!["shipped", "supplier_confirmed"].includes(order.status)) throw new Error("只有已确认或已发货订单可以收货。");
    const formal = this.getOrderFormal(order.id);
    if (!formal) throw new Error("订单正式表记录不存在。");
    const lines = this.listOrderLineRows(order.id);
    const receivedInput = body.receivedItems?.length
      ? body.receivedItems
      : lines.map((line) => ({ orderLineItemId: String(line.id), itemName: String(line.item_name), receivedQuantity: Number(line.quantity) - Number(line.received_quantity), accepted: true }));
    for (const item of receivedInput) {
      const line = this.findOrderLine(lines, item);
      if (!line) throw new Error("收货明细不属于该订单。");
      if (item.receivedQuantity <= 0) throw new Error("收货数量必须大于 0。");
      const remaining = Number(line.quantity) - Number(line.received_quantity);
      if (item.receivedQuantity > remaining) throw new Error("收货数量不能超过订单未收数量。");
    }
    const timestamp = now();
    const receiptType = body.receiptType ?? (receivedInput.some((item) => item.accepted === false) ? "exception" : "full");
    const receipt: ReceiptRecord = {
      id: `rrc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      purchaseOrderId: order.id,
      projectId: String(formal.project_id),
      supplierId: order.supplierId,
      receiptType,
      exceptionType: body.exceptionType,
      acceptanceResult: receiptType === "exception" ? "accepted_with_exception" : "accepted",
      status: "recorded",
      handlingStatus: receiptType === "exception" ? "pending_resolution" : "none",
      receivedItems: receivedInput.map((item) => {
        const line = this.findOrderLine(lines, item)!;
        return { itemName: String(line.item_name), receivedQuantity: item.receivedQuantity, unit: String(line.unit), accepted: item.accepted !== false };
      }),
      summary: body.summary ?? (receiptType === "exception" ? "异常收货已登记" : "收货验收已登记"),
      receiptAt: timestamp,
      operatorId: user.id,
      attachmentMetadata: (body.attachmentFileIds ?? [])
        .map((fileId) => body.fileLookup?.(fileId))
        .filter((file): file is NonNullable<ReturnType<NonNullable<typeof body.fileLookup>>> => Boolean(file))
        .map(toAttachment),
      createdBy: user.id,
      createdAt: timestamp
    };
    this.writeReceipt(receipt, receivedInput.map((item) => this.findOrderLine(lines, item)!));
    const updatedLines = this.listOrderLineRows(order.id);
    const allReceived = updatedLines.every((line) => Number(line.received_quantity) >= Number(line.quantity));
    const poStatus: PurchaseOrder["status"] = receiptType === "exception" ? "exception" : allReceived ? "received" : "partially_received";
    const mallStatus: MallOrder["status"] = allReceived || receiptType === "exception" ? "received" : "shipped";
    this.updateOrderStatus(order.id, mallStatus, poStatus);
    for (const shipment of this.listMallShipments().filter((item) => item.orderId === order.id)) {
      this.runtimeDb.db.prepare("update r2_shipments set shipment_status = ?, received_at = ?, updated_at = ? where id = ?").run("received", timestamp, timestamp, shipment.id);
    }
    return { order: { ...order, status: mallStatus, updatedAt: timestamp }, receipt };
  }

  createReturn(order: MallOrder, user: User, productId: string, quantity: number, reason: string): { returnRequest: MallReturnRequest; order: MallOrder } {
    if (!this.canBuyerOperate(user, order)) throw new Error("酒店只能退本酒店订单。");
    if (!["received", "return_requested", "return_rejected"].includes(order.status)) throw new Error("只有已收货订单可以退货。");
    if (quantity <= 0) throw new Error("退货数量必须大于 0。");
    const line = this.listOrderLineRows(order.id).find((item) => String(item.product_id) === productId);
    if (!line) throw new Error("退货商品不属于该订单。");
    const returned = this.returnedQuantity(order.id, productId);
    if (quantity + returned > Number(line.received_quantity)) throw new Error("退货数量不能超过已收货数量。");
    const timestamp = now();
    const returnRequest: MallReturnRequest = {
      id: `mret-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderId: order.id,
      productId,
      quantity,
      reason,
      status: "submitted",
      createdBy: user.id,
      createdAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_returns (
          id, order_id, product_id, order_line_item_id, quantity, reason, handling_note,
          return_status, created_by, created_at, reviewed_by, reviewed_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [returnRequest.id, order.id, productId, String(line.id), quantity, reason, null, returnRequest.status, user.id, timestamp, null, null, timestamp]
    );
    this.updateOrderStatus(order.id, "return_requested", "exception");
    return { returnRequest, order: { ...order, status: "return_requested", updatedAt: timestamp } };
  }

  reviewReturn(returnRequest: MallReturnRequest, order: MallOrder, user: User, approved: boolean, handlingNote?: string): MallReturnRequest {
    if (order.supplierId !== user.supplierId) throw new Error("供应商只能处理本企业退货。");
    const status = approved ? "approved" : "rejected";
    const timestamp = now();
    this.runtimeDb.db
      .prepare("update r2_returns set return_status = ?, handling_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? where id = ?")
      .run(status, handlingNote ?? null, user.id, timestamp, timestamp, returnRequest.id);
    return { ...returnRequest, status, reviewedBy: user.id, reviewedAt: timestamp };
  }

  evaluateSupplier(order: MallOrder, user: User, body: { quality: number; delivery: number; service: number; cooperation?: number; priceReasonableness?: number; description?: string; improvementSuggestion?: string }): SupplierEvaluation {
    if (!this.canBuyerOperate(user, order)) throw new Error("酒店只能评价本酒店订单。");
    if (!["received", "return_requested", "return_approved", "return_rejected", "closed"].includes(order.status)) throw new Error("只有已收货或已完成履约订单可以评价。");
    const formal = this.getOrderFormal(order.id);
    if (!formal) throw new Error("订单正式表记录不存在。");
    const dimensions = {
      quality: body.quality,
      delivery: body.delivery,
      service: body.service,
      cooperation: body.cooperation ?? body.service,
      priceReasonableness: body.priceReasonableness ?? body.quality
    };
    const score = Math.round((dimensions.quality + dimensions.delivery + dimensions.service + dimensions.cooperation + dimensions.priceReasonableness) / 5);
    const timestamp = now();
    const evaluation: SupplierEvaluation = {
      id: `se-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      supplierId: order.supplierId,
      projectId: String(formal.project_id),
      purchaseOrderId: order.id,
      dimensions,
      score,
      status: "submitted_locked",
      versionNo: 1,
      description: body.description ?? "订单履约评价",
      improvementSuggestion: body.improvementSuggestion,
      lockedAt: timestamp,
      createdBy: user.id,
      createdAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_evaluations (
          id, supplier_id, project_id, purchase_order_id, score, dimensions_json,
          description, improvement_suggestion, evaluation_status, locked_at, created_by, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        evaluation.id,
        evaluation.supplierId,
        evaluation.projectId,
        evaluation.purchaseOrderId ?? null,
        evaluation.score,
        JSON.stringify(evaluation.dimensions),
        evaluation.description,
        evaluation.improvementSuggestion ?? null,
        evaluation.status,
        evaluation.lockedAt,
        evaluation.createdBy,
        evaluation.createdAt,
        timestamp
      ]
    );
    this.updateSupplierEvaluationScore(order.supplierId);
    return evaluation;
  }

  private writeOrder(order: MallOrder, detail: { departmentId?: string; expectedDeliveryAt: string; lineSources: Array<{ product: MallProduct; priceSource: MallPriceSource; taxRate: number }> }) {
    const timestamp = order.updatedAt;
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_purchase_orders (
          id, project_id, supplier_id, contract_id, source_request_id, award_approval_id,
          selected_bid_id, order_no, order_status, payment_status, buyer_id, org_id,
          department_id, total_amount, expected_delivery_at, receiving_location, invoice_title,
          confirmed_at, created_by, created_at, updated_at, synced_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        order.id,
        toProjectId(order.id),
        order.supplierId,
        null,
        null,
        null,
        null,
        order.orderNo,
        "pending_confirmation",
        "payment_reserved",
        order.buyerId,
        order.orgId,
        detail.departmentId ?? null,
        order.totalAmount,
        detail.expectedDeliveryAt,
        order.shippingAddress,
        order.invoiceTitle,
        null,
        order.buyerId,
        order.createdAt,
        order.updatedAt,
        timestamp
      ]
    );
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_order_line_items (
        id, order_id, product_id, sku_id, item_name, specification, quantity, unit, unit_price,
        tax_rate, total_price, received_quantity, price_source_type, price_source_id, price_source_item_id, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    order.lineItems.forEach((line, index) => {
      const source = detail.lineSources[index];
      run(statement, [
        `${order.id}:line:${index + 1}`,
        order.id,
        source.product.id,
        `sku:${source.product.id}`,
        line.productName,
        source.product.specification,
        line.quantity,
        line.unit,
        line.unitPrice,
        source.taxRate,
        line.totalPrice,
        0,
        source.priceSource.type,
        source.priceSource.sourceId,
        source.priceSource.sourceItemId ?? null,
        timestamp
      ]);
    });
  }

  private updateOrderStatus(orderId: string, mallStatus: MallOrder["status"], purchaseOrderStatus: PurchaseOrder["status"]) {
    const timestamp = now();
    this.runtimeDb.db
      .prepare("update r2_purchase_orders set order_status = ?, confirmed_at = coalesce(confirmed_at, ?), updated_at = ?, synced_at = ? where id = ?")
      .run(purchaseOrderStatus, purchaseOrderStatus === "supplier_confirmed" ? timestamp : null, timestamp, timestamp, orderId);
    this.runtimeDb.db
      .prepare("update business_mall_orders set order_status = ?, updated_at = ? where id = ?")
      .run(mallStatus, timestamp, orderId);
  }

  private writeReceipt(receipt: ReceiptRecord, lineRows: Row[]) {
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_receipts (
          id, purchase_order_id, project_id, supplier_id, receipt_type, exception_type,
          acceptance_result, handling_status, summary, attachment_file_ids_json, receipt_at,
          operator_id, created_by, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        receipt.id,
        receipt.purchaseOrderId,
        receipt.projectId,
        receipt.supplierId,
        receipt.receiptType,
        receipt.exceptionType ?? null,
        receipt.acceptanceResult,
        receipt.handlingStatus,
        receipt.summary,
        JSON.stringify(receipt.attachmentMetadata.map((item) => item.id)),
        receipt.receiptAt,
        receipt.operatorId,
        receipt.createdBy,
        receipt.createdAt,
        timestamp
      ]
    );
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_receipt_line_items (id, receipt_id, order_line_item_id, item_name, received_quantity, unit, accepted_flag, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    receipt.receivedItems.forEach((item, index) => {
      const line = lineRows[index];
      run(statement, [`${receipt.id}:line:${index + 1}`, receipt.id, String(line.id), item.itemName, item.receivedQuantity, item.unit, item.accepted ? 1 : 0, timestamp]);
      this.runtimeDb.db
        .prepare("update r2_order_line_items set received_quantity = received_quantity + ?, updated_at = ? where id = ?")
        .run(item.receivedQuantity, timestamp, String(line.id));
    });
  }

  private canBuyerOperate(user: User, order: MallOrder) {
    return isProcurementBuyerRole(user.roleId) && (userOrgScope(user).includes(order.orgId) || user.id === order.buyerId);
  }

  private getOrderFormal(orderId: string) {
    return this.runtimeDb.db.prepare("select * from r2_purchase_orders where id = ?").get(orderId) as Row | undefined;
  }

  private listOrderLineRows(orderId: string) {
    return this.runtimeDb.db.prepare("select * from r2_order_line_items where order_id = ? order by id").all(orderId) as Row[];
  }

  private findOrderLine(lines: Row[], item: { productId?: string; orderLineItemId?: string; itemName?: string }) {
    return lines.find((line) => String(line.id) === item.orderLineItemId || String(line.product_id) === item.productId || String(line.item_name) === item.itemName);
  }

  private returnedQuantity(orderId: string, productId: string) {
    const row = this.runtimeDb.db
      .prepare("select coalesce(sum(quantity), 0) as total from r2_returns where order_id = ? and product_id = ? and return_status in ('submitted', 'approved', 'processed')")
      .get(orderId, productId) as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  private updateSupplierEvaluationScore(supplierId: string) {
    const row = this.runtimeDb.db.prepare("select avg(score) as score from r2_supplier_evaluations where supplier_id = ?").get(supplierId) as { score: number | null } | undefined;
    if (row?.score === null || row?.score === undefined) return;
    this.runtimeDb.db.prepare("update r2_suppliers set evaluation_score = ?, updated_at = ? where id = ?").run(Math.round(row.score * 10) / 10, now(), supplierId);
  }

  listPurchaseOrders(): PurchaseOrder[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_purchase_orders order by created_at").all() as Row[];
    return rows.map((row) => this.purchaseOrderFromRow(row));
  }

  listMallOrders(): MallOrder[] {
    return this.listPurchaseOrders()
      .filter((order) => order.id.startsWith("mo-"))
      .map((order) => {
        const row = this.getOrderFormal(order.id)!;
        return {
          id: order.id,
          orderNo: order.orderNo,
          buyerId: String(row.buyer_id ?? order.createdBy),
          orgId: String(row.org_id ?? ""),
          supplierId: order.supplierId,
          status: mallStatusFromOrder(order.status),
          lineItems: order.lineItems.map((line) => ({
            productId: String((this.runtimeDb.db.prepare("select product_id from r2_order_line_items where id = ?").get(line.id) as Row | undefined)?.product_id ?? ""),
            productName: line.itemName,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice
          })),
          totalAmount: order.totalAmount,
          shippingAddress: order.receivingLocation,
          invoiceTitle: String(row.invoice_title ?? "酒店集团"),
          latestReturnId: optionalString((this.runtimeDb.db.prepare("select id from r2_returns where order_id = ? order by created_at desc limit 1").get(order.id) as Row | undefined)?.id),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        } as MallOrder & { latestReturnId?: string };
      });
  }

  listMallShipments(): MallShipment[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_shipments order by shipped_at").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      orderId: String(row.order_id),
      supplierId: String(row.supplier_id),
      carrier: String(row.carrier),
      trackingNo: String(row.tracking_no),
      status: String(row.shipment_status) === "received" ? "received" : "shipped",
      shippedAt: String(row.shipped_at),
      receivedAt: optionalString(row.received_at)
    }));
  }

  listReceipts(): ReceiptRecord[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_receipts order by created_at").all() as Row[];
    return rows.map((row) => {
      const lineRows = this.runtimeDb.db.prepare("select * from r2_receipt_line_items where receipt_id = ? order by id").all(String(row.id)) as Row[];
      return {
        id: String(row.id),
        purchaseOrderId: String(row.purchase_order_id),
        projectId: String(row.project_id),
        supplierId: String(row.supplier_id),
        receiptType: String(row.receipt_type) as ReceiptRecord["receiptType"],
        exceptionType: optionalString(row.exception_type) as ReceiptRecord["exceptionType"],
        acceptanceResult: String(row.acceptance_result) as ReceiptRecord["acceptanceResult"],
        status: "recorded",
        handlingStatus: String(row.handling_status) as ReceiptRecord["handlingStatus"],
        receivedItems: lineRows.map((line) => ({
          itemName: String(line.item_name),
          receivedQuantity: Number(line.received_quantity),
          unit: String(line.unit),
          accepted: Number(line.accepted_flag) === 1
        })),
        summary: String(row.summary),
        receiptAt: String(row.receipt_at),
        operatorId: String(row.operator_id),
        attachmentMetadata: json<string[]>(row.attachment_file_ids_json, []).map((fileId) => ({ id: fileId, fileName: fileId, contentType: "application/octet-stream", sizeBytes: 0, uploadedAt: String(row.created_at) })),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      };
    });
  }

  listReturns(): MallReturnRequest[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_returns order by created_at").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      orderId: String(row.order_id),
      productId: String(row.product_id),
      quantity: Number(row.quantity),
      reason: String(row.reason),
      status: String(row.return_status) as MallReturnRequest["status"],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      reviewedBy: optionalString(row.reviewed_by),
      reviewedAt: optionalString(row.reviewed_at)
    }));
  }

  listSupplierEvaluations(): SupplierEvaluation[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_supplier_evaluations order by created_at").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      supplierId: String(row.supplier_id),
      projectId: String(row.project_id),
      purchaseOrderId: optionalString(row.purchase_order_id),
      dimensions: json<SupplierEvaluation["dimensions"]>(row.dimensions_json, { quality: 0, delivery: 0, service: 0, cooperation: 0, priceReasonableness: 0 }),
      score: Number(row.score),
      status: String(row.evaluation_status) as SupplierEvaluation["status"],
      versionNo: 1,
      description: String(row.description ?? ""),
      improvementSuggestion: optionalString(row.improvement_suggestion),
      lockedAt: String(row.locked_at),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at)
    }));
  }

  private purchaseOrderFromRow(row: Row): PurchaseOrder {
    const orderId = String(row.id);
    const lineRows = this.listOrderLineRows(orderId);
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
}
