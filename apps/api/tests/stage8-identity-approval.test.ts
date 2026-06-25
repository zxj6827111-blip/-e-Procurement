import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage8-"));
}

describe("Stage 8 identity, organization and approval configuration", () => {
  it("disables pass-uX local login by default in production and exposes enterprise provider boundary", async () => {
    const ctx = createAppContext({
      runtime: {
        appEnv: "production",
        dataRoot: makeDataRoot(),
        mockAuthEnabled: false,
        identityProviderMode: "oidc",
        identityProviderIssuer: "https://sso.example.local",
        identityProviderLoginUrl: "https://sso.example.local/login"
      }
    });
    const app = createApp(ctx);

    const providers = await request(app).get("/api/auth/providers");
    expect(providers.status).toBe(200);
    expect(providers.body.localPasswordLoginEnabled).toBe(false);
    expect(providers.body.mode).toBe("oidc");

    const login = await request(app).post("/api/auth/login").send({ username: "u2", password: "pass-u2" });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("LOCAL_PASSWORD_LOGIN_DISABLED");
    expect(login.body.error.provider.loginUrl).toBe("https://sso.example.local/login");

    const mockLogin = await request(app).post("/api/auth/mock-login").send({ userId: "u2" });
    expect(mockLogin.status).toBe(403);
    expect(mockLogin.body.error.code).toBe("MOCK_LOGIN_DISABLED");
  });

  it("lets admin maintain users and approval rules while keeping suppliers and experts isolated", async () => {
    const ctx = createAppContext({
      runtime: {
        appEnv: "test",
        dataRoot: makeDataRoot(),
        mockAuthEnabled: true
      }
    });
    const app = createApp(ctx);

    const supplierUsers = await request(app).get("/api/users").set("x-mock-user-id", "u3");
    expect(supplierUsers.status).toBe(403);
    expect(supplierUsers.body.error.code).toBe("CONFIG_ADMIN_ONLY");

    const expertRules = await request(app).get("/api/approval-rules").set("x-mock-user-id", "u4");
    expect(expertRules.status).toBe(403);
    expect(expertRules.body.error.code).toBe("APPROVAL_RULE_READ_DENIED");

    const adminUsers = await request(app).get("/api/users").set("x-mock-user-id", "u6");
    expect(adminUsers.status).toBe(200);
    expect(adminUsers.body.users.map((item: { id: string }) => item.id)).toContain("u2");

    const createdRule = await request(app)
      .post("/api/approval-rules")
      .set("x-mock-user-id", "u6")
      .send({
        ruleCode: "approval-stage8-test",
        ruleName: "Stage8 测试审批规则",
        businessType: "procurement_request",
        amountMin: 500000,
        amountMax: 1000000,
        methodTypes: ["内部公开采购"],
        nodeRoleIds: ["group_manager", "auditor"],
        actions: ["submit", "approve", "reject"]
      });
    expect(createdRule.status).toBe(201);
    expect(createdRule.body.approvalRule.versionNo).toBe(1);

    const updatedRule = await request(app)
      .patch(`/api/approval-rules/${createdRule.body.approvalRule.id}`)
      .set("x-mock-user-id", "u6")
      .send({ status: "disabled", actions: ["submit", "return"] });
    expect(updatedRule.status).toBe(200);
    expect(updatedRule.body.approvalRule.status).toBe("disabled");
    expect(updatedRule.body.approvalRule.versionNo).toBe(2);

    const tableRow = ctx.runtimeDb.db.prepare("select rule_status, version_no from business_approval_rules where id = ?").get(createdRule.body.approvalRule.id) as
      | { rule_status: string; version_no: number }
      | undefined;
    expect(tableRow).toEqual({ rule_status: "disabled", version_no: 2 });

    const roleChange = await request(app).patch("/api/users/u2/role").set("x-mock-user-id", "u6").send({ roleId: "auditor", orgScope: ["org-group", "org-east"] });
    expect(roleChange.status).toBe(200);
    expect(roleChange.body.user.roleId).toBe("auditor");

    const disableUser = await request(app).patch("/api/users/u2/status").set("x-mock-user-id", "u6").send({ status: "offboarded" });
    expect(disableUser.status).toBe(200);
    expect(disableUser.body.user.status).toBe("offboarded");

    const disabledMe = await request(app).get("/api/me").set("x-mock-user-id", "u2");
    expect(disabledMe.status).toBe(401);
  });
});
