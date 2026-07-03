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

  it("blocks result publication for approvals that did not enter formal workflow", async () => {
    const runtime = boot();
    const approval = runtime.ctx.state.awardApprovals.find((item) => item.id === "aa-award-1");
    expect(approval).toBeTruthy();
    approval!.submittedAt = null;
    approval!.approvedAt = new Date().toISOString();
    approval!.approvalStatus = "approved";
    runtime.ctx.r5ReviewAwardRepository.upsertAwardApproval(approval!);
    runtime.ctx.runtimeDb.db.prepare("delete from r2_approval_instances where business_type = 'award_approval' and business_id = ?").run(approval!.id);

    const response = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ visibilityConfig: "supplier_self_only" });

    expectDenied(response, "AWARD_APPROVAL_WORKFLOW_REQUIRED");
  });

  it("blocks archive sealing before fulfillment closeout evidence exists", async () => {
    const runtime = boot();
    const project = runtime.ctx.state.projects.find((item) => item.id === "p-award");
    expect(project).toBeTruthy();
    project!.status = "performing";
    const snapshot = await request(runtime.app).post("/api/projects/p-award/archive-snapshot").set("x-mock-user-id", "u2");
    expect(snapshot.status).toBe(201);
    runtime.ctx.state.receiptRecords.push({
      id: "rrc-sellable-not-ready",
      purchaseOrderId: "po-award-1",
      projectId: "p-award",
      supplierId: "sup-1",
      receiptType: "full",
      status: "recorded",
      acceptanceResult: "accepted",
      handlingStatus: "none",
      receivedItems:
        runtime.ctx.state.purchaseOrders.find((entry) => entry.id === "po-award-1")?.lineItems.map((item) => ({
          itemName: item.itemName,
          receivedQuantity: item.quantity,
          unit: item.unit,
          accepted: true
        })) ?? [],
      summary: "sellable closeout evidence without final project status",
      receiptAt: "2026-07-02T09:00:00.000Z",
      operatorId: "u2",
      attachmentMetadata: [],
      createdBy: "u2",
      createdAt: "2026-07-02T09:00:00.000Z"
    });
    runtime.ctx.state.supplierEvaluations.push({
      id: "se-sellable-not-ready",
      supplierId: "sup-1",
      projectId: "p-award",
      contractId: "cl-award-1",
      dimensions: { quality: 90, delivery: 90, service: 90, cooperation: 90, priceReasonableness: 90 },
      score: 90,
      status: "submitted_locked",
      versionNo: 1,
      description: "sellable closeout evidence without final project status",
      lockedAt: "2026-07-02T09:05:00.000Z",
      createdBy: "u2",
      createdAt: "2026-07-02T09:05:00.000Z"
    });
    runtime.ctx.state.settlementMaterials = runtime.ctx.state.settlementMaterials.map((entry) =>
      entry.projectId === "p-award" ? { ...entry, status: "verified", verificationOpinion: "sellable closeout evidence" } : entry
    );
    runtime.ctx.state.auditLogs.push({
      id: "audit-sellable-not-ready",
      actorId: "u2",
      roleId: "buyer",
      orgId: "org-east",
      projectId: "p-award",
      action: "sellable.archive.prepare",
      objectType: "project",
      objectId: "p-award",
      result: "recorded",
      createdAt: "2026-07-02T09:10:00.000Z"
    });

    const response = await request(runtime.app).post("/api/projects/p-award/archive-seal").set("x-mock-user-id", "u2");

    expectDenied(response, "ARCHIVE_CLOSEOUT_NOT_READY");
  });

  it("blocks contract acceptance records before performance is active", async () => {
    const runtime = boot();
    const response = await request(runtime.app)
      .post("/api/contracts/cl-award-1/acceptance-payments")
      .set("x-mock-user-id", "u2")
      .send({ recordType: "acceptance", summary: "should require active performance" });

    expectDenied(response, "ACCEPTANCE_PERFORMANCE_NOT_READY");
  });

  it("keeps system administrators outside business workbench data", async () => {
    const runtime = boot();

    const response = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u6");

    expectDenied(response, "PROJECT_WORKBENCH_READ_DENIED");
  });
});
