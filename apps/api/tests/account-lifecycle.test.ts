import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createIsolatedRuntime } from "./helpers/test-runtime.js";

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

describe("managed account lifecycle", () => {
  let runtime: ReturnType<typeof createIsolatedRuntime>;

  beforeEach(() => {
    runtime = createIsolatedRuntime("eproc-account-lifecycle-");
  });

  it("lets administrators create, edit, disable, restore, reset and offboard accounts", async () => {
    const forbidden = await request(runtime.app)
      .post("/api/users")
      .set("x-mock-user-id", "u2")
      .send({ username: "managed.demo", name: "演示账号", roleId: "buyer", orgId: "org-east", orgScope: ["org-east"] });
    expectDenied(forbidden, "CONFIG_ADMIN_ONLY");

    const created = await request(runtime.app)
      .post("/api/users")
      .set("x-mock-user-id", "u6")
      .send({
        username: "managed.demo",
        name: "演示账号",
        roleId: "buyer",
        orgId: "org-east",
        orgScope: ["org-east", "org-hotel"],
        departmentId: "采购部",
        position: "采购专员"
      });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ username: "managed.demo", accountStatus: "active", passwordChangeRequired: true });
    expect(created.body.temporaryPassword).toMatch(/^Init@/);
    const userId = created.body.user.id as string;

    const duplicate = await request(runtime.app)
      .post("/api/users")
      .set("x-mock-user-id", "u6")
      .send({ username: "MANAGED.DEMO", name: "重复账号", roleId: "buyer", orgId: "org-east", orgScope: ["org-east"] });
    expectDenied(duplicate, "USERNAME_EXISTS");

    const initialLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: "managed.demo", password: created.body.temporaryPassword });
    expect(initialLogin.status).toBe(200);
    expect(initialLogin.body.passwordChangeRequired).toBe(true);
    const initialCookie = initialLogin.headers["set-cookie"];

    const forcedBlock = await request(runtime.app).get("/api/procurement-method-rules").set("cookie", initialCookie);
    expectDenied(forcedBlock, "PASSWORD_CHANGE_REQUIRED");

    const changedPassword = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", initialCookie)
      .send({ currentPassword: created.body.temporaryPassword, newPassword: "Managed@2026", confirmPassword: "Managed@2026" });
    expect(changedPassword.status).toBe(200);

    const updated = await request(runtime.app)
      .patch(`/api/users/${userId}`)
      .set("x-mock-user-id", "u6")
      .send({
        username: "managed.renamed",
        name: "已编辑账号",
        roleId: "auditor",
        orgId: "org-group",
        orgScope: ["org-group", "org-east"],
        departmentId: "审计部",
        position: "审计员"
      });
    expect(updated.status).toBe(200);
    expect(updated.body.user).toMatchObject({ username: "managed.renamed", name: "已编辑账号", roleId: "auditor", orgId: "org-group" });

    const oldUsernameLogin = await request(runtime.app).post("/api/auth/login").send({ username: "managed.demo", password: "Managed@2026" });
    expectDenied(oldUsernameLogin, "LOGIN_DENIED");
    const renamedLogin = await request(runtime.app).post("/api/auth/login").send({ username: "managed.renamed", password: "Managed@2026" });
    expect(renamedLogin.status).toBe(200);

    const reset = await request(runtime.app)
      .post(`/api/users/${userId}/reset-password`)
      .set("x-mock-user-id", "u6");
    expect(reset.status).toBe(200);
    expect(reset.body.temporaryPassword).toMatch(/^Reset@/);
    const revokedAfterReset = await request(runtime.app).get("/api/me").set("cookie", renamedLogin.headers["set-cookie"]);
    expectDenied(revokedAfterReset, "UNAUTHENTICATED");
    const oldPasswordLogin = await request(runtime.app).post("/api/auth/login").send({ username: "managed.renamed", password: "Managed@2026" });
    expectDenied(oldPasswordLogin, "LOGIN_DENIED");

    const temporaryLogin = await request(runtime.app).post("/api/auth/login").send({ username: "managed.renamed", password: reset.body.temporaryPassword });
    expect(temporaryLogin.status).toBe(200);
    const disabled = await request(runtime.app)
      .patch(`/api/users/${userId}`)
      .set("x-mock-user-id", "u6")
      .send({ status: "disabled" });
    expect(disabled.status).toBe(200);
    expect(disabled.body.user).toMatchObject({ status: "disabled", accountStatus: "disabled" });
    expectDenied(await request(runtime.app).get("/api/me").set("cookie", temporaryLogin.headers["set-cookie"]), "UNAUTHENTICATED");
    expectDenied(await request(runtime.app).post("/api/auth/login").send({ username: "managed.renamed", password: reset.body.temporaryPassword }), "LOGIN_DENIED");

    const restored = await request(runtime.app)
      .patch(`/api/users/${userId}`)
      .set("x-mock-user-id", "u6")
      .send({ status: "active" });
    expect(restored.status).toBe(200);
    expect((await request(runtime.app).post("/api/auth/login").send({ username: "managed.renamed", password: reset.body.temporaryPassword })).status).toBe(200);

    const offboarded = await request(runtime.app)
      .patch(`/api/users/${userId}`)
      .set("x-mock-user-id", "u6")
      .send({ status: "offboarded" });
    expect(offboarded.status).toBe(200);
    expectDenied(
      await request(runtime.app).patch(`/api/users/${userId}`).set("x-mock-user-id", "u6").send({ status: "active" }),
      "USER_OFFBOARDED_TERMINAL"
    );
    expectDenied(await request(runtime.app).post(`/api/users/${userId}/reset-password`).set("x-mock-user-id", "u6"), "USER_OFFBOARDED_TERMINAL");

    expectDenied(await request(runtime.app).patch("/api/users/u6").set("x-mock-user-id", "u6").send({ status: "disabled" }), "USER_SELF_DISABLE_FORBIDDEN");
    expectDenied(await request(runtime.app).patch("/api/users/u6").set("x-mock-user-id", "u6").send({ roleId: "auditor" }), "USER_SELF_DEMOTION_FORBIDDEN");
  });

  it("creates or binds an account while creating an expert profile", async () => {
    const createdExpert = await request(runtime.app)
      .post("/api/experts")
      .set("x-mock-user-id", "u1")
      .send({
        name: "新建账号专家",
        ownerOrgId: "org-group",
        branchOrgId: "org-group",
        reviewScopes: ["技术评审"],
        supplierAssessmentScopes: ["供应链评审"],
        accountProvisioning: { mode: "create", username: "expert.created", orgId: "org-group", departmentId: "专家库" }
      });
    expect(createdExpert.status).toBe(201);
    expect(createdExpert.body.account).toMatchObject({ username: "expert.created", passwordChangeRequired: true });
    expect(createdExpert.body.account.temporaryPassword).toMatch(/^Init@/);
    expect(createdExpert.body.expert.accountUserIds).toEqual([createdExpert.body.account.userId]);
    expect(runtime.ctx.state.users.find((item) => item.id === createdExpert.body.account.userId)).toMatchObject({ roleId: "expert", expertId: createdExpert.body.expert.id });

    const createdLogin = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: "expert.created", password: createdExpert.body.account.temporaryPassword });
    expect(createdLogin.status).toBe(200);
    expect(createdLogin.body.passwordChangeRequired).toBe(true);

    const account = await request(runtime.app)
      .post("/api/users")
      .set("x-mock-user-id", "u6")
      .send({ username: "expert.bound", name: "待绑定专家", roleId: "expert", orgId: "org-group", orgScope: ["org-group"] });
    expect(account.status).toBe(201);

    const boundExpert = await request(runtime.app)
      .post("/api/experts")
      .set("x-mock-user-id", "u1")
      .send({
        name: "绑定账号专家",
        ownerOrgId: "org-group",
        branchOrgId: "org-group",
        accountProvisioning: { mode: "bind", userId: account.body.user.id }
      });
    expect(boundExpert.status).toBe(201);
    expect(boundExpert.body.account).toBeUndefined();
    expect(boundExpert.body.expert.accountUserIds).toEqual([account.body.user.id]);
    expect(runtime.ctx.state.users.find((item) => item.id === account.body.user.id)?.expertId).toBe(boundExpert.body.expert.id);
  });

  it("suspends linked supplier accounts, revokes sessions and only restores supplier-suspended accounts", async () => {
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({
        name: "账号联动供应商",
        category: "食材供应",
        qualification: "有效",
        contactName: "联动联系人",
        contactPhone: "13900007777",
        qualificationAttachments: [qualificationAttachment("supplier-account-sync.txt")]
      });
    expect(admission.status).toBe(201);
    const supplierId = admission.body.supplier.id as string;
    const adminUserId = admission.body.accounts.admin.userId as string;
    const quotationUserId = admission.body.accounts.quotation.userId as string;

    const login = await request(runtime.app)
      .post("/api/auth/login")
      .send({ username: adminUserId, password: admission.body.accounts.admin.initialPassword });
    expect(login.status).toBe(200);
    const changed = await request(runtime.app)
      .post("/api/me/change-password")
      .set("cookie", login.headers["set-cookie"])
      .send({ currentPassword: admission.body.accounts.admin.initialPassword, newPassword: "Supplier@2026", confirmPassword: "Supplier@2026" });
    expect(changed.status).toBe(200);

    const manualDisable = await request(runtime.app)
      .patch(`/api/users/${quotationUserId}`)
      .set("x-mock-user-id", "u6")
      .send({ status: "disabled" });
    expect(manualDisable.status).toBe(200);

    const inactive = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/status`)
      .set("x-mock-user-id", "u1")
      .send({ admissionStatus: "inactive", reason: "供应商暂停合作" });
    expect(inactive.status).toBe(200);
    expectDenied(await request(runtime.app).get("/api/me").set("cookie", login.headers["set-cookie"]), "UNAUTHENTICATED");
    expectDenied(await request(runtime.app).post("/api/auth/login").send({ username: adminUserId, password: "Supplier@2026" }), "LOGIN_DENIED");

    const suspendedAccount = runtime.ctx.authStore.getAccountsByUserIds([adminUserId])[0];
    const manuallyDisabledAccount = runtime.ctx.authStore.getAccountsByUserIds([quotationUserId])[0];
    expect(suspendedAccount).toMatchObject({ status: "suspended", statusSource: `supplier_inactive:${supplierId}` });
    expect(manuallyDisabledAccount).toMatchObject({ status: "disabled", statusSource: "administrator_disabled:u6" });

    const reactivated = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/status`)
      .set("x-mock-user-id", "u1")
      .send({ admissionStatus: "admitted", reason: "恢复合作" });
    expect(reactivated.status).toBe(200);
    expect(runtime.ctx.authStore.getAccountsByUserIds([adminUserId])[0]).toMatchObject({ status: "active", statusSource: null });
    expect(runtime.ctx.authStore.getAccountsByUserIds([quotationUserId])[0]).toMatchObject({ status: "disabled", statusSource: "administrator_disabled:u6" });
    expect((await request(runtime.app).post("/api/auth/login").send({ username: adminUserId, password: "Supplier@2026" })).status).toBe(200);
  });
});
