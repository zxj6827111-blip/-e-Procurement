import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m5c-bpmn-"));
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

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function expectNoInternalFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("assigneeUserId");
  expect(json).not.toContain("internalEventId");
  expect(json).not.toContain("businessIds");
}

function procurementRequestBpmnXml(nodeName = "Method decision") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="m5c_procurement_request" isExecutable="false">
    <startEvent id="start" name="Start" />
    <userTask id="submit_request" name="Submit request" roleId="hotel_buyer" taskType="procurement_request_submit" />
    <userTask id="purchase_review" name="Purchase review" roleId="buyer" taskType="procurement_request_review" />
    <exclusiveGateway id="review_gateway" name="Review decision" />
    <userTask id="method_decision" name="${nodeName}" roleId="buyer" taskType="procurement_method_decision" />
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

async function createReadyRequest(runtime: ReturnType<typeof boot>, title: string, userId = "u8", orgId = "org-hotel") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", userId)
    .send({
      title,
      orgId,
      requestDepartment: "M5-C pilot department",
      requesterName: "M5-C requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [{ itemName: "M5-C item", specification: "standard", quantity: 1, unit: "piece", budgetAmount: 1000 }]
    });
  expect(created.status).toBe(201);
  return created.body.procurementRequest as { id: string; orgId: string };
}

async function createEnabledDefinition(runtime: ReturnType<typeof boot>, processCode: string, versionNo: number, nodeName = "Method decision") {
  const response = await request(runtime.app)
    .post("/api/bpmn/definitions")
    .set("x-mock-user-id", "u6")
    .send({
      processCode,
      processName: `M5-C procurement request BPMN v${versionNo}`,
      versionNo,
      businessType: "procurement_request",
      status: "enabled",
      bpmnXml: procurementRequestBpmnXml(nodeName)
    });
  expect(response.status).toBe(201);
  return response.body.bpmnDefinition as { id: string; status: string; validationStatus: string; versionNo: number };
}

async function createPilot(runtime: ReturnType<typeof boot>, definitionId: string, requestId: string, environments = ["test"]) {
  const response = await request(runtime.app)
    .post("/api/bpmn/pilots")
    .set("x-mock-user-id", "u6")
    .send({
      definitionId,
      pilotName: "M5-C governed procurement request pilot",
      businessType: "procurement_request",
      status: "enabled",
      scope: {
        orgIds: ["org-hotel"],
        businessIds: [requestId],
        environments
      }
    });
  expect(response.status).toBe(201);
  return response.body.bpmnPilot as {
    id: string;
    definitionId: string;
    previousDefinitionId?: string;
    status: string;
    scope: { orgIds: string[]; businessIdCount: number; environments: string[]; businessIds?: string[] };
  };
}

describe("M5-C BPMN pilot governance", () => {
  it("updates rollout scope without exposing scoped business ids and keeps out-of-scope events on the legacy path", async () => {
    const runtime = boot("test");
    const scopedRequest = await createReadyRequest(runtime, "M5-C scoped request");
    const otherRequest = await createReadyRequest(runtime, "M5-C other request");
    const definition = await createEnabledDefinition(runtime, "m5c_scope_procurement_request", 1);
    const pilot = await createPilot(runtime, definition.id, scopedRequest.id);

    expect(pilot.scope).toEqual({ orgIds: ["org-hotel"], businessIdCount: 1, environments: ["test"] });
    expect(JSON.stringify(pilot)).not.toContain(scopedRequest.id);

    const changed = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/scope`)
      .set("x-mock-user-id", "u6")
      .send({ scope: { orgIds: ["org-hotel"], businessIds: [otherRequest.id], environments: ["test"] } });
    expect(changed.status).toBe(200);
    expect(changed.body.bpmnPilot.scope).toEqual({ orgIds: ["org-hotel"], businessIdCount: 1, environments: ["test"] });
    expect(JSON.stringify(changed.body)).not.toContain(otherRequest.id);

    await request(runtime.app).post(`/api/procurement-requests/${scopedRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${otherRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);

    expect(one(runtime, "select count(*) as count from bpmn_pilot_runs where business_id = ?", scopedRequest.id)).toEqual({ count: 0 });
    expect(one(runtime, "select count(*) as count from bpmn_pilot_runs where business_id = ?", otherRequest.id)).toEqual({ count: 1 });
    expect(one(runtime, "select process_status from process_instances where business_type = 'procurement_request' and business_id = ?", scopedRequest.id)).toEqual({ process_status: "running" });

    const logs = await request(runtime.app).get("/api/bpmn/pilot-change-logs").set("x-mock-user-id", "u6");
    expect(logs.status).toBe(200);
    expect(logs.body.bpmnPilotChangeLogs.map((item: { actionCode: string }) => item.actionCode)).toContain("bpmn_pilot.scope_updated");
    expectNoInternalFields(logs.body);
    expect(JSON.stringify(logs.body)).not.toContain(scopedRequest.id);
    expect(JSON.stringify(logs.body)).not.toContain(otherRequest.id);
  });

  it("switches pilot definition versions and rolls back to the previous enabled BPMN definition", async () => {
    const runtime = boot("test");
    const procurementRequest = await createReadyRequest(runtime, "M5-C version switch request");
    const v1 = await createEnabledDefinition(runtime, "m5c_version_procurement_request", 1, "Method decision v1");
    const v2 = await createEnabledDefinition(runtime, "m5c_version_procurement_request", 2, "Method decision v2");
    const pilot = await createPilot(runtime, v1.id, procurementRequest.id);

    const switched = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/switch-definition`)
      .set("x-mock-user-id", "u6")
      .send({ definitionId: v2.id, reason: "M5-C controlled version switch" });
    expect(switched.status).toBe(200);
    expect(switched.body.bpmnPilot).toEqual(expect.objectContaining({ definitionId: v2.id, previousDefinitionId: v1.id, status: "enabled" }));

    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    expect(one(runtime, "select definition_id from bpmn_pilot_runs where business_id = ? order by created_at desc limit 1", procurementRequest.id)).toEqual({ definition_id: v2.id });

    const rollback = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/rollback`)
      .set("x-mock-user-id", "u6")
      .send({ reason: "M5-C rollback to previous version" });
    expect(rollback.status).toBe(200);
    expect(rollback.body.bpmnPilot).toEqual(expect.objectContaining({ definitionId: v1.id, previousDefinitionId: v2.id, status: "enabled", lastRollbackReason: "M5-C rollback to previous version" }));

    const logs = all<{ action_code: string; after_json: string }>(runtime, "select action_code, after_json from bpmn_pilot_change_logs where pilot_id = ? order by created_at", pilot.id);
    expect(logs.map((item) => item.action_code)).toEqual(["bpmn_pilot.created", "bpmn_pilot.definition_switched", "bpmn_pilot.rollback"]);
    expect(logs.every((item) => !item.after_json.includes(procurementRequest.id))).toBe(true);
  });

  it("rolls back to R8 Process fallback when no previous BPMN version exists and still leaves R8 usable", async () => {
    const runtime = boot("test");
    const procurementRequest = await createReadyRequest(runtime, "M5-C fallback rollback request");
    const definition = await createEnabledDefinition(runtime, "m5c_fallback_procurement_request", 1);
    const pilot = await createPilot(runtime, definition.id, procurementRequest.id);

    const rollback = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/rollback`)
      .set("x-mock-user-id", "u6")
      .send({ reason: "M5-C stop pilot" });
    expect(rollback.status).toBe(200);
    expect(rollback.body.bpmnPilot).toEqual(expect.objectContaining({ status: "disabled", definitionId: definition.id, lastRollbackReason: "M5-C stop pilot" }));

    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    expect(one(runtime, "select count(*) as count from bpmn_pilot_runs where business_id = ?", procurementRequest.id)).toEqual({ count: 0 });
    expect(one(runtime, "select process_status from process_instances where business_type = 'procurement_request' and business_id = ?", procurementRequest.id)).toEqual({ process_status: "running" });
  });

  it("enforces governance permissions and rejects invalid switch or rollback targets", async () => {
    const runtime = boot("test");
    const procurementRequest = await createReadyRequest(runtime, "M5-C permission request");
    const definition = await createEnabledDefinition(runtime, "m5c_permission_procurement_request", 1);
    const pilot = await createPilot(runtime, definition.id, procurementRequest.id);

    const auditorScope = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/scope`)
      .set("x-mock-user-id", "u5")
      .send({ scope: { orgIds: ["org-hotel"], businessIds: [procurementRequest.id], environments: ["test"] } });
    expect(auditorScope.status).toBe(403);
    expect(auditorScope.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");

    const supplierRollback = await request(runtime.app).post(`/api/bpmn/pilots/${pilot.id}/rollback`).set("x-mock-user-id", "u14").send({ reason: "denied" });
    expect(supplierRollback.status).toBe(403);
    expect(supplierRollback.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");

    const sameDefinition = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/switch-definition`)
      .set("x-mock-user-id", "u6")
      .send({ definitionId: definition.id });
    expect(sameDefinition.status).toBe(400);
    expect(sameDefinition.body.error.code).toBe("BPMN_PILOT_DEFINITION_UNCHANGED");

    const disabledDefinition = await createEnabledDefinition(runtime, "m5c_disabled_switch_target", 1);
    await request(runtime.app).post(`/api/bpmn/definitions/${disabledDefinition.id}/disable`).set("x-mock-user-id", "u6").expect(200);
    const disabledSwitch = await request(runtime.app)
      .post(`/api/bpmn/pilots/${pilot.id}/switch-definition`)
      .set("x-mock-user-id", "u6")
      .send({ definitionId: disabledDefinition.id });
    expect(disabledSwitch.status).toBe(400);
    expect(disabledSwitch.body.error.code).toBe("BPMN_PILOT_DEFINITION_NOT_ENABLED");

    const auditorLogs = await request(runtime.app).get("/api/bpmn/pilot-change-logs").set("x-mock-user-id", "u5");
    expect(auditorLogs.status).toBe(200);
    expectNoInternalFields(auditorLogs.body);
  });

  it("honors environment rollout scope so production-scoped pilots do not run in test", async () => {
    const runtime = boot("test");
    const procurementRequest = await createReadyRequest(runtime, "M5-C environment gated request");
    const definition = await createEnabledDefinition(runtime, "m5c_environment_procurement_request", 1);
    await createPilot(runtime, definition.id, procurementRequest.id, ["production"]);

    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    expect(one(runtime, "select count(*) as count from bpmn_pilot_runs where business_id = ?", procurementRequest.id)).toEqual({ count: 0 });
    expect(one(runtime, "select process_status from process_instances where business_type = 'procurement_request' and business_id = ?", procurementRequest.id)).toEqual({ process_status: "running" });
  });
});
