import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { SupplierRegistration } from "../src/types.js";

function boot() {
  const ctx = createAppContext();
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

async function createLockedDocument(runtime: ReturnType<typeof boot>, projectId = "p-pre") {
  const created = await request(runtime.app)
    .post(`/api/projects/${projectId}/procurement-documents`)
    .set("x-mock-user-id", "u2")
    .send({
      title: "Phase 2 Procurement Document",
      contentSummary: "document metadata only",
      attachmentMetadata: [{ fileName: "phase2-document.pdf", sizeBytes: 128 }]
    });
  expect(created.status).toBe(201);

  const published = await request(runtime.app).post(`/api/procurement-documents/${created.body.procurementDocument.id}/publish`).set("x-mock-user-id", "u2");
  expect(published.status).toBe(200);
  return published.body.procurementDocument;
}

async function createPublishedAnnouncement(runtime: ReturnType<typeof boot>, projectId = "p-pre", supplierIds: string[] = ["sup-1"]) {
  const document = await createLockedDocument(runtime, projectId);
  const announcement = await request(runtime.app)
    .post(`/api/projects/${projectId}/announcements`)
    .set("x-mock-user-id", "u2")
    .send({
      documentId: document.id,
      title: "Phase 2 Supplier Registration",
      scope: "public_internal",
      registrationDeadlineAt: "2099-12-20T17:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T17:00:00.000Z"
    });
  expect(announcement.status).toBe(201);

  const published = await request(runtime.app)
    .post(`/api/announcements/${announcement.body.announcement.id}/publish`)
    .set("x-mock-user-id", "u2")
    .send({ supplierIds });
  expect(published.status).toBe(200);
  return published.body.announcement;
}

describe("Phase 2 procurement documents, announcements and supplier registration", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("locks procurement documents after publish and creates a new version on later edits", async () => {
    const initialDocumentCount = runtime.ctx.state.procurementDocuments.length;
    const locked = await createLockedDocument(runtime);
    expect(locked.status).toBe("locked");
    expect(locked.reviewStatus).toBe("approved");
    expect(locked.lockedAt).toEqual(expect.any(String));

    const revision = await request(runtime.app)
      .patch(`/api/procurement-documents/${locked.id}`)
      .set("x-mock-user-id", "u2")
      .send({ title: "Phase 2 Procurement Document Revision", contentSummary: "new controlled version" });

    expect(revision.status).toBe(201);
    expect(revision.body.procurementDocument.versionNo).toBe(locked.versionNo + 1);
    expect(revision.body.procurementDocument.previousDocumentId).toBe(locked.id);
    expect(revision.body.previousDocument.status).toBe("locked");
    expect(runtime.ctx.state.procurementDocuments).toHaveLength(initialDocumentCount + 2);
  });

  it("denies internal procurement documents and announcements on external trade projects", async () => {
    const document = await request(runtime.app)
      .post("/api/projects/p-ext/procurement-documents")
      .set("x-mock-user-id", "u2")
      .send({ title: "Should be blocked" });
    expectDenied(document, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["Should be blocked"]);

    runtime.ctx.state.procurementDocuments.push({
      id: "pd-ext-locked",
      projectId: "p-ext",
      title: "External locked placeholder",
      versionNo: 1,
      status: "locked",
      reviewStatus: "approved",
      contentSummary: "external blocked",
      attachmentMetadata: [],
      createdBy: "u2",
      createdAt: "2026-06-23T00:00:00.000Z",
      updatedAt: "2026-06-23T00:00:00.000Z",
      publishedAt: "2026-06-23T00:00:00.000Z",
      lockedAt: "2026-06-23T00:00:00.000Z"
    });
    const announcement = await request(runtime.app)
      .post("/api/projects/p-ext/announcements")
      .set("x-mock-user-id", "u2")
      .send({ documentId: "pd-ext-locked", title: "Blocked announcement" });
    expectDenied(announcement, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["Blocked announcement"]);
  });

  it("creates announcement, invitation notification records and audit logs", async () => {
    const initialInvitationCount = runtime.ctx.state.supplierInvitations.length;
    const document = await createLockedDocument(runtime);
    const created = await request(runtime.app)
      .post("/api/projects/p-pre/announcements")
      .set("x-mock-user-id", "u2")
      .send({ documentId: document.id, title: "Registration Announcement", scope: "invited_suppliers" });
    expect(created.status).toBe(201);
    expect(created.body.auditLogId).toMatch(/^audit-/);

    const published = await request(runtime.app)
      .post(`/api/announcements/${created.body.announcement.id}/publish`)
      .set("x-mock-user-id", "u2")
      .send({ supplierIds: ["sup-1", "sup-2"] });

    expect(published.status).toBe(200);
    expect(published.body.announcement.status).toBe("published");
    expect(published.body.invitations).toHaveLength(2);
    expect(runtime.ctx.state.supplierInvitations).toHaveLength(initialInvitationCount + 2);
    expect(runtime.ctx.state.auditLogs.some((item) => item.action === "announcement.publish")).toBe(true);
  });

  it("covers PDF inquiry sheet, structured announcement rules, clarification attachments and project samples", async () => {
    const document = await createLockedDocument(runtime);
    const inquiry = await request(runtime.app)
      .post("/api/projects/p-pre/inquiry-sheets")
      .set("x-mock-user-id", "u2")
      .send({
        title: "PDF 1:1 独立询价单",
        supplierIds: ["sup-1"],
        maxRounds: 2,
        quoteRuleConfig: { taxIncluded: true, allowAlternativeBrand: false, priceVisibleAfterDeadline: false, requireDeliveryDays: true },
        deadlineAt: "2099-12-31T17:00:00.000Z"
      });
    expect(inquiry.status).toBe(201);
    expect(inquiry.body.inquirySheet.maxRounds).toBe(2);

    const publishedInquiry = await request(runtime.app).post(`/api/inquiry-sheets/${inquiry.body.inquirySheet.id}/publish`).set("x-mock-user-id", "u2");
    expect(publishedInquiry.status).toBe(200);
    expect(publishedInquiry.body.inquirySheet.status).toBe("published");

    const secondRound = await request(runtime.app)
      .post(`/api/inquiry-sheets/${inquiry.body.inquirySheet.id}/rounds`)
      .set("x-mock-user-id", "u2")
      .send({ roundNo: 2, deadlineAt: "2099-12-25T17:00:00.000Z", quoteRuleConfig: { taxIncluded: true, allowAlternativeBrand: true } });
    expect(secondRound.status).toBe(200);
    expect(secondRound.body.inquirySheet.currentRound).toBe(2);

    const priced = await request(runtime.app)
      .post(`/api/inquiry-sheets/${inquiry.body.inquirySheet.id}/pricing`)
      .set("x-mock-user-id", "u2")
      .send({ selectedSupplierId: "sup-1", pricingMethod: "lowest_valid_quote", decisionSummary: "PDF 1:1 询价定价" });
    expect(priced.status).toBe(200);
    expect(priced.body.inquirySheet.status).toBe("priced");

    const supplierInquiry = await request(runtime.app).get("/api/inquiry-sheets").set("x-mock-user-id", "u12");
    expect(supplierInquiry.status).toBe(200);
    expect(supplierInquiry.body.inquirySheets.some((item: { id: string }) => item.id === inquiry.body.inquirySheet.id)).toBe(true);

    const announcement = await request(runtime.app)
      .post("/api/projects/p-pre/announcements")
      .set("x-mock-user-id", "u2")
      .send({
        documentId: document.id,
        title: "PDF 1:1 招标公告",
        scope: "public_internal",
        noticeTemplateCode: "PDF_NOTICE_TEMPLATE",
        supplierInstructions: "须按必传文件和答疑补遗应标",
        evaluationMethod: "综合评分法",
        requiredFileRules: [{ id: "tech", name: "技术响应", required: true, fileType: "pdf" }],
        abandonmentRules: { allowedBeforeDeadline: true, reasonRequired: true, noticeScope: "buyer_only" },
        sampleRules: { required: true, receiveLocation: "样品间", returnRequired: true }
      });
    expect(announcement.status).toBe(201);
    expect(announcement.body.announcement.requiredFileRules[0].name).toBe("技术响应");
    expect(announcement.body.announcement.sampleRules.required).toBe(true);

    const published = await request(runtime.app)
      .post(`/api/announcements/${announcement.body.announcement.id}/publish`)
      .set("x-mock-user-id", "u2")
      .send({ supplierIds: ["sup-1"] });
    expect(published.status).toBe(200);

    const asked = await request(runtime.app)
      .post("/api/projects/p-pre/clarifications")
      .set("x-mock-user-id", "u12")
      .send({
        question: "是否必须寄送样品？",
        visibility: "public_to_invited",
        questionAttachments: [{ fileName: "clarification-question.txt", contentType: "text/plain", contentBase64: Buffer.from("question", "utf8").toString("base64") }]
      });
    expect(asked.status).toBe(201);
    expect(asked.body.clarification.questionAttachments[0].id).toMatch(/^file-/);
    expect(asked.body.clarification.notificationTrace.adapterStatus).toBe("local_message_recorded");

    const answered = await request(runtime.app)
      .post(`/api/projects/p-pre/clarifications/${asked.body.clarification.id}/answer`)
      .set("x-mock-user-id", "u2")
      .send({
        answer: "必须寄送样品并保留退样记录。",
        visibility: "public_to_invited",
        answerAttachments: [{ fileName: "clarification-answer.txt", contentType: "text/plain", contentBase64: Buffer.from("answer", "utf8").toString("base64") }]
      });
    expect(answered.status).toBe(200);
    expect(answered.body.clarification.status).toBe("answered");
    expect(answered.body.clarification.answerAttachments[0].id).toMatch(/^file-/);

    const sample = await request(runtime.app)
      .post("/api/projects/p-pre/samples")
      .set("x-mock-user-id", "u2")
      .send({
        supplierId: "sup-1",
        sampleName: "样品套装",
        quantity: 2,
        returnRequired: true,
        attachmentMetadata: [{ fileName: "sample-receipt.txt", contentType: "text/plain", contentBase64: Buffer.from("sample", "utf8").toString("base64") }]
      });
    expect(sample.status).toBe(201);
    expect(sample.body.sample.status).toBe("received");

    const returned = await request(runtime.app).post(`/api/project-samples/${sample.body.sample.id}/return`).set("x-mock-user-id", "u2").send({ handlingNote: "评审后退回" });
    expect(returned.status).toBe(200);
    expect(returned.body.sample.status).toBe("returned");
  });

  it("blocks restricted and unauthorized suppliers during registration", async () => {
    const announcement = await createPublishedAnnouncement(runtime, "p-pre", ["sup-1", "sup-2"]);

    const supplier = runtime.ctx.state.suppliers.find((item) => item.id === "sup-1");
    expect(supplier).toBeTruthy();
    supplier!.admissionStatus = "restricted";
    runtime.ctx.r3SupplierProductRepository.upsertSupplier(supplier!);
    const restricted = await request(runtime.app)
      .post(`/api/announcements/${announcement.id}/registrations`)
      .set("x-mock-user-id", "u3")
      .send({ materialMetadata: [{ fileName: "restricted.pdf" }] });
    expectDenied(restricted, "SUPPLIER_RESTRICTED", ["restricted.pdf"]);

    supplier!.admissionStatus = "admitted";
    supplier!.categoryAuthorizations = [{ category: "客房布草", status: "active", authorizedAt: "2026-06-01T00:00:00.000Z" }];
    runtime.ctx.r3SupplierProductRepository.upsertSupplier(supplier!);
    const unauthorized = await request(runtime.app)
      .post(`/api/announcements/${announcement.id}/registrations`)
      .set("x-mock-user-id", "u3")
      .send({ materialMetadata: [{ fileName: "wrong-category.pdf" }] });
    expectDenied(unauthorized, "SUPPLIER_CATEGORY_NOT_AUTHORIZED", ["wrong-category.pdf"]);

    supplier!.categoryAuthorizations = [{ category: "客房一次性用品", status: "active", authorizedAt: "2026-06-01T00:00:00.000Z", expiresAt: "2020-01-01T00:00:00.000Z" }];
    runtime.ctx.r3SupplierProductRepository.upsertSupplier(supplier!);
    const expired = await request(runtime.app)
      .post(`/api/announcements/${announcement.id}/registrations`)
      .set("x-mock-user-id", "u3")
      .send({ materialMetadata: [{ fileName: "expired-category.pdf" }] });
    expectDenied(expired, "SUPPLIER_CATEGORY_NOT_AUTHORIZED", ["expired-category.pdf"]);
  });

  it("keeps supplier registration list scoped to the current supplier only", async () => {
    const announcement = await createPublishedAnnouncement(runtime, "p-pre", ["sup-1"]);
    const submitted = await request(runtime.app)
      .post(`/api/announcements/${announcement.id}/registrations`)
      .set("x-mock-user-id", "u3")
      .send({ materialMetadata: [{ fileName: "own-material.pdf", sizeBytes: 512 }] });
    expect(submitted.status).toBe(201);

    const otherRegistration: SupplierRegistration = {
      id: "reg-other",
      projectId: "p-pre",
      announcementId: announcement.id,
      supplierId: "sup-2",
      status: "submitted",
      materialMetadata: [{ id: "att-other", fileName: "other-secret.pdf", contentType: "application/pdf", sizeBytes: 256, uploadedAt: "2026-06-23T00:00:00.000Z" }],
      submittedAt: "2026-06-23T00:00:00.000Z"
    };
    runtime.ctx.state.supplierRegistrations.push(otherRegistration);

    const list = await request(runtime.app).get("/api/registrations").set("x-mock-user-id", "u3");
    expect(list.status).toBe(200);
    expect(list.body.registrations.length).toBeGreaterThanOrEqual(1);
    expect(list.body.registrations.every((item: { supplierId: string }) => item.supplierId === "sup-1")).toBe(true);
    expect(list.body.registrations.some((item: { id: string }) => item.id === submitted.body.registration.id)).toBe(true);
    expect(list.text).not.toContain("other-secret.pdf");
  });

  it("stores registration materials and supplementary materials in the real file center", async () => {
    const announcement = await createPublishedAnnouncement(runtime, "p-pre", ["sup-1"]);
    const submitted = await request(runtime.app)
      .post(`/api/announcements/${announcement.id}/registrations`)
      .set("x-mock-user-id", "u3")
      .send({
        materialMetadata: [
          {
            fileName: "registration-main.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("registration-main", "utf8").toString("base64")
          }
        ],
        supplementMaterialMetadata: [
          {
            fileName: "registration-supplement.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("registration-supplement", "utf8").toString("base64")
          }
        ]
      });
    expect(submitted.status).toBe(201);
    expect(submitted.body.registration.materialMetadata[0].id).toMatch(/^file-/);
    expect(submitted.body.registration.supplementMaterialMetadata[0].id).toMatch(/^file-/);

    const mainDownload = await request(runtime.app)
      .get(`/api/files/${submitted.body.registration.materialMetadata[0].id}/download`)
      .set("x-mock-user-id", "u3");
    expect(mainDownload.status).toBe(200);
    expect(mainDownload.text).toBe("registration-main");

    const supplementDownload = await request(runtime.app)
      .get(`/api/files/${submitted.body.registration.supplementMaterialMetadata[0].id}/download`)
      .set("x-mock-user-id", "u3");
    expect(supplementDownload.status).toBe(200);
    expect(supplementDownload.text).toBe("registration-supplement");
  });

  it("keeps role menus aligned with the full MVP demo boundary", async () => {
    const buyer = await request(runtime.app).get("/api/me/menus").set("x-mock-user-id", "u2");
    expect(buyer.status).toBe(200);
    expect(buyer.body.menus).toEqual(expect.arrayContaining(["needs", "projects", "procurementDocuments", "announcements", "registrations", "bidSecrecy", "expertReview", "award", "contracts", "archives"]));

    const supplier = await request(runtime.app).get("/api/me/menus").set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.menus).toEqual(expect.arrayContaining(["projects", "suppliers", "supplierRegistration", "bidding", "contracts"]));
    expect(supplier.body.menus).not.toContain("needs");
    expect(supplier.body.menus).not.toContain("award");
    expect(supplier.body.menus).not.toContain("archives");

    const expert = await request(runtime.app).get("/api/me/menus").set("x-mock-user-id", "u4");
    expect(expert.status).toBe(200);
    expect(expert.body.menus).toEqual(expect.arrayContaining(["projects", "expertReview", "expertScoring"]));
    expect(expert.body.menus).not.toContain("bidding");
    expect(expert.body.menus).not.toContain("award");

    const admin = await request(runtime.app).get("/api/me/menus").set("x-mock-user-id", "u6");
    expect(admin.status).toBe(200);
    expect(admin.body.menus).toEqual(["dashboard", "admin"]);
  });
});
