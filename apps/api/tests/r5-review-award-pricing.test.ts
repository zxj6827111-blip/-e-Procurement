import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { Bid, ComparisonReport, User } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r5-"));
}

function boot(dataRoot = makeDataRoot()) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: Array<string | number | null>) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: Array<string | number | null>) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) expect(response.text).not.toContain(token);
}

function confirmAll(runtime: ReturnType<typeof boot>, assignmentId: string, userId: string) {
  return Promise.all(
    ["avoidance", "discipline", "confidentiality"].map((type) => request(runtime.app).post(`/api/expert-assignments/${assignmentId}/confirm`).set("x-mock-user-id", userId).send({ type }))
  );
}

function addFoodReviewFixture(runtime: ReturnType<typeof boot>) {
  runtime.ctx.state.expertAssignments.push({
    id: "ea-r5-food",
    projectId: "p-food",
    expertId: "exp-1",
    method: "appointed",
    status: "confirmed",
    avoidanceConfirmed: true,
    disciplineConfirmed: true,
    confidentialityConfirmed: true,
    reason: "R5 comparison fixture",
    notifiedAt: "2026-06-20T12:30:00.000Z",
    createdAt: "2026-06-20T12:30:00.000Z",
    confirmedAt: "2026-06-20T12:40:00.000Z"
  });
  runtime.ctx.state.projects.find((item) => item.id === "p-food")!.assignedExpertIds.push("exp-1");
  runtime.ctx.state.scoringSheets.push({
    id: "score-r5-food",
    projectId: "p-food",
    expertId: "exp-1",
    supplierId: "sup-3",
    templateId: "st-1",
    technical: 44,
    service: 28,
    price: 20,
    total: 92,
    status: "submitted_locked",
    opinion: "冷链能力满足早餐配送。",
    versionNo: 1,
    submittedAt: "2026-06-20T13:00:00.000Z",
    lockedAt: "2026-06-20T13:01:00.000Z"
  });
}

describe("R5 review award pricing formal source", () => {
  it("persists expert assignments, scoring, comparison, award and pricing reports into r2 tables and restores after restart", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);

    const appointed = await request(runtime1.app)
      .post("/api/projects/p-award/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "R5 formal table assignment" });
    expect(appointed.status).toBe(201);
    const assignmentId = appointed.body.assignment.id as string;
    expect(single(runtime1, "select id from r2_expert_assignments where id = ?", assignmentId)).toBeTruthy();

    const confirmations = await confirmAll(runtime1, assignmentId, "u4");
    expect(confirmations.every((response) => response.status === 200)).toBe(true);
    expect(single<{ assignment_status: string }>(runtime1, "select assignment_status from r2_expert_assignments where id = ?", assignmentId)?.assignment_status).toBe("confirmed");

    const openSheetConfirmations = await confirmAll(runtime1, "ea-3", "u7");
    expect(openSheetConfirmations.every((response) => response.status === 200)).toBe(true);

    const saved = await request(runtime1.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 45, service: 30, price: 18, opinion: "R5 saved score" });
    expect(saved.status).toBe(200);

    const submitted = await request(runtime1.app)
      .post("/api/scoring-sheets/score-open/submit-lock")
      .set("x-mock-user-id", "u7")
      .send({ technical: 46, service: 30, price: 18, opinion: "R5 locked score" });
    expect(submitted.status).toBe(200);
    const scoreRow = single<{ score_status: string; opinion: string; locked_at: string }>(runtime1, "select score_status, opinion, locked_at from r2_expert_scores where id = ?", "score-open");
    expect(scoreRow?.score_status).toBe("submitted_locked");
    expect(scoreRow?.opinion).toBe("R5 locked score");
    expect(scoreRow?.locked_at).toEqual(expect.any(String));

    runtime1.ctx.state.comparisonReports = runtime1.ctx.state.comparisonReports.filter((item) => item.projectId !== "p-food");
    addFoodReviewFixture(runtime1);
    runtime1.ctx.r5ReviewAwardRepository.upsertExpertAssignment(runtime1.ctx.state.expertAssignments.find((item) => item.id === "ea-r5-food")!);
    runtime1.ctx.r5ReviewAwardRepository.upsertScoringSheet(runtime1.ctx.state.scoringSheets.find((item) => item.id === "score-r5-food")!);

    const generated = await request(runtime1.app).post("/api/projects/p-food/comparison-report").set("x-mock-user-id", "u2");
    expect(generated.status).toBe(201);
    expect(generated.body.comparisonReport.comparisonRows[0].expertTotalScore).toBe(92);
    const comparisonId = generated.body.comparisonReport.id as string;
    expect(single(runtime1, "select id from r2_comparison_reports where id = ?", comparisonId)).toBeTruthy();

    const frozen = await request(runtime1.app).post("/api/projects/p-food/comparison-report/freeze").set("x-mock-user-id", "u2");
    expect(frozen.status).toBe(200);

    const award = await request(runtime1.app).post("/api/projects/p-food/award-approvals").set("x-mock-user-id", "u2").send({ selectedSupplierId: "sup-3" });
    expect(award.status).toBe(201);
    const awardId = award.body.approval.id as string;
    expect(single(runtime1, "select id from r2_award_decisions where id = ?", awardId)).toBeTruthy();

    await request(runtime1.app).post(`/api/award-approvals/${awardId}/submit`).set("x-mock-user-id", "u2");
    const approved = await request(runtime1.app).post(`/api/award-approvals/${awardId}/mock-approve`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(approved.status).toBe(200);
    expect(single<{ approval_status: string }>(runtime1, "select approval_status from r2_award_decisions where id = ?", awardId)?.approval_status).toBe("approved");

    const pricing = await request(runtime1.app).post("/api/projects/p-food/pricing-reports").set("x-mock-user-id", "u2");
    expect(pricing.status).toBe(201);
    const pricingId = pricing.body.pricingReport.id as string;
    expect(pricing.body.pricingReport.items.length).toBeGreaterThan(0);
    expect(single(runtime1, "select id from r2_pricing_reports where id = ?", pricingId)).toBeTruthy();
    expect(all(runtime1, "select id from r2_pricing_report_items where pricing_report_id = ?", pricingId).length).toBeGreaterThan(0);

    const runtime2 = boot(dataRoot);
    const assignments = await request(runtime2.app).get("/api/projects/p-award/expert-assignments").set("x-mock-user-id", "u2");
    expect(assignments.status).toBe(200);
    expect(assignments.body.assignments.some((item: { id: string; status: string }) => item.id === assignmentId && item.status === "confirmed")).toBe(true);

    const pricingRead = await request(runtime2.app).get("/api/projects/p-food/pricing-reports").set("x-mock-user-id", "u2");
    expect(pricingRead.status).toBe(200);
    expect(pricingRead.body.pricingReports.some((item: { id: string }) => item.id === pricingId)).toBe(true);
  });

  it("keeps expert, supplier, auditor and admin boundaries for R5 objects", async () => {
    const runtime = boot();

    const ownSheets = await request(runtime.app).get("/api/expert-review/my-scoring-sheets").set("x-mock-user-id", "u7");
    expect(ownSheets.status).toBe(200);
    expect(ownSheets.body.scoringSheets.every((item: { expertId: string }) => item.expertId === "exp-4")).toBe(true);

    const otherSheet = await request(runtime.app).get("/api/scoring-sheets/score-3").set("x-mock-user-id", "u7");
    expectDenied(otherSheet, "EXPERT_SCORE_SCOPE_DENIED", ["质量控制"]);

    const supplierSummary = await request(runtime.app).get("/api/projects/p-award/scoring-summary").set("x-mock-user-id", "u3");
    expectDenied(supplierSummary, "EXPERT_REVIEW_READ_DENIED", ["score-1"]);

    const supplierWorkbench = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u3");
    expect(supplierWorkbench.status).toBe(200);
    expect(supplierWorkbench.body.awardApprovals).toEqual([]);
    expect(supplierWorkbench.body.pricingReports).toEqual([]);

    const auditorAwardCreate = await request(runtime.app).post("/api/projects/p-award/award-approvals").set("x-mock-user-id", "u5").send({ selectedSupplierId: "sup-1" });
    expectDenied(auditorAwardCreate, "AWARD_MAINTAINER_REQUIRED");

    const adminAwardCreate = await request(runtime.app).post("/api/projects/p-award/award-approvals").set("x-mock-user-id", "u6").send({ selectedSupplierId: "sup-1" });
    expectDenied(adminAwardCreate, "AWARD_MAINTAINER_REQUIRED");
  });

  it("blocks before-deadline scoring, summary, comparison and award", async () => {
    const runtime = boot();
    const expertUser: User = {
      id: "u-r5-pre-expert",
      name: "R5 Pre Expert",
      orgId: "org-east",
      roleId: "expert",
      expertId: "exp-1",
      orgScope: ["org-hotel", "org-east"]
    };
    runtime.ctx.state.users.push(expertUser);
    runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.assignedExpertIds.push("exp-1");
    runtime.ctx.state.expertAssignments.push({
      id: "ea-r5-pre",
      projectId: "p-pre",
      expertId: "exp-1",
      method: "appointed",
      status: "confirmed",
      avoidanceConfirmed: true,
      disciplineConfirmed: true,
      confidentialityConfirmed: true
    });
    runtime.ctx.state.scoringSheets.push({
      id: "score-r5-pre",
      projectId: "p-pre",
      expertId: "exp-1",
      supplierId: "sup-1",
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

    const score = await request(runtime.app)
      .post("/api/scoring-sheets/score-r5-pre/save")
      .set("x-mock-user-id", "u-r5-pre-expert")
      .send({ technical: 10, service: 10, price: 10, opinion: "too early" });
    expectDenied(score, "BID_DEADLINE_NOT_REACHED", ["too early"]);

    const summary = await request(runtime.app).get("/api/projects/p-pre/scoring-summary").set("x-mock-user-id", "u2");
    expectDenied(summary, "BID_DEADLINE_NOT_REACHED");

    const comparison = await request(runtime.app).post("/api/projects/p-pre/comparison-report").set("x-mock-user-id", "u2");
    expectDenied(comparison, "BID_DEADLINE_NOT_REACHED");

    const award = await request(runtime.app).post("/api/projects/p-pre/award-approvals").set("x-mock-user-id", "u2").send({ selectedSupplierId: "sup-1" });
    expectDenied(award, "BID_DEADLINE_NOT_REACHED");
  });

  it("blocks award for unsubmitted or restricted suppliers", async () => {
    const runtime = boot();
    runtime.ctx.state.comparisonReports.push({
      id: "cr-r5-invalid",
      projectId: "p-award",
      reportNo: "CR-R5-INVALID",
      status: "frozen",
      comparisonRows: [
        {
          supplierId: "sup-4",
          supplierName: "Restricted Supplier",
          amount: 888000,
          deliveryDays: 10,
          serviceCommitment: "invalid fixture",
          rank: 1,
          isLowestPrice: true
        }
      ],
      recommendedSupplierId: "sup-4",
      awardReason: "invalid fixture",
      generatedBy: "u2",
      generatedAt: "2026-06-20T10:00:00.000Z",
      frozenAt: "2026-06-20T11:00:00.000Z"
    } satisfies ComparisonReport);
    runtime.ctx.state.projects.find((item) => item.id === "p-award")!.participantSupplierIds.push("sup-4");

    const noBid = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-4", nonLowestPriceReason: "invalid" });
    expectDenied(noBid, "AWARD_SUPPLIER_BID_INVALID");

    runtime.ctx.state.bids.push({
      id: "bid-r5-restricted",
      projectId: "p-award",
      supplierId: "sup-4",
      amount: 888000,
      status: "locked",
      submittedAt: "2026-06-18T10:00:00.000Z",
      quoteDeadlineAt: "2026-06-18T17:00:00.000Z",
      lockedAt: "2026-06-18T17:10:00.000Z",
      fileId: "file-r5-restricted",
      fileName: "restricted.pdf"
    } satisfies Bid);

    const restricted = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-4", nonLowestPriceReason: "invalid" });
    expectDenied(restricted, "AWARD_SUPPLIER_RESTRICTED");
  });
});
