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

function seedFrozenReport(runtime: ReturnType<typeof boot>) {
  runtime.ctx.state.reviewReports.push({
    id: "rr-phase5",
    projectId: "p-award",
    reportNo: "RR-PHASE5",
    status: "frozen",
    summaryJson: {
      recommendation: { supplierId: "sup-1", isLowestPrice: false, note: "highest score is not lowest price" },
      ranking: [
        { supplierId: "sup-1", rank: 1, total: 88 },
        { supplierId: "sup-2", rank: 2, total: 87 }
      ]
    },
    snapshotJson: {},
    generatedAt: "2026-06-20T10:00:00.000Z",
    frozenAt: "2026-06-20T11:00:00.000Z",
    createdBy: "u2"
  });
}

describe("Phase 5 award approval and result notification", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
    seedFrozenReport(runtime);
  });

  it("requires frozen source and preserves non-lowest-price reason on award draft", async () => {
    const withoutReport = boot();
    withoutReport.ctx.state.reviewReports = [];
    withoutReport.ctx.state.comparisonReports = [];
    const noReport = await request(withoutReport.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "missing report" });
    expectDenied(noReport, "REVIEW_REPORT_FROZEN_REQUIRED");

    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    expect(created.status).toBe(201);
    expect(created.body.approval.approvalStatus).toBe("draft");
    expect(created.body.approval.isLowestPrice).toBe(false);
    expect(created.body.approval.nonLowestPriceReason).toBe("service score leads");

    const notCandidate = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-4", nonLowestPriceReason: "not in report" });
    expectDenied(notCandidate, "AWARD_SUPPLIER_NOT_RECOMMENDED", ["not in report"]);
  });

  it("submits and mock-approves award approval through adapter logs, not real OA", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });

    const submitted = await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    expect(submitted.status).toBe(200);
    expect(submitted.body.adapterLog.mode).toBe("test");
    expect(submitted.body.adapterLog.adapter).toBe("OA 审批适配器");

    const duplicateSubmit = await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    expectDenied(duplicateSubmit, "AWARD_APPROVAL_STATUS_DENIED");

    const approved = await request(runtime.app)
      .post(`/api/award-approvals/${created.body.approval.id}/mock-approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true, approvalOpinion: "mock approved" });
    expect(approved.status).toBe(200);
    expect(approved.body.approval.approvalStatus).toBe("approved");
    expect(approved.body.adapterLog.mode).toBe("test");
    expect(approved.body.project?.status ?? runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("awarded_pending_order");
  });

  it("sends result notifications with supplier self-only isolation and audit logs", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/mock-approve`).set("x-mock-user-id", "u1").send({ approved: true });

    const sent = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "supplier_self_only" });
    expect(sent.status).toBe(201);
    expect(sent.body.notifications).toHaveLength(2);
    expect(new Set(sent.body.notifications.map((item: { id: string }) => item.id)).size).toBe(2);
    expect(sent.body.notifications.every((item: { awardApprovalId: string }) => item.awardApprovalId === created.body.approval.id)).toBe(true);
    expect(sent.body.auditLogId).toMatch(/^audit-/);

    const supplier = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.notifications).toHaveLength(1);
    expect(supplier.body.notifications[0].supplierId).toBe("sup-1");
    expect(supplier.body.notifications[0].winnerName).toBeUndefined();
    expect(supplier.text).not.toContain("sup-2");

    runtime.ctx.state.users.push({
      id: "u-sup-other",
      name: "Other Supplier",
      orgId: "org-supplier",
      roleId: "supplier",
      supplierId: "sup-4"
    });
    const outsider = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u-sup-other");
    expectDenied(outsider, "SUPPLIER_RESULT_SCOPE_DENIED");

    const publicity = await request(runtime.app).post("/api/projects/p-award/internal-publicity").set("x-mock-user-id", "u2").send({ contentSummary: "phase5 publicity" });
    expect(publicity.status).toBe(201);
    expect(publicity.body.publicityRecord.status).toBe("published");
  });

  it("validates result notification scope and winner-name visibility config", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/mock-approve`).set("x-mock-user-id", "u1").send({ approved: true });

    const badScope = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ scope: "everyone" });
    expectDenied(badScope, "RESULT_NOTIFICATION_SCOPE_INVALID");

    const badVisibility = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "public_all" });
    expectDenied(badVisibility, "RESULT_VISIBILITY_CONFIG_INVALID");

    const sent = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "show_winner_name" });
    expect(sent.status).toBe(201);

    const supplier = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.notifications[0].winnerName).toEqual(expect.any(String));
  });

  it("does not expose internal-publicity notifications to suppliers", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/mock-approve`).set("x-mock-user-id", "u1").send({ approved: true });

    const sent = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ scope: "internal_publicity", visibilityConfig: "show_winner_name" });
    expect(sent.status).toBe(201);
    expect(sent.body.notifications).toHaveLength(1);
    expect(sent.body.notifications[0].supplierId).toBeUndefined();

    const supplier = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.notifications).toHaveLength(0);
  });

  it("blocks external-trade internal award and admin award submission", async () => {
    const external = await request(runtime.app)
      .post("/api/projects/p-ext/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-4", nonLowestPriceReason: "external result only" });
    expectDenied(external, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");

    const admin = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u6")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "admin denied" });
    expectDenied(admin, "AWARD_MAINTAINER_REQUIRED", ["admin denied"]);
  });

  it("supports comparison-report-only award source for comparison projects", async () => {
    runtime.ctx.state.comparisonReports.push({
      id: "cr-phase5-food",
      projectId: "p-food",
      reportNo: "CR-PHASE5-FOOD",
      status: "frozen",
      comparisonRows: [
        {
          supplierId: "sup-3",
          supplierName: "Food Supplier",
          amount: 368000,
          deliveryDays: 1,
          serviceCommitment: "daily delivery",
          rank: 1,
          isLowestPrice: true
        }
      ],
      recommendedSupplierId: "sup-3",
      awardReason: "single qualified supplier",
      generatedBy: "u2",
      generatedAt: "2026-06-20T15:10:00.000Z",
      frozenAt: "2026-06-20T15:40:00.000Z"
    });

    const created = await request(runtime.app).post("/api/projects/p-food/award-approvals").set("x-mock-user-id", "u2").send({ selectedSupplierId: "sup-3" });
    expect(created.status).toBe(201);
    expect(created.body.approval.recommendedSupplierId).toBe("sup-3");
  });
});
