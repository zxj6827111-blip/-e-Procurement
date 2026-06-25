import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage10-"));
}

function boot(options: { integrationEndpoints?: Record<string, string> } = {}) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true,
      integrationEndpoints: options.integrationEndpoints,
      buildVersion: "stage10-test"
    }
  });
  return { ctx, app: createApp(ctx) };
}

describe("Stage 10 integration and operations baseline", () => {
  it("reports operations health fields and configured integration count", async () => {
    const runtime = boot({ integrationEndpoints: { oa: "https://oa.example.local/api" } });
    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.operations.buildVersion).toBe("stage10-test");
    expect(health.body.operations.logsReady).toBe(true);
    expect(health.body.operations.integrationConfiguredCount).toBe(1);
  });

  it("persists adapter jobs with idempotency and supports manual retry", async () => {
    const runtime = boot({ integrationEndpoints: { oa: "https://oa.example.local/api" } });

    const created = await request(runtime.app)
      .post("/api/integration-adapters/oa/call")
      .set("x-mock-user-id", "u1")
      .send({ operation: "award_approval.submit", payload: { approvalId: "aa-stage10" }, idempotencyKey: "stage10-oa-aa" });
    expect(created.status).toBe(202);
    expect(created.body.log.status).toBe("pending");
    expect(created.body.log.mode).toBe("http");

    const duplicate = await request(runtime.app)
      .post("/api/integration-adapters/oa/call")
      .set("x-mock-user-id", "u1")
      .send({ operation: "award_approval.submit", payload: { approvalId: "aa-stage10-duplicate" }, idempotencyKey: "stage10-oa-aa" });
    expect(duplicate.status).toBe(202);
    expect(duplicate.body.log.jobId).toBe(created.body.log.jobId);

    const retry = await request(runtime.app).post(`/api/integration-adapters/oa/jobs/${created.body.log.jobId}/retry`).set("x-mock-user-id", "u1");
    expect(retry.status).toBe(200);
    expect(retry.body.log.status).toBe("succeeded");
    expect(retry.body.log.attemptCount).toBe(1);

    const jobs = await request(runtime.app).get("/api/integration-jobs").set("x-mock-user-id", "u5");
    expect(jobs.status).toBe(200);
    expect(jobs.body.jobs.some((job: { jobId: string }) => job.jobId === created.body.log.jobId)).toBe(true);
  });

  it("keeps suppliers from operating integration jobs", async () => {
    const runtime = boot();
    const denied = await request(runtime.app).get("/api/integration-adapters").set("x-mock-user-id", "u3");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("INTEGRATION_OPERATION_DENIED");
  });
});
