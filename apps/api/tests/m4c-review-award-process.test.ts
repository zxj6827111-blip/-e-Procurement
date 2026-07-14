import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-m4c-review-award-"));
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

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function one<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
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

async function confirmAssignment(runtime: ReturnType<typeof boot>, assignmentId = "ea-3", userId = "u7") {
  for (const type of ["avoidance", "discipline", "confidentiality"]) {
    const response = await request(runtime.app).post(`/api/expert-assignments/${assignmentId}/confirm`).set("x-mock-user-id", userId).send({ type });
    expect(response.status).toBe(200);
  }
}

async function buildReviewAwardFlow(runtime: ReturnType<typeof boot>) {
  const projectId = "p-award";
  for (const bid of runtime.ctx.state.bids.filter((item) => item.projectId === projectId)) {
    bid.status = "submitted";
    bid.lockedAt = null;
  }
  const lock = await request(runtime.app).post(`/api/projects/${projectId}/bids/lock`).set("x-mock-user-id", "u2");
  expect(lock.status).toBe(200);

  runtime.ctx.state.experts.push({
    id: "exp-m4c-orphan",
    name: "M4-C process expert",
    category: "process-test",
    status: "available",
    accountUserIds: ["u-m4c-expert"]
  });
  runtime.ctx.state.users.push({
    id: "u-m4c-expert",
    name: "M4-C process expert",
    roleId: "expert",
    orgId: "org-group",
    orgScope: ["org-group", "org-east", "org-hotel"],
    expertId: "exp-m4c-orphan"
  });
  const appointed = await request(runtime.app)
    .post(`/api/projects/${projectId}/expert-assignments/appoint`)
    .set("x-mock-user-id", "u2")
    .send({ expertId: "exp-m4c-orphan", reason: "M4-C process assignment event" });
  expect(appointed.status).toBe(201);
  expect(Object.keys(appointed.body).sort()).toEqual(["assignment", "auditLogId"]);
  const assignmentId = appointed.body.assignment.id as string;

  await confirmAssignment(runtime, "ea-3", "u7");

  const scoring = await request(runtime.app)
    .post("/api/scoring-sheets/score-open/submit-lock")
    .set("x-mock-user-id", "u7")
    .send({ technical: 80, service: 78, price: 76, opinion: "M4-C expert opinion must not leak" });
  expect(scoring.status).toBe(200);

  const comparison = await request(runtime.app).post(`/api/projects/${projectId}/comparison-report`).set("x-mock-user-id", "u2");
  expect(comparison.status).toBe(201);

  const report = await request(runtime.app).post(`/api/projects/${projectId}/review-report`).set("x-mock-user-id", "u2").send({ note: "M4-C review report" });
  expect(report.status).toBe(201);

  const frozen = await request(runtime.app).post(`/api/projects/${projectId}/review-report/freeze`).set("x-mock-user-id", "u2");
  expect(frozen.status).toBe(200);

  const award = await request(runtime.app)
    .post(`/api/projects/${projectId}/award-approvals`)
    .set("x-mock-user-id", "u2")
    .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "M4-C expert score leads" });
  expect(award.status).toBe(201);
  expect(Object.keys(award.body).sort()).toEqual(["approval", "auditLogId"]);
  const awardId = award.body.approval.id as string;

  const submitted = await request(runtime.app).post(`/api/award-approvals/${awardId}/submit`).set("x-mock-user-id", "u2");
  expect(submitted.status).toBe(200);
  expect(Object.keys(submitted.body).sort()).toEqual(["adapterLog", "approval", "auditLogId", "workflow"]);

  const approved = await request(runtime.app)
    .post(`/api/workflow/approval-instances/${submitted.body.workflow.approvalInstance.id}/actions`)
    .set("x-mock-user-id", "u1")
    .send({ action: "approve", opinion: "M4-C approval opinion must not leak" });
  expect(approved.status).toBe(200);

  const notification = await request(runtime.app)
    .post(`/api/projects/${projectId}/result-notifications`)
    .set("x-mock-user-id", "u2")
    .send({ scope: "supplier_self", visibilityConfig: "supplier_self_only" });
  expect(notification.status).toBe(201);

  const pricing = await request(runtime.app).post(`/api/projects/${projectId}/pricing-reports`).set("x-mock-user-id", "u2");
  expect(pricing.status).toBe(201);

  const contract = await request(runtime.app)
    .post(`/api/projects/${projectId}/contracts`)
    .set("x-mock-user-id", "u2")
    .send({ supplierId: "sup-1", contractNo: "M4C-HT-001", amount: 10000 });
  expect(contract.status).toBe(201);
  expect(Object.keys(contract.body).sort()).toEqual(["auditLogId", "contract"]);

  return { projectId, assignmentId, awardId, contractId: contract.body.contract.id as string };
}

describe("M4-C review award processization", () => {
  it("seeds review_award and contract_preparation definitions as Process Layer tracking processes", () => {
    const runtime = boot();
    const definitions = all<{ process_code: string; source_type: string; source_json: string }>(
      runtime,
      "select process_code, source_type, source_json from process_definitions where process_code in ('review_award','contract_preparation') order by process_code"
    );
    expect(definitions.map((item) => item.process_code)).toEqual(["contract_preparation", "review_award"]);
    expect(definitions.every((item) => item.source_type === "process_layer")).toBe(true);
    expect(definitions.every((item) => JSON.parse(item.source_json).phase === "M4-C")).toBe(true);
  });

  it("tracks expert review, award approval, result publication and contract preparation without changing old response shapes", async () => {
    const runtime = boot();
    const { projectId, awardId } = await buildReviewAwardFlow(runtime);

    const reviewInstance = one<{ current_node_key: string; process_status: string; project_id: string }>(
      runtime,
      "select current_node_key, process_status, project_id from process_instances where business_type = 'review_award' and business_id = ?",
      projectId
    );
    expect(reviewInstance).toEqual({ current_node_key: "completed", process_status: "completed", project_id: projectId });

    const reviewEvents = all<{ event_code: string }>(
      runtime,
      "select event_code from process_events where business_type = 'review_award' and business_id = ? order by created_at",
      projectId
    ).map((row) => row.event_code);
    expect(reviewEvents).toEqual(
      expect.arrayContaining([
        "review_award.quote_locked",
        "review_award.expert_assignment_created",
        "review_award.expert_assignment_confirmed",
        "review_award.expert_score_submitted",
        "review_award.comparison_report_generated",
        "review_award.review_report_generated",
        "review_award.review_report_frozen",
        "review_award.award_approval_created",
        "review_award.award_approval_submitted",
        "review_award.award_approved",
        "review_award.result_notification_sent"
      ])
    );

    const reviewTasks = all<{ task_type: string; task_status: string; source_json: string }>(
      runtime,
      "select task_type, task_status, source_json from process_task_instances where business_type = 'review_award' and business_id = ?",
      projectId
    );
    expect(reviewTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_type: "review_award_expert_assignment", task_status: "completed" }),
        expect.objectContaining({ task_type: "review_award_expert_confirmation", task_status: "pending" }),
        expect.objectContaining({ task_type: "review_award_expert_scoring", task_status: "completed" }),
        expect.objectContaining({ task_type: "review_award_review_report", task_status: "completed" }),
        expect.objectContaining({ task_type: "review_award_approval_submit", task_status: "completed" }),
        expect.objectContaining({ task_type: "review_award_result_preparation", task_status: "completed" })
      ])
    );
    expect(reviewTasks.some((task) => JSON.parse(task.source_json).expertId === "exp-4")).toBe(true);

    const awardProcessEvents = runtime.ctx.processRepository
      .listProcessInstancesByBusiness("award_approval", awardId)
      .flatMap((instance) => runtime.ctx.processRepository.listProcessEventsByInstance(instance.id))
      .map((event) => event.eventCode);
    expect(awardProcessEvents).toEqual(["award_approval.submitted", "award_approval.approved"]);

    const contractInstance = one<{ current_node_key: string; process_status: string }>(
      runtime,
      "select current_node_key, process_status from process_instances where business_type = 'contract_preparation' and business_id = ?",
      projectId
    );
    expect(contractInstance).toEqual({ current_node_key: "contract_ready", process_status: "completed" });
    const contractEvents = all<{ event_code: string }>(
      runtime,
      "select event_code from process_events where business_type = 'contract_preparation' and business_id = ? order by created_at",
      projectId
    ).map((row) => row.event_code);
    expect(contractEvents).toEqual(
      expect.arrayContaining([
        "contract_preparation.award_approved",
        "contract_preparation.result_notification_sent",
        "contract_preparation.pricing_report_generated",
        "contract_preparation.contract_entry_created"
      ])
    );
  });

  it("keeps expert, supplier, finance, auditor and admin boundaries for M4-C process views", async () => {
    const runtime = boot();
    const { projectId } = await buildReviewAwardFlow(runtime);

    const buyerTimeline = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u2");
    expect(buyerTimeline.status).toBe(200);
    expect(buyerTimeline.body.processInstances).toHaveLength(1);
    expectNoSensitiveFields(buyerTimeline.body);

    const expertTimeline = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u7");
    expect(expertTimeline.status).toBe(200);
    expect(expertTimeline.body.processInstances).toHaveLength(1);
    expect(expertTimeline.body.tasks.every((task: { assigneeRoleId?: string }) => task.assigneeRoleId === "expert")).toBe(true);
    expectNoSensitiveFields(expertTimeline.body);

    const otherExpert = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u4");
    expect(otherExpert.status).toBe(200);
    expect(otherExpert.body.processInstances).toHaveLength(0);

    const supplier = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.processInstances).toHaveLength(0);

    const finance = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u9");
    expect(finance.status).toBe(200);
    expect(finance.body.processInstances).toHaveLength(0);

    const auditor = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u5");
    expect(auditor.status).toBe(200);
    expect(auditor.body.processInstances).toHaveLength(1);
    expect(auditor.body.tasks).toHaveLength(0);
    expectNoSensitiveFields(auditor.body);

    const admin = await request(runtime.app).get(`/api/process/business/review_award/${projectId}`).set("x-mock-user-id", "u6");
    expect(admin.status).toBe(200);
    expect(admin.body.processInstances).toHaveLength(0);
  });
});
