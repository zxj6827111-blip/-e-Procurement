import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m5a-bpmn-"));
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

function validBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="m5a_procurement_request" isExecutable="false">
    <startEvent id="start" name="Start">
      <outgoing>flow_start_submit</outgoing>
    </startEvent>
    <userTask id="submit_request" name="Submit request" roleId="hotel_buyer" taskType="procurement_request_submit">
      <incoming>flow_start_submit</incoming>
      <outgoing>flow_submit_review</outgoing>
    </userTask>
    <userTask id="purchase_review" name="Purchase review" roleId="buyer" taskType="procurement_request_review">
      <incoming>flow_submit_review</incoming>
      <outgoing>flow_review_gateway</outgoing>
    </userTask>
    <exclusiveGateway id="review_gateway" name="Review decision">
      <incoming>flow_review_gateway</incoming>
      <outgoing>flow_review_approved</outgoing>
      <outgoing>flow_review_rejected</outgoing>
    </exclusiveGateway>
    <userTask id="method_decision" name="Method decision" roleId="buyer" taskType="procurement_method_decision">
      <incoming>flow_review_approved</incoming>
      <outgoing>flow_method_end</outgoing>
    </userTask>
    <endEvent id="approved_end" name="Approved">
      <incoming>flow_method_end</incoming>
    </endEvent>
    <endEvent id="rejected_end" name="Rejected">
      <incoming>flow_review_rejected</incoming>
    </endEvent>
    <sequenceFlow id="flow_start_submit" sourceRef="start" targetRef="submit_request" actionCode="start" />
    <sequenceFlow id="flow_submit_review" sourceRef="submit_request" targetRef="purchase_review" actionCode="submit" />
    <sequenceFlow id="flow_review_gateway" sourceRef="purchase_review" targetRef="review_gateway" actionCode="review" />
    <sequenceFlow id="flow_review_approved" sourceRef="review_gateway" targetRef="method_decision" actionCode="approve" condition="approved" />
    <sequenceFlow id="flow_review_rejected" sourceRef="review_gateway" targetRef="rejected_end" actionCode="reject" condition="rejected" />
    <sequenceFlow id="flow_method_end" sourceRef="method_decision" targetRef="approved_end" actionCode="method_decided" />
  </process>
</definitions>`;
}

function invalidBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="bad" isExecutable="false">
    <startEvent id="start_a" name="Start A" />
    <startEvent id="start_b" name="Start B" />
    <userTask id="orphan_review" name="Orphan Review" taskType="approval" />
    <exclusiveGateway id="gateway" name="Missing condition">
      <incoming>flow_x</incoming>
      <outgoing>flow_y</outgoing>
    </exclusiveGateway>
    <endEvent id="end" name="End" />
    <sequenceFlow id="flow_y" sourceRef="gateway" targetRef="end" />
  </process>
</definitions>`;
}

async function createBpmnDefinition(runtime: ReturnType<typeof boot>, status = "draft") {
  const response = await request(runtime.app)
    .post("/api/bpmn/definitions")
    .set("x-mock-user-id", "u6")
    .send({
      processCode: "m5a_procurement_request",
      processName: "M5-A procurement request BPMN",
      businessType: "procurement_request",
      status,
      bpmnXml: validBpmnXml()
    });
  expect(response.status).toBe(201);
  return response.body.bpmnDefinition as { id: string; status: string; validationStatus: string };
}

describe("M5-A BPMN controlled definition layer", () => {
  it("validates BPMN XML and maps it to ProcessDefinition draft preview without writing formal process definitions", async () => {
    const runtime = boot();
    const before = one<{ count: number }>(runtime, "select count(*) as count from process_definitions where process_code = 'm5a_procurement_request'")?.count ?? 0;
    const validation = await request(runtime.app)
      .post("/api/bpmn/definitions/validate")
      .set("x-mock-user-id", "u6")
      .send({
        processCode: "m5a_procurement_request",
        processName: "M5-A procurement request BPMN",
        businessType: "procurement_request",
        bpmnXml: validBpmnXml()
      });

    expect(validation.status).toBe(200);
    expect(validation.body.valid).toBe(true);
    expect(validation.body.errors).toEqual([]);
    expect(validation.body.preview.processDefinitionDraft).toEqual(
      expect.objectContaining({
        processCode: "m5a_procurement_request",
        processName: "M5-A procurement request BPMN",
        processType: "procurement_request",
        status: "draft",
        sourceType: "bpmn_preview"
      })
    );
    expect(validation.body.preview.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeKey: "submit_request", nodeType: "user_task", assigneeRoleId: "hotel_buyer", taskType: "procurement_request_submit" }),
        expect.objectContaining({ nodeKey: "purchase_review", nodeType: "user_task", assigneeRoleId: "buyer", taskType: "procurement_request_review" }),
        expect.objectContaining({ nodeKey: "review_gateway", nodeType: "gateway" })
      ])
    );
    expect(validation.body.preview.transitions).toEqual(expect.arrayContaining([expect.objectContaining({ fromNodeKey: "review_gateway", toNodeKey: "method_decision", actionCode: "approve" })]));

    const after = one<{ count: number }>(runtime, "select count(*) as count from process_definitions where process_code = 'm5a_procurement_request'")?.count ?? 0;
    expect(after).toBe(before);
  });

  it("saves validated BPMN XML as a controlled definition and records sanitized change logs", async () => {
    const runtime = boot();
    const definition = await createBpmnDefinition(runtime);

    expect(definition.status).toBe("draft");
    expect(definition.validationStatus).toBe("valid");
    expect(JSON.stringify(definition)).not.toContain(validBpmnXml());
    expect(definition).toEqual(expect.objectContaining({ xmlLength: validBpmnXml().length }));

    const row = one<{ status: string; validation_status: string; bpmn_xml: string }>(runtime, "select status, validation_status, bpmn_xml from bpmn_definitions where id = ?", definition.id);
    expect(row).toEqual(expect.objectContaining({ status: "draft", validation_status: "valid", bpmn_xml: validBpmnXml() }));

    const logs = all<{ action_code: string; after_json: string }>(runtime, "select action_code, after_json from bpmn_definition_change_logs where definition_id = ? order by created_at", definition.id);
    expect(logs.map((item) => item.action_code)).toEqual(["bpmn_definition.created", "bpmn_definition.validated"]);
    expect(logs.every((item) => JSON.stringify(item).includes("bpmnXml"))).toBe(false);
  });

  it("rejects enabling unvalidated or invalid BPMN and returns explicit validation errors", async () => {
    const runtime = boot();
    const invalid = await request(runtime.app)
      .post("/api/bpmn/definitions")
      .set("x-mock-user-id", "u6")
      .send({
        processCode: "m5a_bad_procurement_request",
        processName: "M5-A invalid BPMN",
        businessType: "procurement_request",
        bpmnXml: invalidBpmnXml()
      });
    expect(invalid.status).toBe(201);
    expect(invalid.body.bpmnDefinition.validationStatus).toBe("invalid");
    expect(invalid.body.bpmnDefinition.validationErrors.map((item: { code: string }) => item.code)).toEqual(
      expect.arrayContaining(["BPMN_START_EVENT_COUNT_INVALID", "BPMN_USER_TASK_ROLE_REQUIRED", "BPMN_NODE_ISOLATED", "BPMN_GATEWAY_CONDITION_REQUIRED"])
    );

    const enableInvalid = await request(runtime.app).post(`/api/bpmn/definitions/${invalid.body.bpmnDefinition.id}/enable`).set("x-mock-user-id", "u6");
    expect(enableInvalid.status).toBe(400);
    expect(enableInvalid.body.error.code).toBe("BPMN_VALIDATION_REQUIRED");

    const directEnableInvalid = await request(runtime.app)
      .post("/api/bpmn/definitions")
      .set("x-mock-user-id", "u6")
      .send({
        processCode: "m5a_bad_direct_enable",
        processName: "M5-A invalid direct enable",
        businessType: "procurement_request",
        status: "enabled",
        bpmnXml: invalidBpmnXml()
      });
    expect(directEnableInvalid.status).toBe(400);
    expect(directEnableInvalid.body.error.code).toBe("BPMN_VALIDATION_REQUIRED");
  });

  it("enables validated BPMN as configuration only and keeps existing M1-M4 Process definitions intact", async () => {
    const runtime = boot();
    const definition = await createBpmnDefinition(runtime, "enabled");
    expect(definition.status).toBe("enabled");

    expect(one(runtime, "select count(*) as count from process_definitions where process_code = 'm5a_procurement_request'")).toEqual({ count: 0 });
    expect(one(runtime, "select source_type, source_json from process_definitions where process_code = 'procurement_request'")).toEqual(
      expect.objectContaining({ source_type: "r8_shadow" })
    );
    expect(JSON.parse(one<{ source_json: string }>(runtime, "select source_json from process_definitions where process_code = 'order_fulfillment'")!.source_json).phase).toBe("M4-D");
  });

  it("simulates BPMN paths without writing business process instances, tasks or events", async () => {
    const runtime = boot();
    const definition = await createBpmnDefinition(runtime, "enabled");
    const before = {
      instances: one<{ count: number }>(runtime, "select count(*) as count from process_instances")?.count ?? 0,
      tasks: one<{ count: number }>(runtime, "select count(*) as count from process_task_instances")?.count ?? 0,
      events: one<{ count: number }>(runtime, "select count(*) as count from process_events")?.count ?? 0
    };

    const simulation = await request(runtime.app)
      .post("/api/bpmn/simulate")
      .set("x-mock-user-id", "u6")
      .send({
        definitionId: definition.id,
        events: ["submit", "review", "approve", "method_decided"]
      });

    expect(simulation.status).toBe(200);
    expect(simulation.body.simulation).toEqual(expect.objectContaining({ valid: true, consumedEvents: 4, stoppedReason: "completed" }));
    expect(simulation.body.simulation.path.map((item: { nodeKey: string }) => item.nodeKey)).toEqual(["start", "submit_request", "purchase_review", "review_gateway", "method_decision", "approved_end"]);

    const after = {
      instances: one<{ count: number }>(runtime, "select count(*) as count from process_instances")?.count ?? 0,
      tasks: one<{ count: number }>(runtime, "select count(*) as count from process_task_instances")?.count ?? 0,
      events: one<{ count: number }>(runtime, "select count(*) as count from process_events")?.count ?? 0
    };
    expect(after).toEqual(before);
  });

  it("enforces BPMN maintenance permissions and keeps auditors read-only", async () => {
    const runtime = boot();
    const definition = await createBpmnDefinition(runtime, "enabled");

    for (const userId of ["u1", "u2", "u3", "u4", "u9", "u13", "u14"]) {
      const denied = await request(runtime.app)
        .post("/api/bpmn/definitions")
        .set("x-mock-user-id", userId)
        .send({ processCode: "denied", processName: "Denied", businessType: "procurement_request", bpmnXml: validBpmnXml() });
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");
    }

    const auditorRead = await request(runtime.app).get("/api/bpmn/definitions").set("x-mock-user-id", "u5");
    expect(auditorRead.status).toBe(200);
    expect(auditorRead.body.bpmnDefinitions.map((item: { id: string }) => item.id)).toContain(definition.id);

    const auditorDisable = await request(runtime.app).post(`/api/bpmn/definitions/${definition.id}/disable`).set("x-mock-user-id", "u5");
    expect(auditorDisable.status).toBe(403);
    expect(auditorDisable.body.error.code).toBe("BPMN_DEFINITION_MAINTAIN_DENIED");

    const supplierRead = await request(runtime.app).get("/api/bpmn/definitions").set("x-mock-user-id", "u14");
    expect(supplierRead.status).toBe(403);
    expect(supplierRead.body.error.code).toBe("BPMN_DEFINITION_READ_DENIED");
  });

  it("keeps BPMN failures isolated from existing R8 and Process Layer execution", async () => {
    const runtime = boot();
    const invalid = await request(runtime.app)
      .post("/api/bpmn/definitions/validate")
      .set("x-mock-user-id", "u6")
      .send({
        processCode: "broken_bpmn",
        processName: "Broken BPMN",
        businessType: "procurement_request",
        bpmnXml: invalidBpmnXml()
      });
    expect(invalid.status).toBe(200);
    expect(invalid.body.valid).toBe(false);

    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "M5-A R8 still works",
        orgId: "org-east",
        requestDepartment: "M5-A",
        requesterName: "Requester",
        category: "linen",
        budgetLabel: "1000",
        budgetAmount: 1000,
        methodSuggestion: "内部公开采购",
        lineItems: [{ itemName: "item", specification: "std", quantity: 1, unit: "piece", budgetAmount: 1000 }]
      });
    expect(created.status).toBe(201);
    const submitted = await request(runtime.app).post(`/api/procurement-requests/${created.body.procurementRequest.id}/submit`).set("x-mock-user-id", "u2");
    expect(submitted.status).toBe(200);
    expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "procurementRequest", "workflow"]);
    expect(one(runtime, "select approval_status from r2_approval_instances where business_type = 'procurement_request' and business_id = ?", created.body.procurementRequest.id)).toEqual({ approval_status: "submitted" });
    expect(one(runtime, "select process_status from process_instances where business_type = 'procurement_request' and business_id = ?", created.body.procurementRequest.id)).toEqual({ process_status: "running" });
  });
});
