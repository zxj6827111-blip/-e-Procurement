import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext, type AppContextOptions } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m6a-"));
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

function checksByKey(healthBody: { readiness: { checks: Array<{ key: string; level: string; severity?: string; message: string }> } }) {
  return new Map(healthBody.readiness.checks.map((check) => [check.key, check]));
}

describe("M6-A production readiness gate", () => {
  it("keeps production readiness No-Go when production prerequisites are missing", async () => {
    const dataRoot = makeDataRoot();
    const runtime = boot({
      appEnv: "production",
      dataRoot,
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      seedOnBoot: true,
      databaseDriver: "sqlite",
      fileStorageMode: "local",
      identityProviderMode: "adapter",
      cookieSecure: false,
      corsAllowedOrigins: [],
      sessionSecret: "change-this-before-shared-uat",
      requiredIntegrationProviders: ["sso", "oa", "erp", "wms", "finance", "fileService"],
      workflowExecutionSource: "r8_workflow",
      processLayerMode: "shadow",
      bpmnPilotMode: "shadow"
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.mode).toBe("production");
    expect(health.body.mockAuthEnabled).toBe(false);
    expect(health.body.workflow).toEqual(
      expect.objectContaining({
        executionSource: "r8_workflow",
        processLayerMode: "shadow",
        bpmnPilotMode: "shadow"
      })
    );
    expect(health.body.readiness.productionReady).toBe(false);
    expect(health.body.readiness.failureCount).toBeGreaterThan(0);
    expect(health.body.readiness.errorCount).toBe(health.body.readiness.failureCount);
    expect(health.body.readiness.warningCount).toBeGreaterThan(0);
    expect(health.body.readiness.infoCount).toBeGreaterThan(0);
    expect(health.text).not.toContain(dataRoot);
    expect(health.text).not.toContain("runtime.sqlite");

    const checks = checksByKey(health.body);
    expect(checks.get("workflow_execution_source")).toMatchObject({ level: "pass", severity: "pass" });
    expect(checks.get("process_layer_mode")).toMatchObject({ level: "info", severity: "info" });
    expect(checks.get("bpmn_pilot_mode")).toMatchObject({ level: "info", severity: "info" });
    expect(checks.get("seed_data")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("cookie_secure")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("cors")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("session_secret")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("database")).toMatchObject({ level: "warning", severity: "warning" });
    expect(checks.get("file_storage")).toMatchObject({ level: "warning", severity: "warning" });
    expect(checks.get("integration_sso")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("integration_oa")).toMatchObject({ level: "failure", severity: "error" });
  });

  it("blocks non-R8 or BPMN-production execution-source configuration in production readiness", async () => {
    const runtime = boot({
      appEnv: "production",
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      seedOnBoot: false,
      databaseDriver: "postgres",
      databaseUrl: "postgres://customer-db.example/eproc",
      fileStorageMode: "object",
      objectStorageEndpoint: "https://object-storage.example.local",
      objectStorageBucket: "eprocurement",
      identityProviderMode: "adapter",
      cookieSecure: true,
      corsAllowedOrigins: ["https://procurement.example.local"],
      sessionSecret: "production-secret-for-m6a-test",
      workflowExecutionSource: "bpmn",
      processLayerMode: "execution",
      bpmnPilotMode: "production"
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.workflow).toEqual(expect.objectContaining({ executionSource: "bpmn", processLayerMode: "execution", bpmnPilotMode: "production" }));
    expect(health.body.readiness.productionReady).toBe(false);

    const checks = checksByKey(health.body);
    expect(checks.get("workflow_execution_source")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("process_layer_mode")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("bpmn_pilot_mode")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("identity_provider")).toMatchObject({ level: "warning", severity: "warning" });
    expect(checks.get("file_storage")).toMatchObject({ level: "warning", severity: "warning" });
  });

  it("disables mock auth, demo role switching and x-mock-user-id as production authentication paths", async () => {
    const runtime = boot({
      appEnv: "production",
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      seedOnBoot: false,
      cookieSecure: true,
      corsAllowedOrigins: ["https://procurement.example.local"],
      sessionSecret: "production-secret-for-m6a-auth-test"
    });

    const mockLogin = await request(runtime.app).post("/api/auth/mock-login").send({ userId: "u2" });
    expect(mockLogin.status).toBe(403);
    expect(mockLogin.body.error.code).toBe("MOCK_LOGIN_DISABLED");

    const mockSwitch = await request(runtime.app).post("/api/me/mock-role-switch").set("x-mock-user-id", "u2").send({ roleId: "admin" });
    expect(mockSwitch.status).toBe(401);
    expect(mockSwitch.body.error.code).toBe("UNAUTHENTICATED");

    const mockHeader = await request(runtime.app).get("/api/me").set("x-mock-user-id", "u2");
    expect(mockHeader.status).toBe(401);
    expect(mockHeader.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects invalid upload readiness configuration and preserves existing health shape", async () => {
    const runtime = boot({
      appEnv: "production",
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      seedOnBoot: false,
      fileUploadMaxBytes: 0,
      allowedUploadContentTypes: []
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(Object.keys(health.body.readiness)).toEqual(expect.arrayContaining(["productionReady", "failureCount", "warningCount", "checks", "errorCount", "infoCount"]));
    const checks = checksByKey(health.body);
    expect(checks.get("upload_limit")).toMatchObject({ level: "failure", severity: "error" });
    expect(checks.get("upload_content_types")).toMatchObject({ level: "failure", severity: "error" });
  });
});
