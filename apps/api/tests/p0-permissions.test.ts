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
  expect(response.body.error.message.length).toBeGreaterThan(0);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

describe("P0 permission and audit controls", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("rejects supplier A reading supplier B detail and writes audit log", async () => {
    const response = await request(runtime.app).get("/api/suppliers/sup-2").set("x-mock-user-id", "u3");
    expectDenied(response, "SUPPLIER_SCOPE_DENIED", ["苏州洁雅清洁服务有限公司"]);
  });

  it("rejects expert A reading another expert scoring sheet", async () => {
    const response = await request(runtime.app).get("/api/scoring-sheets/score-3").set("x-mock-user-id", "u4");
    expectDenied(response, "EXPERT_SCORE_SCOPE_DENIED", ["质量控制和交付响应较稳定"]);
  });

  it("rejects buyer reading bid amount before deadline without abnormal view approval", async () => {
    const response = await request(runtime.app)
      .post("/api/bids/bid-pre-1/view-check")
      .set("x-mock-user-id", "u2")
      .send({ content: "amount" });
    expectDenied(response, "BID_CONFIDENTIALITY_DENIED", ["186000"]);
  });

  it("rejects group manager reading bid file before deadline without approval", async () => {
    const response = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u1")
      .send({ content: "response_file_metadata" });
    expectDenied(response, "BID_CONFIDENTIALITY_DENIED", ["响应文件-一次性用品.pdf"]);
  });

  it("rejects auditor reading bid amount before deadline without approval", async () => {
    const response = await request(runtime.app)
      .post("/api/bids/bid-pre-1/view-check")
      .set("x-mock-user-id", "u5")
      .send({ content: "amount" });
    expectDenied(response, "BID_CONFIDENTIALITY_DENIED", ["186000"]);
  });

  it("allows approved file metadata but rejects amount out of scope", async () => {
    const allowed = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u2")
      .send({ content: "response_file_metadata", approvalId: "bva-file-meta-active" });
    expect(allowed.status).toBe(200);

    const denied = await request(runtime.app)
      .post("/api/bids/bid-pre-1/view-check")
      .set("x-mock-user-id", "u2")
      .send({ content: "amount", approvalId: "bva-file-meta-active" });
    expect(denied.status).toBe(403);
    expectDenied(denied, "BID_CONFIDENTIALITY_DENIED", ["186000"]);
  });

  it("rejects expired abnormal view approval", async () => {
    const response = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u2")
      .send({ content: "response_file_metadata", approvalId: "bva-expired" });
    expectDenied(response, "BID_CONFIDENTIALITY_DENIED", ["响应文件-一次性用品.pdf"]);
  });

  it("blocks external trade project internal registration and writes audit log", async () => {
    const response = await request(runtime.app)
      .post("/api/projects/p-ext/internal-actions/internal_registration")
      .set("x-mock-user-id", "u2");
    expectDenied(response, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");
  });

  it("blocks external trade project internal bid and expert review", async () => {
    const bidResponse = await request(runtime.app)
      .post("/api/projects/p-ext/internal-actions/internal_bid")
      .set("x-mock-user-id", "u2");
    expectDenied(bidResponse, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");

    const reviewResponse = await request(runtime.app)
      .post("/api/projects/p-ext/internal-actions/internal_expert_review")
      .set("x-mock-user-id", "u2");
    expectDenied(reviewResponse, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");
  });

  it("rejects admin reading bid details", async () => {
    const response = await request(runtime.app)
      .post("/api/bids/bid-award-1/view-check")
      .set("x-mock-user-id", "u6")
      .send({ content: "amount" });
    expectDenied(response, "ADMIN_BUSINESS_DATA_DENIED", ["1286000"]);
  });

  it("rejects expert without confidentiality confirmation viewing response materials", async () => {
    const response = await request(runtime.app)
      .post("/api/expert-review/p-award/materials/view-check")
      .set("x-mock-user-id", "u7");
    expectDenied(response, "EXPERT_AVOIDANCE_REQUIRED");
  });

  it("rejects modifying locked expert scoring sheet", async () => {
    const response = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/save")
      .set("x-mock-user-id", "u4")
      .send({ opinion: "尝试修改锁定意见" });
    expectDenied(response, "SCORING_SHEET_LOCKED", ["尝试修改锁定意见"]);
  });

  it("creates a new scoring version after reevaluation approval without replacing older versions", async () => {
    const before = runtime.ctx.state.scoringVersions.filter((item) => item.sheetId === "score-1").length;
    const requested = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "phase4 request before approval" });
    expect(requested.status).toBe(201);

    const response = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-approve")
      .set("x-mock-user-id", "u1")
      .send({ reason: "重评审批通过测试" });
    expect(response.status).toBe(200);
    expect(response.body.version.versionNo).toBe(3);
    const after = runtime.ctx.state.scoringVersions.filter((item) => item.sheetId === "score-1").length;
    expect(after).toBe(before + 2);
  });

  it("rejects direct update after archive item is sealed", async () => {
    const response = await request(runtime.app)
      .post("/api/archive-items/ai-ext-result/update")
      .set("x-mock-user-id", "u2")
      .send({ collectedFlag: true });
    expectDenied(response, "ARCHIVE_ITEM_SEALED");
  });

  it("keeps prohibited contract body and signing capabilities closed", async () => {
    const response = await request(runtime.app).post("/api/contracts/cl-award-1/body").set("x-mock-user-id", "u2");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");

    const signing = await request(runtime.app).post("/api/contracts/cl-award-1/sign").set("x-mock-user-id", "u2");
    expect(signing.status).toBe(404);
    expect(signing.body.error.code).toBe("NOT_FOUND");
  });

  it("exposes the exact P0 endpoint set required by the goal", async () => {
    const externalBlock = await request(runtime.app)
      .post("/api/external-trades/p-ext/block-check")
      .set("x-mock-user-id", "u2")
      .send({ action: "internal_bid" });
    expectDenied(externalBlock, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");

    const reevaluationRequest = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-request")
      .set("x-mock-user-id", "u1")
      .send({ reason: "端点覆盖测试" });
    expect(reevaluationRequest.status).toBe(201);
    expect(reevaluationRequest.body.auditLogId).toMatch(/^audit-/);

    runtime.ctx.state.receiptRecords.push({
      id: "rrc-award-p0-1",
      purchaseOrderId: "po-award-1",
      projectId: "p-award",
      supplierId: "sup-1",
      receiptType: "full",
      status: "recorded",
      acceptanceResult: "accepted",
      handlingStatus: "none",
      receivedItems: runtime.ctx.state.purchaseOrders.find((entry) => entry.id === "po-award-1")?.lineItems.map((item) => ({
        itemName: item.itemName,
        receivedQuantity: item.quantity,
        unit: item.unit,
        accepted: true
      })) ?? [],
      summary: "p0 archive coverage baseline",
      receiptAt: "2026-07-02T10:00:00.000Z",
      operatorId: "u2",
      attachmentMetadata: [],
      createdBy: "u2",
      createdAt: "2026-07-02T10:00:00.000Z"
    });
    runtime.ctx.state.settlementMaterials = runtime.ctx.state.settlementMaterials.map((entry) =>
      entry.projectId === "p-award" ? { ...entry, status: "verified", verificationOpinion: "p0 archive coverage baseline" } : entry
    );

    const snapshot = await request(runtime.app).post("/api/projects/p-award/archive-snapshot").set("x-mock-user-id", "u2");
    expect(snapshot.status).toBe(201);
    expect(snapshot.body.auditLogId).toMatch(/^audit-/);

    const check = await request(runtime.app).post("/api/projects/p-award/archive-check").set("x-mock-user-id", "u2");
    expect(check.status).toBe(200);
    expect(check.body.auditLogId).toMatch(/^audit-/);

    runtime.ctx.state.auditLogs.push({
      id: "audit-p0-award",
      actorId: "u2",
      roleId: "buyer",
      orgId: "org-east",
      projectId: "p-award",
      action: "p0.archive.prepare",
      objectType: "project",
      objectId: "p-award",
      result: "recorded",
      createdAt: "2026-07-02T10:05:00.000Z"
    });

    const seal = await request(runtime.app).post("/api/projects/p-award/archive-seal").set("x-mock-user-id", "u2");
    expect(seal.status).toBe(200);
    expect(seal.body.auditLogId).toMatch(/^audit-/);

    const supplement = await request(runtime.app)
      .post("/api/archive-items/ai-ext-result/supplement-requests")
      .set("x-mock-user-id", "u2")
      .send({ reason: "端点覆盖测试" });
    expect(supplement.status).toBe(201);

    const approve = await request(runtime.app)
      .post(`/api/archive-supplement-requests/${supplement.body.supplementRequest.id}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    expect(approve.status).toBe(200);
    expect(approve.body.auditLogId).toMatch(/^audit-/);
  });

  it("rejects invalid project transition status through the state machine", async () => {
    const response = await request(runtime.app)
      .post("/api/projects/p-pre/transitions")
      .set("x-mock-user-id", "u2")
      .send({ status: "fake_status" });
    expect(response.status).toBe(400);
    expectDenied(response, "PROJECT_STATUS_INVALID");
  });
});
