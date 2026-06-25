import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext();
  return { ctx, app: createApp(ctx) };
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.message).toEqual(expect.any(String));
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

describe("Phase 6 external-trade filing", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("creates an external-trade project without internal quote deadline and records internal approval", async () => {
    const created = await request(runtime.app)
      .post("/api/external-trades/projects")
      .set("x-mock-user-id", "u2")
      .send({ name: "external filing phase6", internalApprovalOpinion: "approved by internal workflow" });

    expect(created.status).toBe(201);
    expect(created.body.project.externalTradeFlag).toBe(true);
    expect(created.body.project.quoteDeadlineAt).toBeNull();
    expect(created.body.project.beforeDeadline).toBe(false);
    expect(created.body.record.internalApprovalStatus).toBe("recorded");
    expect(created.body.auditLogId).toMatch(/^audit-/);
  });

  it("records external platform code, materials and result filing with audit logs", async () => {
    const code = await request(runtime.app)
      .post("/api/external-trades/p-ext/external-project")
      .set("x-mock-user-id", "u2")
      .send({ externalPlatformName: "External Exchange", externalProjectCode: "EXT-CODE-1" });
    expect(code.status).toBe(200);
    expect(code.body.project.status).toBe("external_project_recorded");

    const announcement = await request(runtime.app)
      .post("/api/external-trades/p-ext/announcement-materials")
      .set("x-mock-user-id", "u2")
      .send({ material: { fileName: "external-announcement.pdf", sizeBytes: 1200 } });
    expect(announcement.status).toBe(201);
    expect(announcement.body.project.status).toBe("external_announcement_uploaded");
    expect(announcement.body.record.announcementMaterialMetadata).toHaveLength(2);

    const resultMaterial = await request(runtime.app)
      .post("/api/external-trades/p-ext/result-materials")
      .set("x-mock-user-id", "u2")
      .send({ material: { fileName: "external-result.pdf", sizeBytes: 2200 } });
    expect(resultMaterial.status).toBe(201);
    expect(resultMaterial.body.project.status).toBe("external_result_uploaded");

    const resultRecord = await request(runtime.app).post("/api/external-trades/p-ext/result-record").set("x-mock-user-id", "u2");
    expect(resultRecord.status).toBe(200);
    expect(resultRecord.body.project.status).toBe("external_result_recorded");
    expect(resultRecord.body.record.resultRecordStatus).toBe("recorded");
    expect(resultRecord.body.auditLogId).toMatch(/^audit-/);
  });

  it("continues to hard-block internal announcement, registration, bid, expert review and award", async () => {
    for (const action of ["internal_announcement", "internal_registration", "internal_bid", "internal_expert_review", "internal_award"]) {
      const response = await request(runtime.app)
        .post("/api/external-trades/p-ext/block-check")
        .set("x-mock-user-id", "u2")
        .send({ action });
      expectDenied(response, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");
    }

    const logs = await request(runtime.app).get("/api/external-trade-block-logs").set("x-mock-user-id", "u5");
    expect(logs.status).toBe(200);
    expect(logs.body.auditLogs.length).toBeGreaterThanOrEqual(5);
  });

  it("rejects non-external projects and non-business maintainers for filing mutations", async () => {
    const internal = await request(runtime.app)
      .post("/api/external-trades/p-award/external-project")
      .set("x-mock-user-id", "u2")
      .send({ externalPlatformName: "invalid", externalProjectCode: "invalid" });
    expectDenied(internal, "EXTERNAL_TRADE_PROJECT_REQUIRED", ["invalid"]);

    const admin = await request(runtime.app)
      .post("/api/external-trades/p-ext/external-project")
      .set("x-mock-user-id", "u6")
      .send({ externalPlatformName: "admin", externalProjectCode: "admin-code" });
    expectDenied(admin, "EXTERNAL_TRADE_MAINTAINER_REQUIRED", ["admin-code"]);
  });

  it("requires external result material before result filing", async () => {
    const created = await request(runtime.app).post("/api/external-trades/projects").set("x-mock-user-id", "u2").send({ name: "empty result filing" });
    const response = await request(runtime.app).post(`/api/external-trades/${created.body.project.id}/result-record`).set("x-mock-user-id", "u2");
    expectDenied(response, "EXTERNAL_RESULT_MATERIAL_REQUIRED");
  });
});
