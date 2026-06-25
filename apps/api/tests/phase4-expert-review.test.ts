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
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

describe("Phase 4 expert review and scoring report", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("lets business roles manage expert assignments with mandatory reasons and blocks external-trade review", async () => {
    const missingReason = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1" });
    expectDenied(missingReason, "EXPERT_APPOINT_REASON_REQUIRED");

    const appointed = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "category match" });
    expect(appointed.status).toBe(201);
    expect(appointed.body.assignment.expertId).toBe("exp-1");
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-food")?.assignedExpertIds).toContain("exp-1");

    const replaced = await request(runtime.app)
      .post(`/api/expert-assignments/${appointed.body.assignment.id}/replace`)
      .set("x-mock-user-id", "u2")
      .send({ replacementExpertId: "exp-3", reason: "avoidance relation" });
    expect(replaced.status).toBe(201);
    expect(replaced.body.replacement.expertId).toBe("exp-3");

    const external = await request(runtime.app)
      .post("/api/projects/p-ext/expert-assignments/draw")
      .set("x-mock-user-id", "u2")
      .send({ count: 1 });
    expectDenied(external, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");
  });

  it("requires expert confirmations before material access and scoring", async () => {
    const sheet = await request(runtime.app).get("/api/scoring-sheets/score-open").set("x-mock-user-id", "u7");
    expect(sheet.status).toBe(200);

    const material = await request(runtime.app).post("/api/expert-review/p-award/materials/view-check").set("x-mock-user-id", "u7");
    expectDenied(material, "EXPERT_AVOIDANCE_REQUIRED");

    const saveBeforeConfirm = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 40, service: 25, price: 20, opinion: "before confirm" });
    expectDenied(saveBeforeConfirm, "EXPERT_AVOIDANCE_REQUIRED", ["before confirm"]);

    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const confirmed = await request(runtime.app)
        .post("/api/expert-assignments/ea-3/confirm")
        .set("x-mock-user-id", "u7")
        .send({ type });
      expect(confirmed.status).toBe(200);
    }

    const saved = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 40, service: 25, price: 20, opinion: "confirmed score" });
    expect(saved.status).toBe(200);
    expect(saved.body.scoringSheet.total).toBe(85);
  });

  it("enforces expert-only scoring isolation and lock semantics", async () => {
    const buyerRead = await request(runtime.app).get("/api/scoring-sheets/score-1").set("x-mock-user-id", "u2");
    expectDenied(buyerRead, "EXPERT_ROLE_REQUIRED", ["综合服务能力"]);

    const otherExpertRead = await request(runtime.app).get("/api/scoring-sheets/score-3").set("x-mock-user-id", "u4");
    expectDenied(otherExpertRead, "EXPERT_SCORE_SCOPE_DENIED", ["质量控制"]);

    const buyerSave = await request(runtime.app).post("/api/scoring-sheets/score-open/save").set("x-mock-user-id", "u2").send({ opinion: "buyer edit" });
    expectDenied(buyerSave, "EXPERT_ROLE_REQUIRED", ["buyer edit"]);

    const locked = await request(runtime.app).post("/api/scoring-sheets/score-1/save").set("x-mock-user-id", "u4").send({ opinion: "locked edit" });
    expectDenied(locked, "SCORING_SHEET_LOCKED", ["locked edit"]);
  });

  it("creates reevaluation versions without replacing history", async () => {
    const openRequest = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "invalid open reevaluation" });
    expectDenied(openRequest, "REEVALUATION_SOURCE_NOT_LOCKED", ["invalid open reevaluation"]);

    const requestRes = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "score review requested" });
    expect(requestRes.status).toBe(201);

    const approved = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-approve")
      .set("x-mock-user-id", "u1")
      .send({ reason: "approved for correction" });
    expect(approved.status).toBe(200);
    expect(approved.body.version.versionNo).toBe(3);
    expect(runtime.ctx.state.scoringVersions.filter((item) => item.sheetId === "score-1")).toHaveLength(4);
  });

  it("revokes replaced expert access to old open scoring sheets", async () => {
    const replaced = await request(runtime.app)
      .post("/api/expert-assignments/ea-3/replace")
      .set("x-mock-user-id", "u2")
      .send({ replacementExpertId: "exp-1", reason: "phase4 replacement regression" });
    expect(replaced.status).toBe(201);

    const read = await request(runtime.app).get("/api/scoring-sheets/score-open").set("x-mock-user-id", "u7");
    expectDenied(read, "EXPERT_ASSIGNMENT_INACTIVE");

    const save = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 10, service: 10, price: 10, opinion: "stale expert edit" });
    expectDenied(save, "EXPERT_ASSIGNMENT_INACTIVE", ["stale expert edit"]);

    const mySheets = await request(runtime.app).get("/api/expert-review/my-scoring-sheets").set("x-mock-user-id", "u7");
    expect(mySheets.status).toBe(200);
    expect(mySheets.body.scoringSheets.some((item: { id: string }) => item.id === "score-open")).toBe(false);
  });

  it("blocks expert-review actions for external-trade projects even if dirty data exists", async () => {
    runtime.ctx.state.projects.find((item) => item.id === "p-ext")!.assignedExpertIds.push("exp-4");
    runtime.ctx.state.expertAssignments.push({
      id: "ea-ext-dirty",
      projectId: "p-ext",
      expertId: "exp-4",
      method: "dirty",
      status: "confirmed",
      avoidanceConfirmed: true,
      disciplineConfirmed: true,
      confidentialityConfirmed: true
    });
    runtime.ctx.state.scoringSheets.push({
      id: "score-ext-dirty",
      projectId: "p-ext",
      expertId: "exp-4",
      supplierId: "sup-4",
      templateId: "st-1",
      technical: 0,
      service: 0,
      price: 0,
      total: 0,
      status: "scoring",
      opinion: "",
      versionNo: 1,
      submittedAt: null,
      lockedAt: null
    });

    const material = await request(runtime.app).post("/api/expert-review/p-ext/materials/view-check").set("x-mock-user-id", "u7");
    expectDenied(material, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");

    const save = await request(runtime.app)
      .post("/api/scoring-sheets/score-ext-dirty/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 10, service: 10, price: 10, opinion: "external dirty edit" });
    expectDenied(save, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["external dirty edit"]);
  });

  it("generates scoring summary and freezes review report only after all sheets are submitted", async () => {
    const notAllSubmitted = await request(runtime.app).post("/api/projects/p-award/review-report").set("x-mock-user-id", "u2");
    expectDenied(notAllSubmitted, "SCORING_NOT_ALL_SUBMITTED");

    runtime.ctx.state.scoringSheets = runtime.ctx.state.scoringSheets.filter((item) => item.id !== "score-open");

    const summary = await request(runtime.app).get("/api/projects/p-award/scoring-summary").set("x-mock-user-id", "u2");
    expect(summary.status).toBe(200);
    expect(summary.body.summary.ranking[0].supplierId).toBe("sup-1");
    expect(summary.body.summary.allSubmitted).toBe(true);

    const report = await request(runtime.app).post("/api/projects/p-award/review-report").set("x-mock-user-id", "u2").send({ note: "phase4 report" });
    expect(report.status).toBe(201);
    expect(report.body.report.status).toBe("generated");

    const frozen = await request(runtime.app).post("/api/projects/p-award/review-report/freeze").set("x-mock-user-id", "u2");
    expect(frozen.status).toBe(200);
    expect(frozen.body.project.status).toBe("review_report_frozen");

    const afterFreeze = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "late change" });
    expectDenied(afterFreeze, "REVIEW_REPORT_FROZEN", ["late change"]);
  });
});
