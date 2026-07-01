import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { InternalBusinessEventCode } from "../src/services/internal-event-bus.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m3-events-"));
}

function boot() {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function events(runtime: ReturnType<typeof boot>, eventCode?: string) {
  return runtime.ctx.internalBusinessEventRepository.listEvents({ eventCode });
}

function expectNoSensitiveFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("actorRoleId");
  expect(json).not.toContain("opinion");
}

async function createReadyRequest(runtime: ReturnType<typeof boot>, title = "M3 process request") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", "u8")
    .send({
      title,
      orgId: "org-hotel",
      requestDepartment: "M3 test department",
      requesterName: "M3 requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [
        {
          itemName: "M3 item",
          specification: "standard",
          quantity: 1,
          unit: "piece",
          budgetAmount: 1000
        }
      ]
    });
  expect(created.status).toBe(201);
  return created.body.procurementRequest as { id: string };
}

async function submitReadyRequest(runtime: ReturnType<typeof boot>, title?: string) {
  const procurementRequest = await createReadyRequest(runtime, title);
  const submitted = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8");
  expect(submitted.status).toBe(200);
  return submitted;
}

async function createSubmittedAward(runtime: ReturnType<typeof boot>) {
  const created = await request(runtime.app)
    .post("/api/projects/p-award/award-approvals")
    .set("x-mock-user-id", "u2")
    .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "M3 service score leads" });
  expect(created.status).toBe(201);
  const submitted = await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
  expect(submitted.status).toBe(200);
  return submitted;
}

async function createMallOrder(runtime: ReturnType<typeof boot>) {
  const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u8").send({ productId: "mp-amenity-kit", quantity: 1000 });
  expect(cart.status).toBe(200);
  const order = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u8").send({ shippingAddress: "M3 hotel dock", invoiceTitle: "M3 hotel" });
  expect(order.status).toBe(201);
  return order.body.order as { id: string; supplierId: string };
}

describe("M3 internal business events", () => {
  it("records procurement request lifecycle events without changing legacy response shape or duplicating ProcessEvent timeline", async () => {
    const runtime = boot();
    const submitted = await submitReadyRequest(runtime);
    const requestId = submitted.body.procurementRequest.id as string;

    expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "procurementRequest", "workflow"]);
    expect(events(runtime, "ProcurementRequestCreated")).toHaveLength(1);
    expect(events(runtime, "ProcurementRequestSubmitted")).toHaveLength(1);
    expect(events(runtime, "ProcurementRequestSubmitted")[0]).toMatchObject({ businessType: "procurement_request", businessId: requestId, status: "handled" });

    const submittedProcessEvents = runtime.ctx.processRepository
      .listProcessInstancesByBusiness("procurement_request", requestId)
      .flatMap((instance) => runtime.ctx.processRepository.listProcessEventsByInstance(instance.id))
      .filter((event) => event.eventCode === "procurement_request.submitted");
    expect(submittedProcessEvents).toHaveLength(1);

    const approved = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "M3 approved should not leak" });
    expect(approved.status).toBe(200);
    expect(Object.keys(approved.body).sort()).toEqual(["auditLogId", "procurementRequest"]);
    expect(events(runtime, "ProcurementRequestApproved")).toHaveLength(1);

    const decision = await request(runtime.app).post(`/api/procurement-requests/${requestId}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" });
    expect(decision.status).toBe(200);
    expect(events(runtime, "ProcurementMethodDecided")).toHaveLength(1);

    const readable = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u1");
    expect(readable.status).toBe(200);
    expect(readable.body.events.map((event: { eventCode: string }) => event.eventCode)).toEqual([
      "procurement_request.created",
      "procurement_request.submitted",
      "procurement_request.approved",
      "procurement_request.method_decided"
    ]);
    expectNoSensitiveFields(readable.body);
  });

  it("records award submitted, approved and rejected events while keeping R8 as the source of execution", async () => {
    const runtime = boot();
    const submitted = await createSubmittedAward(runtime);
    const awardId = submitted.body.approval.id as string;

    expect(Object.keys(submitted.body).sort()).toEqual(["adapterLog", "approval", "auditLogId", "workflow"]);
    expect(events(runtime, "AwardApprovalSubmitted")).toHaveLength(1);

    const approved = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${submitted.body.workflow.approvalInstance.id}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "approve", opinion: "M3 award opinion hidden" });
    expect(approved.status).toBe(200);
    expect(events(runtime, "AwardApproved")).toHaveLength(1);

    const rejectedSubmitted = await createSubmittedAward(runtime);
    const rejectedAwardId = rejectedSubmitted.body.approval.id as string;
    const rejected = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${rejectedSubmitted.body.workflow.approvalInstance.id}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "reject", opinion: "M3 reject hidden" });
    expect(rejected.status).toBe(200);
    expect(events(runtime, "AwardRejected")).toHaveLength(1);

    const awardProcessEvents = runtime.ctx.processRepository
      .listProcessInstancesByBusiness("award_approval", awardId)
      .flatMap((instance) => runtime.ctx.processRepository.listProcessEventsByInstance(instance.id))
      .map((event) => event.eventCode);
    expect(awardProcessEvents).toEqual(["award_approval.submitted", "award_approval.approved"]);
  });

  it("records bid cutoff, comparison report and expert scoring events after existing permission checks", async () => {
    const runtime = boot();
    const cutoff = await request(runtime.app).post("/api/projects/p-pre/bids/cutoff").set("x-mock-user-id", "u2").send({ action: "manual_cutoff" });
    expect(cutoff.status).toBe(200);
    expect(events(runtime, "BidCutoffCompleted")).toHaveLength(1);

    const lock = await request(runtime.app).post("/api/projects/p-pre/bids/lock").set("x-mock-user-id", "u2");
    expect(lock.status).toBe(200);

    const comparison = await request(runtime.app).post("/api/projects/p-pre/comparison-report").set("x-mock-user-id", "u2");
    expect(comparison.status).toBe(201);
    expect(events(runtime, "ComparisonReportGenerated")).toHaveLength(1);

    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const confirmed = await request(runtime.app).post("/api/expert-assignments/ea-3/confirm").set("x-mock-user-id", "u7").send({ type });
      expect(confirmed.status).toBe(200);
    }
    const scoring = await request(runtime.app).post("/api/scoring-sheets/score-open/submit-lock").set("x-mock-user-id", "u7").send({ technical: 80, service: 70, price: 60, opinion: "M3 expert opinion hidden" });
    expect(scoring.status).toBe(200);
    const scoringEvents = events(runtime, "ExpertScoreSubmitted");
    expect(scoringEvents).toHaveLength(1);
    expect(JSON.stringify(scoringEvents[0].payloadJson)).not.toContain("opinion");
  });

  it("records mall order create, confirm, ship, receive and payment events through existing role isolation", async () => {
    const runtime = boot();
    const order = await createMallOrder(runtime);
    expect(events(runtime, "PurchaseOrderCreated")).toHaveLength(1);

    const confirm = await request(runtime.app).post(`/api/mall/orders/${order.id}/confirm`).set("x-mock-user-id", "u14");
    expect(confirm.status).toBe(200);
    expect(events(runtime, "SupplierOrderConfirmed")).toHaveLength(1);

    const shipment = await request(runtime.app).post(`/api/mall/orders/${order.id}/shipments`).set("x-mock-user-id", "u14").send({ trackingNo: "M3-TRK-1" });
    expect(shipment.status).toBe(201);
    expect(events(runtime, "OrderShipped")).toHaveLength(1);

    const receive = await request(runtime.app).post(`/api/mall/orders/${order.id}/receive`).set("x-mock-user-id", "u8").send({ summary: "M3 received" });
    expect(receive.status).toBe(200);
    expect(events(runtime, "OrderReceived")).toHaveLength(1);

    const paid = await request(runtime.app).post(`/api/mall/orders/${order.id}/fund-ledger`).set("x-mock-user-id", "u9").send({ action: "capture" });
    expect(paid.status).toBe(200);
    expect(events(runtime, "PaymentCaptured")).toHaveLength(1);

    const wrongSupplierConfirm = await request(runtime.app).post(`/api/mall/orders/${order.id}/confirm`).set("x-mock-user-id", "u16");
    expect(wrongSupplierConfirm.status).toBe(403);
    expect(events(runtime, "SupplierOrderConfirmed")).toHaveLength(1);
  });

  it("keeps event handler failures traceable and non-blocking", async () => {
    const runtime = boot();
    runtime.ctx.eventBus.handle("ProcurementRequestCreated", "m3-failing-test", () => {
      throw new Error("m3 handler boom");
    });

    const created = await createReadyRequest(runtime, "M3 failure isolation");
    expect(created.id).toBeTruthy();
    const failed = events(runtime, "ProcurementRequestCreated").find((event) => event.businessId === created.id);
    expect(failed).toBeDefined();
    expect(failed?.status).toBe("failed");
    expect(failed?.lastErrorMessage).toContain("m3 handler boom");
    const logs = runtime.ctx.internalBusinessEventRepository.listHandlerLogs({ eventId: failed!.id });
    expect(logs).toEqual(expect.arrayContaining([expect.objectContaining({ handlerName: "m3-failing-test", status: "failed" })]));

    const visible = await request(runtime.app).get(`/api/internal-events?businessType=procurement_request&businessId=${created.id}`).set("x-mock-user-id", "u5");
    expect(visible.status).toBe(200);
    expect(visible.body.events).toHaveLength(1);
    expect(visible.body.events[0]).toMatchObject({ eventCode: "ProcurementRequestCreated", status: "failed" });
    expectNoSensitiveFields(visible.body);

    const auditorRetry = await request(runtime.app).post("/api/internal-events/retry").set("x-mock-user-id", "u5").send({ businessType: "procurement_request", businessId: created.id });
    expect(auditorRetry.status).toBe(403);

    const buyerLog = await request(runtime.app).get(`/api/internal-events/${failed!.id}/handler-logs`).set("x-mock-user-id", "u2");
    expect(buyerLog.status).toBe(403);

    const emptyRetry = await request(runtime.app).post("/api/internal-events/retry").set("x-mock-user-id", "u1").send({});
    expect(emptyRetry.status).toBe(400);

    const scopedRetry = await request(runtime.app).post("/api/internal-events/retry").set("x-mock-user-id", "u1").send({ eventId: failed!.id });
    expect(scopedRetry.status).toBe(200);
    expect(scopedRetry.body.retried).toMatchObject({ id: failed!.id, status: "failed" });
    expectNoSensitiveFields(scopedRetry.body);
  });

  it("deduplicates repeated internal events and does not duplicate ProcessEvent projections", () => {
    const runtime = boot();
    const actor = runtime.ctx.state.users.find((user) => user.id === "u2")!;
    runtime.ctx.r8WorkflowTaskRepository.startApproval({
      businessType: "procurement_request",
      businessId: "m3-idempotent-request",
      title: "M3 idempotent request",
      initiator: actor,
      amount: 1000,
      methodType: "内部公开采购",
      orgId: "org-east",
      sourceJson: { route: "m3.idempotent.seed" }
    });
    const emitArgs = {
      eventCode: "ProcurementRequestSubmitted" as InternalBusinessEventCode,
      businessType: "procurement_request",
      businessId: "m3-idempotent-request",
      businessTitle: "M3 idempotent request",
      actor,
      orgId: "org-east",
      idempotencyKey: "m3-idempotent-event"
    };
    runtime.ctx.eventBus.emit(emitArgs);
    runtime.ctx.eventBus.emit(emitArgs);

    const matchedEvents = runtime.ctx.internalBusinessEventRepository.listEvents({ businessType: "procurement_request", businessId: "m3-idempotent-request" });
    expect(matchedEvents.filter((event) => event.idempotencyKey === "m3-idempotent-event")).toHaveLength(1);
    const processEvents = runtime.ctx.processRepository
      .listProcessInstancesByBusiness("procurement_request", "m3-idempotent-request")
      .flatMap((instance) => runtime.ctx.processRepository.listProcessEventsByInstance(instance.id))
      .filter((event) => event.eventCode === "procurement_request.submitted");
    expect(processEvents).toHaveLength(1);
  });

  it("does not expose internal event data to admin or suppliers through the monitor endpoint", async () => {
    const runtime = boot();
    await submitReadyRequest(runtime, "M3 monitor scope");

    const admin = await request(runtime.app).get("/api/internal-events").set("x-mock-user-id", "u6");
    expect(admin.status).toBe(200);
    expect(admin.body.events).toHaveLength(0);

    const supplier = await request(runtime.app).get("/api/internal-events").set("x-mock-user-id", "u14");
    expect(supplier.status).toBe(403);

    const buyer = await request(runtime.app).get("/api/internal-events").set("x-mock-user-id", "u2");
    expect(buyer.status).toBe(403);

    const finance = await request(runtime.app).get("/api/internal-events").set("x-mock-user-id", "u13");
    expect(finance.status).toBe(403);
  });
});
