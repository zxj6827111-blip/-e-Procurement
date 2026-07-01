import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage3-"));
}

function boot(dataRoot?: string) {
  const ctx = createAppContext(
    dataRoot
      ? {
          runtime: {
            appEnv: "test",
            dataRoot,
            mockAuthEnabled: true
          }
        }
      : undefined
  );
  return { ctx, app: createApp(ctx) };
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

function seedSupplier(runtime: ReturnType<typeof boot>, supplierId: string, userId: string, category: string, registrationStatus: "submitted" | "qualified" = "qualified") {
  runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.participantSupplierIds.push(supplierId);
  runtime.ctx.state.users.push({ id: userId, name: `${supplierId} User`, roleId: "supplier", supplierId, orgId: "org-hotel" });
  runtime.ctx.state.suppliers.push({
    id: supplierId,
    name: `${supplierId} Supplier`,
    status: "admitted",
    admissionStatus: "admitted",
    categoryAuth: [category],
    categoryAuthorizations: [{ category, status: "active", authorizedAt: "2026-06-01T00:00:00.000Z" }],
    qualification: "valid",
    risk: "normal",
    evaluationScore: null
  });
  runtime.ctx.state.supplierRegistrations.push({
    id: `reg-p-pre-${supplierId}`,
    projectId: "p-pre",
    announcementId: "ann-pre-1",
    supplierId,
    status: registrationStatus,
    materialMetadata: [],
    submittedAt: "2026-06-21T15:30:00.000Z",
    ...(registrationStatus === "qualified"
      ? {
          qualifiedAt: "2026-06-21T16:30:00.000Z",
          qualificationReason: "测试供应商已通过报名资格审核"
        }
      : {})
  });
}

describe("Phase 3 bidding, locking and abnormal view approvals", () => {
  let runtime: ReturnType<typeof boot>;
  let dataRoot: string;

  beforeEach(() => {
    dataRoot = makeDataRoot();
    runtime = boot(dataRoot);
  });

  it("supports supplier bid draft, submit, withdraw, resubmit and version trace with real files", async () => {
    seedSupplier(runtime, "sup-new", "u-new-supplier", runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category);

    const draft = await request(runtime.app)
      .post("/api/projects/p-pre/bids")
      .set("x-mock-user-id", "u-new-supplier")
      .send({
        amount: 188800,
        taxRate: 0.13,
        taxInclusive: true,
        taxNote: "tax included",
        deliveryDays: 7,
        responseSummary: "phase3 supplier response",
        serviceCommitment: "7 days delivery",
        responseFileMetadata: [
          {
            fileName: "phase3-draft.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("phase3-draft-content", "utf8").toString("base64")
          }
        ]
      });
    expect(draft.status).toBe(201);
    expect(draft.body.bid.status).toBe("draft");
    expect(draft.body.bid.fileId).toMatch(/^file-/);
    expect(draft.body.bid.taxRate).toBe(0.13);

    const submitted = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/submit`).set("x-mock-user-id", "u-new-supplier");
    expect(submitted.status).toBe(200);
    expect(submitted.body.bid.status).toBe("submitted");
    expect(submitted.body.version.versionNo).toBe(1);

    const withdrawn = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/withdraw`).set("x-mock-user-id", "u-new-supplier");
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.bid.status).toBe("withdrawn");
    expect(withdrawn.body.version.versionNo).toBe(2);

    const resubmitted = await request(runtime.app)
      .post(`/api/bids/${draft.body.bid.id}/resubmit`)
      .set("x-mock-user-id", "u-new-supplier")
      .send({
        amount: 181000,
        responseSummary: "phase3 resubmitted",
        responseFileMetadata: [
          {
            fileName: "phase3-resubmit.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("phase3-resubmit-content", "utf8").toString("base64")
          }
        ]
      });
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.bid.status).toBe("submitted");
    expect(resubmitted.body.version.versionNo).toBe(3);
    expect(resubmitted.body.bid.responseSummary).toBe("phase3 resubmitted");

    const versions = await request(runtime.app).get(`/api/bids/${draft.body.bid.id}/versions`).set("x-mock-user-id", "u-new-supplier");
    expect(versions.status).toBe(200);
    expect(versions.body.versions).toHaveLength(3);
    expect(versions.body.versions[2].responseSummary).toBe("phase3 resubmitted");

    const download = await request(runtime.app).get(`/api/files/${resubmitted.body.bid.fileId}/download`).set("x-mock-user-id", "u-new-supplier");
    expect(download.status).toBe(200);
    expect(download.text).toBe("phase3-resubmit-content");
  });

  it("rechecks supplier admission before submitting an existing bid draft", async () => {
    seedSupplier(runtime, "sup-recheck", "u-recheck-supplier", runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category);

    const draft = await request(runtime.app)
      .post("/api/projects/p-pre/bids")
      .set("x-mock-user-id", "u-recheck-supplier")
      .send({ amount: 188800, responseSummary: "draft before admission revoked" });
    expect(draft.status).toBe(201);

    const supplier = runtime.ctx.state.suppliers.find((item) => item.id === "sup-recheck");
    expect(supplier).toBeTruthy();
    supplier!.admissionStatus = "inactive";
    supplier!.status = "inactive";
    supplier!.categoryAuthorizations = supplier!.categoryAuthorizations?.map((item) => ({ ...item, status: "suspended" }));
    runtime.ctx.r3SupplierProductRepository.upsertSupplier(supplier!);

    const submitted = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/submit`).set("x-mock-user-id", "u-recheck-supplier");
    expectDenied(submitted, "SUPPLIER_NOT_ADMITTED");
  });

  it("requires procurement qualification approval before supplier bidding", async () => {
    seedSupplier(runtime, "sup-pending", "u-pending-supplier", runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category, "submitted");

    const denied = await request(runtime.app)
      .post("/api/projects/p-pre/bids")
      .set("x-mock-user-id", "u-pending-supplier")
      .send({ amount: 188800, deliveryDays: 7, responseSummary: "should wait for qualification approval" });

    expectDenied(denied, "SUPPLIER_REGISTRATION_NOT_QUALIFIED", ["should wait for qualification approval"]);
    expect(runtime.ctx.state.bids.some((item) => item.projectId === "p-pre" && item.supplierId === "sup-pending")).toBe(false);
  });

  it("blocks bid update, submit and resubmit when registration qualification is revoked", async () => {
    seedSupplier(runtime, "sup-revoked", "u-revoked-supplier", runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category);

    const draft = await request(runtime.app)
      .post("/api/projects/p-pre/bids")
      .set("x-mock-user-id", "u-revoked-supplier")
      .send({ amount: 188800, deliveryDays: 7, responseSummary: "qualified draft" });
    expect(draft.status).toBe(201);

    const registration = runtime.ctx.state.supplierRegistrations.find((item) => item.projectId === "p-pre" && item.supplierId === "sup-revoked");
    expect(registration).toBeTruthy();
    registration!.status = "submitted";

    const update = await request(runtime.app)
      .patch(`/api/bids/${draft.body.bid.id}`)
      .set("x-mock-user-id", "u-revoked-supplier")
      .send({ amount: 177700, responseSummary: "should not update after revoke" });
    expectDenied(update, "SUPPLIER_REGISTRATION_NOT_QUALIFIED", ["should not update after revoke"]);

    const submit = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/submit`).set("x-mock-user-id", "u-revoked-supplier");
    expectDenied(submit, "SUPPLIER_REGISTRATION_NOT_QUALIFIED");

    registration!.status = "qualified";
    const submitted = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/submit`).set("x-mock-user-id", "u-revoked-supplier");
    expect(submitted.status).toBe(200);

    const withdrawn = await request(runtime.app).post(`/api/bids/${draft.body.bid.id}/withdraw`).set("x-mock-user-id", "u-revoked-supplier");
    expect(withdrawn.status).toBe(200);

    registration!.status = "rejected";
    const resubmit = await request(runtime.app)
      .post(`/api/bids/${draft.body.bid.id}/resubmit`)
      .set("x-mock-user-id", "u-revoked-supplier")
      .send({ amount: 166600, responseSummary: "should not resubmit after reject" });
    expectDenied(resubmit, "SUPPLIER_REGISTRATION_NOT_QUALIFIED", ["should not resubmit after reject"]);
  });

  it("records bid abandonment reason and exposes opening room security boundary", async () => {
    seedSupplier(runtime, "sup-abandon", "u-abandon-supplier", runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category);

    const abandoned = await request(runtime.app)
      .post("/api/projects/p-pre/bids/abandon")
      .set("x-mock-user-id", "u-abandon-supplier")
      .send({
        reason: "产能不足放弃应标",
        attachmentMetadata: [{ fileName: "abandon.txt", contentType: "text/plain", contentBase64: Buffer.from("abandon", "utf8").toString("base64") }]
      });
    expect(abandoned.status).toBe(201);
    expect(abandoned.body.bid.status).toBe("withdrawn");
    expect(abandoned.body.bid.abandonmentReason).toBe("产能不足放弃应标");
    expect(abandoned.body.version.reason).toBe("abandon");

    const supplierSummary = await request(runtime.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", "u-abandon-supplier");
    expect(supplierSummary.status).toBe(200);
    expect(supplierSummary.body.bids[0].abandonmentReason).toBe("产能不足放弃应标");

    const openingBefore = await request(runtime.app).get("/api/projects/p-pre/opening-room").set("x-mock-user-id", "u2");
    expect(openingBefore.status).toBe(200);
    expect(openingBefore.body.securityBoundary.caAdapterStatus).toBe("mock_boundary_only");
    expect(openingBefore.body.securityBoundary.encryptionBoundary).toContain("未接入真实 CA");

    const openingAfter = await request(runtime.app).get("/api/projects/p-award/opening-room").set("x-mock-user-id", "u2");
    expect(openingAfter.status).toBe(200);
    expect(openingAfter.body.beforeDeadline).toBe(false);
    expect(openingAfter.body.lockedCount).toBeGreaterThan(0);
  });

  it("keeps pre-deadline buyer summary desensitized while supplier sees only own bid", async () => {
    const buyerSummary = await request(runtime.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", "u2");
    expect(buyerSummary.status).toBe(200);
    expect(buyerSummary.body.submittedCount).toBe(1);
    expect(buyerSummary.body.effectiveSubmittedCount).toBe(1);
    expect(buyerSummary.body.bidProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplierId: "sup-1",
          status: "submitted"
        })
      ])
    );
    expect(buyerSummary.text).not.toContain("186000");
    expect(buyerSummary.text).not.toContain("responseFileMetadata");

    const supplierSummary = await request(runtime.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", "u3");
    expect(supplierSummary.status).toBe(200);
    expect(supplierSummary.body.bids).toHaveLength(1);
    expect(supplierSummary.body.bids[0].supplierId).toBe("sup-1");
    expect(supplierSummary.body.bids[0].amount).toBe(186000);
    expect(supplierSummary.text).not.toContain("179000");

    const buyerVersions = await request(runtime.app).get("/api/bids/bid-pre-1/versions").set("x-mock-user-id", "u2");
    expectDenied(buyerVersions, "BID_CONFIDENTIALITY_DENIED", ["186000", "file-pre-1"]);

    const buyerDirectDownload = await request(runtime.app).get("/api/files/file-pre-1/download").set("x-mock-user-id", "u2");
    expectDenied(buyerDirectDownload, "BID_CONFIDENTIALITY_DENIED", ["mock-file-content"]);
  });

  it("locks submitted bids after deadline action and prevents later modification", async () => {
    const earlyLock = await request(runtime.app).post("/api/projects/p-pre/bids/lock").set("x-mock-user-id", "u2");
    expectDenied(earlyLock, "BID_DEADLINE_NOT_REACHED", ["186000", "file-pre-1"]);

    runtime.ctx.state.bids.push({
      id: "bid-award-submitted",
      projectId: "p-award",
      supplierId: "sup-1",
      amount: 1260000,
      status: "submitted",
      submittedAt: "2026-06-17T18:00:00.000Z",
      quoteDeadlineAt: "2026-06-18T17:00:00.000Z",
      lockedAt: null,
      fileId: "file-award-submitted",
      fileName: "award-submitted.pdf"
    });

    const locked = await request(runtime.app).post("/api/projects/p-award/bids/lock").set("x-mock-user-id", "u2");
    expect(locked.status).toBe(200);
    expect(locked.body.project.status).toBe("bidding_locked");
    expect(locked.body.lockedCount).toBeGreaterThanOrEqual(1);

    const update = await request(runtime.app).patch("/api/bids/bid-award-submitted").set("x-mock-user-id", "u3").send({ amount: 100 });
    expectDenied(update, "BID_LOCKED", ["100"]);
  });

  it("keeps bid control access aligned with project execution visibility and reports safe progress counts", async () => {
    runtime.ctx.state.projects.push({
      id: "p-buyer-owned",
      code: "CG-BUYER-OWNED",
      sourceRequestId: "req-buyer-owned",
      name: "Buyer owned runtime project",
      orgId: "org-hotel",
      orgName: "上海滨江华礼酒店",
      type: "内部公开招采",
      status: "bidding_open",
      displayStatus: "bidding open",
      category: runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category,
      budgetLabel: "¥100,000",
      buyer: "刘明",
      attachments: [],
      sourceLineItems: [],
      quoteDeadlineAt: "2099-12-31T17:00:00.000Z",
      beforeDeadline: true,
      qualificationRequirements: [],
      quoteRequirements: [],
      deliveryRequirements: [],
      clarificationRecords: [],
      externalTradeFlag: false,
      participantSupplierIds: [],
      assignedExpertIds: []
    });
    runtime.ctx.state.supplierInvitations.push({
      id: "inv-buyer-owned-sup-1",
      projectId: "p-buyer-owned",
      announcementId: "ann-buyer-owned",
      supplierId: "sup-1",
      status: "sent",
      notificationStatus: "sent",
      notifiedAt: "2026-06-30T10:00:00.000Z",
      createdAt: "2026-06-30T10:00:00.000Z"
    });
    runtime.ctx.state.bids.push(
      {
        id: "bid-buyer-owned-draft",
        projectId: "p-buyer-owned",
        supplierId: "sup-1",
        amount: 99000,
        status: "draft",
        submittedAt: null,
        quoteDeadlineAt: "2099-12-31T17:00:00.000Z",
        lockedAt: null,
        fileId: "file-buyer-owned-draft",
        fileName: "draft.pdf"
      },
      {
        id: "bid-buyer-owned-submitted",
        projectId: "p-buyer-owned",
        supplierId: "sup-2",
        amount: 98000,
        status: "submitted",
        submittedAt: "2026-06-30T11:00:00.000Z",
        quoteDeadlineAt: "2099-12-31T17:00:00.000Z",
        lockedAt: null,
        fileId: "file-buyer-owned-submitted",
        fileName: "submitted.pdf"
      }
    );

    const summary = await request(runtime.app).get("/api/projects/p-buyer-owned/bids/summary").set("x-mock-user-id", "u2");

    expect(summary.status).toBe(200);
    expect(summary.body.draftCount).toBe(1);
    expect(summary.body.submittedCount).toBe(1);
    expect(summary.body.effectiveSubmittedCount).toBe(1);
    expect(summary.body.totalInvitedSuppliers).toBe(2);
    expect(summary.body.bidProgress).toHaveLength(2);
    expect(summary.text).not.toContain("99000");
    expect(summary.text).not.toContain("98000");

    const approval = await request(runtime.app)
      .post("/api/bid-view-approvals")
      .set("x-mock-user-id", "u2")
      .send({ projectId: "p-buyer-owned", targetSupplierId: "sup-1", viewContent: "response_file_metadata" });
    expect(approval.status).toBe(201);
  });

  it("generates and freezes comparison report after deadline", async () => {
    const generated = await request(runtime.app).post("/api/projects/p-award/comparison-report").set("x-mock-user-id", "u2");
    expect(generated.status).toBe(201);
    expect(generated.body.comparisonReport.comparisonRows.length).toBeGreaterThan(0);
    expect(generated.body.comparisonReport.recommendedSupplierId).toBe("sup-2");

    const frozen = await request(runtime.app).post("/api/projects/p-award/comparison-report/freeze").set("x-mock-user-id", "u2");
    expect(frozen.status).toBe(200);
    expect(frozen.body.comparisonReport.status).toBe("frozen");
    expect(frozen.body.comparisonReport.frozenAt).toEqual(expect.any(String));
  });

  it("enforces abnormal view approval object, content, validity and download limits", async () => {
    const supplierAttempt = await request(runtime.app)
      .post("/api/bid-view-approvals")
      .set("x-mock-user-id", "u3")
      .send({ projectId: "p-pre", targetSupplierId: "sup-1", viewContent: "amount" });
    expectDenied(supplierAttempt, "BID_VIEW_APPROVAL_ROLE_DENIED");

    const selfApproval = await request(runtime.app)
      .post("/api/bid-view-approvals")
      .set("x-mock-user-id", "u1")
      .send({ projectId: "p-pre", targetSupplierId: "sup-1", viewContent: "amount" });
    expect(selfApproval.status).toBe(201);
    await request(runtime.app).post(`/api/bid-view-approvals/${selfApproval.body.approval.id}/submit`).set("x-mock-user-id", "u1");
    const selfApproved = await request(runtime.app)
      .post(`/api/bid-view-approvals/${selfApproval.body.approval.id}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    expectDenied(selfApproved, "BID_VIEW_APPROVAL_SELF_APPROVAL_DENIED");

    const approval = await request(runtime.app)
      .post("/api/bid-view-approvals")
      .set("x-mock-user-id", "u2")
      .send({ projectId: "p-pre", targetSupplierId: "sup-1", viewContent: "response_file_download", allowDownload: false });
    expect(approval.status).toBe(201);

    await request(runtime.app).post(`/api/bid-view-approvals/${approval.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    const approved = await request(runtime.app)
      .post(`/api/bid-view-approvals/${approval.body.approval.id}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    expect(approved.status).toBe(200);

    const deniedDownload = await request(runtime.app)
      .get(`/api/bid-files/file-pre-1/download?approvalId=${approval.body.approval.id}`)
      .set("x-mock-user-id", "u2");
    expectDenied(deniedDownload, "BID_CONFIDENTIALITY_DENIED", ["mock-file-content"]);

    const metaApproval = await request(runtime.app)
      .post("/api/bid-view-approvals")
      .set("x-mock-user-id", "u2")
      .send({ projectId: "p-pre", targetSupplierId: "sup-1", viewContent: "response_file_metadata", allowDownload: false });
    const draftApproved = await request(runtime.app)
      .post(`/api/bid-view-approvals/${metaApproval.body.approval.id}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    expectDenied(draftApproved, "BID_VIEW_APPROVAL_STATUS_DENIED");

    await request(runtime.app).post(`/api/bid-view-approvals/${metaApproval.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app).post(`/api/bid-view-approvals/${metaApproval.body.approval.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true });

    const auditorValidate = await request(runtime.app)
      .post(`/api/bid-view-approvals/${metaApproval.body.approval.id}/validate`)
      .set("x-mock-user-id", "u5")
      .send({ supplierId: "sup-1", content: "response_file_metadata" });
    expectDenied(auditorValidate, "BID_VIEW_APPROVAL_OWNER_DENIED");

    const auditorViewCheck = await request(runtime.app)
      .post("/api/bid-files/file-pre-1/view-check")
      .set("x-mock-user-id", "u5")
      .send({ approvalId: metaApproval.body.approval.id, content: "response_file_metadata" });
    expectDenied(auditorViewCheck, "BID_CONFIDENTIALITY_DENIED", ["file-pre-1"]);

    const auditorDownload = await request(runtime.app)
      .get(`/api/bid-files/file-pre-1/download?approvalId=${metaApproval.body.approval.id}`)
      .set("x-mock-user-id", "u5");
    expectDenied(auditorDownload, "BID_CONFIDENTIALITY_DENIED", ["mock-file-content"]);

    const allowed = await request(runtime.app)
      .post(`/api/bid-view-approvals/${metaApproval.body.approval.id}/validate`)
      .set("x-mock-user-id", "u2")
      .send({ supplierId: "sup-1", content: "response_file_metadata" });
    expect(allowed.status).toBe(200);

    const content = await request(runtime.app).get(`/api/bid-view-approvals/${metaApproval.body.approval.id}/content`).set("x-mock-user-id", "u2");
    expect(content.status).toBe(200);
    expect(content.body.content.fileName).toMatch(/\.pdf$/);
    expect(content.text).not.toContain("186000");

    const logs = await request(runtime.app).get("/api/bid-view-logs").set("x-mock-user-id", "u5");
    expect(logs.status).toBe(200);
    expect(logs.body.bidViewLogs.some((item: { result: string }) => item.result === "allowed")).toBe(true);
  });

  it("blocks internal bid writes for external-trade projects", async () => {
    const external = await request(runtime.app)
      .post("/api/projects/p-ext/bids")
      .set("x-mock-user-id", "u3")
      .send({ amount: 1, fileName: "external-blocked.pdf" });
    expectDenied(external, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["external-blocked.pdf"]);

    runtime.ctx.state.projects.find((item) => item.id === "p-ext")!.participantSupplierIds.push("sup-1");
    runtime.ctx.state.bids.push({
      id: "bid-ext-dirty",
      projectId: "p-ext",
      supplierId: "sup-1",
      amount: 1,
      status: "submitted",
      submittedAt: "2026-06-20T10:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T17:00:00.000Z",
      lockedAt: null,
      fileId: "file-ext-dirty",
      fileName: "external-dirty.pdf"
    });

    const update = await request(runtime.app).patch("/api/bids/bid-ext-dirty").set("x-mock-user-id", "u3").send({ amount: 2 });
    expectDenied(update, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["external-dirty.pdf"]);

    const withdraw = await request(runtime.app).post("/api/bids/bid-ext-dirty/withdraw").set("x-mock-user-id", "u3");
    expectDenied(withdraw, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["external-dirty.pdf"]);
  });

  it("blocks internal qualification review for external-trade registrations", async () => {
    runtime.ctx.state.supplierRegistrations.push({
      id: "reg-ext-dirty",
      projectId: "p-ext",
      announcementId: "ann-ext-dirty",
      supplierId: "sup-4",
      status: "submitted",
      materialMetadata: [],
      submittedAt: "2026-06-20T10:00:00.000Z"
    });

    const qualify = await request(runtime.app)
      .post("/api/registrations/reg-ext-dirty/qualify")
      .set("x-mock-user-id", "u2")
      .send({ status: "qualified", reason: "should be blocked" });
    expectDenied(qualify, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["should be blocked"]);
  });

  it("persists bid data and uploaded response files across reboot", async () => {
    seedSupplier(runtime, "sup-new", "u-new-supplier", runtime.ctx.state.projects.find((item) => item.id === "p-pre")!.category);

    const created = await request(runtime.app)
      .post("/api/projects/p-pre/bids")
      .set("x-mock-user-id", "u-new-supplier")
      .send({
        amount: 150000,
        responseFileMetadata: [
          {
            fileName: "persist-stage3.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("persist-stage3-body", "utf8").toString("base64")
          }
        ]
      });
    expect(created.status).toBe(201);

    const runtime2 = boot(dataRoot);
    const summary = await request(runtime2.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", "u-new-supplier");
    expect(summary.status).toBe(200);
    expect(summary.body.bids.some((item: { fileId: string }) => item.fileId === created.body.bid.fileId)).toBe(true);

    const downloaded = await request(runtime2.app).get(`/api/files/${created.body.bid.fileId}/download`).set("x-mock-user-id", "u-new-supplier");
    expect(downloaded.status).toBe(200);
    expect(downloaded.text).toBe("persist-stage3-body");
  });
});
