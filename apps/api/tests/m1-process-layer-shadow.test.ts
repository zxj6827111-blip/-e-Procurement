import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { User } from "../src/types.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m1-process-"));
}

function boot(dataRoot = makeDataRoot()) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

async function createReadyRequest(runtime: ReturnType<typeof boot>, title = "M1 process request") {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", "u8")
    .send({
      title,
      orgId: "org-hotel",
      requestDepartment: "M1 test department",
      requesterName: "M1 requester",
      category: "linen",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [
        {
          itemName: "M1 item",
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
    .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "M1 service score leads" });
  expect(created.status).toBe(201);
  const submitted = await request(runtime.app).post(`/api/award-approvals/${created.body.approval.id}/submit`).set("x-mock-user-id", "u2");
  expect(submitted.status).toBe(200);
  return submitted;
}

describe("M1 Process Layer shadow records", () => {
  it("mirrors procurement request submit and approval into process instances, tasks and events without changing legacy response shape", async () => {
    const runtime = boot();
    const submitted = await submitReadyRequest(runtime);
    const requestId = submitted.body.procurementRequest.id as string;
    const workflowInstanceId = submitted.body.workflow.approvalInstance.id as string;

    expect(Object.keys(submitted.body).sort()).toEqual(["auditLogId", "procurementRequest", "workflow"]);
    expect(submitted.body.process).toBeUndefined();
    expect(submitted.body.processInstance).toBeUndefined();

    expect(
      single<{ process_status: string; current_node_key: string; source_instance_id: string }>(
        runtime,
        "select process_status, current_node_key, source_instance_id from process_instances where business_type = 'procurement_request' and business_id = ?",
        requestId
      )
    ).toEqual({
      process_status: "running",
      current_node_key: "approval_pending",
      source_instance_id: workflowInstanceId
    });
    expect(single(runtime, "select task_status from process_task_instances where business_type = 'procurement_request' and business_id = ? and task_type = 'approval_procurement_request'", requestId)).toEqual({ task_status: "pending" });
    expect(all(runtime, "select event_code from process_events where business_type = 'procurement_request' and business_id = ? order by created_at", requestId)).toEqual([
      { event_code: "procurement_request.created" },
      { event_code: "procurement_request.submitted" }
    ]);

    const approved = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "M1 approved" });
    expect(approved.status).toBe(200);
    expect(Object.keys(approved.body).sort()).toEqual(["auditLogId", "procurementRequest"]);
    expect(approved.body.process).toBeUndefined();
    expect(approved.body.procurementRequest.approvalStatus).toBe("approved");

    expect(single(runtime, "select process_status, current_node_key from process_instances where source_instance_id = ?", workflowInstanceId)).toEqual({
      process_status: "running",
      current_node_key: "method_decision"
    });
    expect(single(runtime, "select task_status from process_task_instances where business_type = 'procurement_request' and business_id = ? and task_type = 'approval_procurement_request'", requestId)).toEqual({ task_status: "completed" });
    expect(single(runtime, "select task_status from process_task_instances where business_type = 'procurement_request' and business_id = ? and task_type = 'procurement_method_decision'", requestId)).toEqual({ task_status: "pending" });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'procurement_request' and business_id = ? order by created_at", requestId).map((row) => row.event_code)
    ).toEqual(["procurement_request.created", "procurement_request.submitted", "procurement_request.approved"]);

    const readable = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u1");
    expect(readable.status).toBe(200);
    expect(readable.body.processInstances).toHaveLength(1);
    expect(readable.body.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ taskType: "approval_procurement_request", status: "completed" })]));
    const buyerReadable = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u2");
    expect(buyerReadable.status).toBe(200);
    expect(buyerReadable.body.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ taskType: "procurement_method_decision", status: "pending" })]));
    expect(readable.body.events.map((event: { eventCode: string }) => event.eventCode)).toEqual(["procurement_request.created", "procurement_request.submitted", "procurement_request.approved"]);
    expect(readable.body.events[2].payloadJson).toBeUndefined();
    expect(readable.body.events[2].actorId).toBeUndefined();

    const adminRead = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u6");
    expect(adminRead.status).toBe(200);
    expect(adminRead.body.processInstances).toHaveLength(0);
  });

  it("mirrors award approval submit and approval into process records while keeping R8 as the execution source", async () => {
    const runtime = boot();
    const submitted = await createSubmittedAward(runtime);
    const awardId = submitted.body.approval.id as string;
    const workflowInstanceId = submitted.body.workflow.approvalInstance.id as string;

    expect(Object.keys(submitted.body).sort()).toEqual(["adapterLog", "approval", "auditLogId", "workflow"]);
    expect(submitted.body.process).toBeUndefined();
    expect(submitted.body.workflow.approvalInstance.businessType).toBe("award_approval");

    expect(single(runtime, "select process_status, current_node_key, supplier_id from process_instances where business_type = 'award_approval' and business_id = ?", awardId)).toEqual({
      process_status: "running",
      current_node_key: "approval_pending",
      supplier_id: "sup-1"
    });
    expect(single(runtime, "select task_status, source_task_id from process_task_instances where business_type = 'award_approval' and business_id = ?", awardId)).toEqual({
      task_status: "pending",
      source_task_id: submitted.body.workflow.task.id
    });

    const approved = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${workflowInstanceId}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "approve", opinion: "M1 award approved" });
    expect(approved.status).toBe(200);
    expect(Object.keys(approved.body).sort()).toEqual(["approvalInstance", "auditLogId", "notification"]);
    expect(approved.body.approvalInstance.approvalStatus).toBe("approved");

    expect(single(runtime, "select approval_status from r2_approval_instances where id = ?", workflowInstanceId)).toEqual({ approval_status: "approved" });
    expect(single(runtime, "select process_status, current_node_key from process_instances where source_instance_id = ?", workflowInstanceId)).toEqual({
      process_status: "completed",
      current_node_key: "approved_end"
    });
    expect(
      all<{ event_code: string }>(runtime, "select event_code from process_events where business_type = 'award_approval' and business_id = ? order by created_at", awardId).map((row) => row.event_code)
    ).toEqual(["award_approval.submitted", "award_approval.approved"]);

    const supplierRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u3");
    expect(supplierRead.status).toBe(200);
    expect(supplierRead.body.processInstances).toHaveLength(1);
    expect(supplierRead.body.tasks).toHaveLength(0);
    expect(supplierRead.body.events[1].payloadJson).toBeUndefined();
    const otherSupplierRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u14");
    expect(otherSupplierRead.status).toBe(200);
    expect(otherSupplierRead.body.processInstances).toHaveLength(0);

    runtime.ctx.state.users.push({
      id: "u-m1-hotel-viewer",
      name: "M1 hotel scoped viewer",
      roleId: "hotel_buyer",
      orgId: "org-east",
      orgScope: ["org-east"]
    } satisfies User);
    const hotelBuyerWithoutProject = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u-m1-hotel-viewer");
    expect(hotelBuyerWithoutProject.status).toBe(200);
    expect(hotelBuyerWithoutProject.body.processInstances).toHaveLength(0);

    const auditorRead = await request(runtime.app).get(`/api/process/business/award_approval/${awardId}`).set("x-mock-user-id", "u5");
    expect(auditorRead.status).toBe(200);
    expect(auditorRead.body.processInstances).toHaveLength(1);
    expect(auditorRead.body.tasks).toHaveLength(0);
    expect(auditorRead.body.events).toHaveLength(2);
    expect(auditorRead.body.events[1].payloadJson).toBeUndefined();
    expect(auditorRead.body.events[1].actorId).toBeUndefined();
  });

  it("does not let Process Layer write failures block the original R8 procurement flow", async () => {
    const runtime = boot();
    runtime.ctx.runtimeDb.db.exec("drop table process_instances");

    const submitted = await submitReadyRequest(runtime, "M1 process failure isolation");
    const requestId = submitted.body.procurementRequest.id as string;
    expect(submitted.body.procurementRequest.approvalStatus).toBe("submitted");
    expect(single(runtime, "select approval_status from r2_approval_instances where business_type = 'procurement_request' and business_id = ?", requestId)).toEqual({ approval_status: "submitted" });
    expect(single(runtime, "select task_status from r2_task_items where business_type = 'procurement_request' and business_id = ?", requestId)).toEqual({ task_status: "pending" });

    const approved = await request(runtime.app).post(`/api/procurement-requests/${requestId}/approve`).set("x-mock-user-id", "u1").send({ approved: true, opinion: "R8 still works" });
    expect(approved.status).toBe(200);
    expect(approved.body.procurementRequest.approvalStatus).toBe("approved");
    expect(single(runtime, "select approval_status from r2_procurement_requests where id = ?", requestId)).toEqual({ approval_status: "approved" });
  });

  it("keeps R8 bootable when Process Layer initialization fails on an incompatible existing schema", async () => {
    const dataRoot = makeDataRoot();
    const sqliteFile = path.join(dataRoot, "runtime.sqlite");
    const db = new DatabaseSync(sqliteFile);
    try {
      db.exec("create table process_definitions (id text primary key)");
    } finally {
      db.close();
    }

    const runtime = boot(dataRoot);
    expect(runtime.ctx.processRepository.isAvailable()).toBe(false);

    const submitted = await submitReadyRequest(runtime, "M1 process boot isolation");
    const requestId = submitted.body.procurementRequest.id as string;
    expect(submitted.body.procurementRequest.approvalStatus).toBe("submitted");
    expect(single(runtime, "select approval_status from r2_approval_instances where business_type = 'procurement_request' and business_id = ?", requestId)).toEqual({ approval_status: "submitted" });

    const processRead = await request(runtime.app).get(`/api/process/business/procurement_request/${requestId}`).set("x-mock-user-id", "u1");
    expect(processRead.status).toBe(200);
    expect(processRead.body.processInstances).toHaveLength(0);
  });

  it("does not mirror non-M1 approval business types into process records", () => {
    const runtime = boot();
    const now = new Date().toISOString();
    runtime.ctx.r8WorkflowTaskRepository.upsertApprovalRule({
      id: "rule:m1-non-shadow-settlement",
      ruleCode: "m1-non-shadow-settlement",
      ruleName: "M1 non shadow settlement",
      businessType: "settlement_bill",
      amountMin: 0,
      amountMax: 999999,
      methodTypes: ["m1-test"],
      nodeRoleIds: ["group_manager"],
      actions: ["approve", "reject"],
      approvalOrder: ["group_manager"],
      status: "enabled",
      versionNo: 1,
      updatedAt: now
    });
    const initiator = runtime.ctx.state.users.find((user) => user.id === "u2")!;
    const result = runtime.ctx.r8WorkflowTaskRepository.startApproval({
      businessType: "settlement_bill",
      businessId: "settlement-m1-no-shadow",
      title: "M1 non shadow settlement",
      amount: 100,
      methodType: "m1-test",
      projectId: "p-award",
      orgId: "org-east",
      supplierId: "sup-1",
      initiator,
      sourceJson: { m1NonShadow: true }
    });
    expect(result.approvalInstance.approvalStatus).toBe("submitted");
    expect(single(runtime, "select approval_status from r2_approval_instances where business_type = 'settlement_bill' and business_id = 'settlement-m1-no-shadow'")).toEqual({ approval_status: "submitted" });
    expect(single(runtime, "select count(*) as count from process_instances where business_type = 'settlement_bill' and business_id = 'settlement-m1-no-shadow'")).toEqual({ count: 0 });
  });
});
