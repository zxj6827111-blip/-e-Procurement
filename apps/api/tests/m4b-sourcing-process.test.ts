import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { Supplier, User } from "../src/types.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m4b-sourcing-"));
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

function addQuotationSupplier(runtime: ReturnType<typeof boot>, supplierId: string, userId: string, category: string) {
  const now = "2026-06-28T00:00:00.000Z";
  const supplier: Supplier = {
    id: supplierId,
    name: `M4-B isolated supplier ${supplierId}`,
    status: "已准入",
    admissionStatus: "admitted",
    contactName: "M4-B tester",
    contactPhone: "13800019999",
    categoryAuth: [category],
    categoryAuthorizations: [
      {
        category,
        status: "active",
        authorizedAt: now,
        expiresAt: "2099-12-31T23:59:59.000Z"
      }
    ],
    serviceRegions: [
      {
        id: `sr-${supplierId}`,
        region: "M4-B",
        storeName: "M4-B isolated store",
        category,
        status: "active"
      }
    ],
    qualification: "有效",
    qualificationAttachments: [
      {
        id: `sqa-${supplierId}-license`,
        fileName: `${supplierId}-license.pdf`,
        qualificationType: "营业执照",
        validUntil: "2099-12-31",
        uploadedAt: now
      }
    ],
    risk: "正常",
    evaluationScore: 90
  };
  const user: User = {
    id: userId,
    name: `M4-B quote user ${supplierId}`,
    roleId: "supplier_quotation",
    supplierId,
    orgId: "org-hotel"
  };
  runtime.ctx.state.suppliers.push(supplier);
  runtime.ctx.state.users.push(user);
  runtime.ctx.r3SupplierProductRepository.upsertSupplier(supplier);
  return { supplier, user };
}

async function createLockedDocument(runtime: ReturnType<typeof boot>, projectId: string) {
  const created = await request(runtime.app)
    .post(`/api/projects/${projectId}/procurement-documents`)
    .set("x-mock-user-id", "u2")
    .send({ title: `M4-B document ${projectId}`, contentSummary: "M4-B sourcing document" });
  expect(created.status).toBe(201);
  const published = await request(runtime.app).post(`/api/procurement-documents/${created.body.procurementDocument.id}/publish`).set("x-mock-user-id", "u2");
  expect(published.status).toBe(200);
  return published.body.procurementDocument as { id: string };
}

async function createAndPublishAnnouncement(runtime: ReturnType<typeof boot>, projectId: string, procurementMethod: string, supplierIds: string[]) {
  const document = await createLockedDocument(runtime, projectId);
  const created = await request(runtime.app)
    .post(`/api/projects/${projectId}/announcements`)
    .set("x-mock-user-id", "u2")
    .send({
      documentId: document.id,
      title: `M4-B announcement ${projectId}`,
      procurementMethod,
      scope: "invited_suppliers",
      registrationDeadlineAt: "2099-12-20T17:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T17:00:00.000Z"
    });
  expect(created.status).toBe(201);
  expect(Object.keys(created.body).sort()).toEqual(["announcement", "auditLogId"]);
  const published = await request(runtime.app).post(`/api/announcements/${created.body.announcement.id}/publish`).set("x-mock-user-id", "u2").send({ supplierIds });
  expect(published.status).toBe(200);
  expect(Object.keys(published.body).sort()).toEqual(["announcement", "auditLogId", "invitations"]);
  return published.body.announcement as { id: string };
}

describe("M4-B RFQ / TENDER / DIRECT sourcing process", () => {
  it("seeds RFQ, TENDER and DIRECT process definitions without promoting Process Layer to the execution source", () => {
    const runtime = boot();
    const definitions = all<{ process_code: string; source_type: string; source_json: string }>(
      runtime,
      "select process_code, source_type, source_json from process_definitions where process_code in ('sourcing','rfq','tender','direct_purchase') order by process_code"
    );
    expect(definitions.map((item) => item.process_code).sort()).toEqual(["direct_purchase", "rfq", "sourcing", "tender"]);
    expect(definitions.every((item) => item.source_type === "process_layer")).toBe(true);
    expect(definitions.every((item) => JSON.parse(item.source_json).phase === "M4-B")).toBe(true);
  });

  it("tracks tender announcement, supplier registration, qualification, quote, cutoff, lock and comparison without changing legacy response shapes", async () => {
    const runtime = boot();
    const projectId = "p-pre";
    const project = runtime.ctx.state.projects.find((item) => item.id === projectId)!;
    const { supplier, user } = addQuotationSupplier(runtime, "sup-m4b-tender", "u-m4b-tender-quote", project.category);
    const announcement = await createAndPublishAnnouncement(runtime, projectId, "internal_open", [supplier.id]);

    const registration = await request(runtime.app).post(`/api/announcements/${announcement.id}/registrations`).set("x-mock-user-id", user.id).send({ materialMetadata: [] });
    expect(registration.status).toBe(201);
    expect(Object.keys(registration.body).sort()).toEqual(["auditLogId", "registration"]);

    const qualified = await request(runtime.app).post(`/api/registrations/${registration.body.registration.id}/qualify`).set("x-mock-user-id", "u2").send({ status: "qualified" });
    expect(qualified.status).toBe(200);
    expect(Object.keys(qualified.body).sort()).toEqual(["auditLogId", "registration"]);

    const draft = await request(runtime.app).post(`/api/projects/${projectId}/bids`).set("x-mock-user-id", user.id).send({ amount: 1200, deliveryDays: 5, responseSummary: "M4-B tender quote" });
    expect(draft.status).toBe(201);
    expect(Object.keys(draft.body).sort()).toEqual(["auditLogId", "bid"]);

    const submitted = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/submit`).set("x-mock-user-id", user.id);
    expect(submitted.status).toBe(200);
    expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "bid", "version"]);

    const cutoff = await request(runtime.app).post(`/api/projects/${projectId}/bids/cutoff`).set("x-mock-user-id", "u2").send({ action: "manual_cutoff" });
    expect(cutoff.status).toBe(200);
    expect(Object.keys(cutoff.body).sort()).toEqual(["auditLogId", "beforeDeadline", "cutoffAt", "previousDeadline", "project"]);

    const lock = await request(runtime.app).post(`/api/projects/${projectId}/bids/lock`).set("x-mock-user-id", "u2");
    expect(lock.status).toBe(200);
    expect(Object.keys(lock.body).sort()).toEqual(["auditLogId", "lockedCount", "project"]);

    const comparison = await request(runtime.app).post(`/api/projects/${projectId}/comparison-report`).set("x-mock-user-id", "u2");
    expect(comparison.status).toBe(201);
    expect(Object.keys(comparison.body).sort()).toEqual(["auditLogId", "comparisonReport"]);

    const instance = one<{ current_node_key: string; process_status: string; project_id: string }>(
      runtime,
      "select current_node_key, process_status, project_id from process_instances where business_type = 'tender' and business_id = ?",
      projectId
    );
    expect(instance).toEqual({ current_node_key: "review_preparation", process_status: "completed", project_id: projectId });

    const eventCodes = all<{ event_code: string }>(
      runtime,
      "select event_code from process_events where business_type = 'tender' and business_id = ? order by created_at",
      projectId
    ).map((row) => row.event_code);
    expect(eventCodes).toEqual(
      expect.arrayContaining([
        "tender.project_created",
        "tender.announcement_created",
        "tender.announcement_published",
        "tender.supplier_invited",
        "tender.supplier_registered",
        "tender.supplier_registration_qualified",
        "tender.quote_draft_created",
        "tender.quote_submitted",
        "tender.bid_cutoff_completed",
        "tender.bid_locked",
        "tender.comparison_report_generated"
      ])
    );

    const taskTypes = all<{ task_type: string; task_status: string }>(
      runtime,
      "select task_type, task_status from process_task_instances where business_type = 'tender' and business_id = ?",
      projectId
    );
    expect(taskTypes).toEqual(
      expect.arrayContaining([
        { task_type: "sourcing_prepare_announcement", task_status: "completed" },
        { task_type: "sourcing_supplier_registration", task_status: "completed" },
        { task_type: "sourcing_registration_qualification", task_status: "completed" },
        { task_type: "sourcing_supplier_quote", task_status: "completed" },
        { task_type: "sourcing_bid_cutoff", task_status: "completed" },
        { task_type: "sourcing_bid_lock", task_status: "completed" }
      ])
    );

    const supplierTimeline = await request(runtime.app).get(`/api/process/business/tender/${projectId}`).set("x-mock-user-id", user.id);
    expect(supplierTimeline.status).toBe(200);
    expect(supplierTimeline.body.processInstances).toHaveLength(1);
    expect(supplierTimeline.body.tasks.every((task: { supplierId?: string }) => !task.supplierId || task.supplierId === supplier.id)).toBe(true);
    expectNoSensitiveFields(supplierTimeline.body);

    const supplierTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", user.id);
    expect(supplierTasks.status).toBe(200);
    expectNoSensitiveFields(supplierTasks.body);

    const auditor = await request(runtime.app).get(`/api/process/business/tender/${projectId}`).set("x-mock-user-id", "u5");
    expect(auditor.status).toBe(200);
    expect(auditor.body.processInstances).toHaveLength(1);
    expect(auditor.body.tasks).toHaveLength(0);
    expectNoSensitiveFields(auditor.body);

    const admin = await request(runtime.app).get(`/api/process/business/tender/${projectId}`).set("x-mock-user-id", "u6");
    expect(admin.status).toBe(200);
    expect(admin.body.processInstances).toHaveLength(0);

    const finance = await request(runtime.app).post(`/api/projects/${projectId}/bids/cutoff`).set("x-mock-user-id", "u9").send({ action: "manual_cutoff" });
    expect(finance.status).toBe(403);
  });

  it("tracks RFQ comparison path and keeps supplier business data scoped", async () => {
    const runtime = boot();
    const projectId = "p-food";
    const project = runtime.ctx.state.projects.find((item) => item.id === projectId)!;
    const { supplier, user } = addQuotationSupplier(runtime, "sup-m4b-rfq", "u-m4b-rfq-quote", project.category);
    const announcement = await createAndPublishAnnouncement(runtime, projectId, "comparison", [supplier.id]);

    const registration = await request(runtime.app).post(`/api/announcements/${announcement.id}/registrations`).set("x-mock-user-id", user.id).send({ materialMetadata: [] });
    expect(registration.status).toBe(201);

    const draft = await request(runtime.app).post(`/api/projects/${projectId}/bids`).set("x-mock-user-id", user.id).send({ amount: 900, deliveryDays: 2, responseSummary: "M4-B RFQ quote" });
    expect(draft.status).toBe(201);
    const submitted = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/submit`).set("x-mock-user-id", user.id);
    expect(submitted.status).toBe(200);
    await request(runtime.app).post(`/api/projects/${projectId}/bids/cutoff`).set("x-mock-user-id", "u2").send({ action: "manual_cutoff" });
    await request(runtime.app).post(`/api/projects/${projectId}/bids/lock`).set("x-mock-user-id", "u2");
    const comparison = await request(runtime.app).post(`/api/projects/${projectId}/comparison-report`).set("x-mock-user-id", "u2");
    expect(comparison.status).toBe(201);

    expect(one(runtime, "select current_node_key, process_status from process_instances where business_type = 'rfq' and business_id = ?", projectId)).toEqual({
      current_node_key: "award_preparation",
      process_status: "completed"
    });
    const events = all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'rfq' and business_id = ? order by created_at", projectId).map((row) => row.event_code);
    expect(events).toEqual(expect.arrayContaining(["rfq.announcement_published", "rfq.supplier_registered", "rfq.quote_submitted", "rfq.bid_cutoff_completed", "rfq.comparison_report_generated"]));

    const otherSupplierSummary = await request(runtime.app).get(`/api/projects/${projectId}/bids/summary`).set("x-mock-user-id", "u14");
    expect(otherSupplierSummary.status).toBe(403);

    const readable = await request(runtime.app).get(`/api/process/business/rfq/${projectId}`).set("x-mock-user-id", "u2");
    expect(readable.status).toBe(200);
    expectNoSensitiveFields(readable.body);
  });

  it("supports DIRECT process instance and tasks as a minimal processized entry without implementing a full direct-purchase production loop", () => {
    const runtime = boot();
    const buyer = runtime.ctx.state.users.find((user) => user.id === "u2")!;
    const project = {
      ...runtime.ctx.state.projects.find((item) => item.id === "p-pre")!,
      id: "p-direct-m4b",
      code: "CG-DIRECT-M4B",
      name: "M4-B direct purchase placeholder",
      type: "direct_purchase",
      participantSupplierIds: []
    };
    runtime.ctx.state.projects.push(project);
    runtime.ctx.processService.startSourcingProcess({ project, actor: buyer, source: "m4b-direct-test" });

    expect(one(runtime, "select current_node_key, process_status from process_instances where business_type = 'direct_purchase' and business_id = ?", project.id)).toEqual({
      current_node_key: "demand_confirmed",
      process_status: "running"
    });
    expect(one(runtime, "select task_type, task_status from process_task_instances where business_type = 'direct_purchase' and business_id = ?", project.id)).toEqual({
      task_type: "direct_supplier_confirmation",
      task_status: "pending"
    });
  });
});
