import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { ProcurementAnnouncement, ProcurementDocument, SupplierInvitation, User } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r3-"));
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

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: Array<string | number | null>) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function tinyPngBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

async function createR3ListedProduct(runtime: ReturnType<typeof boot>) {
  const image = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", "u3")
    .send({
      originalName: "r3-product.png",
      contentType: "image/png",
      contentBase64: tinyPngBase64(),
      attachmentKind: "mall_product_image",
      objectType: "supplier",
      objectId: "sup-1",
      supplierId: "sup-1"
    });
  expect(image.status).toBe(201);

  const product = await request(runtime.app)
    .post("/api/mall/products")
    .set("x-mock-user-id", "u3")
    .send({
      name: "R3 商品中心主源商品",
      category: "客房物资",
      brand: "R3Brand",
      unit: "箱",
      skuCode: "SKU-R3-001",
      specification: "R3 规格",
      supplierId: "sup-1",
      serviceRegions: ["华东", "华南"],
      procurementCategory: "客房一次性用品",
      imageFileIds: [image.body.file.id],
      packingQuantity: 12,
      minOrderQty: 2,
      maxOrderQty: 200,
      taxRate: 0.13,
      invoiceName: "客房一次性用品",
      taxClassificationCode: "106050299",
      detailDescription: "R3 商品详情",
      acceptanceGuide: "按箱验收",
      installationRequirement: "无需安装"
    });
  expect(product.status).toBe(201);

  const price = await request(runtime.app)
    .post(`/api/mall/products/${product.body.product.id}/prices`)
    .set("x-mock-user-id", "u3")
    .send({
      price: 118,
      purchasePrice: 95,
      salePrice: 118,
      taxRate: 0.13,
      deliveryDays: 3,
      effectiveFrom: "2026-01-01",
      effectiveTo: "2099-12-31"
    });
  expect(price.status).toBe(201);

  const approved = await request(runtime.app).post(`/api/mall/prices/${price.body.price.id}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
  expect(approved.status).toBe(200);

  const listed = await request(runtime.app)
    .post(`/api/mall/products/${product.body.product.id}/status`)
    .set("x-mock-user-id", "u2")
    .send({
      status: "listed",
      sourceType: "award_project",
      sourceProjectId: "p-award",
      purchasePrice: 95,
      salePrice: 118,
      taxRate: 0.13,
      deliveryDays: 3,
      effectiveFrom: "2026-01-01",
      effectiveTo: "2099-12-31"
    });
  expect(listed.status).toBe(200);

  return { productId: product.body.product.id as string, priceId: price.body.price.id as string, imageFileId: image.body.file.id as string };
}

describe("R3 supplier and product center master source", () => {
  it("writes supplier profile, qualifications, reviews, restrictions and seal samples into R2/R3 formal tables and retains them after reboot", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);

    const supplier = await request(runtime1.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({
        name: "R3 主源供应商",
        category: "客房一次性用品",
        supplierType: "manufacturer",
        supplierSource: "hotel_supply_chain_standardization",
        socialCreditCode: "91310000R3MASTER001",
        businessLicenseNo: "BL-R3-001",
        legalRepresentative: "陈主源",
        registeredAddress: "上海市黄浦区R3路1号",
        businessScope: "酒店客房物资生产和配送",
        contactName: "陈主源",
        contactPhone: "13900030001",
        contactEmail: "r3-supplier@example.com",
        serviceRegions: [{ region: "华东", storeName: "上海滨江华礼酒店", category: "客房一次性用品" }],
        qualificationAttachments: [
          {
            fileName: "r3-license.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("r3 supplier license", "utf8").toString("base64")
          }
        ],
        qualificationType: "营业执照"
      });
    expect(supplier.status).toBe(201);
    const supplierId = supplier.body.supplier.id as string;

    const review = await request(runtime1.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 96, opinion: "R3 准入通过" });
    expect(review.status).toBe(201);

    const sample = await request(runtime1.app)
      .post(`/api/suppliers/${supplierId}/seal-samples`)
      .set("x-mock-user-id", "u1")
      .send({
        sampleName: "R3 布草封样",
        specification: "80支全棉",
        attachments: [
          {
            fileName: "r3-sample.png",
            contentType: "image/png",
            contentBase64: tinyPngBase64()
          }
        ]
      });
    expect(sample.status).toBe(201);

    const restricted = await request(runtime1.app).post(`/api/suppliers/${supplierId}/restrictions`).set("x-mock-user-id", "u1").send({ reason: "R3 风险控制测试" });
    expect(restricted.status).toBe(200);

    const supplierRow = single<{
      supplier_name: string;
      admission_status: string;
      supplier_type: string;
      social_credit_code: string;
      business_scope: string;
      restriction_reason: string;
      evaluation_score: number;
    }>(runtime1, "select supplier_name, admission_status, supplier_type, social_credit_code, business_scope, restriction_reason, evaluation_score from r2_suppliers where id = ?", supplierId);
    expect(supplierRow).toMatchObject({
      supplier_name: "R3 主源供应商",
      admission_status: "restricted",
      supplier_type: "manufacturer",
      social_credit_code: "91310000R3MASTER001",
      business_scope: "酒店客房物资生产和配送",
      restriction_reason: "R3 风险控制测试",
      evaluation_score: 96
    });

    expect(single<{ file_name: string }>(runtime1, "select file_name from r2_supplier_qualifications where supplier_id = ?", supplierId)?.file_name).toBe("r3-license.txt");
    expect(single<{ review_status: string }>(runtime1, "select review_status from r2_supplier_admission_reviews where supplier_id = ?", supplierId)?.review_status).toBe("passed");
    expect(single<{ sample_name: string }>(runtime1, "select sample_name from r2_supplier_seal_samples where supplier_id = ?", supplierId)?.sample_name).toBe("R3 布草封样");
    expect(single<{ restriction_status: string }>(runtime1, "select restriction_status from r2_supplier_restrictions where supplier_id = ?", supplierId)?.restriction_status).toBe("active");

    const runtime2 = boot(dataRoot);
    const afterReboot = await request(runtime2.app).get(`/api/suppliers/${supplierId}`).set("x-mock-user-id", "u2");
    expect(afterReboot.status).toBe(200);
    expect(afterReboot.body.supplier).toMatchObject({
      id: supplierId,
      socialCreditCode: "91310000R3MASTER001",
      restrictionReason: "R3 风险控制测试",
      evaluationScore: 96
    });
    expect(afterReboot.body.supplier.qualificationAttachments).toHaveLength(1);
    expect(afterReboot.body.supplier.sealSamples).toHaveLength(1);
  });

  it("enforces restriction, supplier isolation, auditor read-only and admin business isolation on R3 supplier flows", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({
      id: "u-r3-restricted-supplier",
      name: "R3 Restricted Supplier",
      roleId: "supplier",
      orgId: "org-hotel",
      supplierId: "sup-4"
    });
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, true);

    const document: ProcurementDocument = {
      id: "pd-r3-restricted",
      projectId: "p-pre",
      title: "R3 受限报名文件",
      versionNo: 103,
      status: "locked",
      reviewStatus: "approved",
      contentSummary: "R3 restricted supplier document",
      attachmentMetadata: [],
      createdBy: "u2",
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      publishedAt: "2026-06-25T00:00:00.000Z",
      lockedAt: "2026-06-25T00:00:00.000Z"
    };
    const announcement: ProcurementAnnouncement = {
      id: "ann-r3-restricted",
      projectId: "p-pre",
      documentId: document.id,
      procurementMethod: "internal_open",
      title: "R3 受限报名公告",
      contentSummary: "R3 restriction check",
      scope: "public_internal",
      status: "published",
      registrationDeadlineAt: "2099-12-31T17:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T18:00:00.000Z",
      createdBy: "u2",
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      publishedAt: "2026-06-25T00:00:00.000Z"
    };
    const invitation: SupplierInvitation = {
      id: "inv-r3-restricted",
      projectId: "p-pre",
      announcementId: announcement.id,
      supplierId: "sup-4",
      status: "sent",
      notificationStatus: "sent",
      notifiedAt: "2026-06-25T00:00:00.000Z",
      createdAt: "2026-06-25T00:00:00.000Z"
    };
    runtime.ctx.state.procurementDocuments.push(document);
    runtime.ctx.state.procurementAnnouncements.push(announcement);
    runtime.ctx.state.supplierInvitations.push(invitation);

    const registration = await request(runtime.app).post(`/api/announcements/${announcement.id}/registrations`).set("x-mock-user-id", "u-r3-restricted-supplier").send({ materialMetadata: [] });
    expect(registration.status).toBe(403);
    expect(registration.body.error.code).toBe("SUPPLIER_RESTRICTED");

    const ownSupplier = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", "u3");
    expect(ownSupplier.status).toBe(200);

    const otherSupplier = await request(runtime.app).get("/api/suppliers/sup-2").set("x-mock-user-id", "u3");
    expect(otherSupplier.status).toBe(403);
    expect(otherSupplier.body.error.code).toBe("SUPPLIER_SCOPE_DENIED");

    const auditorWrite = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u5")
      .send({ name: "审计不应创建供应商", category: "客房一次性用品" });
    expect(auditorWrite.status).toBe(403);
    expect(auditorWrite.body.error.code).toBe("PHASE1_BUSINESS_ACTION_DENIED");

    const adminRead = await request(runtime.app).get("/api/suppliers").set("x-mock-user-id", "u6");
    expect(adminRead.status).toBe(403);
    expect(adminRead.body.error.code).toBe("ADMIN_BUSINESS_DATA_DENIED");
  });

  it("writes product, SKU, image and quotation data through R2/R3 formal tables with listing constraints and reboot retention", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);
    const { productId, priceId, imageFileId } = await createR3ListedProduct(runtime1);

    const productRow = single<{
      product_name: string;
      product_status: string;
      packing_quantity: number;
      tax_rate: number;
      invoice_name: string;
      service_regions_json: string;
      source_type: string;
      source_project_id: string;
    }>(runtime1, "select product_name, product_status, packing_quantity, tax_rate, invoice_name, service_regions_json, source_type, source_project_id from r2_products where id = ?", productId);
    expect(productRow).toMatchObject({
      product_name: "R3 商品中心主源商品",
      product_status: "listed",
      packing_quantity: 12,
      tax_rate: 0.13,
      invoice_name: "客房一次性用品",
      source_type: "award_project",
      source_project_id: "p-award"
    });
    expect(JSON.parse(productRow?.service_regions_json ?? "[]")).toEqual(["华东", "华南"]);

    expect(single<{ sku_code: string; min_order_qty: number }>(runtime1, "select sku_code, min_order_qty from r2_skus where product_id = ?", productId)).toEqual({
      sku_code: "SKU-R3-001",
      min_order_qty: 2
    });
    expect(single<{ file_id: string }>(runtime1, "select file_id from r2_product_images where product_id = ?", productId)?.file_id).toBe(imageFileId);
    expect(single<{ quotation_status: string }>(runtime1, "select quotation_status from r2_supplier_quotations where id = ?", priceId)?.quotation_status).toBe("approved");
    expect(single<{ purchase_price: number; sale_price: number; tax_rate: number; delivery_days: number }>(
      runtime1,
      "select purchase_price, sale_price, tax_rate, delivery_days from r2_supplier_quotation_items where quotation_id = ?",
      priceId
    )).toEqual({
      purchase_price: 95,
      sale_price: 118,
      tax_rate: 0.13,
      delivery_days: 3
    });

    const noImage = await request(runtime1.app)
      .post("/api/mall/products")
      .set("x-mock-user-id", "u3")
      .send({
        name: "R3 不完整商品",
        category: "客房物资",
        brand: "R3Brand",
        unit: "箱",
        skuCode: "SKU-R3-BLOCKED",
        specification: "缺图片规格",
        supplierId: "sup-1",
        procurementCategory: "客房一次性用品"
      });
    expect(noImage.status).toBe(201);

    const blocked = await request(runtime1.app)
      .post(`/api/mall/products/${noImage.body.product.id}/status`)
      .set("x-mock-user-id", "u2")
      .send({
        status: "listed",
        sourceType: "award_project",
        sourceProjectId: "p-award",
        purchasePrice: 50,
        salePrice: 60,
        effectiveFrom: "2026-01-01"
      });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe("MALL_PRODUCT_LISTING_BLOCKED");

    const operatorProducts = await request(runtime1.app).get("/api/mall/products").set("x-mock-user-id", "u10");
    expect(operatorProducts.status).toBe(200);
    expect(operatorProducts.body.products.map((item: { id: string }) => item.id)).toContain(noImage.body.product.id);

    const hotelProducts = await request(runtime1.app).get("/api/mall/products").set("x-mock-user-id", "u8");
    expect(hotelProducts.status).toBe(200);
    expect(hotelProducts.body.products.map((item: { id: string }) => item.id)).not.toContain(noImage.body.product.id);

    const runtime2 = boot(dataRoot);
    const listedProducts = await request(runtime2.app).get("/api/mall/products").set("x-mock-user-id", "u2");
    expect(listedProducts.status).toBe(200);
    const rebootedProduct = listedProducts.body.products.find((item: { id: string }) => item.id === productId);
    expect(rebootedProduct).toMatchObject({
      id: productId,
      skuCode: "SKU-R3-001",
      invoiceName: "客房一次性用品",
      status: "listed"
    });
    expect(rebootedProduct.activePrice).toMatchObject({ salePrice: 118, deliveryDays: 3, sourceType: "pricing_report" });
    expect(rebootedProduct.priceSource).toMatchObject({ type: "pricing_report" });
  });

  it("records supplier performance evaluation into the R3 supplier center formal table", async () => {
    const runtime = boot();
    const order = runtime.ctx.state.purchaseOrders.find((item) => item.id === "po-award-1");
    expect(order).toBeTruthy();
    order!.status = "received";
    for (const lineItem of order!.lineItems) lineItem.receivedQuantity = lineItem.quantity;

    const evaluation = await request(runtime.app)
      .post("/api/project-workbench/purchase-orders/po-award-1/evaluations")
      .set("x-mock-user-id", "u2")
      .send({
        dimensions: { quality: 92, delivery: 91, service: 93, cooperation: 90, priceReasonableness: 89 },
        description: "R3 履约评价"
      });
    expect(evaluation.status).toBe(201);

    const row = single<{ supplier_id: string; score: number; evaluation_status: string }>(
      runtime,
      "select supplier_id, score, evaluation_status from r2_supplier_evaluations where id = ?",
      evaluation.body.supplierEvaluation.id
    );
    expect(row).toEqual({ supplier_id: "sup-1", score: 91, evaluation_status: "submitted_locked" });
    expect(single<{ evaluation_score: number }>(runtime, "select evaluation_score from r2_suppliers where id = ?", "sup-1")?.evaluation_score).toBe(91);
  });
});
