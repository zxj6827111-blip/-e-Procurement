import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { User } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m2-process-"));
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

function expectNoSensitiveFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("actorRoleId");
  expect(json).not.toContain("assigneeUserId");
  expect(json).not.toContain("completedBy");
  expect(json).not.toContain("sourceTaskId");
  expect(json).not.toContain("opinion");
}

async function createReadyRequest(runtime: ReturnType<typeof boot>, title = "M2 process request") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", "u8")
    .send({
      title,
      orgId: "org-hotel",
      requestDepartment: "M2 test department",
      requesterName: "M2 requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [
        {
          itemName: "M2 item",
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
    .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "M2 service score leads" });
  expect(created.status).toBe(201);
  const submitted = await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
  expect(submitted.status).toBe(200);
  return submitted;
}

describe("M2 Process task center and timeline views", () => {
  it("lists only readable Process Tasks for the task center without exposing process internals", async () => {
    const runtime = boot();
    const submitted = await submitReadyRequest(runtime);
    const requestId = submitted.body.procurementRequest.id as string;

    const groupManagerTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u1");
    expect(groupManagerTasks.status).toBe(200);
    expect(groupManagerTasks.body.processTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          businessType: "procurement_request",
          businessId: requestId,
          status: "pending",
          processStatus: "running",
          processCurrentNodeKey: "approval_pending"
        })
      ])
    );
    expectNoSensitiveFields(groupManagerTasks.body);

    const r8Tasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u1");
    expect(r8Tasks.status).toBe(200);
    expect(r8Tasks.body.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ businessType: "procurement_request", businessId: requestId, status: "pending" })]));

    const auditorTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u5");
    expect(auditorTasks.status).toBe(200);
    expect(auditorTasks.body.processTasks).toHaveLength(0);

    const adminTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u6");
    expect(adminTasks.status).toBe(200);
    expect(adminTasks.body.processTasks).toHaveLength(0);
  });

  it("keeps timeline read-only and sanitized for award approval while supplier and auditor scopes stay isolated", async () => {
    const runtime = boot();
    const submitted = await createSubmittedAward(runtime);
    const awardId = submitted.body.approval.id as string;

    const approved = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${submitted.body.workflow.approvalInstance.id}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "approve", opinion: "M2 award approval opinion should stay hidden" });
    expect(approved.status).toBe(200);

    const supplierRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u3");
    expect(supplierRead.status).toBe(200);
    expect(supplierRead.body.processInstances).toHaveLength(1);
    expect(supplierRead.body.tasks).toHaveLength(0);
    expect(supplierRead.body.events.map((event: { eventName: string }) => event.eventName)).toEqual(["定标审批已提交", "定标审批已通过"]);
    expectNoSensitiveFields(supplierRead.body);

    const otherSupplierRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u14");
    expect(otherSupplierRead.status).toBe(200);
    expect(otherSupplierRead.body.processInstances).toHaveLength(0);

    const auditorRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u5");
    expect(auditorRead.status).toBe(200);
    expect(auditorRead.body.processInstances).toHaveLength(1);
    expect(auditorRead.body.tasks).toHaveLength(0);
    expectNoSensitiveFields(auditorRead.body);

    const adminRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u6");
    expect(adminRead.status).toBe(200);
    expect(adminRead.body.processInstances).toHaveLength(0);
  });

  it("does not widen buyer project scope when exposing Process timeline data", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({
      id: "u-m2-hotel-viewer",
      name: "M2 hotel scoped viewer",
      roleId: "hotel_buyer",
      orgId: "org-east",
      orgScope: ["org-east"]
    } satisfies User);
    const submitted = await createSubmittedAward(runtime);
    const awardId = submitted.body.approval.id as string;

    const hotelBuyerWithoutProject = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u-m2-hotel-viewer");
    expect(hotelBuyerWithoutProject.status).toBe(200);
    expect(hotelBuyerWithoutProject.body.processInstances).toHaveLength(0);
    expect(hotelBuyerWithoutProject.body.tasks).toHaveLength(0);

    const hotelBuyerTasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u-m2-hotel-viewer");
    expect(hotelBuyerTasks.status).toBe(200);
    expect(hotelBuyerTasks.body.processTasks).toHaveLength(0);
  });
});
