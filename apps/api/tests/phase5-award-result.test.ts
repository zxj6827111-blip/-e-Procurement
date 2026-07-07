import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createIsolatedRuntime } from "./helpers/test-runtime.js";

function boot() {
  return createIsolatedRuntime("eproc-phase5-");
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

async function approveAwardThroughWorkflow(runtime: ReturnType<typeof boot>, approvalId: string, opinion = "workflow approved") {
  const submitted = await request(runtime.app).post(`/api/award-approvals/${approvalId}/submit`).set("x-mock-user-id", "u2");
  expect(submitted.status).toBe(200);
  const instanceId = submitted.body.workflow.approvalInstance.id as string;
  const approved = await request(runtime.app).post(`/api/workflow/approval-instances/${instanceId}/actions`).set("x-mock-user-id", "u1").send({ action: "approve", opinion });
  expect(approved.status).toBe(200);
  return { submitted, approved };
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

  it("submits and approves award approval through formal workflow", async () => {
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

    const buyerApprove = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${submitted.body.workflow.approvalInstance.id}/actions`)
      .set("x-mock-user-id", "u2")
      .send({ action: "approve", opinion: "buyer should not approve own award" });
    expect(buyerApprove.status).toBe(403);
    expect(buyerApprove.body.error.code).toBe("WORKFLOW_ASSIGNEE_DENIED");

    const approved = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${submitted.body.workflow.approvalInstance.id}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "approve", opinion: "workflow approved" });
    expect(approved.status).toBe(200);
    expect(runtime.ctx.state.awardApprovals.find((item) => item.id === created.body.approval.id)?.approvalStatus).toBe("approved");
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("awarded_pending_order");
  });

  it("sends result notifications with supplier self-only isolation and audit logs", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await approveAwardThroughWorkflow(runtime, created.body.approval.id);

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

    const duplicateSent = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "supplier_self_only" });
    expect(duplicateSent.status).toBe(200);
    expect(duplicateSent.body.notifications).toHaveLength(2);
    expect(runtime.ctx.state.resultNotifications.filter((item) => item.projectId === "p-award" && item.awardApprovalId === created.body.approval.id && item.scope === "supplier_self")).toHaveLength(2);

    const duplicatePublicity = await request(runtime.app).post("/api/projects/p-award/internal-publicity").set("x-mock-user-id", "u2").send({ contentSummary: "duplicate publicity" });
    expect(duplicatePublicity.status).toBe(200);
    expect(duplicatePublicity.body.publicityRecord.id).toBe(publicity.body.publicityRecord.id);
    expect(runtime.ctx.state.internalPublicityRecords.filter((item) => item.projectId === "p-award" && item.awardApprovalId === created.body.approval.id)).toHaveLength(1);
  });

  it("allows supplier admin and quotation accounts to read own award result and pricing report only", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await approveAwardThroughWorkflow(runtime, created.body.approval.id);
    runtime.ctx.state.contractLedgers = runtime.ctx.state.contractLedgers.filter((item) => item.projectId !== "p-award");

    const pricing = await request(runtime.app).post("/api/projects/p-award/pricing-reports").set("x-mock-user-id", "u2").send({ awardApprovalId: created.body.approval.id });
    expect(pricing.status).toBe(201);

    const sent = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "supplier_self_only" });
    expect(sent.status).toBe(201);

    const quotationResult = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u12");
    expect(quotationResult.status).toBe(200);
    expect(quotationResult.body.notifications).toHaveLength(1);
    expect(quotationResult.body.notifications[0].supplierId).toBe("sup-1");
    expect(quotationResult.text).not.toContain("sup-2");

    const adminResult = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u11");
    expect(adminResult.status).toBe(200);
    expect(adminResult.body.notifications).toHaveLength(1);

    const quotationPricing = await request(runtime.app).get("/api/projects/p-award/pricing-reports").set("x-mock-user-id", "u12");
    expect(quotationPricing.status).toBe(200);
    expect(quotationPricing.body.pricingReports.length).toBeGreaterThan(0);
    expect(quotationPricing.body.pricingReports.every((report: { selectedSupplierId: string }) => report.selectedSupplierId === "sup-1")).toBe(true);

    const otherSupplierPricing = await request(runtime.app).get("/api/projects/p-award/pricing-reports").set("x-mock-user-id", "u15");
    expect(otherSupplierPricing.status).toBe(200);
    expect(otherSupplierPricing.body.pricingReports).toHaveLength(0);
  });

  it("runs award follow-up through contract confirmation and auto-listed awarded products", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await approveAwardThroughWorkflow(runtime, created.body.approval.id);

    const pricing = await request(runtime.app).post("/api/projects/p-award/pricing-reports").set("x-mock-user-id", "u2").send({ awardApprovalId: created.body.approval.id });
    expect(pricing.status).toBe(201);

    const signing = await request(runtime.app).post("/api/projects/p-award/contracts/signing").set("x-mock-user-id", "u2").send();
    expect([200, 201]).toContain(signing.status);
    expect(signing.body.contract.supplierId).toBe("sup-1");

    const supplierContracts = await request(runtime.app).get("/api/projects/p-award/contracts").set("x-mock-user-id", "u11");
    expect(supplierContracts.status).toBe(200);
    expect(supplierContracts.body.contracts.map((item: { id: string }) => item.id)).toContain(signing.body.contract.id);

    const otherSupplierConfirm = await request(runtime.app).post(`/api/contracts/${signing.body.contract.id}/confirm`).set("x-mock-user-id", "u15");
    expectDenied(otherSupplierConfirm, "SUPPLIER_CONTRACT_CONFIRM_DENIED");

    const confirmed = await request(runtime.app).post(`/api/contracts/${signing.body.contract.id}/confirm`).set("x-mock-user-id", "u11");
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.contract.status).toBe("registered");

    const listed = await request(runtime.app).post("/api/projects/p-award/award-products/auto-list").set("x-mock-user-id", "u2");
    expect(listed.status).toBe(201);
    expect(listed.body.products.length).toBeGreaterThan(0);
    expect(listed.body.products.every((item: { status: string; supplierId: string; sourceType: string; sourceProjectId: string }) => item.status === "listed" && item.supplierId === "sup-1" && item.sourceType === "award_project" && item.sourceProjectId === "p-award")).toBe(true);

    const supplierMall = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u11");
    expect(supplierMall.status).toBe(200);
    expect(supplierMall.body.products.some((item: { sourceProjectId?: string; supplierId: string; status: string; activePrice?: unknown }) => item.sourceProjectId === "p-award" && item.supplierId === "sup-1" && item.status === "listed" && item.activePrice)).toBe(true);
  });

  it("keeps award result visible when participant list misses the selected supplier", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await approveAwardThroughWorkflow(runtime, created.body.approval.id);

    const project = runtime.ctx.state.projects.find((item) => item.id === "p-award");
    expect(project).toBeTruthy();
    project!.participantSupplierIds = ["sup-2"];

    const sent = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "supplier_self_only" });
    expect(sent.status).toBe(201);
    expect(sent.body.notifications.map((item: { supplierId?: string }) => item.supplierId)).toEqual(expect.arrayContaining(["sup-1", "sup-2"]));

    const quotationResult = await request(runtime.app).get("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u12");
    expect(quotationResult.status).toBe(200);
    expect(quotationResult.body.notifications).toHaveLength(1);
    expect(quotationResult.body.notifications[0].supplierId).toBe("sup-1");
    expect(quotationResult.body.notifications[0].selected).toBe(true);
  });

  it("validates result notification scope and winner-name visibility config", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    await approveAwardThroughWorkflow(runtime, created.body.approval.id);

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
    await approveAwardThroughWorkflow(runtime, created.body.approval.id);

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

  it("allows group management to confirm pending award approval from the award detail context", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service score leads" });
    const submitted = await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    const instanceId = submitted.body.workflow.approvalInstance.id as string;

    const tasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u1");
    expect(tasks.status).toBe(200);
    expect(tasks.body.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          approvalInstanceId: instanceId,
          assigneeRoleId: "group_manager",
          businessType: "award_approval",
          status: "pending"
        })
      ])
    );

    const approved = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${instanceId}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "approve", opinion: "集团确认定标" });
    expect(approved.status).toBe(200);
    expect(approved.body.approvalInstance.approvalStatus).toBe("approved");
    expect(runtime.ctx.state.awardApprovals.find((item) => item.id === created.body.approval.id)?.approvalStatus).toBe("approved");
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("awarded_pending_order");
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
