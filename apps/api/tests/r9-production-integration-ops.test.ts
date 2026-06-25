import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext, type AppContextOptions } from "../src/app-context.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r9-"));
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

describe("R9 production integration and operations baseline", () => {
  it("reports production readiness failures and warnings without leaking local paths", async () => {
    const dataRoot = makeDataRoot();
    const runtime = boot({
      appEnv: "production",
      dataRoot,
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      cookieSecure: false,
      corsAllowedOrigins: [],
      sessionSecret: "change-this-before-shared-uat",
      requiredIntegrationProviders: ["oa", "erp"],
      fileStorageMode: "local"
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.readiness.productionReady).toBe(false);
    expect(health.body.readiness.failureCount).toBeGreaterThan(0);
    expect(health.body.readiness.warningCount).toBeGreaterThan(0);
    expect(health.body.fileStorage.mode).toBe("local");
    expect(health.text).not.toContain(dataRoot);
    expect(health.text).not.toContain("runtime.sqlite");
    expect(health.body.readiness.checks.map((check: { key: string }) => check.key)).toEqual(expect.arrayContaining(["cookie_secure", "cors", "session_secret", "integration_oa"]));
  });

  it("keeps SSO and object storage readiness conservative when only contract endpoints are configured", async () => {
    const runtime = boot({
      appEnv: "production",
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      cookieSecure: true,
      corsAllowedOrigins: ["https://procurement.example.local"],
      sessionSecret: "production-secret-for-test-only",
      integrationEndpoints: { sso: "https://sso.example.local/api" },
      fileStorageMode: "object",
      objectStorageEndpoint: "https://minio.example.local",
      objectStorageBucket: "eprocurement"
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.fileStorage.mode).toBe("object");
    expect(health.body.fileStorage.finalStorage).toBe(false);
    expect(health.body.fileStorage.note).toContain("still writes through local storage");
    const checks = health.body.readiness.checks as Array<{ key: string; level: string; message: string }>;
    expect(checks.find((check) => check.key === "identity_provider")).toMatchObject({ level: "warning" });
    expect(checks.find((check) => check.key === "file_storage")).toMatchObject({ level: "warning" });
  });

  it("disables mock login, mock role switch and mock header identity in production", async () => {
    const runtime = boot({
      appEnv: "production",
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      cookieSecure: true,
      corsAllowedOrigins: ["https://procurement.example.local"],
      sessionSecret: "production-secret-for-test-only"
    });

    const mockLogin = await request(runtime.app).post("/api/auth/mock-login").send({ userId: "u2" });
    expect(mockLogin.status).toBe(403);

    const roleSwitch = await request(runtime.app).post("/api/me/mock-role-switch").set("x-mock-user-id", "u2").send({ roleId: "admin" });
    expect(roleSwitch.status).toBe(401);

    const me = await request(runtime.app).get("/api/me").set("x-mock-user-id", "u2");
    expect(me.status).toBe(401);
  });

  it("maps mock/test SSO identity to user role and organization scope outside production", async () => {
    const runtime = boot({ appEnv: "test", mockAuthEnabled: true, allowLocalPasswordLogin: false });

    const providers = await request(runtime.app).get("/api/auth/providers");
    expect(providers.status).toBe(200);
    expect(providers.body.ssoAdapter.contract.requiredClaims).toContain("roleCode");

    const callback = await request(runtime.app).post("/api/auth/sso/mock-callback").send({
      token: "test-sso:u2",
      providerUserId: "u2",
      displayName: "刘明",
      roleCode: "buyer",
      orgCode: "org-east",
      hotelCodes: ["org-hotel"]
    });
    expect(callback.status).toBe(200);
    expect(callback.body.roleId).toBe("buyer");
    expect(callback.body.orgScope).toEqual(["org-east", "org-hotel"]);
    expect(callback.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("creates, executes, retries, repushes and redacts integration jobs", async () => {
    const runtime = boot({ integrationEndpoints: { oa: "https://oa.example.local/api" }, integrationMaxAttempts: 2 });

    const created = await request(runtime.app)
      .post("/api/integration-adapters/oa/call")
      .set("x-mock-user-id", "u1")
      .send({
        operation: "approval.push.submit",
        businessType: "approval.push",
        businessId: "approval-r9-1",
        requestId: "req-r9-1",
        idempotencyKey: "r9-oa-approval",
        payload: {
          approvalId: "approval-r9-1",
          token: "real-token",
          nested: { password: "secret" }
        }
      });
    expect(created.status).toBe(202);
    expect(created.body.log.status).toBe("pending");
    expect(created.body.log.mode).toBe("http");
    expect(created.body.log.requestPayload.token).toBe("[REDACTED]");
    expect(created.body.log.requestPayload.nested.password).toBe("[REDACTED]");

    const duplicate = await request(runtime.app)
      .post("/api/integration-adapters/oa/call")
      .set("x-mock-user-id", "u1")
      .send({ operation: "approval.push.submit", idempotencyKey: "r9-oa-approval", payload: { approvalId: "different" } });
    expect(duplicate.body.log.jobId).toBe(created.body.log.jobId);

    const executed = await request(runtime.app).post(`/api/integration-adapters/oa/jobs/${created.body.log.jobId}/execute`).set("x-mock-user-id", "u1");
    expect(executed.status).toBe(200);
    expect(executed.body.log.status).toBe("succeeded");
    expect(executed.body.log.attemptCount).toBe(1);

    const failed = await request(runtime.app)
      .post("/api/integration-adapters/finance/call")
      .set("x-mock-user-id", "u1")
      .send({ operation: "payment_request.push", payload: { forceFailure: true, secret: "must-hide" }, forceFailure: true });
    expect(failed.status).toBe(202);
    expect(["failed", "retrying"]).toContain(failed.body.log.status);
    expect(failed.text).not.toContain("must-hide");

    const retry = await request(runtime.app).post(`/api/integration-adapters/finance/jobs/${failed.body.log.jobId}/retry`).set("x-mock-user-id", "u1");
    expect(retry.status).toBe(200);
    expect(retry.body.log.status).toBe("succeeded");

    const repush = await request(runtime.app).post(`/api/integration-adapters/oa/jobs/${created.body.log.jobId}/repush`).set("x-mock-user-id", "u1");
    expect(repush.status).toBe(202);
    expect(repush.body.originalJobId).toBe(created.body.log.jobId);
    expect(repush.body.log.status).toBe("pending");
    expect(repush.body.replayMode).toBe("redacted_payload_manual_task");
    expect(repush.body.warning).toContain("redacted stored payload");
  });

  it("does not rewrite terminal integration job states through retry or cancel", async () => {
    const runtime = boot({ integrationEndpoints: { erp: "https://erp.example.local/api" } });

    const created = await request(runtime.app)
      .post("/api/integration-adapters/erp/call")
      .set("x-mock-user-id", "u1")
      .send({ operation: "purchase_order.sync", payload: { orderId: "po-r9-state" }, idempotencyKey: "r9-erp-state" });
    expect(created.body.log.status).toBe("pending");

    const executed = await request(runtime.app).post(`/api/integration-adapters/erp/jobs/${created.body.log.jobId}/execute`).set("x-mock-user-id", "u1");
    expect(executed.body.log.status).toBe("succeeded");

    const retrySucceeded = await request(runtime.app).post(`/api/integration-adapters/erp/jobs/${created.body.log.jobId}/retry`).set("x-mock-user-id", "u1");
    expect(retrySucceeded.body.log.status).toBe("succeeded");
    expect(retrySucceeded.body.log.warning).toContain("cannot be retried");

    const cancelSucceeded = await request(runtime.app).post(`/api/integration-adapters/erp/jobs/${created.body.log.jobId}/cancel`).set("x-mock-user-id", "u1");
    expect(cancelSucceeded.body.log.status).toBe("succeeded");
    expect(cancelSucceeded.body.log.warning).toContain("cannot be cancelled");
  });

  it("uses file storage modes, blocks path traversal names and keeps download audit", async () => {
    const runtime = boot({ fileStorageMode: "mock" });

    const health = await request(runtime.app).get("/health");
    expect(health.body.fileStorage.mode).toBe("mock");

    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u2")
      .send({
        originalName: "../secret/receipt.png",
        contentType: "image/png",
        contentBase64: Buffer.from("fake-png", "utf8").toString("base64"),
        attachmentKind: "acceptance_image",
        objectType: "receipt_record",
        objectId: "rr-r9-file-1",
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.file.fileName).toBe("receipt.png");

    const download = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(download.status).toBe(200);
    expect(download.headers["x-audit-log-id"]).toMatch(/^audit-/);
  });

  it("runs the R9 readiness backup and data validation script", () => {
    const runtime = boot();
    const marker = runtime.ctx.runtimeDb.db.prepare("select count(*) as count from integration_jobs").get() as { count: number };
    expect(marker.count).toBe(0);
    const output = execFileSync(process.execPath, [path.join(repoRoot, "scripts", "r9-production-readiness-check.mjs"), "--backup"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        APP_DATA_DIR: runtime.ctx.config.dataRoot
      },
      encoding: "utf8"
    });
    const parsed = JSON.parse(output) as { sqliteFileExists: boolean; backupFile: string; sqliteIntegrity: string; tables: Record<string, number> };
    expect(parsed.sqliteFileExists).toBe(true);
    expect(parsed.sqliteIntegrity).toBe("ok");
    expect(fs.existsSync(parsed.backupFile)).toBe(true);
    expect(parsed.tables.integration_jobs).toBe(0);
    expect(parsed.tables.stored_files).toBeGreaterThanOrEqual(0);
  });
});
