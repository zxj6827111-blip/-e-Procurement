import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m5b-bpmn-"));
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

function one<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function expectNoInternalFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("actorRoleId");
  expect(json).not.toContain("assigneeUserId");
  expect(json).not.toContain("internalEventId");
  expect(json).not.toContain("opinion");
}

function procurementRequestBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="m5b_procurement_request" isExecutable="false">
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
  <process id="m5b_fallback_procurement_request" isExecutable="false">
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
      requestDepartment: "M5-B pilot department",
      requesterName: "M5-B requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [{ itemName: "M5-B item", specification: "standard", quantity: 1, unit: "piece", budgetAmount: 1000 }]
    });
  expect(created.status).toBe(201);
  expect(Object.keys(created.body).sort()).toEqual(["auditLogId", "procurementRequest"]);
  return created.body.procurementRequest as { id: string; orgId: string };
}

async function createEnabledDefinition(runtime: ReturnType<typeof boot>, processCode: string, bpmnXml = procurementRequestBpmnXml()) {
  const response = await request(runtime.app)
    .post("/api/bpmn/definitions")
    .set("x-mock-user-id", "u6")
    .send({
      processCode,
      processName: "M5-B procurement request BPMN pilot",
      businessType: "procurement_request",
      status: "enabled",
      bpmnXml
    });
  expect(response.status).toBe(201);
  expect(response.body.bpmnDefinition.status).toBe("enabled");
  return response.body.bpmnDefinition as { id: string; status: string; validationStatus: string };
}

async function createEnabledPilot(runtime: ReturnType<typeof boot>, definitionId: string, requestId: string, status = "enabled") {
  const response = await request(runtime.app)
    .post("/api/bpmn/pilots")
    .set("x-mock-user-id", "u6")
    .send({
      definitionId,
      pilotName: "M5-B procurement request shadow pilot",
      businessType: "procurement_request",
      status,
      scope: {
        orgIds: ["org-hotel"],
        businessIds: [requestId]
      }
    });
  expect(response.status).toBe(201);
  return response.body.bpmnPilot as { id: string; status: string; mode: string; scope: { businessIdCount: number; businessIds?: string[] } };
}

describe("M5-B BPMN controlled pilot", () => {
  it("runs a procurement request BPMN shadow pilot only for the scoped test request while R8 and Process remain the execution path", async () => {
    const runtime = boot();
    const pilotedRequest = await createReadyRequest(runtime, "M5-B scoped pilot request");
    const otherRequest = await createReadyRequest(runtime, "M5-B non pilot request");
    const definition = await createEnabledDefinition(runtime, "m5b_procurement_request");
    const pilot = await createEnabledPilot(runtime, definition.id, pilotedRequest.id);

    expect(pilot.status).toBe("enabled");
    expect(pilot.mode).toBe("shadow");
    expect(pilot.scope.businessIdCount).toBe(1);
    expect(JSON.stringify(pilot)).not.toContain(pilotedRequest.id);

    const submitted = await request(runtime.app).post(`/api/procurement-requests/${pilotedRequest.id}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);
    expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "procurementRequest", "workflow"]);
    const approved = await request(runtime.app).post(`/api/procurement-requests/${pilotedRequest.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "M5-B approve" });
    expect(approved.status).toBe(200);
    expect(Object.keys(approved.body).sort()).toEqual(["auditLogId", "procurementRequest"]);
    const method = await request(runtime.app).post(`/api/procurement-requests/${pilotedRequest.id}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" });
    expect(method.status).toBe(200);

    const otherSubmitted = await request(runtime.app).post(`/api/procurement-requests/${otherRequest.id}/submit`).set("x-mock-user-id", "u8");
    expect(otherSubmitted.status).toBe(200);

    expect(one(runtime, "select approval_status from r2_approval_instances where business_type = 'procurement_request' and business_id = ?", pilotedRequest.id)).toEqual({ approval_status: "approved" });
    expect(one(runtime, "select process_status, current_node_key, source_engine from process_instances where business_type = 'procurement_request' and business_id = ?", pilotedRequest.id)).toEqual({
      process_status: "running",
      current_node_key: "method_decision",
      source_engine: "r8_workflow"
    });

    const pilotRuns = all<{ event_code: string; run_status: string; predicted_node_key: string; stopped_reason: string }>(
      runtime,
      "select event_code, run_status, predicted_node_key, stopped_reason from bpmn_pilot_runs where pilot_id = ? order by created_at",
      pilot.id
    );
    expect(pilotRuns).toEqual([
      { event_code: "ProcurementRequestSubmitted", run_status: "compatible", predicted_node_key: "purchase_review", stopped_reason: "waiting_for_matching_event" },
      { event_code: "ProcurementRequestApproved", run_status: "compatible", predicted_node_key: "method_decision", stopped_reason: "waiting_for_matching_event" },
      { event_code: "ProcurementMethodDecided", run_status: "compatible", predicted_node_key: "approved_end", stopped_reason: "completed" }
    ]);
    expect(one(runtime, "select count(*) as count from bpmn_pilot_runs where business_id = ?", otherRequest.id)).toEqual({ count: 0 });
    expect(one(runtime, "select count(*) as count from process_definitions where process_code = 'm5b_procurement_request'")).toEqual({ count: 0 });

    const runsDto = await request(runtime.app).get("/api/bpmn/pilot-runs").set("x-mock-user-id", "u6");
    expect(runsDto.status).toBe(200);
    expect(runsDto.body.bpmnPilotRuns).toHaveLength(3);
    expectNoInternalFields(runsDto.body);
    expect(JSON.stringify(runsDto.body)).not.toContain(pilotedRequest.id);
  });

  it("records fallback when the pilot BPMN diverges and still leaves the legacy procurement request flow usable", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime, "M5-B fallback pilot request");
    const definition = await createEnabledDefinition(runtime, "m5b_fallback_procurement_request", fallbackBpmnXml());
    const pilot = await createEnabledPilot(runtime, definition.id, procurementRequest.id);

    const submitted = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);
    const approved = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(approved.status).toBe(200);
    const method = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" });
    expect(method.status).toBe(200);

    expect(one(runtime, "select approval_status from r2_procurement_requests where id = ?", procurementRequest.id)).toEqual({ approval_status: "approved" });
    expect(one(runtime, "select current_node_key from process_instances where business_type = 'procurement_request' and business_id = ?", procurementRequest.id)).toEqual({ current_node_key: "method_decision" });

    const fallback = all<{ event_code: string; run_status: string; stopped_reason: string; fallback_to: string }>(
      runtime,
      "select event_code, run_status, stopped_reason, fallback_to from bpmn_pilot_runs where pilot_id = ? order by created_at",
      pilot.id
    );
    expect(fallback).toEqual(
      expect.arrayContaining([{ event_code: "ProcurementRequestApproved", run_status: "fallback", stopped_reason: "expected_node_mismatch", fallback_to: "r8_process_layer" }])
    );
    expect(fallback).toEqual(
      expect.arrayContaining([{ event_code: "ProcurementMethodDecided", run_status: "fallback", stopped_reason: "expected_node_mismatch", fallback_to: "r8_process_layer" }])
    );
  });

  it("enforces pilot permissions, keeps auditors read-only and rejects disabled or mismatched definitions", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime, "M5-B permission pilot request");
    const definition = await createEnabledDefinition(runtime, "m5b_permission_procurement_request");
    const pilot = await createEnabledPilot(runtime, definition.id, procurementRequest.id, "draft");

    const enabled = await request(runtime.app).post(`/api/bpmn/pilots/${pilot.id}/enable`).set("x-mock-user-id", "u6");
    expect(enabled.status).toBe(200);
    expect(enabled.body.bpmnPilot.status).toBe("enabled");

    const auditorRead = await request(runtime.app).get("/api/bpmn/pilots").set("x-mock-user-id", "u5");
    expect(auditorRead.status).toBe(200);
    expect(auditorRead.body.bpmnPilots.map((item: { id: string }) => item.id)).toContain(pilot.id);
    expectNoInternalFields(auditorRead.body);
    expect(JSON.stringify(auditorRead.body)).not.toContain(procurementRequest.id);

    const auditorDisable = await request(runtime.app).post(`/api/bpmn/pilots/${pilot.id}/disable`).set("x-mock-user-id", "u5");
    expect(auditorDisable.status).toBe(403);
    expect(auditorDisable.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");

    for (const userId of ["u1", "u2", "u3", "u4", "u9", "u13", "u14"]) {
      const denied = await request(runtime.app)
        .post("/api/bpmn/pilots")
        .set("x-mock-user-id", userId)
        .send({ definitionId: definition.id, pilotName: "denied", businessType: "procurement_request", scope: { businessIds: [procurementRequest.id] } });
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");
    }

    const supplierRead = await request(runtime.app).get("/api/bpmn/pilot-runs").set("x-mock-user-id", "u14");
    expect(supplierRead.status).toBe(403);
    expect(supplierRead.body.error.code).toBe("BPMN_DEFINITION_READ_DENIED");

    const disabledDefinition = await createEnabledDefinition(runtime, "m5b_disabled_procurement_request");
    const disabled = await request(runtime.app).post(`/api/bpmn/definitions/${disabledDefinition.id}/disable`).set("x-mock-user-id", "u6");
    expect(disabled.status).toBe(200);
    const disabledPilot = await request(runtime.app)
      .post("/api/bpmn/pilots")
      .set("x-mock-user-id", "u6")
      .send({ definitionId: disabledDefinition.id, pilotName: "disabled", businessType: "procurement_request", scope: { businessIds: [procurementRequest.id] } });
    expect(disabledPilot.status).toBe(400);
    expect(disabledPilot.body.error.code).toBe("BPMN_PILOT_DEFINITION_NOT_ENABLED");

    const mismatch = await request(runtime.app)
      .post("/api/bpmn/pilots")
      .set("x-mock-user-id", "u6")
      .send({ definitionId: definition.id, pilotName: "mismatch", businessType: "supplier_onboarding", scope: { businessIds: [procurementRequest.id] } });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe("BPMN_PILOT_BUSINESS_TYPE_MISMATCH");
  });
});
