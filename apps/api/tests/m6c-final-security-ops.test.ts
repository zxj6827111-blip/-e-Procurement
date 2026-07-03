import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext, type AppContextOptions } from "../src/app-context.js";
import type { User } from "../src/types.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m6c-"));
}

function boot(runtime: AppContextOptions["runtime"] = {}) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true,
      ...runtime
    }
  });
  return { ctx, app: createApp(ctx) };
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function one<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function tinyPngBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

function expectNoInternalFields(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain("payloadJson");
  expect(json).not.toContain("sourceJson");
  expect(json).not.toContain("actorId");
  expect(json).not.toContain("assigneeUserId");
  expect(json).not.toContain("sourceTaskId");
  expect(json).not.toContain("internalEventId");
  expect(json).not.toContain("businessIds");
  expect(json).not.toContain("opinion");
}

async function createReadyRequest(runtime: ReturnType<typeof boot>, userId: string, orgId: string, title = "M6-C procurement request") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", userId)
    .send({
      title,
      orgId,
      requestDepartment: "M6-C 验收部门",
      requesterName: "M6-C 发起人",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [{ itemName: "M6-C 验收物资", specification: "standard", quantity: 1, unit: "件", budgetAmount: 1000 }]
    });
  expect(created.status).toBe(201);
  return created.body.procurementRequest as { id: string; orgId: string };
}

function procurementRequestBpmnXml(processId = "m6c_procurement_request") {
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

async function createEnabledPilot(runtime: ReturnType<typeof boot>, requestId: string) {
  const definition = await request(runtime.app)
    .post("/api/bpmn/definitions")
    .set("x-mock-user-id", "u6")
    .send({
      processCode: `m6c_procurement_request_${Date.now()}`,
      processName: "M6-C procurement request shadow pilot",
      businessType: "procurement_request",
      status: "enabled",
      bpmnXml: procurementRequestBpmnXml()
    });
  expect(definition.status).toBe(201);

  const pilot = await request(runtime.app)
    .post("/api/bpmn/pilots")
    .set("x-mock-user-id", "u6")
    .send({
      definitionId: definition.body.bpmnDefinition.id,
      pilotName: "M6-C final shadow pilot",
      businessType: "procurement_request",
      status: "enabled",
      scope: {
        orgIds: ["org-hotel"],
        businessIds: [requestId],
        environments: ["test"]
      }
    });
  expect(pilot.status).toBe(201);
  return pilot.body.bpmnPilot as { id: string; definitionId: string };
}

describe("M6-C final security, operations and delivery gate", () => {
  it("keeps final role boundaries for supplier isolation, organization isolation, audit read-only and administrator business isolation", async () => {
    const runtime = boot();
    const otherSupplier: User = { id: "u-m6c-other-supplier", name: "M6-C 其他供应商", roleId: "supplier", supplierId: "sup-2", orgId: "org-hotel" };
    const otherHotelBuyer: User = { id: "u-m6c-other-hotel", name: "M6-C 其他酒店采购", roleId: "hotel_buyer", orgId: "org-other-hotel", orgScope: ["org-other-hotel"] };
    runtime.ctx.state.users.push(otherSupplier, otherHotelBuyer);
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, runtime.ctx.config.allowLocalPasswordLogin);

    const ownSupplier = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", "u11");
    expect(ownSupplier.status).toBe(200);

    const otherSupplierRead = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", otherSupplier.id);
    expect(otherSupplierRead.status).toBe(403);
    expect(otherSupplierRead.text).not.toContain("上海棉织供应链有限公司");

    const requestFromOtherOrg = await createReadyRequest(runtime, "u8", "org-hotel", "M6-C hotel demand");
    const unrelatedHotelRead = await request(runtime.app).get(`/api/procurement-requests/${requestFromOtherOrg.id}`).set("x-mock-user-id", otherHotelBuyer.id);
    expect(unrelatedHotelRead.status).toBe(403);
    expect(unrelatedHotelRead.text).not.toContain("M6-C hotel demand");

    const auditorTimeline = await request(runtime.app).get("/api/process/business/procurement_request/req-award").set("x-mock-user-id", "u5");
    expect(auditorTimeline.status).toBe(200);
    expectNoInternalFields(auditorTimeline.body);

    const auditorMutation = await request(runtime.app).post(`/api/procurement-requests/${requestFromOtherOrg.id}/approve`).set("x-mock-user-id", "u5").send({ approved: true });
    expect(auditorMutation.status).toBe(403);

    const adminBusinessRead = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u6");
    expect(adminBusinessRead.status).toBe(403);
    expect(adminBusinessRead.body.error.code).toBe("PROJECT_WORKBENCH_READ_DENIED");

    const expertSuppliers = await request(runtime.app).get("/api/suppliers").set("x-mock-user-id", "u7");
    expect(expertSuppliers.status).toBe(403);

    const financeApproval = await request(runtime.app).post(`/api/procurement-requests/${requestFromOtherOrg.id}/approve`).set("x-mock-user-id", "u13").send({ approved: true });
    expect(financeApproval.status).toBe(403);
  });

  it("keeps archive aggregate lists scoped and supplier sub-roles able to access only their own bid files", async () => {
    const runtime = boot();
    const projectById = new Map(runtime.ctx.state.projects.map((project) => [project.id, project]));

    const supplierArchiveItems = await request(runtime.app).get("/api/archive-items").set("x-mock-user-id", "u11");
    expect(supplierArchiveItems.status).toBe(200);
    expect(supplierArchiveItems.body.archiveItems.length).toBeGreaterThan(0);
    expect(
      supplierArchiveItems.body.archiveItems.every((item: { projectId: string }) => projectById.get(item.projectId)?.participantSupplierIds.includes("sup-1"))
    ).toBe(true);

    const adminArchiveItems = await request(runtime.app).get("/api/archive-items").set("x-mock-user-id", "u6");
    expect(adminArchiveItems.status).toBe(403);
    expect(adminArchiveItems.body.error.code).toBe("ARCHIVE_READ_DENIED");

    const adminSupplementRequests = await request(runtime.app).get("/api/archive-supplement-requests").set("x-mock-user-id", "u6");
    expect(adminSupplementRequests.status).toBe(403);
    expect(adminSupplementRequests.body.error.code).toBe("ARCHIVE_SUPPLEMENT_READ_DENIED");

    const supplierAdminBidFile = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u11")
      .send({ content: "response_file_metadata" });
    expect(supplierAdminBidFile.status).toBe(200);
    expect(supplierAdminBidFile.body.allowed).toBe(true);

    const supplierQuotationBidFile = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u12")
      .send({ content: "response_file_metadata" });
    expect(supplierQuotationBidFile.status).toBe(200);
    expect(supplierQuotationBidFile.body.allowed).toBe(true);

    const otherSupplierBidFile = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u14")
      .send({ content: "response_file_metadata" });
    expect(otherSupplierBidFile.status).toBe(403);
    expect(otherSupplierBidFile.body.error.code).toBe("SUPPLIER_BID_SCOPE_DENIED");
  });

  it("locks process timeline and task DTO redaction while preserving traceable procurement events", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime, "u8", "org-hotel", "M6-C redaction request");
    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "M6-C should stay internal" }).expect(200);
    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-open" }).expect(200);

    const timeline = await request(runtime.app).get(`/api/process/business/procurement_request/${procurementRequest.id}`).set("x-mock-user-id", "u1");
    expect(timeline.status).toBe(200);
    expect(timeline.body.events.map((event: { eventCode: string }) => event.eventCode)).toEqual([
      "procurement_request.created",
      "procurement_request.submitted",
      "procurement_request.approved",
      "procurement_request.method_decided"
    ]);
    expectNoInternalFields(timeline.body);

    const tasks = await request(runtime.app).get("/api/process/tasks").set("x-mock-user-id", "u1");
    expect(tasks.status).toBe(200);
    expectNoInternalFields(tasks.body);

    expect(
      all<{ event_code: string; payload_json: string }>(
        runtime,
        "select event_code, payload_json from process_events where business_type = 'procurement_request' and business_id = ? order by created_at",
        procurementRequest.id
      ).map((row) => row.event_code)
    ).toEqual(["procurement_request.created", "procurement_request.submitted", "procurement_request.approved", "procurement_request.method_decided"]);
  });

  it("keeps file upload security, path sanitization, download audit and sensitive health redaction", async () => {
    const runtime = boot({ fileStorageMode: "mock", fileUploadMaxBytes: 8 });

    const blockedType = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u2")
      .send({
        originalName: "payload.exe",
        contentType: "application/x-msdownload",
        contentBase64: Buffer.from("demo", "utf8").toString("base64"),
        attachmentKind: "m6c_file_security",
        objectType: "procurement_request",
        objectId: "req-award"
      });
    expect(blockedType.status).toBe(400);
    expect(blockedType.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");

    const tooLarge = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u2")
      .send({
        originalName: "m6c-too-large.png",
        contentType: "image/png",
        contentBase64: Buffer.from("123456789", "utf8").toString("base64"),
        attachmentKind: "m6c_file_security",
        objectType: "procurement_request",
        objectId: "req-award"
      });
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.code).toBe("FILE_TOO_LARGE");

    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u2")
      .send({
        originalName: "../secret/m6c.png",
        contentType: "image/png",
        contentBase64: Buffer.from("png", "utf8").toString("base64"),
        attachmentKind: "m6c_file_security",
        objectType: "procurement_request",
        objectId: "req-award",
        projectId: "p-award"
      });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.file.fileName).toBe("m6c.png");

    const supplierDenied = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u14");
    expect(supplierDenied.status).toBe(403);

    const download = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(download.status).toBe(200);
    expect(download.headers["x-audit-log-id"]).toMatch(/^audit-/);

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.text).not.toContain(runtime.ctx.config.dataRoot);
    expect(health.text).not.toContain("runtime.sqlite");
  });

  it("keeps BPMN pilot health permissioned and redacted while R8 and Process remain the execution path", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime, "u8", "org-hotel", "M6-C BPMN pilot request");
    const pilot = await createEnabledPilot(runtime, procurementRequest.id);

    await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8").expect(200);

    const adminHealth = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", "u6");
    expect(adminHealth.status).toBe(200);
    expect(adminHealth.body.bpmnPilotHealth.map((item: { pilotId: string }) => item.pilotId)).toContain(pilot.id);
    expectNoInternalFields(adminHealth.body);
    expect(JSON.stringify(adminHealth.body)).not.toContain(procurementRequest.id);

    const auditorHealth = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", "u5");
    expect(auditorHealth.status).toBe(200);
    expect(auditorHealth.body.bpmnPilotHealth.map((item: { pilotId: string }) => item.pilotId)).toContain(pilot.id);
    expectNoInternalFields(auditorHealth.body);

    for (const userId of ["u11", "u12", "u7", "u13"]) {
      const denied = await request(runtime.app).get("/api/bpmn/pilot-health").set("x-mock-user-id", userId);
      expect(denied.status).toBe(403);
    }

    const process = one<{ source_engine: string; process_status: string }>(
      runtime,
      "select source_engine, process_status from process_instances where business_type = 'procurement_request' and business_id = ?",
      procurementRequest.id
    );
    expect(process).toEqual({ source_engine: "r8_workflow", process_status: "running" });
  });

  it("keeps production Go/No-Go conservative when only contracts, local files or mock boundaries exist", async () => {
    const dataRoot = makeDataRoot();
    const runtime = boot({
      appEnv: "production",
      dataRoot,
      mockAuthEnabled: false,
      allowLocalPasswordLogin: false,
      seedOnBoot: false,
      databaseDriver: "postgres",
      databaseUrl: "postgres://customer-db.example/eproc",
      fileStorageMode: "object",
      objectStorageEndpoint: "https://object-storage.example.local",
      objectStorageBucket: "eprocurement",
      identityProviderMode: "adapter",
      cookieSecure: true,
      corsAllowedOrigins: ["https://procurement.example.local"],
      sessionSecret: "production-secret-for-m6c-test",
      requiredIntegrationProviders: ["sso", "oa", "erp", "wms", "finance", "fileService", "eInvoice"],
      integrationEndpoints: {
        sso: "https://sso.example.local/api",
        oa: "https://oa.example.local/api",
        erp: "https://erp.example.local/api",
        wms: "https://wms.example.local/api",
        finance: "https://finance.example.local/api",
        fileService: "https://file.example.local/api",
        eInvoice: "https://invoice.example.local/api"
      },
      workflowExecutionSource: "r8_workflow",
      processLayerMode: "shadow",
      bpmnPilotMode: "shadow"
    });

    const health = await request(runtime.app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.mockAuthEnabled).toBe(false);
    expect(health.body.workflow).toMatchObject({ executionSource: "r8_workflow", processLayerMode: "shadow", bpmnPilotMode: "shadow" });
    expect(health.body.readiness.productionReady).toBe(false);
    expect(health.body.operations.integrationContractSummary).toMatchObject({
      endpointConfigured: 7,
      verifiedIntegration: 0
    });
    expect(health.text).not.toContain(dataRoot);
    expect(health.text).not.toContain("runtime.sqlite");

    const mockLogin = await request(runtime.app).post("/api/auth/mock-login").send({ userId: "u2" });
    expect(mockLogin.status).toBe(403);

    const contracts = await request(runtime.app).get("/api/integration-contracts").set("x-mock-user-id", "u1");
    expect(contracts.status).toBe(401);
  });
});
