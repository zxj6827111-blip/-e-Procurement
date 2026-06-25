import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { PricingReport, User } from "../src/types.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r6-"));
}

function boot(dataRoot = makeDataRoot()) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function tinyPngBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

async function uploadProductImage(runtime: ReturnType<typeof boot>, userId = "u3", supplierId = "sup-1") {
  const response = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", userId)
    .send({
      originalName: "r6-product.png",
      contentType: "image/png",
      contentBase64: tinyPngBase64(),
      attachmentKind: "mall_product_image",
      objectType: "supplier",
      objectId: supplierId,
      supplierId
    });
  expect(response.status).toBe(201);
  return response.body.file.id as string;
}

async function createProduct(runtime: ReturnType<typeof boot>, override: Record<string, unknown> = {}, userId = "u3") {
  const supplierId = String(override.supplierId ?? "sup-1");
  const imageFileId = await uploadProductImage(runtime, userId, supplierId);
  const response = await request(runtime.app)
    .post("/api/mall/products")
    .set("x-mock-user-id", userId)
    .send({
      name: "R6 酒店客房床品",
      category: "客房布草",
      brand: "华礼优选",
      unit: "箱",
      skuCode: "SKU-R6-BED",
      specification: "60 套/箱",
      supplierId: "sup-1",
      serviceRegions: ["华东"],
      procurementCategory: "客房布草",
      imageFileIds: [imageFileId],
      taxRate: 0.13,
      ...override
    });
  expect(response.status).toBe(201);
  return response.body.product;
}

async function createApprovedQuotation(runtime: ReturnType<typeof boot>, productId: string, price = 100) {
  const priceResponse = await request(runtime.app).post(`/api/mall/products/${productId}/prices`).set("x-mock-user-id", "u3").send({ price, effectiveFrom: "2026-01-01" });
  expect(priceResponse.status).toBe(201);
  const approved = await request(runtime.app).post(`/api/mall/prices/${priceResponse.body.price.id}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
  expect(approved.status).toBe(200);
  return approved.body.price;
}

async function listProduct(runtime: ReturnType<typeof boot>, productId: string) {
  const listed = await request(runtime.app).post(`/api/mall/products/${productId}/status`).set("x-mock-user-id", "u2").send({ status: "listed" });
  expect(listed.status).toBe(200);
  return listed.body.product;
}

function addPricingReport(runtime: ReturnType<typeof boot>, productId: string, salePrice = 88) {
  const report: PricingReport = {
    id: `pr-r6-${productId}`,
    projectId: "p-award",
    awardApprovalId: "aa-award-1",
    sourceReportId: "cr-award-1",
    selectedSupplierId: "sup-1",
    reportNo: `PR-R6-${productId}`,
    status: "generated",
    items: [
      {
        id: `pr-r6-${productId}-item-1`,
        productId,
        itemName: "R6 酒店客房床品",
        specification: "60 套/箱",
        quantity: 1,
        unit: "箱",
        purchasePrice: 80,
        salePrice,
        serviceFeeRate: 0.1,
        grossMarginRate: 0.09,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01"
      }
    ],
    basisJson: { source: "r6-test" },
    createdBy: "u2",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    approvedAt: null
  };
  runtime.ctx.state.pricingReports.push(report);
  runtime.ctx.r5ReviewAwardRepository.upsertPricingReport(report);
  return report;
}

async function createOrder(runtime: ReturnType<typeof boot>, productId: string, quantity = 2) {
  const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId, quantity });
  expect(cart.status).toBe(200);
  const order = await request(runtime.app)
    .post("/api/mall/orders")
    .set("x-mock-user-id", "u2")
    .send({ shippingAddress: "上海滨江华礼酒店收货口", invoiceTitle: "上海滨江华礼酒店", departmentId: "housekeeping" });
  expect(order.status).toBe(201);
  return order.body.order;
}

describe("R6 order fulfillment formal source", () => {
  it("prefers R5 pricing report items over R3 approved quotations for mall price source", async () => {
    const runtime = boot();
    const product = await createProduct(runtime);
    await createApprovedQuotation(runtime, product.id, 100);
    addPricingReport(runtime, product.id, 88);
    await listProduct(runtime, product.id);

    const products = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u2");
    expect(products.status).toBe(200);
    const listed = products.body.products.find((item: { id: string }) => item.id === product.id);
    expect(listed.priceSource.type).toBe("pricing_report");
    expect(listed.activePrice.price).toBe(88);
    expect(listed.priceSource.sourceTrace.reportNo).toContain("PR-R6");

    const order = await createOrder(runtime, product.id, 2);
    expect(order.totalAmount).toBe(176);
    const line = single<{ price_source_type: string; price_source_id: string; unit_price: number }>(runtime, "select price_source_type, price_source_id, unit_price from r2_order_line_items where order_id = ?", order.id);
    expect(line).toMatchObject({ price_source_type: "pricing_report", price_source_id: `pr-r6-${product.id}`, unit_price: 88 });
  });

  it("blocks unavailable products, expired prices, supplier restrictions and out-of-region orders", async () => {
    const runtime = boot();
    const noPrice = await createProduct(runtime, { skuCode: "SKU-R6-NOPRICE" });
    const noPriceList = await request(runtime.app).post(`/api/mall/products/${noPrice.id}/status`).set("x-mock-user-id", "u2").send({ status: "listed" });
    expect(noPriceList.status).toBe(400);

    const expired = await createProduct(runtime, { skuCode: "SKU-R6-EXPIRED" });
    const expiredPrice = await request(runtime.app).post(`/api/mall/products/${expired.id}/prices`).set("x-mock-user-id", "u3").send({ price: 90, effectiveFrom: "2025-01-01", effectiveTo: "2025-02-01" });
    expect(expiredPrice.status).toBe(201);
    await request(runtime.app).post(`/api/mall/prices/${expiredPrice.body.price.id}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
    const expiredList = await request(runtime.app).post(`/api/mall/products/${expired.id}/status`).set("x-mock-user-id", "u2").send({ status: "listed" });
    expect(expiredList.status).toBe(400);

    const outRegion = await createProduct(runtime, { skuCode: "SKU-R6-NORTH", serviceRegions: ["华北"] });
    await createApprovedQuotation(runtime, outRegion.id, 100);
    await listProduct(runtime, outRegion.id);
    const blockedCart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: outRegion.id, quantity: 1 });
    expect(blockedCart.status).toBe(400);
    expect(blockedCart.body.error.message).toContain("超出供货区域");

    const restricted = await createProduct(runtime, { skuCode: "SKU-R6-RESTRICTED", supplierId: "sup-4" }, "u2");
    addPricingReport(runtime, restricted.id, 70);
    const restrictedList = await request(runtime.app).post(`/api/mall/products/${restricted.id}/status`).set("x-mock-user-id", "u2").send({ status: "listed" });
    expect(restrictedList.status).toBe(400);
  });

  it("writes cart, order, shipment, receipt, return and evaluation into r2 tables and restores orders after reboot", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);
    const product = await createProduct(runtime1);
    addPricingReport(runtime1, product.id, 120);
    await listProduct(runtime1, product.id);

    const order = await createOrder(runtime1, product.id, 3);
    expect(single(runtime1, "select id from r2_purchase_orders where id = ?", order.id)).toBeTruthy();
    expect(single(runtime1, "select id from r2_order_line_items where order_id = ?", order.id)).toBeTruthy();

    const wrongSupplier = await request(runtime1.app).post(`/api/mall/orders/${order.id}/confirm`).set("x-mock-user-id", "u8");
    expect([401, 403]).toContain(wrongSupplier.status);

    const confirmed = await request(runtime1.app).post(`/api/mall/orders/${order.id}/confirm`).set("x-mock-user-id", "u3");
    expect(confirmed.status).toBe(200);
    expect(single<{ order_status: string }>(runtime1, "select order_status from r2_purchase_orders where id = ?", order.id)?.order_status).toBe("supplier_confirmed");

    const shipped = await request(runtime1.app)
      .post(`/api/mall/orders/${order.id}/shipments`)
      .set("x-mock-user-id", "u3")
      .send({ carrier: "顺丰冷链", trackingNo: "R6-WL-001", contactName: "王岚", contactPhone: "13800000000", estimatedArrivalAt: "2026-06-30T12:00:00.000Z" });
    expect(shipped.status).toBe(201);
    expect(single(runtime1, "select id from r2_shipments where order_id = ?", order.id)).toBeTruthy();

    const overReceipt = await request(runtime1.app)
      .post(`/api/mall/orders/${order.id}/receive`)
      .set("x-mock-user-id", "u2")
      .send({ receivedItems: [{ productId: product.id, receivedQuantity: 4 }] });
    expect(overReceipt.status).toBe(400);

    const receiptFile = await request(runtime1.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u2")
      .send({
        originalName: "r6-receipt.png",
        contentType: "image/png",
        contentBase64: tinyPngBase64(),
        attachmentKind: "mall_receipt_image",
        objectType: "mall_order",
        objectId: order.id,
        supplierId: "sup-1"
      });
    expect(receiptFile.status).toBe(201);

    const partial = await request(runtime1.app)
      .post(`/api/mall/orders/${order.id}/receive`)
      .set("x-mock-user-id", "u2")
      .send({
        receiptType: "partial",
        summary: "先收 2 箱",
        attachmentFileIds: [receiptFile.body.file.id],
        receivedItems: [{ productId: product.id, receivedQuantity: 2, accepted: true }]
    });
    expect(partial.status).toBe(200);
    expect(single(runtime1, "select id from r2_receipts where purchase_order_id = ?", order.id)).toBeTruthy();
    const partialReceiptId = runtime1.ctx.state.receiptRecords.at(-1)?.id;
    expect(partialReceiptId).toEqual(expect.any(String));
    expect(all(runtime1, "select id from r2_receipt_line_items where receipt_id = ?", partialReceiptId ?? "").length).toBeGreaterThan(0);

    const exception = await request(runtime1.app)
      .post(`/api/mall/orders/${order.id}/receive`)
      .set("x-mock-user-id", "u2")
      .send({
        receiptType: "exception",
        exceptionType: "quality_issue",
        summary: "剩余 1 箱外包装破损，登记异常收货",
        attachmentFileIds: [receiptFile.body.file.id],
        receivedItems: [{ productId: product.id, receivedQuantity: 1, accepted: false }]
      });
    expect(exception.status).toBe(200);
    const exceptionRow = single<{ exception_type: string; attachment_file_ids_json: string }>(runtime1, "select exception_type, attachment_file_ids_json from r2_receipts where receipt_type = 'exception' and purchase_order_id = ?", order.id);
    expect(exceptionRow?.exception_type).toBe("quality_issue");
    expect(exceptionRow?.attachment_file_ids_json).toContain(receiptFile.body.file.id);

    const returnTooMuch = await request(runtime1.app).post(`/api/mall/orders/${order.id}/returns`).set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 4, reason: "退货超量" });
    expect(returnTooMuch.status).toBe(400);

    const returnRequest = await request(runtime1.app).post(`/api/mall/orders/${order.id}/returns`).set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 1, reason: "包装破损" });
    expect(returnRequest.status).toBe(201);
    expect(single(runtime1, "select id from r2_returns where id = ?", returnRequest.body.returnRequest.id)).toBeTruthy();

    const reviewed = await request(runtime1.app).post(`/api/mall/returns/${returnRequest.body.returnRequest.id}/review`).set("x-mock-user-id", "u3").send({ approved: true, handlingNote: "同意退货" });
    expect(reviewed.status).toBe(200);
    expect(single<{ return_status: string; handling_note: string }>(runtime1, "select return_status, handling_note from r2_returns where id = ?", returnRequest.body.returnRequest.id)).toMatchObject({
      return_status: "approved",
      handling_note: "同意退货"
    });

    const evaluation = await request(runtime1.app)
      .post(`/api/mall/orders/${order.id}/evaluations`)
      .set("x-mock-user-id", "u2")
      .send({ quality: 86, delivery: 90, service: 88, description: "R6 履约评价" });
    expect(evaluation.status).toBe(201);
    expect(single(runtime1, "select id from r2_supplier_evaluations where id = ?", evaluation.body.evaluation.id)).toBeTruthy();
    expect(single<{ evaluation_score: number }>(runtime1, "select evaluation_score from r2_suppliers where id = 'sup-1'")?.evaluation_score).toBeGreaterThan(0);

    const runtime2 = boot(dataRoot);
    const orders = await request(runtime2.app).get("/api/mall/orders").set("x-mock-user-id", "u2");
    expect(orders.status).toBe(200);
    expect(orders.body.orders.some((item: { id: string }) => item.id === order.id)).toBe(true);
    expect(single(runtime2, "select id from r2_purchase_orders where id = ?", order.id)).toBeTruthy();
  });

  it("keeps hotel, supplier, auditor readonly and admin boundaries for R6 order flow", async () => {
    const runtime = boot();
    const otherHotelUser: User = {
      id: "u-r6-other-hotel",
      name: "其他酒店采购",
      roleId: "buyer",
      orgId: "org-other-hotel",
      orgScope: ["org-other-hotel"],
      managedProjectIds: []
    };
    runtime.ctx.state.users.push(otherHotelUser);
    runtime.ctx.state.users.push({
      id: "u-r6-other-supplier",
      name: "其他供应商",
      roleId: "supplier",
      orgId: "org-hotel",
      supplierId: "sup-2"
    });
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, runtime.ctx.config.allowLocalPasswordLogin);

    const product = await createProduct(runtime);
    addPricingReport(runtime, product.id, 66);
    await listProduct(runtime, product.id);
    const order = await createOrder(runtime, product.id, 1);

    const supplierOrders = await request(runtime.app).get("/api/mall/orders").set("x-mock-user-id", "u3");
    expect(supplierOrders.status).toBe(200);
    expect(supplierOrders.body.orders.map((item: { id: string }) => item.id)).toContain(order.id);

    const otherSupplierOrders = await request(runtime.app).get("/api/mall/orders").set("x-mock-user-id", "u-r6-other-supplier");
    expect(otherSupplierOrders.status).toBe(200);
    expect(otherSupplierOrders.body.orders.map((item: { id: string }) => item.id)).not.toContain(order.id);

    const otherHotelOrders = await request(runtime.app).get("/api/mall/orders").set("x-mock-user-id", "u-r6-other-hotel");
    expect(otherHotelOrders.status).toBe(200);
    expect(otherHotelOrders.body.orders.map((item: { id: string }) => item.id)).not.toContain(order.id);

    const auditorConfirm = await request(runtime.app).post(`/api/mall/orders/${order.id}/confirm`).set("x-mock-user-id", "u5");
    expect(auditorConfirm.status).toBe(403);

    const auditorReceive = await request(runtime.app).post(`/api/mall/orders/${order.id}/receive`).set("x-mock-user-id", "u5");
    expect(auditorReceive.status).toBe(403);

    const adminOrders = await request(runtime.app).get("/api/mall/orders").set("x-mock-user-id", "u6");
    expect(adminOrders.status).toBe(403);

    const adminSubmit = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u6").send({ productId: product.id, quantity: 1 });
    expect(adminSubmit.status).toBe(403);
  });
});
