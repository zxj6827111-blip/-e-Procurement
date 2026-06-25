import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext();
  return { ctx, app: createApp(ctx) };
}

async function seedFrozenReport(runtime: ReturnType<typeof boot>) {
  runtime.ctx.state.reviewReports.push({
    id: `rr-flow-${runtime.ctx.state.reviewReports.length + 1}`,
    projectId: "p-award",
    reportNo: "RR-FLOW",
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

describe("Phase 9 full-flow regression paths", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("runs internal open procurement path from award to archive audit", async () => {
    await seedFrozenReport(runtime);

    const approval = await request(runtime.app)
      .post("/api/projects/p-award/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "service and technical score lead" });
    expect(approval.status).toBe(201);

    await request(runtime.app).post(`/api/award-approvals/${approval.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    const approved = await request(runtime.app).post(`/api/award-approvals/${approval.body.approval.id}/mock-approve`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(approved.body.approval.approvalStatus).toBe("approved");

    const notified = await request(runtime.app).post("/api/projects/p-award/result-notifications").set("x-mock-user-id", "u2");
    expect(notified.status).toBe(201);

    const contract = await request(runtime.app)
      .post("/api/projects/p-award/contracts")
      .set("x-mock-user-id", "u2")
      .send({ supplierId: "sup-1", contractNo: "HT-FLOW-1", amount: 1286000 });
    expect(contract.status).toBe(201);

    const node = await request(runtime.app).post(`/api/contracts/${contract.body.contract.id}/performance-nodes`).set("x-mock-user-id", "u2").send({ nodeName: "delivery" });
    expect(node.status).toBe(201);

    const evaluation = await request(runtime.app).post(`/api/contracts/${contract.body.contract.id}/supplier-evaluations`).set("x-mock-user-id", "u2").send({ description: "flow evaluation" });
    expect(evaluation.status).toBe(201);

    const snapshot = await request(runtime.app).post("/api/projects/p-award/archive-snapshot").set("x-mock-user-id", "u2");
    expect(snapshot.status).toBe(201);
    const audit = await request(runtime.app).get("/api/projects/p-award/audit-trail").set("x-mock-user-id", "u5");
    expect(audit.status).toBe(200);
    expect(audit.body.auditLogs.some((log: { action: string }) => log.action === "supplier_evaluation.create")).toBe(true);
  });

  it("runs simplified comparison path through contract, evaluation and archive", async () => {
    const contract = await request(runtime.app)
      .post("/api/projects/p-food/contracts")
      .set("x-mock-user-id", "u2")
      .send({ supplierId: "sup-3", contractNo: "HT-FOOD-FLOW", amount: 380000 });
    expect(contract.status).toBe(201);

    const node = await request(runtime.app).post(`/api/contracts/${contract.body.contract.id}/performance-nodes`).set("x-mock-user-id", "u2").send({ nodeName: "food supply" });
    expect(node.status).toBe(201);

    const evaluation = await request(runtime.app).post(`/api/contracts/${contract.body.contract.id}/supplier-evaluations`).set("x-mock-user-id", "u2").send({ score: 88, description: "comparison supplier evaluation" });
    expect(evaluation.status).toBe(201);

    const archive = await request(runtime.app).post("/api/projects/p-food/archive-snapshot").set("x-mock-user-id", "u2");
    expect(archive.status).toBe(201);
    const check = await request(runtime.app).post("/api/projects/p-food/archive-check").set("x-mock-user-id", "u2");
    expect(check.status).toBe(200);
  });

  it("runs external-trade filing path and keeps internal actions blocked", async () => {
    const created = await request(runtime.app).post("/api/external-trades/projects").set("x-mock-user-id", "u2").send({ name: "phase9 external flow" });
    expect(created.status).toBe(201);
    const projectId = created.body.project.id;

    await request(runtime.app).post(`/api/external-trades/${projectId}/external-project`).set("x-mock-user-id", "u2").send({ externalPlatformName: "External Exchange", externalProjectCode: "P9-EXT" });
    await request(runtime.app).post(`/api/external-trades/${projectId}/announcement-materials`).set("x-mock-user-id", "u2").send({ material: { fileName: "announcement.pdf" } });
    await request(runtime.app).post(`/api/external-trades/${projectId}/result-materials`).set("x-mock-user-id", "u2").send({ material: { fileName: "result.pdf" } });
    const recorded = await request(runtime.app).post(`/api/external-trades/${projectId}/result-record`).set("x-mock-user-id", "u2");
    expect(recorded.body.project.status).toBe("external_result_recorded");

    const blocked = await request(runtime.app).post(`/api/external-trades/${projectId}/block-check`).set("x-mock-user-id", "u2").send({ action: "internal_award" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");

    recorded.body.project.participantSupplierIds.push("sup-4");
    const project = runtime.ctx.state.projects.find((item) => item.id === projectId);
    if (project) project.participantSupplierIds = ["sup-4"];

    const contract = await request(runtime.app).post(`/api/projects/${projectId}/contracts`).set("x-mock-user-id", "u2").send({ supplierId: "sup-4", contractNo: "EXT-P9", amount: 500000 });
    expect(contract.status).toBe(201);
    await request(runtime.app).post(`/api/contracts/${contract.body.contract.id}/supplier-evaluations`).set("x-mock-user-id", "u2").send({ description: "external supplier evaluation" });
    const archive = await request(runtime.app).post(`/api/projects/${projectId}/archive-snapshot`).set("x-mock-user-id", "u2");
    expect(archive.status).toBe(201);
  });
});
