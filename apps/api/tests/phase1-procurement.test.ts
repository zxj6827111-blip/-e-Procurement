import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext();
  return { ctx, app: createApp(ctx) };
}

function expectDenied(response: request.Response, code: string) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
}

describe("Phase 1 supplier, procurement request and project initiation", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("creates supplier admission, category authorization and restriction with audit logs", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u2")
      .send({ name: "Phase 1 Test Supplier", category: "linen", qualification: "pending_review" });

    expect(admission.status).toBe(201);
    expect(admission.body.supplier.admissionStatus).toBe("admitted");
    expect(admission.body.auditLogId).toMatch(/^audit-/);

    const supplierId = admission.body.supplier.id;
    const authorize = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/category-authorizations`)
      .set("x-mock-user-id", "u2")
      .send({ category: "amenities" });

    expect(authorize.status).toBe(200);
    expect(authorize.body.supplier.categoryAuth).toContain("amenities");
    expect(authorize.body.auditLogId).toMatch(/^audit-/);

    const restrict = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/restrictions`)
      .set("x-mock-user-id", "u1")
      .send({ reason: "Phase 1 control test" });

    expect(restrict.status).toBe(200);
    expect(restrict.body.supplier.admissionStatus).toBe("restricted");
    expect(restrict.body.auditLogId).toMatch(/^audit-/);
  });

  it("keeps supplier self-service scoped to its own supplier data", async () => {
    const own = await request(runtime.app).get("/api/suppliers/sup-1/qualifications").set("x-mock-user-id", "u3");
    expect(own.status).toBe(200);
    expect(own.body.supplierId).toBe("sup-1");

    const other = await request(runtime.app).get("/api/suppliers/sup-2/project-participations").set("x-mock-user-id", "u3");
    expectDenied(other, "SUPPLIER_SCOPE_DENIED");
  });

  it("covers PDF supplier registration boundary, split supplier roles and admission scoring rules", async () => {
    const boundary = await request(runtime.app).get("/api/suppliers/registration-boundary");
    expect(boundary.status).toBe(200);
    expect(boundary.body.captchaProvider).toBe("local_mock");

    const missingAgreement = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({ name: "PDF Local Supplier", category: "linen", socialCreditCode: "91310000PDF000001", legalRepresentative: "张登记", contactName: "张登记", contactPhone: "13900000001", captchaCode: "123456" });
    expectDenied(missingAgreement, "SUPPLIER_AGREEMENT_REQUIRED");

    const registered = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        name: "PDF Local Supplier",
        category: "linen",
        socialCreditCode: "91310000PDF000001",
        legalRepresentative: "张登记",
        contactName: "张登记",
        contactPhone: "13900000001",
        captchaCode: "123456",
        agreementAccepted: true,
        qualificationAttachments: [
          {
            fileName: "pdf-local-license.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("pdf local registration", "utf8").toString("base64")
          }
        ]
      });
    expect(registered.status).toBe(201);
    expect(registered.body.supplier.admissionStatus).toBe("pending");
    expect(registered.body.supplier.registrationTrace.adapterBoundary).toContain("本地模拟验证码");
    expect(registered.body.accounts.adminUserId).toMatch(/^u-supplier-admin-/);
    expect(registered.body.accounts.quotationUserId).toMatch(/^u-supplier-quotation-/);

    const supplierId = registered.body.supplier.id as string;
    const quotationProfilePatch = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", registered.body.accounts.quotationUserId)
      .send({ contactName: "报价员不应维护资料" });
    expectDenied(quotationProfilePatch, "PHASE1_BUSINESS_ACTION_DENIED");

    const adminProfilePatch = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", registered.body.accounts.adminUserId)
      .send({ contactEmail: "supplier-admin@example.com" });
    expect(adminProfilePatch.status).toBe(200);
    expect(adminProfilePatch.body.supplier.contactEmail).toBe("supplier-admin@example.com");

    const review = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({
        reviewType: "admission_assessment",
        status: "passed",
        scoreItems: [
          { id: "qualification", name: "资质完整性", weight: 30, score: 95 },
          { id: "delivery", name: "履约能力", weight: 25, score: 90 },
          { id: "quality", name: "质量稳定性", weight: 25, score: 92 },
          { id: "service", name: "服务响应", weight: 20, score: 94 }
        ],
        opinion: "PDF 1:1 准入评分模板通过"
      });
    expect(review.status).toBe(201);
    expect(review.body.supplier.admissionStatus).toBe("admitted");
    expect(review.body.supplier.admissionLevel).toBe("preferred");
    expect(review.body.supplier.regularizedAt).toEqual(expect.any(String));
    expect(review.body.supplier.periodicAssessment.latestResult).toBe("passed");
    expect(review.body.review.scoreTemplateCode).toBe("PDF_SUPPLIER_ADMISSION_V1");

    const period = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "periodic_assessment", status: "rejected", score: 52, opinion: "周期考核低于黑名单阈值" });
    expect(period.status).toBe(201);
    expect(period.body.supplier.admissionStatus).toBe("restricted");
    expect(period.body.supplier.admissionLevel).toBe("blacklisted");
    expect(period.body.supplier.periodicAssessment.latestResult).toBe("blacklisted");
  });

  it("rejects admin business mutation for Phase 1 supplier and request actions", async () => {
    const supplier = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u6")
      .send({ name: "Admin Supplier", category: "linen" });
    expectDenied(supplier, "PHASE1_BUSINESS_ACTION_DENIED");

    const procurementRequest = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u6")
      .send({ title: "Admin Request" });
    expectDenied(procurementRequest, "PHASE1_BUSINESS_ACTION_DENIED");
  });

  it("runs request create, submit, method decision and internal project creation", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "Phase 1 Linen Request",
        orgId: "org-hotel",
        category: "linen",
        budgetLabel: "configured by policy",
        requestDepartment: "Housekeeping",
        requesterName: "Buyer U2",
        lineItems: [{ itemName: "Linen Set", category: "linen", specification: "standard", quantity: 10, unit: "set" }]
      });

    expect(created.status).toBe(201);
    expect(created.body.procurementRequest.status).toBe("draft");
    expect(created.body.auditLogId).toMatch(/^audit-/);

    const requestId = created.body.procurementRequest.id;
    const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u2");
    expect(submitted.status).toBe(200);
    expect(submitted.body.procurementRequest.status).toBe("submitted");

    const approved = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true, opinion: "phase1 compatibility approval" });
    expect(approved.status).toBe(200);
    expect(approved.body.procurementRequest.approvalStatus).toBe("approved");

    const method = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/method-decision`)
      .set("x-mock-user-id", "u2")
      .send({ ruleId: "pmr-1" });
    expect(method.status).toBe(200);
    expect(method.body.procurementRequest.status).toBe("method_decided");
    expect(method.body.procurementRequest.externalTradeFlag).toBe(false);

    const project = await request(runtime.app)
      .post("/api/projects")
      .set("x-mock-user-id", "u2")
      .send({ requestId, name: "Phase 1 Linen Project" });
    expect(project.status).toBe(201);
    expect(project.body.project.sourceRequestId).toBe(requestId);
    expect(project.body.project.status).toBe("project_created");
    expect(project.body.procurementRequest.status).toBe("project_created");
    expect(project.body.auditLogId).toMatch(/^audit-/);
  });

  it("prevents project creation before method decision and records the denial", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({ title: "Not Ready Request", orgId: "org-hotel" });
    const requestId = created.body.procurementRequest.id;

    const project = await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });
    expectDenied(project, "PROCUREMENT_REQUEST_NOT_READY");
    expect(project.body.error.auditLogId).toMatch(/^audit-/);
  });

  it("deletes draft procurement requests and records the audit trail", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({ title: "Draft Request To Delete", orgId: "org-hotel" });
    expect(created.status).toBe(201);
    const requestId = created.body.procurementRequest.id;

    const deleted = await request(runtime.app).delete(`/api/procurement-requests/${requestId}`).set("x-mock-user-id", "u2");
    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.auditLogId).toMatch(/^audit-/);

    const list = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u2");
    expect(list.body.procurementRequests.map((item: { id: string }) => item.id)).not.toContain(requestId);
  });

  it("cancels submitted procurement requests instead of hard deleting them", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "Submitted Request To Cancel",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "Buyer U2",
        lineItems: [{ itemName: "Cancel Item", specification: "standard", quantity: 1, unit: "item" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u2");

    await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: false, opinion: "phase1 reject path" });

    const deleteSubmitted = await request(runtime.app).delete(`/api/procurement-requests/${requestId}`).set("x-mock-user-id", "u2");
    expectDenied(deleteSubmitted, "PROCUREMENT_REQUEST_DELETE_DENIED");
    expect(deleteSubmitted.body.error.auditLogId).toMatch(/^audit-/);

    const createdAgain = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "Submitted Request To Cancel Again",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "Buyer U2",
        lineItems: [{ itemName: "Cancel Item Again", specification: "standard", quantity: 1, unit: "item" }]
      });
    const requestId2 = createdAgain.body.procurementRequest.id;
    await request(runtime.app).post(`/api/procurement-requests/${requestId2}/submit`).set("x-mock-user-id", "u2");

    const deleteSubmitted2 = await request(runtime.app).delete(`/api/procurement-requests/${requestId2}`).set("x-mock-user-id", "u2");
    expectDenied(deleteSubmitted2, "PROCUREMENT_REQUEST_DELETE_DENIED");
    expect(deleteSubmitted2.body.error.auditLogId).toMatch(/^audit-/);

    const cancelled = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId2}/cancel`)
      .set("x-mock-user-id", "u2")
      .send({ reason: "no longer needed" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.procurementRequest.status).toBe("cancelled");
    expect(cancelled.body.auditLogId).toMatch(/^audit-/);
  });

  it("does not cancel procurement requests after a project has been created", async () => {
    const cancelProjectRequest = await request(runtime.app)
      .post("/api/procurement-requests/req-pre/cancel")
      .set("x-mock-user-id", "u2")
      .send({ reason: "late cancel" });

    expectDenied(cancelProjectRequest, "PROCUREMENT_REQUEST_CANCEL_DENIED");
    expect(cancelProjectRequest.body.error.auditLogId).toMatch(/^audit-/);
  });

  it("creates external trade project branch and still blocks internal actions", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "External Filing Request",
        orgId: "org-hotel",
        category: "maintenance",
        externalTradeFlag: true,
        requestDepartment: "Engineering",
        requesterName: "Buyer U2",
        lineItems: [{ itemName: "Maintenance Service", category: "maintenance", specification: "onsite", quantity: 1, unit: "service" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    const method = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/method-decision`)
      .set("x-mock-user-id", "u2")
      .send({ ruleId: "pmr-3", externalTradeFlag: true });
    expect(method.body.procurementRequest.externalTradeFlag).toBe(true);

    const project = await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });
    expect(project.status).toBe(201);
    expect(project.body.project.externalTradeFlag).toBe(true);
    expect(project.body.project.status).toBe("external_project_recorded");

    const blocked = await request(runtime.app)
      .post(`/api/projects/${project.body.project.id}/internal-actions/internal_bid`)
      .set("x-mock-user-id", "u2");
    expectDenied(blocked, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");
  });

  it("does not let the client downgrade an external-trade rule into an internal project", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "External Rule Override Attempt",
        orgId: "org-hotel",
        category: "maintenance",
        requestDepartment: "Engineering",
        requesterName: "Buyer U2",
        lineItems: [{ itemName: "Maintenance Service", category: "maintenance", specification: "onsite", quantity: 1, unit: "service" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    const method = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/method-decision`)
      .set("x-mock-user-id", "u2")
      .send({ ruleId: "pmr-3", externalTradeFlag: false });

    expect(method.status).toBe(200);
    expect(method.body.procurementRequest.externalTradeFlag).toBe(true);

    const project = await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });
    expect(project.status).toBe(201);
    expect(project.body.project.externalTradeFlag).toBe(true);
    expect(project.body.project.status).toBe("external_project_recorded");
  });

  it("rejects supplier direct project status transition with an audit log", async () => {
    const response = await request(runtime.app)
      .post("/api/projects/p-pre/transitions")
      .set("x-mock-user-id", "u3")
      .send({ status: "bidding_locked" });

    expectDenied(response, "PHASE1_BUSINESS_ACTION_DENIED");
    expect(response.body.error.auditLogId).toMatch(/^audit-/);
  });

  it("rejects non-sequential project status jumps", async () => {
    const response = await request(runtime.app)
      .post("/api/projects/p-pre/transitions")
      .set("x-mock-user-id", "u2")
      .send({ status: "closed" });

    expectDenied(response, "PROJECT_STATUS_TRANSITION_DENIED");
    expect(response.body.error.auditLogId).toMatch(/^audit-/);
  });
});
