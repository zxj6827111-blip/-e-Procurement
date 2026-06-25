import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import { canR2Transition } from "../src/runtime/index.js";
import type { ArchiveItem, ProcurementAnnouncement, ProcurementDocument, SupplierInvitation, User } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r2-"));
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

function countRows(runtime: ReturnType<typeof boot>, tableName: string) {
  return runtime.ctx.runtimeDb.db.prepare(`select count(*) as count from ${tableName}`).get() as { count: number };
}

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: Array<string | number | null>) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

async function createListedProduct(runtime: ReturnType<typeof boot>) {
  const image = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", "u3")
    .send({
      originalName: "r2-product.png",
      contentType: "image/png",
      contentBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
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
      name: "R2 正式表测试商品",
      category: "客房物资",
      brand: "R2Brand",
      unit: "箱",
      skuCode: "SKU-R2-001",
      specification: "R2 规格",
      supplierId: "sup-1",
      serviceRegions: ["华东"],
      procurementCategory: "客房一次性用品",
      imageFileIds: [image.body.file.id]
    });
  expect(product.status).toBe(201);

  const price = await request(runtime.app)
    .post(`/api/mall/products/${product.body.product.id}/prices`)
    .set("x-mock-user-id", "u3")
    .send({ price: 88.5, effectiveFrom: "2026-07-01", effectiveTo: "2026-12-31" });
  expect(price.status).toBe(201);

  const approved = await request(runtime.app)
    .post(`/api/mall/prices/${price.body.price.id}/approve`)
    .set("x-mock-user-id", "u2")
    .send({ approved: true });
  expect(approved.status).toBe(200);

  const listed = await request(runtime.app)
    .post(`/api/mall/products/${product.body.product.id}/status`)
    .set("x-mock-user-id", "u2")
    .send({ status: "listed" });
  expect(listed.status).toBe(200);

  return { productId: product.body.product.id as string, priceId: price.body.price.id as string, imageFileId: image.body.file.id as string };
}

describe("R2 data model governance baseline", () => {
  it("initializes an empty sqlite database with idempotent R2 baseline tables and seed/runtime data migration", () => {
    const runtime = boot();

    expect(countRows(runtime, "r2_business_object_registry").count).toBeGreaterThanOrEqual(30);
    expect(countRows(runtime, "r2_state_transition_rules").count).toBeGreaterThanOrEqual(20);
    expect(countRows(runtime, "r2_procurement_requests").count).toBe(runtime.ctx.state.procurementRequests.length);
    expect(countRows(runtime, "r2_bids").count).toBe(runtime.ctx.state.bids.length);
    expect(countRows(runtime, "r2_purchase_orders").count).toBe(runtime.ctx.state.purchaseOrders.length);
    expect(countRows(runtime, "r2_settlement_materials").count).toBe(runtime.ctx.state.settlementMaterials.length);
    expect(countRows(runtime, "audit_logs").count).toBeGreaterThanOrEqual(runtime.ctx.state.auditLogs.length);

    const run = single<{ id: string; source_key: string; status: string }>(
      runtime,
      "select id, source_key, status from r2_migration_runs where id = ?",
      "r2-baseline-v1"
    );
    expect(run).toEqual({ id: "r2-baseline-v1", source_key: "runtime_state.seed_state", status: "applied" });

    runtime.ctx.runtimeDb.db
      .prepare(
        "insert into r2_amount_reconciliation_lines (id, source_type, source_id, project_id, supplier_id, expected_amount, actual_amount, reconciliation_status, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run("manual-r2-preserve", "manual", "manual-source", null, null, 1, 1, "matched", "2026-06-25T00:00:00.000Z");

    runtime.ctx.stateStore.saveState(runtime.ctx.state);

    const preserved = single<{ id: string }>(runtime, "select id from r2_amount_reconciliation_lines where id = ?", "manual-r2-preserve");
    expect(preserved?.id).toBe("manual-r2-preserve");
  });

  it("writes core API changes into R2 formal tables and retains them after API restart", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);

    const created = await request(runtime1.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "R2 持久化采购申请",
        orgId: "org-hotel",
        requestDepartment: "客房部",
        requesterName: "R2 Tester",
        category: "客房一次性用品",
        budgetLabel: "R2 预算",
        budgetAmount: 12000,
        purpose: "验证 R2 正式表和重启留存",
        lineItems: [
          {
            id: "r2-line-001",
            itemName: "R2 测试物资",
            specification: "标准",
            quantity: 20,
            unit: "箱",
            estimatedUnitPrice: 600,
            budgetAmount: 12000
          }
        ]
      });
    expect(created.status).toBe(201);

    const requestRow = single<{ title: string; request_status: string; budget_amount: number }>(
      runtime1,
      "select title, request_status, budget_amount from r2_procurement_requests where id = ?",
      created.body.procurementRequest.id
    );
    expect(requestRow).toEqual({ title: "R2 持久化采购申请", request_status: "draft", budget_amount: 12000 });

    const lineRow = single<{ item_name: string; quantity: number }>(runtime1, "select item_name, quantity from r2_procurement_request_items where id = ?", "r2-line-001");
    expect(lineRow).toEqual({ item_name: "R2 测试物资", quantity: 20 });

    const runtime2 = boot(dataRoot);
    const rebootedRow = single<{ title: string }>(runtime2, "select title from r2_procurement_requests where id = ?", created.body.procurementRequest.id);
    expect(rebootedRow?.title).toBe("R2 持久化采购申请");
  });

  it("syncs supplier, product, quotation, order and settlement domains through formal R2 tables", async () => {
    const runtime = boot();
    const { productId, priceId, imageFileId } = await createListedProduct(runtime);

    const productRow = single<{ product_name: string; product_status: string; supplier_id: string }>(
      runtime,
      "select product_name, product_status, supplier_id from r2_products where id = ?",
      productId
    );
    expect(productRow).toEqual({ product_name: "R2 正式表测试商品", product_status: "listed", supplier_id: "sup-1" });

    const skuRow = single<{ sku_code: string; product_id: string }>(runtime, "select sku_code, product_id from r2_skus where product_id = ?", productId);
    expect(skuRow).toEqual({ sku_code: "SKU-R2-001", product_id: productId });

    const imageRow = single<{ file_id: string }>(runtime, "select file_id from r2_product_images where product_id = ? and file_id = ?", productId, imageFileId);
    expect(imageRow?.file_id).toBe(imageFileId);

    const quotationRow = single<{ id: string; supplier_id: string; quotation_status: string }>(
      runtime,
      "select id, supplier_id, quotation_status from r2_supplier_quotations where id = ?",
      priceId
    );
    expect(quotationRow).toEqual({ id: priceId, supplier_id: "sup-1", quotation_status: "approved" });

    const settlement = await request(runtime.app)
      .post("/api/project-workbench/purchase-orders/po-award-1/settlement-materials")
      .set("x-mock-user-id", "u3")
      .send({ materialType: "invoice", fileName: "r2-settlement.pdf" });
    expect(settlement.status).toBe(201);

    const settlementRow = single<{ material_type: string; material_status: string; supplier_id: string }>(
      runtime,
      "select material_type, material_status, supplier_id from r2_settlement_materials where id = ?",
      settlement.body.settlementMaterial.id
    );
    expect(settlementRow).toEqual({ material_type: "invoice", material_status: "pending_verification", supplier_id: "sup-1" });

    const supplierRow = single<{ admission_status: string; restriction_reason: string | null }>(
      runtime,
      "select admission_status, restriction_reason from r2_suppliers where id = ?",
      "sup-4"
    );
    expect(supplierRow?.admission_status).toBe("restricted");
  });

  it("keeps state-machine and business constraints from being bypassed by the R2 data layer", async () => {
    const runtime = boot();

    expect(canR2Transition("procurement_request", "draft", "submitted")).toBe(true);
    expect(canR2Transition("procurement_request", "draft", "project_created")).toBe(false);
    expect(canR2Transition("purchase_order", "pending_confirmation", "closed")).toBe(false);
    expect(canR2Transition("supplier", "admitted", "restricted")).toBe(true);

    const nonSequential = await request(runtime.app).post("/api/projects/p-pre/transitions").set("x-mock-user-id", "u2").send({ status: "closed" });
    expect(nonSequential.status).toBe(400);
    expect(nonSequential.body.error.code).toBe("PROJECT_STATUS_TRANSITION_DENIED");

    const restrictedUser: User = {
      id: "u-r2-restricted-supplier",
      name: "R2 Restricted Supplier",
      roleId: "supplier",
      orgId: "org-hotel",
      supplierId: "sup-4"
    };
    runtime.ctx.state.users.push(restrictedUser);
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, true);
    const announcement: ProcurementAnnouncement = {
      id: "ann-r2-restricted",
      projectId: "p-pre",
      documentId: "pd-r2-restricted",
      procurementMethod: "internal_open",
      title: "R2 黑名单校验公告",
      contentSummary: "R2 registration restriction check",
      scope: "public_internal",
      status: "published",
      registrationDeadlineAt: "2099-12-31T17:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T18:00:00.000Z",
      createdBy: "u2",
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      publishedAt: "2026-06-25T00:00:00.000Z"
    };
    const document: ProcurementDocument = {
      id: "pd-r2-restricted",
      projectId: "p-pre",
      title: "R2 黑名单校验文件",
      versionNo: 99,
      status: "locked",
      reviewStatus: "approved",
      contentSummary: "R2 restricted supplier document",
      attachmentMetadata: [],
      createdBy: "u2",
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
      publishedAt: "2026-06-25T00:00:00.000Z",
      lockedAt: "2026-06-25T00:00:00.000Z"
    };
    const invitation: SupplierInvitation = {
      id: "inv-r2-restricted",
      projectId: "p-pre",
      announcementId: "ann-r2-restricted",
      supplierId: "sup-4",
      status: "sent",
      notificationStatus: "sent",
      notifiedAt: "2026-06-25T00:00:00.000Z",
      createdAt: "2026-06-25T00:00:00.000Z"
    };
    runtime.ctx.state.procurementDocuments.push(document);
    runtime.ctx.state.procurementAnnouncements.push(announcement);
    runtime.ctx.state.supplierInvitations.push(invitation);

    const restrictedRegistration = await request(runtime.app)
      .post("/api/announcements/ann-r2-restricted/registrations")
      .set("x-mock-user-id", "u-r2-restricted-supplier")
      .send({ materialMetadata: [] });
    expect(restrictedRegistration.status).toBe(403);
    expect(restrictedRegistration.body.error.code).toBe("SUPPLIER_RESTRICTED");

    const sealedArchive: ArchiveItem = {
      id: "ai-r2-sealed-award",
      projectId: "p-award",
      itemName: "R2 sealed archive",
      requiredFlag: true,
      collectedFlag: true,
      sealed: true,
      status: "sealed",
      snapshotJson: { sealedAt: "2026-06-25T00:00:00.000Z" }
    };
    runtime.ctx.state.archiveItems.push(sealedArchive);

    const sealedSettlement = await request(runtime.app)
      .post("/api/project-workbench/purchase-orders/po-award-1/settlement-materials")
      .set("x-mock-user-id", "u3")
      .send({ materialType: "invoice", fileName: "sealed.pdf" });
    expect(sealedSettlement.status).toBe(403);
    expect(sealedSettlement.body.error.code).toBe("ARCHIVE_ALREADY_SEALED");
  });

  it("preserves supplier isolation, audit read-only and pre-deadline bid confidentiality", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({
      id: "u-r2-other-supplier",
      name: "R2 Other Supplier",
      roleId: "supplier",
      orgId: "org-hotel",
      supplierId: "sup-2"
    });
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, true);

    const summary = await request(runtime.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", "u2");
    expect(summary.status).toBe(200);
    expect(summary.body.beforeDeadline).toBe(true);
    expect(summary.body.bids).toBeUndefined();
    expect(summary.body.submittedCount).toBeTypeOf("number");

    const auditDenied = await request(runtime.app).get("/api/audit-logs").set("x-mock-user-id", "u3");
    expect(auditDenied.status).toBe(403);
    expect(auditDenied.body.error.code).toBe("AUDIT_LOG_READ_DENIED");

    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "r2-qualification.png",
        contentType: "image/png",
        contentBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        attachmentKind: "supplier_qualification_image",
        objectType: "supplier",
        objectId: "sup-1",
        supplierId: "sup-1"
      });
    expect(uploaded.status).toBe(201);

    const deniedDownload = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u-r2-other-supplier");
    expect(deniedDownload.status).toBe(403);
    expect(deniedDownload.body.error.code).toBe("SUPPLIER_FILE_DOWNLOAD_DENIED");

    const fileAccessLog = single<{ object_id: string; object_type: string; access_result: string }>(
      runtime,
      "select object_id, object_type, access_result from r2_file_access_logs where object_id = ? order by accessed_at desc limit 1",
      "sup-1"
    );
    expect(fileAccessLog).toMatchObject({ object_id: "sup-1", object_type: "supplier", access_result: "recorded" });
  });
});
