import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { AppContextOptions } from "../src/app-context.js";
import type { PricingReport, User } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r10-"));
}

function boot(runtime: AppContextOptions["runtime"] = {}) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true,
      ...runtime
    }
  });
  return { ctx, app: createApp(ctx) };
}

function tinyPngBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

async function uploadFile(runtime: ReturnType<typeof boot>, userId: string, body: Record<string, unknown>) {
  const response = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", userId)
    .send({
      originalName: "r10-evidence.png",
      contentType: "image/png",
      contentBase64: tinyPngBase64(),
      attachmentKind: "r10_uat_evidence",
      objectType: "r10_uat",
      objectId: "r10",
      ...body
    });
  expect(response.status).toBe(201);
  return response.body.file as { id: string; fileName: string };
}

async function createListedProduct(runtime: ReturnType<typeof boot>) {
  const image = await uploadFile(runtime, "u3", {
    originalName: "r10-mall-product.png",
    attachmentKind: "mall_product_image",
    objectType: "supplier",
    objectId: "sup-1",
    supplierId: "sup-1"
  });

  const product = await request(runtime.app)
    .post("/api/mall/products")
    .set("x-mock-user-id", "u3")
    .send({
      name: "R10 客房布草 UAT 商品",
      category: "客房布草",
      brand: "华礼优选",
      unit: "箱",
      skuCode: `SKU-R10-${Date.now()}`,
      specification: "60 套/箱",
      supplierId: "sup-1",
      serviceRegions: ["华东"],
      procurementCategory: "客房布草",
      imageFileIds: [image.id],
      taxRate: 0.13
    });
  expect(product.status).toBe(201);

  const report: PricingReport = {
    id: `pr-r10-${product.body.product.id}`,
    projectId: "p-award",
    awardApprovalId: "aa-award-1",
    sourceReportId: "cr-award-1",
    selectedSupplierId: "sup-1",
    reportNo: `PR-R10-${product.body.product.id}`,
    status: "approved",
    items: [
      {
        id: `pr-r10-${product.body.product.id}-item-1`,
        productId: product.body.product.id,
        itemName: "R10 客房布草 UAT 商品",
        specification: "60 套/箱",
        quantity: 1,
        unit: "箱",
        purchasePrice: 80,
        salePrice: 100,
        serviceFeeRate: 0.1,
        grossMarginRate: 0.1,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01"
      }
    ],
    basisJson: { source: "r10-final-uat" },
    createdBy: "u2",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    approvedAt: "2026-06-25T00:00:00.000Z"
  };
  runtime.ctx.state.pricingReports.push(report);
  runtime.ctx.r5ReviewAwardRepository.upsertPricingReport(report);

  const listed = await request(runtime.app)
    .post(`/api/mall/products/${product.body.product.id}/status`)
    .set("x-mock-user-id", "u2")
    .send({ status: "listed", sourceType: "award_project", sourceProjectId: "p-award" });
  expect(listed.status).toBe(200);
  return listed.body.product as { id: string };
}

async function createReceivedMallOrder(runtime: ReturnType<typeof boot>) {
  const product = await createListedProduct(runtime);
  const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 2 });
  expect(cart.status).toBe(200);
  const order = await request(runtime.app)
    .post("/api/mall/orders")
    .set("x-mock-user-id", "u2")
    .send({ shippingAddress: "上海滨江华礼酒店后勤仓", invoiceTitle: "华礼酒店集团" });
  expect(order.status).toBe(201);
  const confirmed = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u3");
  expect(confirmed.status).toBe(200);
  const shipped = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/shipments`).set("x-mock-user-id", "u3").send({ carrier: "供应商配送", trackingNo: "R10-UAT" });
  expect(shipped.status).toBe(201);
  const received = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/receive`).set("x-mock-user-id", "u2").send({
    receiptType: "full",
    summary: "R10 UAT 全量收货"
  });
  expect(received.status).toBe(200);
  return { product, order: received.body.order as { id: string; status: string; totalAmount: number } };
}

describe("R10 final UAT and production go/no-go evidence", () => {
  it("runs the buyer, supplier, finance and audit closed loop needed for final UAT", async () => {
    const runtime = boot();

    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({
        name: "R10 备选供应商",
        category: "客房布草",
        contactName: "验收联系人",
        contactPhone: "13800019999",
        qualificationAttachments: [{ fileName: "r10-license.pdf", contentType: "application/pdf", sizeBytes: 1024 }]
      });
    expect(admission.status).toBe(201);
    expect(admission.body.supplier.admissionStatus).toBe("pending");

    const qualificationReview = await request(runtime.app)
      .post(`/api/suppliers/${admission.body.supplier.id}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 90, opinion: "R10 UAT 资质初审通过" });
    expect(qualificationReview.status).toBe(201);

    const review = await request(runtime.app)
      .post(`/api/suppliers/${admission.body.supplier.id}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 91, opinion: "R10 UAT 准入通过" });
    expect(review.status).toBe(201);
    expect(review.body.supplier.admissionStatus).toBe("admitted");

    const { order } = await createReceivedMallOrder(runtime);
    expect(order.status).toBe("received");

    const bill = await request(runtime.app)
      .post("/api/settlement-finance/settlement-bills")
      .set("x-mock-user-id", "u2")
      .send({ purchaseOrderId: order.id, period: "2026-06", serviceFeeRate: 0.05 });
    expect(bill.status).toBe(201);
    expect(bill.body.settlementBill.settlementAmount).toBeLessThan(order.totalAmount);

    const submitted = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/submit`).set("x-mock-user-id", "u3");
    expect(submitted.status).toBe(200);
    expect(submitted.body.workflow.approvalInstance.businessType).toBe("settlement_bill");

    const reviewed = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/review`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.settlementBill.status).toBe("approved");

    const invoiceFile = await uploadFile(runtime, "u3", {
      originalName: "r10-invoice.pdf",
      contentType: "application/pdf",
      contentBase64: Buffer.from("r10 invoice", "utf8").toString("base64"),
      attachmentKind: "settlement_invoice",
      objectType: "mall_order",
      objectId: order.id,
      supplierId: "sup-1"
    });
    const invoice = await request(runtime.app)
      .post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/invoices`)
      .set("x-mock-user-id", "u3")
      .send({ invoiceNo: "R10-INV-001", amount: bill.body.settlementBill.settlementAmount, taxRate: 0.13, fileId: invoiceFile.id, fileName: invoiceFile.fileName });
    expect(invoice.status).toBe(201);

    const invoiceReview = await request(runtime.app).post(`/api/settlement-finance/invoices/${invoice.body.invoice.id}/review`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(invoiceReview.status).toBe(200);
    expect(invoiceReview.body.invoice.status).toBe("verified");

    const fundLedger = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/fund-ledger`).set("x-mock-user-id", "u2").send({
      status: "payment_requested",
      note: "R10 模拟资金台账付款申请"
    });
    expect(fundLedger.status).toBe(201);
    expect(fundLedger.body.fundLedgerEntry.status).toBe("payment_requested");

    const auditorOverview = await request(runtime.app).get("/api/settlement-finance/overview").set("x-mock-user-id", "u5");
    expect(auditorOverview.status).toBe(200);
    const auditorCreate = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u5").send({ purchaseOrderId: order.id, period: "2026-07" });
    expect(auditorCreate.status).toBe(403);

    const auditLogs = await request(runtime.app).get("/api/audit-logs").set("x-mock-user-id", "u5");
    expect(auditLogs.status).toBe(200);
    expect(auditLogs.body.auditLogs.length).toBeGreaterThan(0);
  });

  it("keeps expert, supplier, hotel, auditor and administrator boundaries explicit for R10", async () => {
    const runtime = boot();
    const otherSupplier: User = { id: "u-r10-other-supplier", name: "其他供应商", roleId: "supplier", supplierId: "sup-2", orgId: "org-hotel" };
    const otherHotelBuyer: User = { id: "u-r10-other-hotel", name: "其他酒店采购", roleId: "buyer", orgId: "org-other-hotel", orgScope: ["org-other-hotel"], managedProjectIds: [] };
    runtime.ctx.state.users.push(otherSupplier, otherHotelBuyer);
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, runtime.ctx.config.allowLocalPasswordLogin);

    const supplierOwn = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", "u3");
    expect(supplierOwn.status).toBe(200);
    const supplierOther = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", "u-r10-other-supplier");
    expect(supplierOther.status).toBe(403);
    expect(supplierOther.text).not.toContain("上海棉织供应链有限公司");

    const expertOwnTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u7");
    expect(expertOwnTasks.status).toBe(200);
    expect(expertOwnTasks.body.tasks.some((task: { businessType: string; businessId: string }) => task.businessType === "expert_scoring" && task.businessId === "score-open")).toBe(true);
    const expertOtherTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u4");
    expect(expertOtherTasks.body.tasks.some((task: { businessId: string }) => task.businessId === "score-open")).toBe(false);

    const adminWorkbench = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u6");
    expect(adminWorkbench.status).toBe(403);
    expect(adminWorkbench.body.error.code).toBe("PROJECT_WORKBENCH_READ_DENIED");

    const otherHotelRequest = await request(runtime.app).get("/api/procurement-requests/req-award").set("x-mock-user-id", "u-r10-other-hotel");
    expect(otherHotelRequest.status).toBe(403);
    expect(otherHotelRequest.text).not.toContain("130 万元以内");

    const preDeadline = await request(runtime.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", "u5");
    expect(preDeadline.status).toBe(200);
    expect(preDeadline.text).not.toContain("186000");
    expect(preDeadline.text).not.toContain("responseFileMetadata");
  });

  it("reports production readiness conservatively when real customer integrations are missing", async () => {
    const runtime = boot({
      appEnv: "production",
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      cookieSecure: true,
      corsAllowedOrigins: ["https://procurement.example.local"],
      sessionSecret: "production-secret-for-r10-test",
      identityProviderMode: "adapter",
      requiredIntegrationProviders: ["sso", "oa", "erp", "wms", "finance", "contractSystem", "messageNotification", "fileService"],
      fileStorageMode: "object",
      objectStorageEndpoint: "https://object-storage.example.local",
      objectStorageBucket: "eprocurement"
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.mode).toBe("production");
    expect(health.body.mockAuthEnabled).toBe(false);
    expect(health.body.readiness.productionReady).toBe(false);
    expect(health.body.readiness.failureCount).toBeGreaterThan(0);
    expect(health.body.readiness.warningCount).toBeGreaterThan(0);
    const checks = health.body.readiness.checks as Array<{ key: string; level: string; message: string }>;
    expect(checks.find((check) => check.key === "identity_provider")).toMatchObject({ level: "warning" });
    expect(checks.find((check) => check.key === "file_storage")).toMatchObject({ level: "warning" });
    expect(checks.map((check) => check.key)).toEqual(
      expect.arrayContaining(["integration_sso", "integration_oa", "integration_erp", "integration_wms", "integration_finance", "integration_contractSystem", "integration_messageNotification", "integration_fileService"])
    );

    const mockLogin = await request(runtime.app).post("/api/auth/mock-login").send({ userId: "u2" });
    expect(mockLogin.status).toBe(403);
    const mockHeader = await request(runtime.app).get("/api/me").set("x-mock-user-id", "u2");
    expect(mockHeader.status).toBe(401);
  });
});
