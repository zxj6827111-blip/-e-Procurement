import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m4d-fulfillment-"));
}

function boot() {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function one<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function expectNoSensitiveFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("actorRoleId");
  expect(json).not.toContain("assigneeUserId");
  expect(json).not.toContain("completedBy");
  expect(json).not.toContain("sourceTaskId");
  expect(json).not.toContain("opinion");
}

async function buildOrderSettlementFlow(runtime: ReturnType<typeof boot>) {
  const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u8").send({ productId: "mp-amenity-kit", quantity: 10 });
  expect(cart.status).toBe(200);

  const order = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u8").send({ shippingAddress: "M4-D hotel warehouse", invoiceTitle: "M4-D hotel invoice" });
  expect(order.status).toBe(201);
  expect(Object.keys(order.body).sort()).toEqual(["auditLogId", "fundAccount", "order", "paymentAdapterBoundary"]);
  expect(order.body.order.supplierId).toBe("sup-2");
  const orderId = order.body.order.id as string;

  const wrongSupplier = await request(runtime.app).post(`/api/mall/orders/${orderId}/confirm`).set("x-mock-user-id", "u11");
  expect(wrongSupplier.status).toBe(403);

  const confirmed = await request(runtime.app).post(`/api/mall/orders/${orderId}/confirm`).set("x-mock-user-id", "u14");
  expect(confirmed.status).toBe(200);
  expect(Object.keys(confirmed.body).sort()).toEqual(["auditLogId", "order"]);

  const shipped = await request(runtime.app).post(`/api/mall/orders/${orderId}/shipments`).set("x-mock-user-id", "u14").send({ carrier: "M4-D carrier", trackingNo: "M4D-TRK-1" });
  expect(shipped.status).toBe(201);
  expect(Object.keys(shipped.body).sort()).toEqual(["auditLogId", "order", "shipment"]);

  const received = await request(runtime.app).post(`/api/mall/orders/${orderId}/receive`).set("x-mock-user-id", "u8").send({ summary: "M4-D received" });
  expect(received.status).toBe(200);
  expect(Object.keys(received.body).sort()).toEqual(["auditLogId", "order", "shipments"]);

  const evaluation = await request(runtime.app)
    .post(`/api/mall/orders/${orderId}/evaluations`)
    .set("x-mock-user-id", "u8")
    .send({ quality: 5, delivery: 5, service: 5, description: "M4-D evaluation should not leak" });
  expect(evaluation.status).toBe(201);
  expect(Object.keys(evaluation.body).sort()).toEqual(["auditLogId", "evaluation"]);

  const paymentCaptured = await request(runtime.app).post(`/api/mall/orders/${orderId}/fund-ledger`).set("x-mock-user-id", "u13").send({ action: "capture" });
  expect(paymentCaptured.status).toBe(200);
  expect(Object.keys(paymentCaptured.body).sort()).toEqual(["account", "adapterBoundary", "auditLogId", "ledger", "order"]);

  const bill = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u9").send({ purchaseOrderId: orderId, period: "2026-10" });
  expect(bill.status).toBe(201);
  expect(Object.keys(bill.body).sort()).toEqual(["auditLogId", "settlementBill"]);
  const billId = bill.body.settlementBill.id as string;

  const submitted = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${billId}/submit`).set("x-mock-user-id", "u14");
  expect(submitted.status).toBe(200);
  expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "settlementBill", "workflow"]);

  const reviewed = await request(runtime.app)
    .post(`/api/settlement-finance/settlement-bills/${billId}/review`)
    .set("x-mock-user-id", "u9")
    .send({ approved: true, opinion: "M4-D settlement opinion should not leak" });
  expect(reviewed.status).toBe(200);
  expect(Object.keys(reviewed.body).sort()).toEqual(["auditLogId", "settlementBill"]);

  const material = await request(runtime.app)
    .post(`/api/settlement-finance/settlement-bills/${billId}/materials`)
    .set("x-mock-user-id", "u14")
    .send({ materialType: "delivery_note", fileName: "m4d-delivery-note.pdf" });
  expect(material.status).toBe(201);
  expect(Object.keys(material.body).sort()).toEqual(["auditLogId", "settlementMaterial"]);
  const materialId = material.body.settlementMaterial.id as string;

  const materialReview = await request(runtime.app)
    .post(`/api/settlement-finance/materials/${materialId}/review`)
    .set("x-mock-user-id", "u9")
    .send({ approved: true, opinion: "M4-D material opinion should not leak" });
  expect(materialReview.status).toBe(200);
  expect(Object.keys(materialReview.body).sort()).toEqual(["auditLogId", "settlementMaterial"]);

  const invoice = await request(runtime.app)
    .post(`/api/settlement-finance/settlement-bills/${billId}/invoices`)
    .set("x-mock-user-id", "u14")
    .send({ invoiceNo: "M4D-INV-001", invoiceType: "special_vat", issueDate: "2026-10-18", amount: bill.body.settlementBill.settlementAmount, taxRate: 0.13 });
  expect(invoice.status).toBe(201);
  expect(Object.keys(invoice.body).sort()).toEqual(["auditLogId", "invoice", "workflow"]);
  const invoiceId = invoice.body.invoice.id as string;

  const invoiceReview = await request(runtime.app)
    .post(`/api/settlement-finance/invoices/${invoiceId}/review`)
    .set("x-mock-user-id", "u9")
    .send({ approved: true, opinion: "M4-D invoice opinion should not leak" });
  expect(invoiceReview.status).toBe(200);
  expect(Object.keys(invoiceReview.body).sort()).toEqual(["auditLogId", "invoice"]);

  const payment = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${billId}/fund-ledger`).set("x-mock-user-id", "u9").send({ status: "payment_requested" });
  expect(payment.status).toBe(201);
  expect(Object.keys(payment.body).sort()).toEqual(["auditLogId", "fundLedgerEntry", "workflow"]);

  return {
    orderId,
    billId,
    invoiceId,
    paymentId: payment.body.fundLedgerEntry.id as string
  };
}

async function buildArchiveFlow(runtime: ReturnType<typeof boot>, projectId = "p-award") {
  const project = runtime.ctx.state.projects.find((item) => item.id === projectId);
  expect(project).toBeTruthy();
  project!.status = "evaluated";
  runtime.ctx.state.supplierEvaluations.push({
    id: `se-m4d-archive-${projectId}`,
    supplierId: "sup-1",
    projectId,
    contractId: "cl-award-1",
    dimensions: { quality: 91, delivery: 90, service: 92, cooperation: 90, priceReasonableness: 89 },
    score: 90,
    status: "submitted_locked",
    versionNo: 1,
    description: "M4-D archive closeout evidence",
    lockedAt: "2026-07-02T11:00:00.000Z",
    createdBy: "u2",
    createdAt: "2026-07-02T11:00:00.000Z"
  });

  const snapshot = await request(runtime.app).post(`/api/projects/${projectId}/archive-snapshot`).set("x-mock-user-id", "u2");
  expect(snapshot.status).toBe(201);
  expect(Object.keys(snapshot.body).sort()).toEqual(["archiveItems", "auditLogId", "projectId"]);

  const checked = await request(runtime.app).post(`/api/projects/${projectId}/archive-check`).set("x-mock-user-id", "u2");
  expect(checked.status).toBe(200);
  expect(Object.keys(checked.body).sort()).toEqual(["auditLogId", "missingItems", "projectId", "status"]);

  const missingItem = checked.body.missingItems[0] ?? snapshot.body.archiveItems.find((item: { requiredFlag?: boolean }) => item.requiredFlag) ?? snapshot.body.archiveItems[0];
  expect(missingItem).toBeTruthy();

  const requested = await request(runtime.app)
    .post(`/api/archive-items/${missingItem.id}/supplement-requests`)
    .set("x-mock-user-id", "u2")
    .send({ reason: "M4-D supplement request" });
  expect(requested.status).toBe(201);
  expect(Object.keys(requested.body).sort()).toEqual(["auditLogId", "supplementRequest"]);
  const requestId = requested.body.supplementRequest.id as string;

  const approved = await request(runtime.app).post(`/api/archive-supplement-requests/${requestId}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
  expect(approved.status).toBe(200);
  expect(Object.keys(approved.body).sort()).toEqual(["archiveItem", "auditLogId", "supplementRequest"]);

  const applied = await request(runtime.app)
    .post(`/api/archive-supplement-requests/${requestId}/apply`)
    .set("x-mock-user-id", "u2")
    .send({ fileName: "m4d-supplement.pdf", contentType: "application/pdf", sizeBytes: 128 });
  expect(applied.status).toBe(200);
  expect(Object.keys(applied.body).sort()).toEqual(["archiveItem", "auditLogId", "status", "supplementRequest"]);

  for (const item of runtime.ctx.state.archiveItems.filter((entry) => entry.projectId === projectId)) {
    item.collectedFlag = true;
    item.sealed = true;
    item.status = "complete";
  }

  const completeCheck = await request(runtime.app).post(`/api/projects/${projectId}/archive-check`).set("x-mock-user-id", "u2");
  expect(completeCheck.status).toBe(200);
  expect(completeCheck.body.status).toBe("complete");

  const sealed = await request(runtime.app).post(`/api/projects/${projectId}/archive-seal`).set("x-mock-user-id", "u2");
  expect(sealed.status).toBe(200);
  expect(Object.keys(sealed.body).sort()).toEqual(["archiveItems", "auditLogId", "projectId"]);

  const audited = await request(runtime.app).get(`/api/projects/${projectId}/archive-items`).set("x-mock-user-id", "u5");
  expect(audited.status).toBe(200);
  expect(Object.keys(audited.body).sort()).toEqual(["archiveItems"]);

  return { projectId };
}

describe("M4-D fulfillment, settlement, payment and archive processization", () => {
  it("seeds M4-D fulfillment process definitions as Process Layer tracking definitions", () => {
    const runtime = boot();
    const definitions = all<{ process_code: string; source_type: string; source_json: string }>(
      runtime,
      "select process_code, source_type, source_json from process_definitions where process_code in ('order_fulfillment','settlement','invoice','payment','archive') order by process_code"
    );
    expect(definitions.map((item) => item.process_code).sort()).toEqual(["archive", "invoice", "order_fulfillment", "payment", "settlement"]);
    expect(definitions.every((item) => item.source_type === "process_layer")).toBe(true);
    expect(definitions.every((item) => JSON.parse(item.source_json).phase === "M4-D")).toBe(true);
  });

  it("tracks order fulfillment, settlement, invoice and payment events without changing legacy response shapes", async () => {
    const runtime = boot();
    const { orderId, billId, invoiceId, paymentId } = await buildOrderSettlementFlow(runtime);

    expect(one(runtime, "select current_node_key, process_status, supplier_id from process_instances where business_type = 'order_fulfillment' and business_id = ?", orderId)).toEqual({
      current_node_key: "settlement_entry",
      process_status: "completed",
      supplier_id: "sup-2"
    });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'order_fulfillment' and business_id = ? order by created_at", orderId).map((row) => row.event_code)
    ).toEqual([
      "order_fulfillment.order_created",
      "order_fulfillment.supplier_confirmed",
      "order_fulfillment.shipped",
      "order_fulfillment.received",
      "order_fulfillment.evaluation_submitted"
    ]);
    expect(
      all<{ task_type: string; task_status: string }>(runtime, "select task_type, task_status from process_task_instances where business_type = 'order_fulfillment' and business_id = ? order by created_at", orderId)
    ).toEqual(
      expect.arrayContaining([
        { task_type: "order_fulfillment_supplier_confirm", task_status: "completed" },
        { task_type: "order_fulfillment_ship", task_status: "completed" },
        { task_type: "order_fulfillment_receive", task_status: "completed" },
        { task_type: "order_fulfillment_supplier_evaluation", task_status: "completed" }
      ])
    );

    expect(one(runtime, "select current_node_key, process_status, supplier_id from process_instances where business_type = 'settlement' and business_id = ?", billId)).toEqual({
      current_node_key: "payment_entry",
      process_status: "completed",
      supplier_id: "sup-2"
    });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'settlement' and business_id = ? order by created_at", billId).map((row) => row.event_code)
    ).toEqual(
      expect.arrayContaining([
        "settlement.generated",
        "settlement.submitted",
        "settlement.approved",
        "settlement.material_uploaded",
        "settlement.material_approved",
        "settlement.payment_requested"
      ])
    );

    expect(one(runtime, "select current_node_key, process_status, supplier_id from process_instances where business_type = 'invoice' and business_id = ?", invoiceId)).toEqual({
      current_node_key: "invoice_approved",
      process_status: "completed",
      supplier_id: "sup-2"
    });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'invoice' and business_id = ? order by created_at", invoiceId).map((row) => row.event_code)
    ).toEqual(["invoice.submitted_process", "invoice.approved_process"]);

    expect(one(runtime, "select current_node_key, process_status, supplier_id from process_instances where business_type = 'payment' and business_id = ?", paymentId)).toEqual({
      current_node_key: "payment_review",
      process_status: "running",
      supplier_id: "sup-2"
    });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'payment' and business_id = ? order by created_at", paymentId).map((row) => row.event_code)
    ).toEqual(["payment.requested"]);

    expectNoSensitiveFields(await request(runtime.app).get(`/api/process/business/order_fulfillment/${orderId}`).set("x-mock-user-id", "u14").then((res) => res.body));
  });

  it("tracks archive snapshot, check, supplement, seal and audit-read events as a read-only Process Layer flow", async () => {
    const runtime = boot();
    const { projectId } = await buildArchiveFlow(runtime);

    expect(one(runtime, "select current_node_key, process_status, project_id from process_instances where business_type = 'archive' and business_id = ?", projectId)).toEqual({
      current_node_key: "audit_read",
      process_status: "completed",
      project_id: projectId
    });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'archive' and business_id = ? order by created_at", projectId).map((row) => row.event_code)
    ).toEqual(
      expect.arrayContaining([
        "archive.snapshot_created",
        "archive.checked",
        "archive.supplement_requested",
        "archive.supplement_approved",
        "archive.supplement_applied",
        "archive.sealed",
        "archive.audit_viewed"
      ])
    );
    expect(
      all<{ task_type: string; task_status: string }>(runtime, "select task_type, task_status from process_task_instances where business_type = 'archive' and business_id = ?", projectId)
    ).toEqual(
      expect.arrayContaining([
        { task_type: "archive_completeness_check", task_status: "completed" },
        { task_type: "archive_supplement_request", task_status: "completed" },
        { task_type: "archive_supplement_approval", task_status: "completed" },
        { task_type: "archive_supplement_apply", task_status: "completed" },
        { task_type: "archive_seal", task_status: "completed" }
      ])
    );

    const auditorTimeline = await request(runtime.app).get(`/api/process/business/archive/${projectId}`).set("x-mock-user-id", "u5");
    expect(auditorTimeline.status).toBe(200);
    expect(auditorTimeline.body.processInstances).toHaveLength(1);
    expect(auditorTimeline.body.tasks).toHaveLength(0);
    expectNoSensitiveFields(auditorTimeline.body);
  });

  it("keeps supplier, finance, expert, auditor and admin boundaries for M4-D process views and tasks", async () => {
    const runtime = boot();
    const { orderId, billId, invoiceId, paymentId } = await buildOrderSettlementFlow(runtime);
    const { projectId } = await buildArchiveFlow(runtime);

    const ownerSupplierOrder = await request(runtime.app).get(`/api/process/business/order_fulfillment/${orderId}`).set("x-mock-user-id", "u14");
    expect(ownerSupplierOrder.status).toBe(200);
    expect(ownerSupplierOrder.body.processInstances).toHaveLength(1);
    expectNoSensitiveFields(ownerSupplierOrder.body);

    const otherSupplierOrder = await request(runtime.app).get(`/api/process/business/order_fulfillment/${orderId}`).set("x-mock-user-id", "u11");
    expect(otherSupplierOrder.status).toBe(200);
    expect(otherSupplierOrder.body.processInstances).toHaveLength(0);

    const financeOrder = await request(runtime.app).get(`/api/process/business/order_fulfillment/${orderId}`).set("x-mock-user-id", "u9");
    expect(financeOrder.status).toBe(200);
    expect(financeOrder.body.processInstances).toHaveLength(0);

    for (const [businessType, businessId] of [
      ["settlement", billId],
      ["invoice", invoiceId],
      ["payment", paymentId]
    ] as const) {
      const financeTimeline = await request(runtime.app).get(`/api/process/business/${businessType}/${businessId}`).set("x-mock-user-id", "u9");
      expect(financeTimeline.status).toBe(200);
      expect(financeTimeline.body.processInstances).toHaveLength(1);
      expectNoSensitiveFields(financeTimeline.body);

      const ownerSupplier = await request(runtime.app).get(`/api/process/business/${businessType}/${businessId}`).set("x-mock-user-id", "u14");
      expect(ownerSupplier.status).toBe(200);
      expect(ownerSupplier.body.processInstances).toHaveLength(1);

      const otherSupplier = await request(runtime.app).get(`/api/process/business/${businessType}/${businessId}`).set("x-mock-user-id", "u11");
      expect(otherSupplier.status).toBe(200);
      expect(otherSupplier.body.processInstances).toHaveLength(0);
    }

    const expertTimeline = await request(runtime.app).get(`/api/process/business/settlement/${billId}`).set("x-mock-user-id", "u7");
    expect(expertTimeline.status).toBe(200);
    expect(expertTimeline.body.processInstances).toHaveLength(0);

    const adminTimeline = await request(runtime.app).get(`/api/process/business/settlement/${billId}`).set("x-mock-user-id", "u6");
    expect(adminTimeline.status).toBe(200);
    expect(adminTimeline.body.processInstances).toHaveLength(0);

    const auditorSettlement = await request(runtime.app).get(`/api/process/business/settlement/${billId}`).set("x-mock-user-id", "u5");
    expect(auditorSettlement.status).toBe(200);
    expect(auditorSettlement.body.processInstances).toHaveLength(1);
    expect(auditorSettlement.body.tasks).toHaveLength(0);
    expectNoSensitiveFields(auditorSettlement.body);

    const auditorArchive = await request(runtime.app).get(`/api/process/business/archive/${projectId}`).set("x-mock-user-id", "u5");
    expect(auditorArchive.status).toBe(200);
    expect(auditorArchive.body.processInstances).toHaveLength(1);
    expect(auditorArchive.body.tasks).toHaveLength(0);

    const adminArchive = await request(runtime.app).get(`/api/process/business/archive/${projectId}`).set("x-mock-user-id", "u6");
    expect(adminArchive.status).toBe(200);
    expect(adminArchive.body.processInstances).toHaveLength(0);

    const supplierTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u14");
    expect(supplierTasks.status).toBe(200);
    expect(supplierTasks.body.processTasks.some((task: { businessType: string; businessId: string }) => task.businessType === "settlement" && task.businessId === billId)).toBe(true);
    expectNoSensitiveFields(supplierTasks.body);

    const financeTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u9");
    expect(financeTasks.status).toBe(200);
    expect(financeTasks.body.processTasks.some((task: { businessType: string; businessId: string }) => task.businessType === "payment" && task.businessId === paymentId)).toBe(true);
    expect(financeTasks.body.processTasks.every((task: { businessType: string }) => ["settlement", "invoice", "payment"].includes(task.businessType))).toBe(true);
    expectNoSensitiveFields(financeTasks.body);
  });
});
