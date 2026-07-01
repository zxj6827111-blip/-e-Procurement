import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { ExpertAssignment, ScoringSheet } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-eight-role-"));
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

function requestPayload(title: string) {
  return {
    title,
    orgId: "org-hotel",
    requestDepartment: "hotel ops",
    requesterName: "requester",
    category: "amenity",
    budgetLabel: "demo budget",
    budgetAmount: 3600,
    lineItems: [{ itemName: "amenity kit", specification: "standard", quantity: 100, unit: "set", budgetAmount: 3600 }]
  };
}

async function createAndSubmit(runtime: ReturnType<typeof boot>, userId: string, title: string) {
  const created = await request(runtime.app).post("/api/procurement-requests").set("x-mock-user-id", userId).send(requestPayload(title));
  expect(created.status).toBe(201);
  const requestId = created.body.procurementRequest.id as string;
  const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", userId);
  expect(submitted.status).toBe(200);
  return { requestId, workflowTaskId: submitted.body.workflow.task.id as string };
}

describe("Eight-role procurement flow regression", () => {
  it("blocks procurement request self approval and lets authorized roles approve within org scope", async () => {
    const runtime = boot();
    const buyerCreate = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send(requestPayload("buyer should not create request"));
    expect(buyerCreate.status).toBe(403);
    expect(buyerCreate.body.error.code).toBe("PROCUREMENT_REQUEST_INITIATOR_REQUIRED");

    const buyerRequest = await createAndSubmit(runtime, "u8", "self approval must fail");

    const selfApproval = await request(runtime.app)
      .post(`/api/procurement-requests/${buyerRequest.requestId}/approve`)
      .set("x-mock-user-id", "u2")
      .send({ approved: true });
    expect(selfApproval.status).toBe(403);
    expect(selfApproval.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const managerApproval = await request(runtime.app)
      .post(`/api/procurement-requests/${buyerRequest.requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true, opinion: "manager approved" });
    expect(managerApproval.status).toBe(200);
    expect(managerApproval.body.procurementRequest.approvalStatus).toBe("approved");

    const hotelRequest = await createAndSubmit(runtime, "u8", "hotel request requires group approval");

    const hotelSelfApproval = await request(runtime.app)
      .post(`/api/procurement-requests/${hotelRequest.requestId}/approve`)
      .set("x-mock-user-id", "u8")
      .send({ approved: true });
    expect(hotelSelfApproval.status).toBe(403);
    expect(hotelSelfApproval.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const managerList = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u1");
    expect(managerList.status).toBe(200);
    expect(managerList.body.procurementRequests.map((item: { id: string }) => item.id)).toContain(hotelRequest.requestId);

    const managerTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u1");
    expect(managerTasks.status).toBe(200);
    expect(managerTasks.body.tasks.map((item: { id: string }) => item.id)).toContain(hotelRequest.workflowTaskId);

    const buyerApproval = await request(runtime.app)
      .post(`/api/procurement-requests/${hotelRequest.requestId}/approve`)
      .set("x-mock-user-id", "u2")
      .send({ approved: true, opinion: "buyer should not approve group task" });
    expect(buyerApproval.status).toBe(403);
    expect(buyerApproval.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const groupApproval = await request(runtime.app)
      .post(`/api/procurement-requests/${hotelRequest.requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true, opinion: "group approved hotel request" });
    expect(groupApproval.status).toBe(200);
    expect(groupApproval.body.procurementRequest.approvalStatus).toBe("approved");

    const method = await request(runtime.app).post(`/api/procurement-requests/${hotelRequest.requestId}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-2" });
    expect(method.status).toBe(200);
    expect(method.body.procurementRequest.status).toBe("method_decided");
  });

  it("lets request stakeholders read pre-project attachments without exposing them to unrelated roles", async () => {
    const runtime = boot();
    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u8")
      .send({
        originalName: "REQ-004-request-detail.doc",
        contentType: "application/msword",
        contentBase64: Buffer.from("hotel request doc", "utf8").toString("base64"),
        attachmentKind: "procurement_request_attachment",
        objectType: "procurement_request",
        objectId: "pending-request-regression"
      });
    expect(uploaded.status).toBe(201);

    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        ...requestPayload("hotel request attachment review"),
        attachments: [uploaded.body.file]
      });
    expect(created.status).toBe(201);
    const requestId = created.body.procurementRequest.id as string;
    expect(created.body.procurementRequest.attachments[0].id).toBe(uploaded.body.file.id);

    const creatorDownload = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u8");
    expect(creatorDownload.status).toBe(200);
    expect(creatorDownload.text).toBe("hotel request doc");

    const buyerBeforeApprovalDownload = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(buyerBeforeApprovalDownload.status).toBe(403);

    const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);

    const listed = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u1");
    expect(listed.status).toBe(200);
    const reviewTarget = listed.body.procurementRequests.find((item: { id: string }) => item.id === requestId);
    expect(reviewTarget.attachments[0].fileName).toBe("REQ-004-request-detail.doc");

    const groupDownload = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u1");
    expect(groupDownload.status).toBe(200);
    expect(groupDownload.text).toBe("hotel request doc");

    const approved = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true, opinion: "attachment approved" });
    expect(approved.status).toBe(200);

    const buyerDownload = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(buyerDownload.status).toBe(200);
    expect(buyerDownload.text).toBe("hotel request doc");

    for (const userId of ["u5", "u6", "u9", "u12", "u13"]) {
      const denied = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", userId);
      expect(denied.status).toBe(403);
    }

    const hiddenFromFinanceList = await request(runtime.app).get("/api/files").set("x-mock-user-id", "u9");
    expect(hiddenFromFinanceList.status).toBe(200);
    expect(hiddenFromFinanceList.body.files.map((item: { id: string }) => item.id)).not.toContain(uploaded.body.file.id);

    const supplierDenied = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u12");
    expect(supplierDenied.status).toBe(403);
  });

  it("rejects forged procurement request attachment metadata", async () => {
    const runtime = boot();
    const forged = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        ...requestPayload("forged attachment reference"),
        attachments: [{ id: "file-does-not-exist", fileName: "fake.pdf", contentType: "application/pdf", sizeBytes: 12 }]
      });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe("PROCUREMENT_REQUEST_ATTACHMENT_INVALID");
  });

  it("supports formal bid cutoff before locking, comparison, expert review and award approval", async () => {
    const runtime = boot();

    const cutoff = await request(runtime.app)
      .post("/api/projects/p-pre/bids/cutoff")
      .set("x-mock-user-id", "u2")
      .send({ action: "early_cutoff", reason: "UAT complete-flow verification" });
    expect(cutoff.status).toBe(200);
    expect(cutoff.body.beforeDeadline).toBe(false);

    const locked = await request(runtime.app).post("/api/projects/p-pre/bids/lock").set("x-mock-user-id", "u2");
    expect(locked.status).toBe(200);
    expect(locked.body.lockedCount).toBeGreaterThan(0);

    const assignment: ExpertAssignment = {
      id: "ea-eight-role-pre",
      projectId: "p-pre",
      expertId: "exp-1",
      method: "appointed",
      status: "confirmed",
      avoidanceConfirmed: true,
      disciplineConfirmed: true,
      confidentialityConfirmed: true,
      reason: "eight-role regression",
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString()
    };
    runtime.ctx.state.expertAssignments.push(assignment);
    runtime.ctx.r5ReviewAwardRepository.upsertExpertAssignment(assignment);
    const project = runtime.ctx.state.projects.find((item) => item.id === "p-pre")!;
    project.assignedExpertIds = Array.from(new Set([...project.assignedExpertIds, "exp-1"]));
    runtime.ctx.r4SourcingRepository.upsertProject(project);
    const scoringSheet: ScoringSheet = {
      id: "score-eight-role-pre",
      projectId: "p-pre",
      expertId: "exp-1",
      supplierId: "sup-1",
      templateId: "st-1",
      technical: 0,
      service: 0,
      price: 0,
      total: 0,
      status: "scoring",
      opinion: "",
      versionNo: 1,
      submittedAt: null,
      lockedAt: null
    };
    runtime.ctx.state.scoringSheets.push(scoringSheet);
    runtime.ctx.r5ReviewAwardRepository.upsertScoringSheet(scoringSheet);

    const scored = await request(runtime.app)
      .post("/api/scoring-sheets/score-eight-role-pre/submit-lock")
      .set("x-mock-user-id", "u4")
      .send({ technical: 45, service: 30, price: 20, opinion: "qualified after cutoff" });
    expect(scored.status).toBe(200);
    expect(scored.body.scoringSheet.status).toBe("submitted_locked");

    const comparison = await request(runtime.app).post("/api/projects/p-pre/comparison-report").set("x-mock-user-id", "u2");
    expect(comparison.status).toBe(201);
    expect(comparison.body.comparisonReport.comparisonRows.length).toBeGreaterThan(0);

    const reviewReport = await request(runtime.app).post("/api/projects/p-pre/review-report").set("x-mock-user-id", "u2");
    expect(reviewReport.status).toBe(201);
    const frozenReview = await request(runtime.app).post("/api/projects/p-pre/review-report/freeze").set("x-mock-user-id", "u2");
    expect(frozenReview.status).toBe(200);

    const award = await request(runtime.app)
      .post("/api/projects/p-pre/award-approvals")
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", nonLowestPriceReason: "expert score leads after cutoff" });
    expect(award.status).toBe(201);
    const awardId = award.body.approval.id as string;
    const submittedAward = await request(runtime.app).post(`/api/award-approvals/${awardId}/submit`).set("x-mock-user-id", "u2");
    expect(submittedAward.status).toBe(200);
    const approvedAward = await request(runtime.app).post(`/api/award-approvals/${awardId}/mock-approve`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(approvedAward.status).toBe(200);
    expect(approvedAward.body.approval.approvalStatus).toBe("approved");
  });

  it("lets the correct supplier fulfill hotel self-purchase orders and keeps supplier isolation", async () => {
    const runtime = boot();

    const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u8").send({ productId: "mp-amenity-kit", quantity: 10 });
    expect(cart.status).toBe(200);
    const order = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u8").send({ shippingAddress: "hotel warehouse", invoiceTitle: "hotel invoice" });
    expect(order.status).toBe(201);
    expect(order.body.order.supplierId).toBe("sup-2");

    const wrongSupplier = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u11");
    expect(wrongSupplier.status).toBe(403);
    expect(wrongSupplier.body.error.code).toBe("MALL_SUPPLIER_SCOPE_DENIED");

    const confirmed = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u14");
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.order.status).toBe("supplier_confirmed");

    const shipped = await request(runtime.app)
      .post(`/api/mall/orders/${order.body.order.id}/shipments`)
      .set("x-mock-user-id", "u14")
      .send({ carrier: "supplier delivery", trackingNo: "SUP2-UAT" });
    expect(shipped.status).toBe(201);
    expect(shipped.body.order.status).toBe("shipped");

    const received = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/receive`).set("x-mock-user-id", "u8");
    expect(received.status).toBe(200);
    expect(received.body.order.status).toBe("received");

    const captured = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/fund-ledger`).set("x-mock-user-id", "u13").send({ action: "capture" });
    expect(captured.status).toBe(200);
    expect(captured.body.order.paymentStatus).toBe("paid");

    const financeView = await request(runtime.app).get(`/api/mall/orders/${order.body.order.id}`).set("x-mock-user-id", "u9");
    expect(financeView.status).toBe(200);
    expect(financeView.body.order.paymentStatus).toBe("paid");
    expect(financeView.body.fundLedgerEntries.some((entry: { entryType: string }) => entry.entryType === "payment_capture")).toBe(true);
  });
});
