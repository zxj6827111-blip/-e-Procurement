import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { SupplierInvitation, User } from "../src/types.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r4-"));
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

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: Array<string | number | null>) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: Array<string | number | null>) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) expect(response.text).not.toContain(token);
}

async function createRequestProject(runtime: ReturnType<typeof boot>) {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", "u2")
    .send({
      title: "R4 寻源主源采购申请",
      orgId: "org-hotel",
      requestDepartment: "客房部",
      requesterName: "R4 Buyer",
      category: "客房一次性用品",
      budgetLabel: "R4 预算",
      budgetAmount: 96000,
      purpose: "R4 采购寻源主源验证",
      expectedArrivalAt: "2026-07-20T00:00:00.000Z",
      receivingLocation: "酒店后勤仓",
      lineItems: [
        {
          id: "r4-req-line-1",
          itemName: "R4 客房拖鞋",
          category: "客房一次性用品",
          specification: "独立包装",
          quantity: 6000,
          unit: "双",
          estimatedUnitPrice: 8,
          budgetAmount: 48000,
          requiredByDate: "2026-07-18"
        },
        {
          id: "r4-req-line-2",
          itemName: "R4 洗护套装",
          category: "客房一次性用品",
          specification: "30ml",
          quantity: 6000,
          unit: "套",
          estimatedUnitPrice: 8,
          budgetAmount: 48000
        }
      ]
    });
  expect(created.status).toBe(201);

  const requestId = created.body.procurementRequest.id as string;
  const patched = await request(runtime.app)
    .patch(`/api/procurement-requests/${requestId}`)
    .set("x-mock-user-id", "u2")
    .send({ purpose: "R4 草稿编辑后提交", lineItems: created.body.procurementRequest.lineItems });
  expect(patched.status).toBe(200);

  const submitted = await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u2");
  expect(submitted.status).toBe(200);

  const lockedEdit = await request(runtime.app)
    .patch(`/api/procurement-requests/${requestId}`)
    .set("x-mock-user-id", "u2")
    .send({ lineItems: [{ itemName: "不应允许改明细", specification: "x", quantity: 1, unit: "项" }] });
  expect(lockedEdit.status).toBe(400);
  expect(lockedEdit.body.error.code).toBe("PROCUREMENT_REQUEST_LOCKED");

  const approved = await request(runtime.app)
    .post(`/api/procurement-requests/${requestId}/approve`)
    .set("x-mock-user-id", "u1")
    .send({ approved: true, opinion: "R4 approval" });
  expect(approved.status).toBe(200);

  const method = await request(runtime.app).post(`/api/procurement-requests/${requestId}/method-decision`).set("x-mock-user-id", "u2").send({ ruleId: "pmr-1" });
  expect(method.status).toBe(200);

  const project = await request(runtime.app)
    .post("/api/projects")
    .set("x-mock-user-id", "u2")
    .send({ requestId, name: "R4 寻源主源项目" });
  expect(project.status).toBe(201);

  return { requestId, projectId: project.body.project.id as string };
}

async function createLockedDocumentAndAnnouncement(runtime: ReturnType<typeof boot>, projectId: string, supplierIds: string[]) {
  const document = await request(runtime.app)
    .post(`/api/projects/${projectId}/procurement-documents`)
    .set("x-mock-user-id", "u2")
    .send({ title: "R4 采购文件", contentSummary: "R4 quote requirements", attachmentMetadata: [{ fileName: "r4-doc.pdf", sizeBytes: 128 }] });
  expect(document.status).toBe(201);

  const publishedDocument = await request(runtime.app).post(`/api/procurement-documents/${document.body.procurementDocument.id}/publish`).set("x-mock-user-id", "u2");
  expect(publishedDocument.status).toBe(200);

  const announcement = await request(runtime.app)
    .post(`/api/projects/${projectId}/announcements`)
    .set("x-mock-user-id", "u2")
    .send({
      documentId: publishedDocument.body.procurementDocument.id,
      title: "R4 寻源公告",
      scope: "invited_suppliers",
      registrationDeadlineAt: "2099-12-20T17:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T17:00:00.000Z"
    });
  expect(announcement.status).toBe(201);

  const published = await request(runtime.app)
    .post(`/api/announcements/${announcement.body.announcement.id}/publish`)
    .set("x-mock-user-id", "u2")
    .send({ supplierIds });
  expect(published.status).toBe(200);
  return published.body.announcement as { id: string };
}

describe("R4 sourcing procurement master-source migration", () => {
  it("writes procurement requests, sourcing projects, invitations and participations into R2/R4 formal tables", async () => {
    const runtime = boot();
    const { requestId, projectId } = await createRequestProject(runtime);

    expect(single<{ request_status: string; approval_status: string; project_id: string }>(
      runtime,
      "select request_status, approval_status, project_id from r2_procurement_requests where id = ?",
      requestId
    )).toEqual({ request_status: "project_created", approval_status: "approved", project_id: projectId });
    expect(all<{ id: string }>(runtime, "select id from r2_procurement_request_items where request_id = ? order by id", requestId)).toHaveLength(2);
    expect(all<{ id: string }>(runtime, "select id from r2_sourcing_project_items where project_id = ? order by id", projectId)).toHaveLength(2);
    expect(single<{ source_request_id: string; project_status: string }>(runtime, "select source_request_id, project_status from r2_sourcing_projects where id = ?", projectId)).toEqual({
      source_request_id: requestId,
      project_status: "project_created"
    });

    const auditorMutation = await request(runtime.app).post("/api/procurement-requests").set("x-mock-user-id", "u5").send({ title: "审计不应新增" });
    expectDenied(auditorMutation, "PHASE1_BUSINESS_ACTION_DENIED");

    const announcement = await createLockedDocumentAndAnnouncement(runtime, projectId, ["sup-1", "sup-4"]);
    expect(all<{ supplier_id: string }>(runtime, "select supplier_id from r2_supplier_invitations where project_id = ? order by supplier_id", projectId)).toEqual([
      { supplier_id: "sup-1" },
      { supplier_id: "sup-4" }
    ]);

    runtime.ctx.state.users.push({ id: "u-r4-restricted-supplier", name: "R4 Restricted Supplier", roleId: "supplier", orgId: "org-hotel", supplierId: "sup-4" });
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, true);
    const restricted = await request(runtime.app).post(`/api/announcements/${announcement.id}/registrations`).set("x-mock-user-id", "u-r4-restricted-supplier").send({ materialMetadata: [] });
    expectDenied(restricted, "SUPPLIER_RESTRICTED");

    const registration = await request(runtime.app)
      .post(`/api/announcements/${announcement.id}/registrations`)
      .set("x-mock-user-id", "u3")
      .send({ materialMetadata: [{ fileName: "r4-registration.pdf", sizeBytes: 256 }] });
    expect(registration.status).toBe(201);

    expect(single<{ participation_status: string; supplier_id: string }>(
      runtime,
      "select participation_status, supplier_id from r2_supplier_participations where id = ?",
      registration.body.registration.id
    )).toEqual({ participation_status: "submitted", supplier_id: "sup-1" });
    expect(single<{ invitation_status: string }>(
      runtime,
      "select invitation_status from r2_supplier_invitations where project_id = ? and supplier_id = ?",
      projectId,
      "sup-1"
    )?.invitation_status).toBe("registered");
  });

  it("writes bids, bid lines, response files and clarifications into formal tables with confidentiality and file permissions", async () => {
    const runtime = boot();
    const { projectId } = await createRequestProject(runtime);
    const announcement = await createLockedDocumentAndAnnouncement(runtime, projectId, ["sup-1"]);
    const registration = await request(runtime.app).post(`/api/announcements/${announcement.id}/registrations`).set("x-mock-user-id", "u3").send({ materialMetadata: [] });
    expect(registration.status).toBe(201);

    const question = await request(runtime.app)
      .post(`/api/projects/${projectId}/clarifications`)
      .set("x-mock-user-id", "u3")
      .send({ question: "R4 响应文件是否需要盖章？", visibility: "supplier_self" });
    expect(question.status).toBe(201);
    expect(single<{ clarification_status: string; supplier_id: string }>(
      runtime,
      "select clarification_status, supplier_id from r2_clarifications where id = ?",
      question.body.clarification.id
    )).toEqual({ clarification_status: "open", supplier_id: "sup-1" });

    const answer = await request(runtime.app)
      .post(`/api/projects/${projectId}/clarifications/${question.body.clarification.id}/answer`)
      .set("x-mock-user-id", "u2")
      .send({ answer: "需要加盖企业公章。", visibility: "public_to_invited" });
    expect(answer.status).toBe(200);
    expect(single<{ clarification_status: string; answer: string }>(
      runtime,
      "select clarification_status, answer from r2_clarifications where id = ?",
      question.body.clarification.id
    )).toEqual({ clarification_status: "answered", answer: "需要加盖企业公章。" });

    const draft = await request(runtime.app)
      .post(`/api/projects/${projectId}/bids`)
      .set("x-mock-user-id", "u3")
      .send({
        lineItems: [
          { id: "r4-bid-line-1", itemName: "R4 客房拖鞋", quantity: 6000, unit: "双", unitPrice: 7.5, taxRate: 0.13, totalPrice: 45000, deliveryDays: 8 },
          { id: "r4-bid-line-2", itemName: "R4 洗护套装", quantity: 6000, unit: "套", unitPrice: 7.7, taxRate: 0.13, totalPrice: 46200, deliveryDays: 8 }
        ],
        taxRate: 0.13,
        taxInclusive: true,
        responseSummary: "R4 supplier response",
        responseFileMetadata: [
          {
            fileName: "r4-response.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("r4 response body", "utf8").toString("base64")
          }
        ]
      });
    expect(draft.status).toBe(201);
    const bidId = draft.body.bid.id as string;
    expect(single<{ bid_status: string; amount: number }>(runtime, "select bid_status, amount from r2_bids where id = ?", bidId)).toEqual({
      bid_status: "draft",
      amount: 91200
    });
    expect(all<{ id: string }>(runtime, "select id from r2_bid_line_items where bid_id = ? order by id", bidId)).toHaveLength(2);
    expect(all<{ file_name: string }>(runtime, "select file_name from r2_response_files where bid_id = ?", bidId)).toEqual([{ file_name: "r4-response.txt" }]);

    const submitted = await request(runtime.app).post(`/api/bids/${bidId}/submit`).set("x-mock-user-id", "u3");
    expect(submitted.status).toBe(200);
    expect(single<{ bid_status: string; version_no: number }>(runtime, "select bid_status, version_no from r2_bids where id = ?", bidId)).toEqual({
      bid_status: "submitted",
      version_no: 1
    });

    const buyerSummary = await request(runtime.app).get(`/api/projects/${projectId}/bids/summary`).set("x-mock-user-id", "u2");
    expect(buyerSummary.status).toBe(200);
    expect(buyerSummary.body.bids).toBeUndefined();
    expect(buyerSummary.text).not.toContain("91200");
    expect(buyerSummary.text).not.toContain("r4-response.txt");

    const otherUser: User = { id: "u-r4-other-supplier", name: "R4 Other Supplier", roleId: "supplier", orgId: "org-hotel", supplierId: "sup-2" };
    runtime.ctx.state.users.push(otherUser);
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, true);
    const deniedDownload = await request(runtime.app).get(`/api/files/${draft.body.bid.fileId}/download`).set("x-mock-user-id", "u-r4-other-supplier");
    expectDenied(deniedDownload, "SUPPLIER_BID_SCOPE_DENIED", ["r4 response body"]);

    const withdrawn = await request(runtime.app).post(`/api/bids/${bidId}/withdraw`).set("x-mock-user-id", "u3");
    expect(withdrawn.status).toBe(200);
    const resubmitted = await request(runtime.app)
      .post(`/api/bids/${bidId}/resubmit`)
      .set("x-mock-user-id", "u3")
      .send({
        amount: 90500,
        responseFileMetadata: [
          {
            fileName: "r4-response-v2.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("r4 response body v2", "utf8").toString("base64")
          }
        ]
      });
    expect(resubmitted.status).toBe(200);
    expect(single<{ bid_status: string; amount: number; version_no: number }>(runtime, "select bid_status, amount, version_no from r2_bids where id = ?", bidId)).toEqual({
      bid_status: "submitted",
      amount: 90500,
      version_no: 3
    });
    expect(all<{ file_name: string }>(runtime, "select file_name from r2_response_files where bid_id = ?", bidId)).toEqual([{ file_name: "r4-response-v2.txt" }]);
  });

  it("retains R4 request, project, participation, bid, response file and clarification data across API restart", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);
    const { requestId, projectId } = await createRequestProject(runtime1);
    const announcement = await createLockedDocumentAndAnnouncement(runtime1, projectId, ["sup-1"]);
    const registration = await request(runtime1.app).post(`/api/announcements/${announcement.id}/registrations`).set("x-mock-user-id", "u3").send({ materialMetadata: [] });
    expect(registration.status).toBe(201);
    const clarification = await request(runtime1.app)
      .post(`/api/projects/${projectId}/clarifications`)
      .set("x-mock-user-id", "u3")
      .send({ question: "R4 重启留存提问？" });
    expect(clarification.status).toBe(201);
    const bid = await request(runtime1.app)
      .post(`/api/projects/${projectId}/bids`)
      .set("x-mock-user-id", "u3")
      .send({
        amount: 88000,
        responseFileMetadata: [
          {
            fileName: "r4-persist.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("r4 persist body", "utf8").toString("base64")
          }
        ]
      });
    expect(bid.status).toBe(201);
    await request(runtime1.app).post(`/api/bids/${bid.body.bid.id}/submit`).set("x-mock-user-id", "u3");

    const runtime2 = boot(dataRoot);
    expect(single<{ title: string }>(runtime2, "select title from r2_procurement_requests where id = ?", requestId)?.title).toBe("R4 寻源主源采购申请");
    expect(single<{ project_name: string }>(runtime2, "select project_name from r2_sourcing_projects where id = ?", projectId)?.project_name).toBe("R4 寻源主源项目");
    expect(single<{ participation_status: string }>(
      runtime2,
      "select participation_status from r2_supplier_participations where id = ?",
      registration.body.registration.id
    )?.participation_status).toBe("submitted");
    expect(single<{ bid_status: string }>(runtime2, "select bid_status from r2_bids where id = ?", bid.body.bid.id)?.bid_status).toBe("submitted");
    expect(single<{ question: string }>(runtime2, "select question from r2_clarifications where id = ?", clarification.body.clarification.id)?.question).toBe("R4 重启留存提问？");

    const projectDetail = await request(runtime2.app).get(`/api/projects/${projectId}`).set("x-mock-user-id", "u2");
    expect(projectDetail.status).toBe(200);
    expect(projectDetail.body.project.sourceLineItems).toHaveLength(2);

    const supplierSummary = await request(runtime2.app).get(`/api/projects/${projectId}/bids/summary`).set("x-mock-user-id", "u3");
    expect(supplierSummary.status).toBe(200);
    expect(supplierSummary.body.bids.some((item: { id: string }) => item.id === bid.body.bid.id)).toBe(true);

    const download = await request(runtime2.app).get(`/api/files/${bid.body.bid.fileId}/download`).set("x-mock-user-id", "u3");
    expect(download.status).toBe(200);
    expect(download.text).toBe("r4 persist body");

    const invitations = all<SupplierInvitation>(runtime2, "select * from r2_supplier_invitations where project_id = ?", projectId);
    expect(invitations.length).toBeGreaterThanOrEqual(1);
  });
});
