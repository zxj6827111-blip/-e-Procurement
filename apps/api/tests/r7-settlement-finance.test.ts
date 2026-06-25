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
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r7-"));
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
      originalName: "r7-product.png",
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
      name: "R7 结算测试布草",
      category: "客房布草",
      brand: "华礼优选",
      unit: "箱",
      skuCode: `SKU-R7-${Math.floor(Math.random() * 100000)}`,
      specification: "60 套/箱",
      supplierId,
      serviceRegions: ["华东"],
      procurementCategory: "客房布草",
      imageFileIds: [imageFileId],
      taxRate: 0.13,
      ...override
    });
  expect(response.status).toBe(201);
  return response.body.product;
}

function addPricingReport(runtime: ReturnType<typeof boot>, productId: string, salePrice = 100) {
  const report: PricingReport = {
    id: `pr-r7-${productId}`,
    projectId: "p-award",
    awardApprovalId: "aa-award-1",
    sourceReportId: "cr-award-1",
    selectedSupplierId: "sup-1",
    reportNo: `PR-R7-${productId}`,
    status: "approved",
    items: [
      {
        id: `pr-r7-${productId}-item-1`,
        productId,
        itemName: "R7 结算测试布草",
        specification: "60 套/箱",
        quantity: 1,
        unit: "箱",
        purchasePrice: salePrice * 0.8,
        salePrice,
        serviceFeeRate: 0.1,
        grossMarginRate: 0.1,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01"
      }
    ],
    basisJson: { source: "r7-test" },
    createdBy: "u2",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    approvedAt: "2026-06-25T00:00:00.000Z"
  };
  runtime.ctx.state.pricingReports.push(report);
  runtime.ctx.r5ReviewAwardRepository.upsertPricingReport(report);
  return report;
}

async function listProduct(runtime: ReturnType<typeof boot>, productId: string) {
  const listed = await request(runtime.app).post(`/api/mall/products/${productId}/status`).set("x-mock-user-id", "u2").send({ status: "listed" });
  expect(listed.status).toBe(200);
  return listed.body.product;
}

async function createReceivedOrder(runtime: ReturnType<typeof boot>, quantity = 3, salePrice = 100) {
  const product = await createProduct(runtime);
  addPricingReport(runtime, product.id, salePrice);
  await listProduct(runtime, product.id);
  const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: product.id, quantity });
  expect(cart.status).toBe(200);
  const order = await request(runtime.app)
    .post("/api/mall/orders")
    .set("x-mock-user-id", "u2")
    .send({ shippingAddress: "上海滨江华礼酒店收货口", invoiceTitle: "上海滨江华礼酒店", departmentId: "housekeeping" });
  expect(order.status).toBe(201);
  const confirm = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u3");
  expect(confirm.status).toBe(200);
  const shipment = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/shipments`).set("x-mock-user-id", "u3").send({ carrier: "顺丰", trackingNo: `R7-${Date.now()}` });
  expect(shipment.status).toBe(201);
  const receipt = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/receive`).set("x-mock-user-id", "u2").send({ receivedItems: [{ productId: product.id, receivedQuantity: quantity }] });
  expect(receipt.status).toBe(200);
  return { product, order: receipt.body.order };
}

describe("R7 settlement, invoice, reconciliation and fund ledger formal source", () => {
  it("generates settlement bills from received orders, writes items and blocks unreceived or duplicate settlements", async () => {
    const runtime = boot();
    const { order } = await createReceivedOrder(runtime, 2, 120);

    const overviewBeforeGenerate = await request(runtime.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u2");
    expect(overviewBeforeGenerate.status).toBe(200);
    expect(all(runtime, "select id from r2_settlement_bills where purchase_order_id = ?", order.id)).toHaveLength(0);

    const bill = await request(runtime.app)
      .post("/api/settlement-finance/settlement-bills")
      .set("x-mock-user-id", "u2")
      .send({ purchaseOrderId: order.id, period: "2026-06", serviceFeeRate: 0.05 });
    expect(bill.status).toBe(201);
    expect(bill.body.settlementBill.orderAmount).toBe(240);
    expect(bill.body.settlementBill.receivedAmount).toBe(240);
    expect(bill.body.settlementBill.serviceFee).toBe(12);
    expect(bill.body.settlementBill.settlementAmount).toBe(228);
    expect(bill.body.settlementBill.items.length).toBeGreaterThan(0);

    expect(single(runtime, "select id from r2_settlement_bills where id = ?", bill.body.settlementBill.id)).toBeTruthy();
    expect(all(runtime, "select id from r2_settlement_bill_items where settlement_bill_id = ?", bill.body.settlementBill.id).length).toBeGreaterThan(0);
    expect(single(runtime, "select id from r2_amount_reconciliation_lines where source_id = ?", bill.body.settlementBill.id)).toBeTruthy();
    expect(single(runtime, "select id from r2_settlement_bills where id = ?", `settlement:${order.id}`)).toBeFalsy();
    expect(single(runtime, "select id from r2_amount_reconciliation_lines where id = ?", `order-total:${order.id}`)).toBeFalsy();

    const duplicate = await request(runtime.app)
      .post("/api/settlement-finance/settlement-bills")
      .set("x-mock-user-id", "u2")
      .send({ purchaseOrderId: order.id, period: "2026-06" });
    expect(duplicate.status).toBe(400);

    const negativeFee = await request(runtime.app)
      .post("/api/settlement-finance/settlement-bills")
      .set("x-mock-user-id", "u2")
      .send({ purchaseOrderId: order.id, period: "2026-06-negative", serviceFeeRate: -0.1 });
    expect(negativeFee.status).toBe(400);
    expect(negativeFee.body.error.code).toBe("SETTLEMENT_SERVICE_FEE_RATE_INVALID");

    const product = await createProduct(runtime, { skuCode: "SKU-R7-UNRECEIVED" });
    addPricingReport(runtime, product.id, 55);
    await listProduct(runtime, product.id);
    await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 1 });
    const unreceived = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u2").send({ shippingAddress: "未收货地址", invoiceTitle: "华礼酒店集团" });
    expect(unreceived.status).toBe(201);
    const blocked = await request(runtime.app)
      .post("/api/settlement-finance/settlement-bills")
      .set("x-mock-user-id", "u2")
      .send({ purchaseOrderId: unreceived.body.order.id, period: "2026-06" });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.message).toContain("未收货");
  });

  it("deducts approved returns from settlement payable amount", async () => {
    const runtime = boot();
    const { product, order } = await createReceivedOrder(runtime, 3, 100);

    const returnRequest = await request(runtime.app).post(`/api/mall/orders/${order.id}/returns`).set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 1, reason: "破损退货" });
    expect(returnRequest.status).toBe(201);
    const reviewed = await request(runtime.app).post(`/api/mall/returns/${returnRequest.body.returnRequest.id}/review`).set("x-mock-user-id", "u3").send({ approved: true });
    expect(reviewed.status).toBe(200);

    const bill = await request(runtime.app)
      .post("/api/settlement-finance/settlement-bills")
      .set("x-mock-user-id", "u2")
      .send({ purchaseOrderId: order.id, period: "2026-07" });
    expect(bill.status).toBe(201);
    expect(bill.body.settlementBill.receivedAmount).toBe(300);
    expect(bill.body.settlementBill.returnAmount).toBe(100);
    expect(bill.body.settlementBill.settlementAmount).toBe(200);
  });

  it("submits materials, uploads and reviews invoices, reconciles amounts and creates formal fund ledger", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);
    const { order } = await createReceivedOrder(runtime1, 2, 80);
    const bill = await request(runtime1.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u2").send({ purchaseOrderId: order.id, period: "2026-08" });
    expect(bill.status).toBe(201);
    const billId = bill.body.settlementBill.id as string;

    const submitted = await request(runtime1.app).post(`/api/settlement-finance/settlement-bills/${billId}/submit`).set("x-mock-user-id", "u3");
    expect(submitted.status).toBe(200);
    expect(submitted.body.settlementBill.status).toBe("submitted");

    const materialFile = await request(runtime1.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "r7-reconciliation.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("r7 material", "utf8").toString("base64"),
        attachmentKind: "settlement_material",
        objectType: "mall_order",
        objectId: order.id,
        supplierId: "sup-1"
      });
    expect(materialFile.status).toBe(201);
    const material = await request(runtime1.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/materials`)
      .set("x-mock-user-id", "u3")
      .send({ materialType: "delivery_note", fileId: materialFile.body.file.id, fileName: "r7-reconciliation.pdf" });
    expect(material.status).toBe(201);
    expect(single(runtime1, "select id from r2_settlement_materials where id = ?", material.body.settlementMaterial.id)).toBeTruthy();
    const invalidMaterial = await request(runtime1.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/materials`)
      .set("x-mock-user-id", "u3")
      .send({ materialType: "script" });
    expect(invalidMaterial.status).toBe(400);
    const materialReview = await request(runtime1.app).post(`/api/settlement-finance/materials/${material.body.settlementMaterial.id}/review`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(materialReview.status).toBe(200);

    const overInvoice = await request(runtime1.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/invoices`)
      .set("x-mock-user-id", "u3")
      .send({ invoiceNo: "R7-INV-OVER", amount: 9999, taxRate: 0.13 });
    expect(overInvoice.status).toBe(400);

    const invoice = await request(runtime1.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/invoices`)
      .set("x-mock-user-id", "u3")
      .send({ invoiceNo: "R7-INV-001", invoiceType: "special_vat", issueDate: "2026-08-25", amount: 160, taxRate: 0.13, fileId: materialFile.body.file.id, fileName: "r7-invoice.pdf" });
    expect(invoice.status).toBe(201);
    expect(single(runtime1, "select id from r2_invoices where id = ?", invoice.body.invoice.id)).toBeTruthy();

    const unapprovedPayment = await request(runtime1.app).post(`/api/settlement-finance/settlement-bills/${billId}/fund-ledger`).set("x-mock-user-id", "u2");
    expect(unapprovedPayment.status).toBe(400);
    const draftReview = await request(runtime1.app).post(`/api/settlement-finance/settlement-bills/${billId}/review`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(draftReview.status).toBe(200);

    const draftBill = await request(runtime1.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u2").send({ purchaseOrderId: order.id, period: "2026-08-draft" });
    expect(draftBill.status).toBe(201);
    const draftBillReview = await request(runtime1.app).post(`/api/settlement-finance/settlement-bills/${draftBill.body.settlementBill.id}/review`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(draftBillReview.status).toBe(400);

    const invoiceReview = await request(runtime1.app).post(`/api/settlement-finance/invoices/${invoice.body.invoice.id}/review`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(invoiceReview.status).toBe(200);

    const reconciliation = single<{ expected_amount: number; actual_amount: number; reconciliation_status: string }>(runtime1, "select expected_amount, actual_amount, reconciliation_status from r2_amount_reconciliation_lines where source_id = ?", billId);
    expect(reconciliation).toMatchObject({ expected_amount: 160, actual_amount: 160, reconciliation_status: "matched" });

    const payment = await request(runtime1.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/fund-ledger`)
      .set("x-mock-user-id", "u2")
      .send({ status: "payment_requested", note: "R7 模拟付款申请" });
    expect(payment.status).toBe(201);
    expect(payment.body.fundLedgerEntry.note).toContain("模拟");
    expect(single(runtime1, "select id from r2_fund_ledger_entries where id = ?", payment.body.fundLedgerEntry.id)).toBeTruthy();
    const invalidLedger = await request(runtime1.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/fund-ledger`)
      .set("x-mock-user-id", "u2")
      .send({ status: "external_paid" });
    expect(invalidLedger.status).toBe(400);

    const runtime2 = boot(dataRoot);
    const overview = await request(runtime2.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u2");
    expect(overview.status).toBe(200);
    expect(overview.body.settlementBills.some((item: { id: string }) => item.id === billId)).toBe(true);
    expect(overview.body.invoices.some((item: { id: string }) => item.id === invoice.body.invoice.id)).toBe(true);
    expect(overview.body.fundLedgerEntries.some((item: { id: string }) => item.id === payment.body.fundLedgerEntry.id)).toBe(true);
  });

  it("keeps supplier, hotel, finance, auditor readonly and admin boundaries", async () => {
    const runtime = boot();
    const otherHotelUser: User = {
      id: "u-r7-other-hotel",
      name: "其他酒店采购",
      roleId: "buyer",
      orgId: "org-other-hotel",
      orgScope: ["org-other-hotel"],
      managedProjectIds: []
    };
    runtime.ctx.state.users.push(otherHotelUser);
    runtime.ctx.state.users.push({
      id: "u-r7-other-supplier",
      name: "其他供应商",
      roleId: "supplier",
      orgId: "org-hotel",
      supplierId: "sup-2"
    });
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, runtime.ctx.config.allowLocalPasswordLogin);

    const { order } = await createReceivedOrder(runtime, 1, 77);
    const bill = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u2").send({ purchaseOrderId: order.id, period: "2026-09" });
    expect(bill.status).toBe(201);

    const supplierOverview = await request(runtime.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u3");
    expect(supplierOverview.status).toBe(200);
    expect(supplierOverview.body.settlementBills.map((item: { id: string }) => item.id)).toContain(bill.body.settlementBill.id);

    const otherSupplierOverview = await request(runtime.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u-r7-other-supplier");
    expect(otherSupplierOverview.status).toBe(200);
    expect(otherSupplierOverview.body.settlementBills.map((item: { id: string }) => item.id)).not.toContain(bill.body.settlementBill.id);

    const otherHotelOverview = await request(runtime.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u-r7-other-hotel");
    expect(otherHotelOverview.status).toBe(200);
    expect(otherHotelOverview.body.settlementBills.map((item: { id: string }) => item.id)).not.toContain(bill.body.settlementBill.id);

    const auditorCreate = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u5").send({ purchaseOrderId: order.id, period: "2026-09" });
    expect(auditorCreate.status).toBe(403);
    const adminOverview = await request(runtime.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u6");
    expect(adminOverview.status).toBe(403);
    const adminCreate = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u6").send({ purchaseOrderId: order.id, period: "2026-09" });
    expect(adminCreate.status).toBe(403);
  });

  it("blocks cross-hotel settlement material and mall invoice review", async () => {
    const runtime = boot();
    const otherHotelUser: User = {
      id: "u-r7-other-hotel",
      name: "其他酒店采购",
      roleId: "buyer",
      orgId: "org-other-hotel",
      orgScope: ["org-other-hotel"],
      managedProjectIds: []
    };
    runtime.ctx.state.users.push(otherHotelUser);
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, runtime.ctx.config.allowLocalPasswordLogin);

    const { order } = await createReceivedOrder(runtime, 1, 90);
    const bill = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u2").send({ purchaseOrderId: order.id, period: "2026-10" });
    expect(bill.status).toBe(201);
    const billId = bill.body.settlementBill.id as string;
    const submit = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${billId}/submit`).set("x-mock-user-id", "u3");
    expect(submit.status).toBe(200);

    const material = await request(runtime.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/materials`)
      .set("x-mock-user-id", "u3")
      .send({ materialType: "delivery_note", fileName: "cross-hotel-block.pdf" });
    expect(material.status).toBe(201);
    const crossMaterialReview = await request(runtime.app).post(`/api/settlement-finance/materials/${material.body.settlementMaterial.id}/review`).set("x-mock-user-id", "u-r7-other-hotel").send({ approved: true });
    expect(crossMaterialReview.status).toBe(403);

    const invoice = await request(runtime.app)
      .post(`/api/settlement-finance/settlement-bills/${billId}/invoices`)
      .set("x-mock-user-id", "u3")
      .send({ invoiceNo: "R7-INV-CROSS", amount: 90, taxRate: 0.13 });
    expect(invoice.status).toBe(201);
    const crossFinanceReview = await request(runtime.app).post(`/api/settlement-finance/invoices/${invoice.body.invoice.id}/review`).set("x-mock-user-id", "u-r7-other-hotel").send({ approved: true });
    expect(crossFinanceReview.status).toBe(403);
    const crossMallReview = await request(runtime.app).post(`/api/mall/invoices/${invoice.body.invoice.id}/verify`).set("x-mock-user-id", "u-r7-other-hotel").send({ approved: true });
    expect(crossMallReview.status).toBe(403);
  });
});
