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
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m6b-"));
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

describe("M6-B integration contract boundary and backup restore", () => {
  it("exposes contract fields for SSO, OA, ERP, WMS, finance, file, invoice and payment boundaries without claiming verified integration", async () => {
    const runtime = boot({
      integrationEndpoints: {
        sso: "https://sso.example.local/api",
        oa: "https://oa.example.local/api",
        erp: "https://erp.example.local/api",
        wms: "https://wms.example.local/api",
        finance: "https://finance.example.local/api",
        fileService: "https://file.example.local/api",
        eInvoice: "https://invoice.example.local/api"
      }
    });

    const response = await request(runtime.app).get("/api/integration-contracts").set("x-mock-user-id", "u1");
    expect(response.status).toBe(200);
    expect(response.body.boundary).toContain("M6-B");
    const contracts = response.body.contracts as Array<{
      key: string;
      endpointConfigured: boolean;
      verifiedIntegration: boolean;
      liveStatus: string;
      operations: string[];
      requestFields: Array<{ name: string; required: boolean }>;
      responseFields: Array<{ name: string; required: boolean }>;
      idempotencyKey: string;
      retryStrategy: { defaultMaxAttempts: number; retryableStatuses: string[] };
      callbackAuth: { required: boolean; methods: string[] };
      errorCodes: string[];
      productionEvidenceRequired: string[];
      noGoWhenMissing: string[];
    }>;
    expect(contracts.map((contract) => contract.key)).toEqual(
      expect.arrayContaining(["sso", "oa", "erp", "wms", "finance", "fileService", "eInvoice", "contractSystem", "messageNotification"])
    );

    for (const key of ["sso", "oa", "erp", "wms", "finance", "fileService", "eInvoice"]) {
      const contract = contracts.find((item) => item.key === key);
      expect(contract).toBeDefined();
      expect(contract).toMatchObject({
        endpointConfigured: true,
        verifiedIntegration: false,
        liveStatus: "configured_endpoint_unverified"
      });
      expect(contract!.requestFields.some((field) => field.required)).toBe(true);
      expect(contract!.responseFields.some((field) => field.required)).toBe(true);
      expect(contract!.idempotencyKey.length).toBeGreaterThan(5);
      expect(contract!.retryStrategy.defaultMaxAttempts).toBe(3);
      expect(contract!.retryStrategy.retryableStatuses).toContain("timeout");
      expect(contract!.callbackAuth.required).toBe(true);
      expect(contract!.errorCodes.length).toBeGreaterThan(0);
      expect(contract!.productionEvidenceRequired.length).toBeGreaterThan(0);
      expect(contract!.noGoWhenMissing.length).toBeGreaterThan(0);
    }

    const finance = contracts.find((item) => item.key === "finance")!;
    expect(finance.operations).toEqual(expect.arrayContaining(["payment_request.push", "payment_status.callback.apply"]));
    expect(finance.requestFields.map((field) => field.name)).toEqual(expect.arrayContaining(["settlementBillId", "amount"]));

    const fileService = contracts.find((item) => item.key === "fileService")!;
    expect(fileService.operations).toEqual(expect.arrayContaining(["file.scan", "file.archive"]));

    const eInvoice = contracts.find((item) => item.key === "eInvoice")!;
    expect(eInvoice.operations).toEqual(expect.arrayContaining(["invoice.issue", "invoice.verify"]));
  });

  it("keeps supplier roles away from integration contracts and job operations", async () => {
    const runtime = boot();

    const contractsDenied = await request(runtime.app).get("/api/integration-contracts").set("x-mock-user-id", "u3");
    expect(contractsDenied.status).toBe(403);
    expect(contractsDenied.body.error.code).toBe("INTEGRATION_OPERATION_DENIED");

    const jobsDenied = await request(runtime.app).get("/api/integration-jobs").set("x-mock-user-id", "u3");
    expect(jobsDenied.status).toBe(403);
  });

  it("reports configured endpoints as contract-boundary warnings in production readiness instead of production Go evidence", async () => {
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
      sessionSecret: "production-secret-for-m6b-test",
      requiredIntegrationProviders: ["SSO", "OA", "ERP", "WMS", "FINANCE", "FILE_SERVICE", "E_INVOICE"],
      integrationEndpoints: {
        sso: "https://sso.example.local/api",
        oa: "https://oa.example.local/api",
        erp: "https://erp.example.local/api",
        wms: "https://wms.example.local/api",
        finance: "https://finance.example.local/api",
        fileService: "https://file.example.local/api",
        eInvoice: "https://invoice.example.local/api"
      }
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.readiness.productionReady).toBe(false);
    expect(health.body.operations.integrationContractSummary).toMatchObject({
      endpointConfigured: 7,
      verifiedIntegration: 0
    });
    expect(health.body.operations.integrationContractSummary.liveStatusCounts.configured_endpoint_unverified).toBe(7);
    expect(health.body.operations.integrationContractSummary.productionBoundary).toContain("real customer-system evidence");

    const checks = checksByKey(health.body);
    for (const key of ["integration_sso", "integration_oa", "integration_erp", "integration_wms", "integration_finance", "integration_fileService", "integration_eInvoice"]) {
      expect(checks.get(key)).toMatchObject({ level: "warning", severity: "warning" });
      expect(checks.get(key)?.message).toContain("unverified contract boundary");
    }
    expect(checks.get("identity_provider")).toMatchObject({ level: "warning" });
    expect(checks.get("file_storage")).toMatchObject({ level: "warning" });
  });

  it("runs the M6-B backup restore drill and records local/UAT production boundary evidence", () => {
    const runtime = boot();
    runtime.ctx.runtimeDb.db
      .prepare(
        `insert into integration_jobs
         (job_id, adapter_key, adapter_name, operation, mode, endpoint, business_type, business_id, request_id, request_payload_json, response_payload_json, status, attempt_count, idempotency_key, next_retry_at, error_message, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "job-m6b-restore",
        "oa",
        "OA approval adapter",
        "approval.push.submit",
        "test",
        null,
        "approval.push",
        "approval-m6b",
        "req-m6b",
        "{}",
        null,
        "pending",
        0,
        "m6b-restore-job",
        null,
        null,
        new Date().toISOString(),
        new Date().toISOString()
      );

    const drillDir = fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m6b-drill-"));
    const output = execFileSync(process.execPath, [path.join(repoRoot, "scripts", "r10-backup-restore-drill.mjs")], {
      cwd: repoRoot,
      env: {
        ...process.env,
        APP_DATA_DIR: runtime.ctx.config.dataRoot,
        R10_DRILL_DIR: drillDir
      },
      encoding: "utf8"
    });
    const parsed = JSON.parse(output) as {
      scope: string;
      checks: {
        sqliteIntegrity: string;
        countMatch: boolean;
        sourceCounts: Record<string, number | null>;
        restoredCounts: Record<string, number | null>;
        missingRestoredStoredFiles: number;
      };
      productionBoundary: Record<string, string>;
      goNoGo: Record<string, string>;
      evidenceFile: string;
      warnings: string[];
    };

    expect(parsed.scope).toBe("M6-B local/UAT backup restore drill");
    expect(parsed.checks.sqliteIntegrity).toBe("ok");
    expect(parsed.checks.countMatch).toBe(true);
    expect(parsed.checks.sourceCounts.integration_jobs).toBe(1);
    expect(parsed.checks.restoredCounts.integration_jobs).toBe(1);
    expect(parsed.checks.missingRestoredStoredFiles).toBe(0);
    expect(parsed.productionBoundary.database).toContain("local/UAT drill only");
    expect(parsed.productionBoundary.fileStorage).toContain("customer infrastructure");
    expect(parsed.goNoGo.formalProduction).toContain("no_go");
    expect(fs.existsSync(parsed.evidenceFile)).toBe(true);
    expect(parsed.warnings.some((warning) => warning.includes("Formal production database restore"))).toBe(true);
  });
});
