import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createIsolatedRuntime } from "./helpers/test-runtime.js";

function boot() {
  return createIsolatedRuntime("eproc-phase8-");
}

function expectDenied(response: request.Response, code: string) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
}

describe("Phase 8 archive closeout and audit supervision", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("creates archive directory snapshot and detects missing required items", async () => {
    const snapshot = await request(runtime.app).post("/api/projects/p-food/archive-snapshot").set("x-mock-user-id", "u2");
    expect(snapshot.status).toBe(201);
    expect(snapshot.body.archiveItems.length).toBeGreaterThan(0);
    expect(snapshot.body.archiveItems[0].snapshotJson.templateVersion).toBeGreaterThanOrEqual(1);

    const check = await request(runtime.app).post("/api/projects/p-food/archive-check").set("x-mock-user-id", "u2");
    expect(check.status).toBe(200);
    expect(check.body.status).toBe("incomplete");
    expect(check.body.missingItems.length).toBeGreaterThan(0);
    expect(check.body.auditLogId).toMatch(/^audit-/);
  });

  it("seals archive and prevents direct mutation", async () => {
    runtime.ctx.state.receiptRecords.push({
      id: "rrc-award-test-1",
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
      summary: "phase8 seal baseline",
      receiptAt: "2026-07-02T09:00:00.000Z",
      operatorId: "u2",
      attachmentMetadata: [],
      createdBy: "u2",
      createdAt: "2026-07-02T09:00:00.000Z"
    });
    runtime.ctx.state.settlementMaterials = runtime.ctx.state.settlementMaterials.map((entry) =>
      entry.projectId === "p-award" ? { ...entry, status: "verified", verificationOpinion: "phase8 seal baseline" } : entry
    );
    runtime.ctx.state.supplierEvaluations.push({
      id: "se-phase8-award",
      supplierId: "sup-1",
      projectId: "p-award",
      contractId: "cl-award-1",
      dimensions: { quality: 90, delivery: 90, service: 90, cooperation: 90, priceReasonableness: 90 },
      score: 90,
      status: "submitted_locked",
      versionNo: 1,
      description: "phase8 seal baseline",
      lockedAt: "2026-07-02T09:03:00.000Z",
      createdBy: "u2",
      createdAt: "2026-07-02T09:03:00.000Z"
    });
    const project = runtime.ctx.state.projects.find((item) => item.id === "p-award");
    if (project) {
      project.status = "evaluated";
      project.displayStatus = "supplier evaluated";
    }

    await request(runtime.app).post("/api/projects/p-award/archive-snapshot").set("x-mock-user-id", "u2");
    runtime.ctx.state.auditLogs.push({
      id: "audit-phase8-award",
      actorId: "u2",
      roleId: "buyer",
      orgId: "org-east",
      projectId: "p-award",
      action: "phase8.archive.prepare",
      objectType: "project",
      objectId: "p-award",
      result: "recorded",
      createdAt: "2026-07-02T09:05:00.000Z"
    });

    const seal = await request(runtime.app).post("/api/projects/p-award/archive-seal").set("x-mock-user-id", "u2");
    expect(seal.status).toBe(200);
    expect(seal.body.archiveItems.every((item: { sealed: boolean }) => item.sealed)).toBe(true);

    const itemId = seal.body.archiveItems[0].id;
    const direct = await request(runtime.app).post(`/api/archive-items/${itemId}/update`).set("x-mock-user-id", "u2").send({ collectedFlag: true });
    expectDenied(direct, "ARCHIVE_ITEM_SEALED");
  });

  it("requires supplement approval before applying and does not overwrite old snapshot fields", async () => {
    const original = runtime.ctx.state.archiveItems.find((item) => item.id === "ai-ext-result");
    const originalSnapshot = { ...original?.snapshotJson };

    const supplement = await request(runtime.app)
      .post("/api/archive-items/ai-ext-result/supplement-requests")
      .set("x-mock-user-id", "u2")
      .send({ reason: "phase8 supplement" });
    expect(supplement.status).toBe(201);

    const earlyApply = await request(runtime.app)
      .post(`/api/archive-supplement-requests/${supplement.body.supplementRequest.id}/apply`)
      .set("x-mock-user-id", "u2")
      .send({ fileName: "too-early.pdf" });
    expectDenied(earlyApply, "SUPPLEMENT_REQUEST_NOT_APPROVED");

    const approved = await request(runtime.app)
      .post(`/api/archive-supplement-requests/${supplement.body.supplementRequest.id}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    expect(approved.status).toBe(200);

    const applied = await request(runtime.app)
      .post(`/api/archive-supplement-requests/${supplement.body.supplementRequest.id}/apply`)
      .set("x-mock-user-id", "u2")
      .send({ fileName: "supplement-result.pdf" });
    expect(applied.status).toBe(200);
    expect(applied.body.archiveItem.collectedFlag).toBe(true);
    expect(applied.body.archiveItem.snapshotJson.templateVersion).toBe(originalSnapshot.templateVersion);
    expect(applied.body.archiveItem.snapshotJson.supplementMetadata.fileName).toBe("supplement-result.pdf");
  });

  it("keeps auditors read-only and ordinary users away from audit log mutation", async () => {
    const auditorUpdate = await request(runtime.app).post("/api/archive-items/ai-ext-result/update").set("x-mock-user-id", "u5").send({ collectedFlag: true });
    expectDenied(auditorUpdate, "ARCHIVE_MAINTAINER_REQUIRED");

    const mutateAudit = await request(runtime.app).post("/api/audit-logs").set("x-mock-user-id", "u2").send({ action: "fake" });
    expect(mutateAudit.status).toBe(404);
  });

  it("returns project, user and sensitive audit logs", async () => {
    await request(runtime.app).post("/api/projects/p-food/archive-snapshot").set("x-mock-user-id", "u2");
    await request(runtime.app).post("/api/projects/p-food/archive-check").set("x-mock-user-id", "u2");

    const projectLogs = await request(runtime.app).get("/api/projects/p-food/audit-trail").set("x-mock-user-id", "u5");
    expect(projectLogs.status).toBe(200);
    expect(projectLogs.body.auditLogs.some((log: { action: string }) => log.action === "archive.check")).toBe(true);

    const userLogs = await request(runtime.app).get("/api/users/u2/audit-logs").set("x-mock-user-id", "u5");
    expect(userLogs.status).toBe(200);
    expect(userLogs.body.auditLogs.length).toBeGreaterThan(0);

    const sensitive = await request(runtime.app).get("/api/sensitive-action-logs").set("x-mock-user-id", "u5");
    expect(sensitive.status).toBe(200);
    expect(sensitive.body.auditLogs.length).toBeGreaterThan(0);
  });
});
