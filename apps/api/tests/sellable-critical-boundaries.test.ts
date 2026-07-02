import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: fs.mkdtempSync(path.join(os.tmpdir(), "eproc-sellable-boundaries-")),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function expectDenied(response: request.Response, code: string, hiddenTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of hiddenTokens) {
    expect(response.text).not.toContain(token);
  }
}

describe("sellable readiness critical boundaries", () => {
  it("keeps supplier data isolated to the current supplier account", async () => {
    const runtime = boot();

    const own = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", "u3");
    expect(own.status).toBe(200);
    expect(own.body.supplier.id).toBe("sup-1");

    const other = await request(runtime.app).get("/api/suppliers/sup-2").set("x-mock-user-id", "u3");
    expectDenied(other, "SUPPLIER_SCOPE_DENIED", ["sup-2", "苏州洁雅清洁服务有限公司"]);
  });

  it("keeps bid amount confidential before cutoff without a scoped approval", async () => {
    const runtime = boot();

    const response = await request(runtime.app)
      .post("/api/bids/bid-pre-1/view-check")
      .set("x-mock-user-id", "u2")
      .send({ content: "amount" });

    expectDenied(response, "BID_CONFIDENTIALITY_DENIED", ["186000"]);
  });

  it("keeps expert scoring sheets scoped to assigned experts only", async () => {
    const runtime = boot();

    const response = await request(runtime.app).get("/api/scoring-sheets/score-3").set("x-mock-user-id", "u4");

    expectDenied(response, "EXPERT_SCORE_SCOPE_DENIED");
  });

  it("keeps audit users read-only for archive mutations", async () => {
    const runtime = boot();

    const response = await request(runtime.app).post("/api/projects/p-award/archive-snapshot").set("x-mock-user-id", "u5");

    expectDenied(response, "ARCHIVE_MAINTAINER_REQUIRED");
  });

  it("keeps sealed archive items immutable outside supplement flow", async () => {
    const runtime = boot();

    const response = await request(runtime.app)
      .post("/api/archive-items/ai-ext-result/update")
      .set("x-mock-user-id", "u2")
      .send({ collectedFlag: true });

    expectDenied(response, "ARCHIVE_ITEM_SEALED");
  });

  it("keeps system administrators outside business workbench data", async () => {
    const runtime = boot();

    const response = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u6");

    expectDenied(response, "PROJECT_WORKBENCH_READ_DENIED");
  });
});
