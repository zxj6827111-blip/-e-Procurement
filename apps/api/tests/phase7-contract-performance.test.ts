import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createIsolatedRuntime } from "./helpers/test-runtime.js";

function boot() {
  return createIsolatedRuntime("eproc-phase7-");
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

describe("Phase 7 contract ledger, performance and supplier evaluation", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("creates contract ledger from award result without contract body, approval, signing or e-signature capability", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-award/contracts")
      .set("x-mock-user-id", "u2")
      .send({
        supplierId: "sup-1",
        contractNo: "HT-PHASE7-1",
        amount: 1286000,
        contractBody: "must not be accepted as a formal capability",
        signatureStatus: "signed"
      });

    expect(created.status).toBe(201);
    expect(created.body.contract.contractNo).toBe("HT-PHASE7-1");
    expect(created.body.contract.contractBody).toBeUndefined();
    expect(created.body.contract.signatureStatus).toBeUndefined();
    expect(created.body.auditLogId).toMatch(/^audit-/);

    const bodyEdit = await request(runtime.app).post(`/api/contracts/${created.body.contract.id}/body`).set("x-mock-user-id", "u2").send({ text: "not allowed" });
    expect(bodyEdit.status).toBe(404);
  });

  it("keeps supplier contract and performance reads scoped to own supplier", async () => {
    const own = await request(runtime.app).get("/api/projects/p-award/contracts").set("x-mock-user-id", "u3");
    expect(own.status).toBe(200);
    expect(own.body.contracts).toHaveLength(1);
    expect(own.body.contracts[0].supplierId).toBe("sup-1");

    runtime.ctx.state.users.push({ id: "u-sup-other", name: "Other Supplier", roleId: "supplier", orgId: "org-supplier", supplierId: "sup-4" });
    const other = await request(runtime.app).get("/api/projects/p-award/contracts").set("x-mock-user-id", "u-sup-other");
    expectDenied(other, "SUPPLIER_CONTRACT_SCOPE_DENIED");
  });

  it("updates performance nodes and records acceptance/payment with audit logs", async () => {
    const node = await request(runtime.app)
      .post("/api/contracts/cl-award-1/performance-nodes")
      .set("x-mock-user-id", "u2")
      .send({ nodeName: "delivery", planDate: "2026-07-05" });
    expect(node.status).toBe(201);
    expect(node.body.performanceNode.status).toBe("planned");

    const updated = await request(runtime.app)
      .post(`/api/performance-nodes/${node.body.performanceNode.id}/status`)
      .set("x-mock-user-id", "u2")
      .send({ status: "completed", acceptanceRecord: "accepted", paymentRecord: "payment pending" });
    expect(updated.status).toBe(200);
    expect(updated.body.performanceNode.status).toBe("completed");

    const acceptance = await request(runtime.app)
      .post("/api/contracts/cl-award-1/acceptance-payments")
      .set("x-mock-user-id", "u2")
      .send({ recordType: "acceptance", summary: "accepted phase7 delivery" });
    expect(acceptance.status).toBe(201);
    expect(acceptance.body.acceptancePaymentRecord.recordType).toBe("acceptance");
    expect(acceptance.body.auditLogId).toMatch(/^audit-/);
  });

  it("writes supplier evaluation into supplier profile history and score", async () => {
    const evaluation = await request(runtime.app)
      .post("/api/contracts/cl-award-1/supplier-evaluations")
      .set("x-mock-user-id", "u2")
      .send({ dimensions: { delivery: 80, quality: 90, service: 100 }, description: "phase7 evaluation" });
    expect(evaluation.status).toBe(201);
    expect(evaluation.body.supplierEvaluation.score).toBe(90);
    expect(evaluation.body.supplier.evaluationScore).toBe(90);

    const history = await request(runtime.app).get("/api/suppliers/sup-1/evaluations").set("x-mock-user-id", "u3");
    expect(history.status).toBe(200);
    expect(history.body.supplierEvaluations.some((item: { id: string }) => item.id === evaluation.body.supplierEvaluation.id)).toBe(true);
  });

  it("rejects admin and supplier mutations of contract/performance business data", async () => {
    const admin = await request(runtime.app)
      .post("/api/contracts/cl-award-1/performance-nodes")
      .set("x-mock-user-id", "u6")
      .send({ nodeName: "admin should not mutate" });
    expectDenied(admin, "CONTRACT_BUSINESS_ROLE_REQUIRED", ["admin should not mutate"]);

    const supplier = await request(runtime.app)
      .post("/api/performance-nodes/pn-award-1/status")
      .set("x-mock-user-id", "u3")
      .send({ status: "completed" });
    expectDenied(supplier, "CONTRACT_BUSINESS_ROLE_REQUIRED");
  });

  it("supports external-trade projects entering contract ledger and performance path", async () => {
    const contract = await request(runtime.app)
      .post("/api/projects/p-ext/contracts")
      .set("x-mock-user-id", "u2")
      .send({ supplierId: "sup-4", contractNo: "EXT-HT-1", amount: 900000 });
    expect(contract.status).toBe(201);
    expect(contract.body.contract.supplierId).toBe("sup-4");
    expect(contract.body.contract.status).toBe("registered");
  });
});
