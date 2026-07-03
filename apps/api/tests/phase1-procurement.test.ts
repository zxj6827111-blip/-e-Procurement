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

function qualificationAttachment(fileName: string) {
  return {
    fileName,
    contentType: "text/plain",
    contentBase64: Buffer.from(fileName, "utf8").toString("base64")
  };
}

describe("Phase 1 supplier, procurement request and project initiation", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  async function createHotelProcurementRequest(payload: Record<string, unknown> = {}) {
    const response = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Hotel Procurement Request",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "Hotel Buyer U8",
        lineItems: [{ itemName: "Linen Set", category: "linen", specification: "standard", quantity: 10, unit: "set" }],
        ...payload
      });
    expect(response.status).toBe(201);
    return response;
  }

  it("creates supplier admission, category authorization and restriction with audit logs", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "Phase 1 Test Supplier", category: "linen", qualification: "pending_review", qualificationAttachments: [qualificationAttachment("phase1-license.txt")] });

    expect(admission.status).toBe(201);
    expect(admission.body.supplier.admissionStatus).toBe("pending");
    expect(admission.body.supplier.categoryAuthorizations.every((item: { status: string }) => item.status === "suspended")).toBe(true);
    expect(admission.body.auditLogId).toMatch(/^audit-/);

    const supplierId = admission.body.supplier.id;
    const authorize = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/category-authorizations`)
      .set("x-mock-user-id", "u1")
      .send({ category: "amenities" });

    expect(authorize.status).toBe(200);
    expect(authorize.body.supplier.categoryAuth).toContain("amenities");
    expect(authorize.body.supplier.categoryAuthorizations.every((item: { status: string }) => item.status === "suspended")).toBe(true);
    expect(authorize.body.auditLogId).toMatch(/^audit-/);

    const qualificationReview = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 88, opinion: "资质附件完整，初审通过。" });
    expect(qualificationReview.status).toBe(201);

    const review = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 90, opinion: "准入通过" });
    expect(review.status).toBe(201);
    expect(review.body.supplier.admissionStatus).toBe("admitted");
    expect(review.body.supplier.categoryAuthorizations.every((item: { status: string }) => item.status === "active")).toBe(true);

    const restrict = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/restrictions`)
      .set("x-mock-user-id", "u1")
      .send({ reason: "Phase 1 control test" });

    expect(restrict.status).toBe(200);
    expect(restrict.body.supplier.admissionStatus).toBe("restricted");
    expect(restrict.body.auditLogId).toMatch(/^audit-/);
  });

  it("provisions supplier login accounts for group-governed admissions and keeps supplier scope isolated", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "杭州新供测试公司", category: "食材供应", qualification: "有效", contactName: "杭供联系人", contactPhone: "13900009999" });

    expect(admission.status).toBe(201);
    expect(admission.body.accounts.admin.username).toMatch(/^u-supplier-admin-sup-/);
    expect(admission.body.accounts.admin.initialPassword).toBe(`pass-${admission.body.accounts.admin.username}`);
    expect(admission.body.accounts.quotation.username).toMatch(/^u-supplier-quotation-sup-/);

    const supplierId = admission.body.supplier.id as string;
    const adminUserId = admission.body.accounts.admin.userId as string;
    const quotationUserId = admission.body.accounts.quotation.userId as string;

    expect(runtime.ctx.state.users.find((user) => user.id === adminUserId)).toMatchObject({ roleId: "supplier_admin", supplierId });
    expect(runtime.ctx.state.users.find((user) => user.id === quotationUserId)).toMatchObject({ roleId: "supplier_quotation", supplierId });

    const login = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: `pass-${adminUserId}` });

    expect(login.status).toBe(200);
    expect(login.body.user.supplierId).toBe(supplierId);
    expect(login.body.roleId).toBe("supplier_admin");
    expect(login.body.passwordChangeRequired).toBe(true);

    const initialBlocked = await request(runtime.app).get("/api/suppliers").set("x-mock-user-id", adminUserId);
    expectDenied(initialBlocked, "PASSWORD_CHANGE_REQUIRED");

    const changed = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", login.headers["set-cookie"])
      .send({ currentPassword: `pass-${adminUserId}`, newPassword: "Supplier@2026", confirmPassword: "Supplier@2026" });
    expect(changed.status).toBe(200);

    const ownList = await request(runtime.app).get("/api/suppliers").set("x-mock-user-id", adminUserId);
    expect(ownList.status).toBe(200);
    expect(ownList.body.suppliers.map((supplier: { id: string }) => supplier.id)).toEqual([supplierId]);

    const otherSupplier = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", adminUserId);
    expectDenied(otherSupplier, "SUPPLIER_SCOPE_DENIED");

    const mockUsers = await request(runtime.app).get("/api/auth/mock-users").set("x-mock-user-id", "u2");
    expect(mockUsers.status).toBe(200);
    expect(mockUsers.body.users).toEqual(expect.arrayContaining([expect.objectContaining({ id: adminUserId, supplierName: "杭州新供测试公司" })]));
  });

  it("lets group procurement governance maintain supplier accounts by listing accounts and resetting passwords without exposing old passwords", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "杭州账号找回公司", category: "食材供应", qualification: "有效", contactName: "账号联系人", contactPhone: "13900008888" });

    expect(admission.status).toBe(201);
    const supplierId = admission.body.supplier.id as string;
    const adminUserId = admission.body.accounts.admin.userId as string;

    const accounts = await request(runtime.app).get(`/api/suppliers/${supplierId}/accounts`).set("x-mock-user-id", "u1");
    expect(accounts.status).toBe(200);
    expect(accounts.body.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: adminUserId, username: adminUserId, label: "供应商管理员", status: "active" })
      ])
    );
    expect(JSON.stringify(accounts.body)).not.toContain("password");

    const reset = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/accounts/${adminUserId}/reset-password`)
      .set("x-mock-user-id", "u1");
    expect(reset.status).toBe(200);
    expect(reset.body.account.userId).toBe(adminUserId);
    expect(reset.body.account.temporaryPassword).toMatch(/^Reset@/);
    expect(reset.body.auditLogId).toMatch(/^audit-/);

    const oldLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: `pass-${adminUserId}` });
    expectDenied(oldLogin, "LOGIN_DENIED");

    const newLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: reset.body.account.temporaryPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.supplierId).toBe(supplierId);
    expect(newLogin.body.passwordChangeRequired).toBe(true);

    const supplierSelfRead = await request(runtime.app).get(`/api/suppliers/${supplierId}/accounts`).set("x-mock-user-id", adminUserId);
    expectDenied(supplierSelfRead, "PASSWORD_CHANGE_REQUIRED");
  });

  it("keeps supplier governance actions out of procurement executor permissions", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "集团治理供应商", category: "客房一次性用品", qualification: "有效" });
    expect(admission.status).toBe(201);

    const supplierId = admission.body.supplier.id as string;
    const adminUserId = admission.body.accounts.admin.userId as string;

    const buyerCreate = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u8")
      .send({ name: "经办不应新增供应商", category: "食材供应" });
    expectDenied(buyerCreate, "PHASE1_BUSINESS_ACTION_DENIED");

    const buyerAccounts = await request(runtime.app).get(`/api/suppliers/${supplierId}/accounts`).set("x-mock-user-id", "u2");
    expectDenied(buyerAccounts, "PHASE1_BUSINESS_ACTION_DENIED");

    const buyerReset = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/accounts/${adminUserId}/reset-password`)
      .set("x-mock-user-id", "u2");
    expectDenied(buyerReset, "PHASE1_BUSINESS_ACTION_DENIED");

    const buyerReview = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u8")
      .send({ reviewType: "admission_assessment", status: "passed", score: 90, opinion: "经办不应准入评审" });
    expectDenied(buyerReview, "PHASE1_BUSINESS_ACTION_DENIED");

    const buyerDeactivate = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/status`)
      .set("x-mock-user-id", "u2")
      .send({ admissionStatus: "inactive", reason: "经办不应停用" });
    expectDenied(buyerDeactivate, "PHASE1_BUSINESS_ACTION_DENIED");

    const buyerRead = await request(runtime.app).get(`/api/suppliers/${supplierId}`).set("x-mock-user-id", "u2");
    expect(buyerRead.status).toBe(200);
  });

  it("lets a logged-in supplier change its own password after receiving a temporary password", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "杭州自助改密公司", category: "客房一次性用品", qualification: "有效", contactName: "改密联系人", contactPhone: "13900007777" });

    expect(admission.status).toBe(201);
    const supplierId = admission.body.supplier.id as string;
    const adminUserId = admission.body.accounts.admin.userId as string;

    const reset = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/accounts/${adminUserId}/reset-password`)
      .set("x-mock-user-id", "u1");
    expect(reset.status).toBe(200);
    const temporaryPassword = reset.body.account.temporaryPassword as string;

    const supplierLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: temporaryPassword });
    expect(supplierLogin.status).toBe(200);
    expect(supplierLogin.body.passwordChangeRequired).toBe(true);
    const supplierCookie = supplierLogin.headers["set-cookie"];

    const blockedBusiness = await request(runtime.app).get("/api/suppliers").set("cookie", supplierCookie);
    expectDenied(blockedBusiness, "PASSWORD_CHANGE_REQUIRED");

    const mismatch = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", supplierCookie)
      .send({ currentPassword: temporaryPassword, newPassword: "Supplier@2026", confirmPassword: "Supplier@2027" });
    expectDenied(mismatch, "PASSWORD_CONFIRM_MISMATCH");

    const changed = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", supplierCookie)
      .send({ currentPassword: temporaryPassword, newPassword: "Supplier@2026", confirmPassword: "Supplier@2026" });
    expect(changed.status).toBe(200);
    expect(changed.body.account.userId).toBe(adminUserId);
    expect(changed.body.passwordChangeRequired).toBe(false);
    expect(JSON.stringify(changed.body)).not.toContain("Supplier@2026");
    expect(changed.body.auditLogId).toMatch(/^audit-/);

    const allowedBusiness = await request(runtime.app).get("/api/suppliers").set("cookie", supplierCookie);
    expect(allowedBusiness.status).toBe(200);
    expect(allowedBusiness.body.suppliers.map((supplier: { id: string }) => supplier.id)).toEqual([supplierId]);

    const oldLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: temporaryPassword });
    expectDenied(oldLogin, "LOGIN_DENIED");

    const newLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: "Supplier@2026" });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.supplierId).toBe(supplierId);
    expect(newLogin.body.passwordChangeRequired).toBe(false);
  });

  it("deactivates mistaken supplier admissions with required audit reason", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "Mistaken Supplier", category: "amenities", qualification: "有效" });

    expect(admission.status).toBe(201);
    const supplierId = admission.body.supplier.id;

    const missingReason = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/status`)
      .set("x-mock-user-id", "u1")
      .send({ admissionStatus: "inactive" });
    expectDenied(missingReason, "SUPPLIER_INACTIVE_REASON_REQUIRED");

    const inactive = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/status`)
      .set("x-mock-user-id", "u1")
      .send({ admissionStatus: "inactive", reason: "误新增作废" });

    expect(inactive.status).toBe(200);
    expect(inactive.body.supplier.admissionStatus).toBe("inactive");
    expect(inactive.body.supplier.risk).toBe("误新增作废");
    expect(inactive.body.supplier.categoryAuthorizations.every((item: { status: string }) => item.status === "suspended")).toBe(true);
    expect(inactive.body.auditLogId).toMatch(/^audit-/);
    const auditLog = runtime.ctx.state.auditLogs.find((item) => item.id === inactive.body.auditLogId);
    expect(auditLog?.reason).toBe("status=inactive;reason=误新增作废");

    const reactivated = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/status`)
      .set("x-mock-user-id", "u1")
      .send({ admissionStatus: "admitted", reason: "重新启用" });

    expect(reactivated.status).toBe(200);
    expect(reactivated.body.supplier.admissionStatus).toBe("admitted");
    expect(reactivated.body.supplier.risk).toBe("正常");
    expect(reactivated.body.supplier.restrictionReason).toBeUndefined();
    expect(reactivated.body.supplier.restrictedAt).toBeUndefined();
    expect(reactivated.body.supplier.categoryAuthorizations.every((item: { status: string }) => item.status === "active")).toBe(true);
    expect(reactivated.body.auditLogId).toMatch(/^audit-/);
  });

  it("keeps supplier self-service scoped to its own supplier data", async () => {
    const own = await request(runtime.app).get("/api/suppliers/sup-1/qualifications").set("x-mock-user-id", "u3");
    expect(own.status).toBe(200);
    expect(own.body.supplierId).toBe("sup-1");

    const other = await request(runtime.app).get("/api/suppliers/sup-2/project-participations").set("x-mock-user-id", "u3");
    expectDenied(other, "SUPPLIER_SCOPE_DENIED");
  });

  it("appends multiple supplier qualifications and creates multiple seal samples in one upload", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({
        name: "杭州多资质封样公司",
        category: "客房一次性用品",
        qualification: "有效",
        qualificationAttachments: [
          {
            fileName: "business-license.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("license", "utf8").toString("base64")
          }
        ]
      });
    expect(admission.status).toBe(201);
    const supplierId = admission.body.supplier.id as string;
    expect(admission.body.supplier.qualificationAttachments).toHaveLength(1);

    const profile = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", "u1")
      .send({
        qualificationAttachments: [
          {
            fileName: "food-permit.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("permit", "utf8").toString("base64")
          },
          {
            fileName: "inspection-report.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("report", "utf8").toString("base64")
          }
        ]
      });
    expect(profile.status).toBe(200);
    expect(profile.body.supplier.qualificationAttachments.map((item: { fileName: string }) => item.fileName)).toEqual([
      "business-license.txt",
      "food-permit.txt",
      "inspection-report.txt"
    ]);

    const samples = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/seal-samples`)
      .set("x-mock-user-id", "u1")
      .send({
        sampleName: "牙具封样",
        specification: "标准套装",
        attachments: [
          {
            fileName: "sample-a.png",
            contentType: "image/png",
            contentBase64: Buffer.from("sample-a", "utf8").toString("base64")
          },
          {
            fileName: "sample-b.png",
            contentType: "image/png",
            contentBase64: Buffer.from("sample-b", "utf8").toString("base64")
          }
        ]
      });
    expect(samples.status).toBe(201);
    expect(samples.body.sealSamples).toHaveLength(2);
    expect(samples.body.supplier.sealSamples.map((item: { fileName: string }) => item.fileName)).toEqual(["sample-a.png", "sample-b.png"]);

    const qualificationToDelete = profile.body.supplier.qualificationAttachments.find((item: { fileName: string }) => item.fileName === "food-permit.txt");
    const deletedQualification = await request(runtime.app)
      .delete(`/api/suppliers/${supplierId}/qualifications/${qualificationToDelete.id}`)
      .set("x-mock-user-id", "u1");
    expect(deletedQualification.status).toBe(200);
    expect(deletedQualification.body.deleted).toBe(true);
    expect(deletedQualification.body.supplier.qualificationAttachments.map((item: { fileName: string }) => item.fileName)).toEqual([
      "business-license.txt",
      "inspection-report.txt"
    ]);

    const sampleToDelete = samples.body.sealSamples[0];
    const deletedSample = await request(runtime.app)
      .delete(`/api/suppliers/${supplierId}/seal-samples/${sampleToDelete.id}`)
      .set("x-mock-user-id", "u1");
    expect(deletedSample.status).toBe(200);
    expect(deletedSample.body.deleted).toBe(true);
    expect(deletedSample.body.supplier.sealSamples.map((item: { fileName: string }) => item.fileName)).toEqual(["sample-b.png"]);
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
    const adminLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: registered.body.accounts.adminUserId, password: `pass-${registered.body.accounts.adminUserId}` });
    expect(adminLogin.status).toBe(200);
    const adminChangePassword = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", adminLogin.headers["set-cookie"])
      .send({ currentPassword: `pass-${registered.body.accounts.adminUserId}`, newPassword: "Supplier@2026", confirmPassword: "Supplier@2026" });
    expect(adminChangePassword.status).toBe(200);

    const quotationProfilePatch = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", registered.body.accounts.quotationUserId)
      .send({ contactName: "报价员不应维护资料" });
    expectDenied(quotationProfilePatch, "PASSWORD_CHANGE_REQUIRED");

    const adminProfilePatch = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", registered.body.accounts.adminUserId)
      .send({ contactEmail: "supplier-admin@example.com" });
    expect(adminProfilePatch.status).toBe(200);
    expect(adminProfilePatch.body.supplier.contactEmail).toBe("supplier-admin@example.com");

    const qualificationReview = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 90, opinion: "注册资料与资质附件齐备。" });
    expect(qualificationReview.status).toBe(201);

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
      .set("x-mock-user-id", "u8")
      .send({
        title: "Phase 1 Linen Request",
        orgId: "org-hotel",
        category: "linen",
        budgetLabel: "configured by policy",
        requestDepartment: "Housekeeping",
        requesterName: "酒店采购",
        lineItems: [{ itemName: "Linen Set", category: "linen", specification: "standard", quantity: 10, unit: "set" }]
      });

    expect(created.status).toBe(201);
    expect(created.body.procurementRequest.status).toBe("draft");
    expect(created.body.auditLogId).toMatch(/^audit-/);

    const requestId = created.body.procurementRequest.id;
    const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
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

  it("blocks procurement executors from creating hotel procurement requests", async () => {
    const createdByBuyer = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({ title: "Buyer Should Not Create Request", orgId: "org-hotel" });
    expectDenied(createdByBuyer, "PROCUREMENT_REQUEST_INITIATOR_REQUIRED");
  });

  it("prevents project creation before method decision and records the denial", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Not Ready Request",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "酒店采购",
        lineItems: [{ itemName: "Not Ready Item", specification: "standard", quantity: 1, unit: "item" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");

    const projectBeforeApproval = await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });
    expectDenied(projectBeforeApproval, "PROCUREMENT_REQUEST_SCOPE_DENIED");

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true });

    const project = await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });
    expectDenied(project, "PROCUREMENT_REQUEST_NOT_READY");
    expect(project.body.error.auditLogId).toMatch(/^audit-/);
  });

  it("deletes draft procurement requests and records the audit trail", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({ title: "Draft Request To Delete", orgId: "org-hotel" });
    expect(created.status).toBe(201);
    const requestId = created.body.procurementRequest.id;

    const deleted = await request(runtime.app).delete(`/api/procurement-requests/${requestId}`).set("x-mock-user-id", "u8");
    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.auditLogId).toMatch(/^audit-/);

    const list = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u8");
    expect(list.body.procurementRequests.map((item: { id: string }) => item.id)).not.toContain(requestId);
  });

  it("cancels submitted procurement requests instead of hard deleting them", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Submitted Request To Cancel",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "酒店采购",
        lineItems: [{ itemName: "Cancel Item", specification: "standard", quantity: 1, unit: "item" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");

    await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: false, opinion: "phase1 reject path" });

    const deleteSubmitted = await request(runtime.app).delete(`/api/procurement-requests/${requestId}`).set("x-mock-user-id", "u8");
    expectDenied(deleteSubmitted, "PROCUREMENT_REQUEST_DELETE_DENIED");
    expect(deleteSubmitted.body.error.auditLogId).toMatch(/^audit-/);

    const createdAgain = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Submitted Request To Cancel Again",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "酒店采购",
        lineItems: [{ itemName: "Cancel Item Again", specification: "standard", quantity: 1, unit: "item" }]
      });
    const requestId2 = createdAgain.body.procurementRequest.id;
    await request(runtime.app).post(`/api/procurement-requests/${requestId2}/submit`).set("x-mock-user-id", "u8");

    const deleteSubmitted2 = await request(runtime.app).delete(`/api/procurement-requests/${requestId2}`).set("x-mock-user-id", "u8");
    expectDenied(deleteSubmitted2, "PROCUREMENT_REQUEST_DELETE_DENIED");
    expect(deleteSubmitted2.body.error.auditLogId).toMatch(/^audit-/);

    const cancelled = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId2}/cancel`)
      .set("x-mock-user-id", "u8")
      .send({ reason: "no longer needed" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.procurementRequest.status).toBe("cancelled");
    expect(cancelled.body.auditLogId).toMatch(/^audit-/);
  });

  it("does not cancel procurement requests after a project has been created", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Created Project Request Cannot Cancel",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "Hotel Buyer",
        lineItems: [{ itemName: "Project Item", specification: "standard", quantity: 1, unit: "item" }]
      });
    const requestId = created.body.procurementRequest.id;
    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
    await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true });
    await request(runtime.app).post(`/api/procurement-requests/${requestId}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-1" });
    await request(runtime.app).post("/api/projects").set("x-mock-user-id", "u2").send({ requestId });

    const cancelProjectRequest = await request(runtime.app).post(`/api/procurement-requests/${requestId}/cancel`).set("x-mock-user-id", "u8").send({ reason: "late cancel" });

    expectDenied(cancelProjectRequest, "PROCUREMENT_REQUEST_CANCEL_DENIED");
    expect(cancelProjectRequest.body.error.auditLogId).toMatch(/^audit-/);
  });

  it("creates external trade project branch and still blocks internal actions", async () => {
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "External Filing Request",
        orgId: "org-hotel",
        category: "maintenance",
        externalTradeFlag: true,
        requestDepartment: "Engineering",
        requesterName: "酒店采购",
        lineItems: [{ itemName: "Maintenance Service", category: "maintenance", specification: "onsite", quantity: 1, unit: "service" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
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
      .set("x-mock-user-id", "u8")
      .send({
        title: "External Rule Override Attempt",
        orgId: "org-hotel",
        category: "maintenance",
        requestDepartment: "Engineering",
        requesterName: "酒店采购",
        lineItems: [{ itemName: "Maintenance Service", category: "maintenance", specification: "onsite", quantity: 1, unit: "service" }]
      });
    const requestId = created.body.procurementRequest.id;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
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
