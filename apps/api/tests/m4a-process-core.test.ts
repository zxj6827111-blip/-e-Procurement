import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m4a-process-"));
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

async function createReadyRequest(runtime: ReturnType<typeof boot>, title = "M4-A process request") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", "u8")
    .send({
      title,
      orgId: "org-hotel",
      requestDepartment: "M4-A department",
      requesterName: "M4-A requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [{ itemName: "M4-A item", specification: "standard", quantity: 1, unit: "piece", budgetAmount: 1000 }]
    });
  expect(created.status).toBe(201);
  expect(Object.keys(created.body).sort()).toEqual(["auditLogId", "procurementRequest"]);
  return created.body.procurementRequest as { id: string };
}

describe("M4-A supplier onboarding and procurement request process core", () => {
  it("creates supplier onboarding process instance, role tasks and sanitized timeline through registration, profile, review and activation", async () => {
    const runtime = boot();
    const registered = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        name: "M4A准入供应商",
        category: "客房布草",
        socialCreditCode: "91310000M4A000001",
        legalRepresentative: "张三",
        contactName: "李四",
        contactPhone: "13900000001",
        agreementAccepted: true,
        captchaCode: "123456",
        serviceRegions: [{ region: "上海", storeName: "滨江店", category: "客房布草" }]
      });
    expect(registered.status).toBe(201);
    expect(Object.keys(registered.body).sort()).toEqual(["accounts", "adapterBoundary", "auditLogId", "supplier"]);
    const supplierId = registered.body.supplier.id as string;
    const supplierAdminUserId = registered.body.accounts.adminUserId as string;

    expect(one(runtime, "select current_node_key, process_status, supplier_id from process_instances where business_type = 'supplier_onboarding' and business_id = ?", supplierId)).toEqual({
      current_node_key: "profile_completion",
      process_status: "running",
      supplier_id: supplierId
    });
    expect(one(runtime, "select task_status, assignee_user_id from process_task_instances where business_type = 'supplier_onboarding' and business_id = ?", supplierId)).toEqual({
      task_status: "pending",
      assignee_user_id: supplierAdminUserId
    });

    const supplierLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: supplierAdminUserId, password: `pass-${supplierAdminUserId}` });
    expect(supplierLogin.status).toBe(200);
    const changedPassword = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", supplierLogin.headers["set-cookie"])
      .send({ currentPassword: `pass-${supplierAdminUserId}`, newPassword: "Supplier@2026", confirmPassword: "Supplier@2026" });
    expect(changedPassword.status).toBe(200);

    const profile = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", supplierAdminUserId)
      .send({
        businessLicenseNo: "BL-M4A-001",
        legalRepresentative: "张三",
        contactEmail: "m4a-supplier@example.com",
        categoryAuth: ["客房布草"],
        serviceRegions: [{ region: "上海", storeName: "滨江店", category: "客房布草", status: "active" }],
        qualificationAttachments: [{ fileName: "营业执照.pdf", uploadedAt: "2026-06-28T00:00:00.000Z" }],
        validUntil: "2027-06-28"
      });
    expect(profile.status).toBe(200);

    const qualification = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 86, opinion: "资质完整" });
    expect(qualification.status).toBe(201);

    const admission = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 93, opinion: "准入通过" });
    expect(admission.status).toBe(201);
    expect(admission.body.supplier.admissionStatus).toBe("admitted");

    const timeline = await request(runtime.app).get(`/api/process/business/supplier_onboarding/${supplierId}`).set("x-mock-user-id", supplierAdminUserId);
    expect(timeline.status).toBe(200);
    expect(timeline.body.processInstances[0]).toMatchObject({ businessType: "supplier_onboarding", supplierId, status: "completed", currentNodeKey: "active_online" });
    expect(timeline.body.events.map((event: { eventCode: string }) => event.eventCode)).toEqual([
      "supplier_onboarding.registered",
      "supplier_onboarding.profile_submitted",
      "supplier_onboarding.qualification_passed",
      "supplier_onboarding.admission_approved",
      "supplier_onboarding.activated"
    ]);
    expectNoSensitiveFields(timeline.body);

    const buyerTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u2");
    expect(buyerTasks.status).toBe(200);
    expect(buyerTasks.body.processTasks.filter((task: { businessType: string; businessId: string; status: string }) => task.businessType === "supplier_onboarding" && task.businessId === supplierId && task.status === "pending")).toHaveLength(0);

    const otherSupplier = await request(runtime.app).get(`/api/process/business/supplier_onboarding/${supplierId}`).set("x-mock-user-id", "u14");
    expect(otherSupplier.status).toBe(200);
    expect(otherSupplier.body.processInstances).toHaveLength(0);

    const auditor = await request(runtime.app).get(`/api/process/business/supplier_onboarding/${supplierId}`).set("x-mock-user-id", "u5");
    expect(auditor.status).toBe(200);
    expect(auditor.body.processInstances).toHaveLength(1);
    expect(auditor.body.tasks).toHaveLength(0);
    expectNoSensitiveFields(auditor.body);

    const expert = await request(runtime.app).get("/api/suppliers").set("x-mock-user-id", "u7");
    expect(expert.status).toBe(403);
  });

  it("tracks procurement request created, submitted, approved, method decision and project generation without changing legacy response shape", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime);
    const requestId = procurementRequest.id;
    expect(all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'procurement_request' and business_id = ?", requestId)).toEqual([
      { event_code: "procurement_request.created" }
    ]);

    const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);
    expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "procurementRequest", "workflow"]);

    const approved = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "M4-A approve" });
    expect(approved.status).toBe(200);
    expect(Object.keys(approved.body).sort()).toEqual(["auditLogId", "procurementRequest"]);

    const selfApproval = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(selfApproval.status).toBe(403);
    expect(selfApproval.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const method = await request(runtime.app).post(`/api/procurement-requests/${requestId}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" });
    expect(method.status).toBe(200);

    const project = await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });
    expect(project.status).toBe(201);
    expect(Object.keys(project.body).sort()).toEqual(["auditLogId", "procurementRequest", "project"]);

    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'procurement_request' and business_id = ? order by created_at", requestId).map((row) => row.event_code)
    ).toEqual([
      "procurement_request.created",
      "procurement_request.submitted",
      "procurement_request.approved",
      "procurement_request.method_decided",
      "procurement_request.project_created"
    ]);
    expect(one(runtime, "select current_node_key, process_status from process_instances where business_type = 'procurement_request' and business_id = ?", requestId)).toEqual({
      current_node_key: "project_created",
      process_status: "completed"
    });

    const processTasks = all<{ task_type: string; task_status: string }>(
      runtime,
      "select task_type, task_status from process_task_instances where business_type = 'procurement_request' and business_id = ? order by created_at",
      requestId
    );
    expect(processTasks).toEqual(
      expect.arrayContaining([
        { task_type: "approval_procurement_request", task_status: "completed" },
        { task_type: "procurement_method_decision", task_status: "completed" },
        { task_type: "procurement_project_generation", task_status: "completed" }
      ])
    );

    const readable = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u1");
    expect(readable.status).toBe(200);
    expect(readable.body.events.map((event: { eventCode: string }) => event.eventCode)).toEqual([
      "procurement_request.created",
      "procurement_request.submitted",
      "procurement_request.approved",
      "procurement_request.method_decided",
      "procurement_request.project_created"
    ]);
    expectNoSensitiveFields(readable.body);

    const expertList = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u7");
    expect(expertList.status).toBe(200);
    expect(expertList.body.procurementRequests).toHaveLength(0);

    const adminRead = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u6");
    expect(adminRead.status).toBe(200);
    expect(adminRead.body.processInstances).toHaveLength(0);
  });

  it("keeps hotel demand handoff and method decision restricted to authorized procurement roles", async () => {
    const runtime = boot();
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "M4-A hotel demand handoff",
        orgId: "org-hotel",
        requestDepartment: "客房部",
        requesterName: "酒店采购",
        category: "amenities",
        budgetLabel: "5000",
        budgetAmount: 5000,
        methodSuggestion: "内部公开采购",
        lineItems: [{ itemName: "amenity kit", specification: "standard", quantity: 10, unit: "box", budgetAmount: 5000 }]
      });
    expect(created.status).toBe(201);
    const requestId = created.body.procurementRequest.id as string;
    const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);
    expect(submitted.body.workflow.task.assigneeRoleId).toBe("group_manager");

    const financeApproval = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u9").send({ approved: true });
    expect(financeApproval.status).toBe(403);
    expect(financeApproval.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const buyerApproval = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(buyerApproval.status).toBe(403);
    expect(buyerApproval.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const managerApproval = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(managerApproval.status).toBe(200);

    const financeDecision = await request(runtime.app).post(`/api/procurement-requests/${requestId}/method-decision`).set("x-mock-user-id", "u9").send({ ruleId: "pmr-open" });
    expect(financeDecision.status).toBe(403);
    expect(financeDecision.body.error.code).toBe("PROCUREMENT_REQUEST_METHOD_DECISION_REQUIRED");

    const buyerDecision = await request(runtime.app).post(`/api/procurement-requests/${requestId}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" });
    expect(buyerDecision.status).toBe(200);

    const buyerTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u2");
    expect(buyerTasks.status).toBe(200);
    expect(buyerTasks.body.processTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          businessType: "procurement_request",
          businessId: requestId,
          taskType: "procurement_project_generation",
          status: "pending",
          processCurrentNodeKey: "method_decision"
        })
      ])
    );
    expectNoSensitiveFields(buyerTasks.body);
  });
});
