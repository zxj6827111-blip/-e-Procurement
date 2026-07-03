import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m5d-bpmn-"));
}

function boot(appEnv = "test") {
  const ctx = createAppContext({
    runtime: {
      appEnv,
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function one<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function expectNoInternalFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("assigneeUserId");
  expect(json).not.toContain("internalEventId");
  expect(json).not.toContain("businessIds");
  expect(json).not.toContain("opinion");
}

function procurementRequestBpmnXml(processId = "m5d_procurement_request") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="${processId}" isExecutable="false">
    <startEvent id="start" name="Start" />
    <userTask id="submit_request" name="Submit request" roleId="hotel_buyer" taskType="procurement_request_submit" />
    <userTask id="purchase_review" name="Purchase review" roleId="buyer" taskType="procurement_request_review" />
    <exclusiveGateway id="review_gateway" name="Review decision" />
    <userTask id="method_decision" name="Method decision" roleId="buyer" taskType="procurement_method_decision" />
    <endEvent id="approved_end" name="Approved" />
    <endEvent id="rejected_end" name="Rejected" />
    <sequenceFlow id="flow_start_submit" sourceRef="start" targetRef="submit_request" actionCode="start" />
    <sequenceFlow id="flow_submit_review" sourceRef="submit_request" targetRef="purchase_review" actionCode="submit" />
    <sequenceFlow id="flow_review_gateway" sourceRef="purchase_review" targetRef="review_gateway" actionCode="review" />
    <sequenceFlow id="flow_review_approved" sourceRef="review_gateway" targetRef="method_decision" actionCode="approve" condition="approved" />
    <sequenceFlow id="flow_review_rejected" sourceRef="review_gateway" targetRef="rejected_end" actionCode="reject" condition="rejected" />
    <sequenceFlow id="flow_method_end" sourceRef="method_decision" targetRef="approved_end" actionCode="method_decided" />
  </process>
</definitions>`;
}

function fallbackBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="m5d_fallback_procurement_request" isExecutable="false">
    <startEvent id="start" name="Start" />
    <userTask id="submit_request" name="Submit request" roleId="hotel_buyer" taskType="procurement_request_submit" />
    <userTask id="manual_review" name="Manual review" roleId="buyer" taskType="procurement_request_review" />
    <endEvent id="manual_end" name="Manual end" />
    <sequenceFlow id="flow_start_submit" sourceRef="start" targetRef="submit_request" actionCode="start" />
    <sequenceFlow id="flow_submit_review" sourceRef="submit_request" targetRef="manual_review" actionCode="submit" />
    <sequenceFlow id="flow_manual_end" sourceRef="manual_review" targetRef="manual_end" actionCode="manual_close" />
  </process>
</definitions>`;
}

async function createReadyRequest(runtime: ReturnType<typeof boot>, title: string, userId = "u8", orgId = "org-hotel") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", userId)
    .send({
      title,
      orgId,
      requestDepartment: "M5-D pilot department",
      requesterName: "M5-D requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "pending",
      lineItems: [{ itemName: "M5-D item", specification: "standard", quantity: 1, unit: "piece", budgetAmount: 1000 }]
    });
  expect(created.status).toBe(201);
  return created.body.procurementRequest as { id: string; orgId: string };
}

async function createEnabledDefinition(runtime: ReturnType<typeof boot>, processCode: string, bpmnXml = procurementRequestBpmnXml(processCode)) {
  const response = await request(runtime.app)
    .post("/api/bpmn/definitions")
    .set("x-mock-user-id", "u6")
    .send({
      processCode,
      processName: `M5-D ${processCode}`,
      businessType: "procurement_request",
      status: "enabled",
      bpmnXml
    });
  expect(response.status).toBe(201);
  return response.body.bpmnDefinition as { id: string; status: string; validationStatus: string };
}

async function createPilot(runtime: ReturnType<typeof boot>, definitionId: string, requestId: string, name: string, status = "enabled") {
  const response = await request(runtime.app)
    .post("/api/bpmn/pilots")
    .set("x-mock-user-id", "u6")
    .send({
      definitionId,
      pilotName: name,
      businessType: "procurement_request",
      status,
      scope: {
        orgIds: ["org-hotel"],
        businessIds: [requestId],
        environments: ["test"]
      }
    });
  expect(response.status).toBe(201);
  return response.body.bpmnPilot as { id: string; status: string; scope: { businessIdCount: number; businessIds?: string[] } };
}

describe("M5-D BPMN pilot closing gate", () => {
  it("summarizes pilot health, compatibility and fallback without exposing internal business data", async () => {
    const runtime = boot();
    const healthyRequest = await createReadyRequest(runtime, "M5-D healthy pilot request");
    const fallbackRequest = await createReadyRequest(runtime, "M5-D fallback pilot request");
    const healthyDefinition = await createEnabledDefinition(runtime, "m5d_healthy_procurement_request");
    const fallbackDefinition = await createEnabledDefinition(runtime, "m5d_fallback_procurement_request", fallbackBpmnXml());
    const healthyPilot = await createPilot(runtime, healthyDefinition.id, healthyRequest.id, "M5-D healthy shadow pilot");
    const fallbackPilot = await createPilot(runtime, fallbackDefinition.id, fallbackRequest.id, "M5-D fallback shadow pilot");

    await request(runtime.app).post(`/api/procurement-requests/${healthyRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${healthyRequest.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "M5-D approve" }).expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${healthyRequest.id}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" }).expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${fallbackRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);

    const response = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", "u6");
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(["bpmnPilotHealth"]);
    expectNoInternalFields(response.body);
    expect(JSON.stringify(response.body)).not.toContain(healthyRequest.id);
    expect(JSON.stringify(response.body)).not.toContain(fallbackRequest.id);

    const healthy = response.body.bpmnPilotHealth.find((item: { pilotId: string }) => item.pilotId === healthyPilot.id);
    expect(healthy).toEqual(
      expect.objectContaining({
        runCount: 3,
        compatibleCount: 3,
        fallbackCount: 0,
        failedCount: 0,
        compatibilityRate: 1,
        fallbackActive: false,
        needsAttention: false
      })
    );
    expect(healthy.scope).toEqual({ orgIds: ["org-hotel"], businessIdCount: 1, environments: ["test"] });

    const fallback = response.body.bpmnPilotHealth.find((item: { pilotId: string }) => item.pilotId === fallbackPilot.id);
    expect(fallback).toEqual(
      expect.objectContaining({
        runCount: 1,
        compatibleCount: 0,
        fallbackCount: 1,
        compatibilityRate: 0,
        latestRunStatus: "fallback",
        latestStoppedReason: "expected_node_mismatch",
        latestErrorCode: "BPMN_PILOT_NODE_MISMATCH",
        fallbackTo: "r8_process_layer",
        fallbackActive: true,
        needsAttention: true
      })
    );
    expect(one(runtime, "select process_status, source_engine from process_instances where business_type = 'procurement_request' and business_id = ?", fallbackRequest.id)).toEqual({
      process_status: "running",
      source_engine: "r8_workflow"
    });
  });

  it("keeps pilot health read-only and role scoped for auditors while denying business roles", async () => {
    const runtime = boot();
    const enabledRequest = await createReadyRequest(runtime, "M5-D enabled health request");
    const disabledRequest = await createReadyRequest(runtime, "M5-D disabled health request");
    const definition = await createEnabledDefinition(runtime, "m5d_permission_procurement_request");
    const enabledPilot = await createPilot(runtime, definition.id, enabledRequest.id, "M5-D enabled pilot", "enabled");
    const disabledPilot = await createPilot(runtime, definition.id, disabledRequest.id, "M5-D disabled pilot", "disabled");

    await request(runtime.app).post(`/api/procurement-requests/${enabledRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${disabledRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);

    const auditor = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", "u5");
    expect(auditor.status).toBe(200);
    expect(auditor.body.bpmnPilotHealth.map((item: { pilotId: string }) => item.pilotId)).toContain(enabledPilot.id);
    expect(auditor.body.bpmnPilotHealth.map((item: { pilotId: string }) => item.pilotId)).not.toContain(disabledPilot.id);
    expectNoInternalFields(auditor.body);

    for (const userId of ["u3", "u4", "u9", "u13", "u14"]) {
      const denied = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", userId);
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("BPMN_DEFINITION_READ_DENIED");
    }

    const auditorRollback = await request(runtime.app).post(`/api/bpmn/pilots/${enabledPilot.id}/rollback`).set("x-mock-user-id", "u5").send({ reason: "denied" });
    expect(auditorRollback.status).toBe(403);
    expect(auditorRollback.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");
  });

  it("surfaces rollback gate status while keeping R8 and Process as the execution path", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime, "M5-D rollback health request");
    const definition = await createEnabledDefinition(runtime, "m5d_rollback_procurement_request");
    const pilot = await createPilot(runtime, definition.id, procurementRequest.id, "M5-D rollback pilot");

    await request(runtime.app).post(`/api/bpmn/pilots/${pilot.id}/rollback`).set("x-mock-user-id", "u6").send({ reason: "M5-D closing gate rollback" }).expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);

    const health = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", "u6");
    expect(health.status).toBe(200);
    const row = health.body.bpmnPilotHealth.find((item: { pilotId: string }) => item.pilotId === pilot.id);
    expect(row).toEqual(expect.objectContaining({ status: "disabled", fallbackActive: true, needsAttention: false, lastRollbackReason: "M5-D closing gate rollback", lastGovernanceAction: "bpmn_pilot.rollback_to_r8_process_layer" }));
    expect(row.runCount).toBe(0);
    expectNoInternalFields(health.body);

    expect(one(runtime, "select count(*) as count from bpmn_pilot_runs where business_id = ?", procurementRequest.id)).toEqual({ count: 0 });
    expect(one(runtime, "select process_status, source_engine from process_instances where business_type = 'procurement_request' and business_id = ?", procurementRequest.id)).toEqual({
      process_status: "running",
      source_engine: "r8_workflow"
    });
  });
});
