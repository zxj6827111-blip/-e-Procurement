import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { internalProjectStatuses } from "../types.js";
import type {
  InquirySheet,
  InternalProjectStatus,
  ProcurementAnnouncement,
  ProcurementAnnouncementScope,
  ProcurementDocument,
  ProcurementDocumentAttachment,
  ProcurementProject,
  ProjectClarificationRecord,
  ProjectSampleReceipt,
  Supplier,
  SupplierCategoryAuthorization,
  SupplierRegistration
} from "../types.js";
import {
  isOrgReaderRole,
  isProcurementMaintainerRole,
  isSupplierQuotationRole,
  isSupplierRole,
  supplierIdMatches,
  userOrgScope
} from "../role-groups.js";
import { resolveAttachments } from "./file-helpers.js";

function denyResponse(
  ctx: AppContext,
  req: Request,
  res: Response,
  status: number,
  code: string,
  message: string,
  action: string,
  objectType: string,
  objectId: string,
  projectId?: string,
  reason = code
) {
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action,
    objectType,
    objectId,
    projectId,
    result: "denied",
    reason
  });
  return res.status(status).json({ error: { code, message, auditLogId: auditLog.id } });
}

function ensureProcurementMaintainer(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  if (isProcurementMaintainerRole(req.auth.roleId)) return true;
  denyResponse(
    ctx,
    req,
    res,
    403,
    "PHASE2_BUSINESS_ACTION_DENIED",
    "Only procurement business roles can maintain Phase 2 document, announcement and registration data.",
    "phase2.business-action.denied",
    objectType,
    objectId,
    undefined,
    `${req.auth.roleId} cannot maintain Phase 2 business data`
  );
  return false;
}

function ensureProject(ctx: AppContext, projectId: string, res: Response) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  return project;
}

function ensureDocument(ctx: AppContext, documentId: string, res: Response) {
  const document = ctx.state.procurementDocuments.find((item) => item.id === documentId);
  if (!document) {
    res.status(404).json({ error: { code: "PROCUREMENT_DOCUMENT_NOT_FOUND", message: "Procurement document does not exist." } });
    return null;
  }
  return document;
}

function ensureAnnouncement(ctx: AppContext, announcementId: string, res: Response) {
  const announcement = ctx.state.procurementAnnouncements.find((item) => item.id === announcementId);
  if (!announcement) {
    res.status(404).json({ error: { code: "ANNOUNCEMENT_NOT_FOUND", message: "Announcement does not exist." } });
    return null;
  }
  return announcement;
}

function canReadProject(req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer") return req.auth.user.managedProjectIds?.includes(project.id) ?? false;
  if (isOrgReaderRole(req.auth.roleId)) return userOrgScope(req.auth.user).includes(project.orgId);
  if (isSupplierRole(req.auth.roleId)) return project.participantSupplierIds.some((supplierId) => supplierIdMatches(req.auth.user, supplierId));
  if (req.auth.roleId === "expert") return project.assignedExpertIds.includes(req.auth.user.expertId ?? "");
  return req.auth.roleId === "admin";
}

function assertProjectReadable(ctx: AppContext, req: Request, res: Response, project: ProcurementProject) {
  if (req.auth.roleId === "admin") {
    ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  denyResponse(
    ctx,
    req,
    res,
    403,
    "PROJECT_SCOPE_DENIED",
    "Current user cannot access this project.",
    "phase2.project.scope.denied",
    "project",
    project.id,
    project.id,
    `role ${req.auth.roleId} cannot access project ${project.id}`
  );
  return false;
}

function ensureSupplier(ctx: AppContext, supplierId: string, res: Response) {
  ctx.r3SupplierProductRepository.syncSupplierState(ctx.state.suppliers);
  const supplier = ctx.state.suppliers.find((item) => item.id === supplierId);
  if (!supplier) {
    res.status(404).json({ error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier does not exist." } });
    return null;
  }
  return supplier;
}

function normalizedSupplier(supplier: Supplier) {
  const admissionStatus = supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted");
  const categoryAuthorizations: SupplierCategoryAuthorization[] =
    supplier.categoryAuthorizations ??
    supplier.categoryAuth.map((category) => ({
      category,
      status: admissionStatus === "restricted" ? ("suspended" as const) : ("active" as const),
      authorizedAt: "2026-06-01T00:00:00.000Z"
    }));
  return { ...supplier, admissionStatus, categoryAuthorizations };
}

function hasActiveCategoryAuthorization(supplier: Supplier, category: string) {
  const normalized = normalizedSupplier(supplier);
  if (normalized.admissionStatus !== "admitted") return false;
  const now = Date.now();
  return normalized.categoryAuthorizations.some((item) => {
    if (item.category !== category || item.status !== "active") return false;
    return item.expiresAt === undefined || new Date(item.expiresAt).getTime() >= now;
  });
}

function normalizeAttachments(raw: unknown, fallbackPrefix: string, now: string): ProcurementDocumentAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const input = (item ?? {}) as Record<string, unknown>;
    const size = Number(input.sizeBytes ?? 0);
    return {
      id: String(input.id ?? `${fallbackPrefix}-att-${index + 1}`),
      fileName: String(input.fileName ?? `attachment-${index + 1}.pdf`),
      contentType: String(input.contentType ?? "application/pdf"),
      sizeBytes: Number.isFinite(size) ? size : 0,
      uploadedAt: String(input.uploadedAt ?? now)
    };
  });
}

function methodSpecificFields(project: ProcurementProject, body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const nested = (input.methodFields ?? {}) as Record<string, unknown>;
  const pick = (key: string) => (input[key] !== undefined ? input[key] : nested[key]);
  const normalizedMethod = String(input.procurementMethod ?? nested.procurementMethod ?? project.type ?? "").toLowerCase();
  if (nested && Object.keys(nested).length > 0) {
    const result: Record<string, string | number | boolean | null> = {};
    if (input.procurementMethod !== undefined) result.procurementMethod = String(input.procurementMethod);
    if (normalizedMethod.includes("comparison") || normalizedMethod.includes("询价")) {
      result.priceRounds = Number(pick("priceRounds") ?? 1);
      result.deliveryWindow = pick("deliveryWindow") === undefined ? null : String(pick("deliveryWindow"));
      return result;
    }
    if (normalizedMethod.includes("selection") || normalizedMethod.includes("比选")) {
      result.presentationRequired = Boolean(pick("presentationRequired") ?? false);
      result.siteVisitRequired = Boolean(pick("siteVisitRequired") ?? false);
      return result;
    }
    result.bidBondRequired = Boolean(pick("bidBondRequired") ?? false);
    result.openingLocation = pick("openingLocation") === undefined ? null : String(pick("openingLocation"));
    return result;
  }
  const base: Record<string, string | number | boolean | null> = {};
  const method = String(input.procurementMethod ?? project.type ?? "").toLowerCase();
  if (input.procurementMethod !== undefined) base.procurementMethod = String(input.procurementMethod);
  if (method.includes("询价") || method.includes("comparison")) {
    base.priceRounds = Number(input.priceRounds ?? 1);
    base.deliveryWindow = input.deliveryWindow === undefined ? null : String(input.deliveryWindow);
  } else if (method.includes("比选")) {
    base.presentationRequired = Boolean(input.presentationRequired ?? false);
    base.siteVisitRequired = Boolean(input.siteVisitRequired ?? false);
  } else {
    base.bidBondRequired = Boolean(input.bidBondRequired ?? false);
    base.openingLocation = input.openingLocation === undefined ? null : String(input.openingLocation);
  }
  return base;
}

function normalizeRuleFiles(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [
      { id: "qualification", name: "资格证明文件", required: true, fileType: "pdf" },
      { id: "commercial", name: "商务响应文件", required: true, fileType: "pdf" },
      { id: "quotation", name: "报价文件", required: true, fileType: "pdf" }
    ];
  }
  return raw.map((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(record.id ?? `required-file-${index + 1}`),
      name: String(record.name ?? record.fileName ?? `必传文件 ${index + 1}`),
      required: record.required === undefined ? true : Boolean(record.required),
      fileType: record.fileType === undefined ? undefined : String(record.fileType)
    };
  });
}

function normalizeInquiryRuleConfig(raw: unknown): InquirySheet["quoteRuleConfig"] {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    taxIncluded: record.taxIncluded === undefined ? true : Boolean(record.taxIncluded),
    allowAlternativeBrand: Boolean(record.allowAlternativeBrand ?? false),
    priceVisibleAfterDeadline: record.priceVisibleAfterDeadline === undefined ? false : Boolean(record.priceVisibleAfterDeadline),
    requireDeliveryDays: record.requireDeliveryDays === undefined ? true : Boolean(record.requireDeliveryDays)
  };
}

function ensureInquiry(ctx: AppContext, inquiryId: string, res: Response) {
  const inquiry = ctx.state.inquirySheets.find((item) => item.id === inquiryId);
  if (!inquiry) {
    res.status(404).json({ error: { code: "INQUIRY_SHEET_NOT_FOUND", message: "Inquiry sheet does not exist." } });
    return null;
  }
  return inquiry;
}

function inquiryVisible(req: Request, project: ProcurementProject, inquiry: InquirySheet) {
  if (isSupplierRole(req.auth.roleId)) {
    const supplierId = req.auth.user.supplierId ?? "";
    return inquiry.supplierIds.includes(supplierId) || project.participantSupplierIds.includes(supplierId);
  }
  return canReadProject(req, project);
}

function ensureProjectSample(ctx: AppContext, sampleId: string, res: Response) {
  const sample = ctx.state.projectSampleReceipts.find((item) => item.id === sampleId);
  if (!sample) {
    res.status(404).json({ error: { code: "PROJECT_SAMPLE_NOT_FOUND", message: "Project sample receipt does not exist." } });
    return null;
  }
  return sample;
}

function advanceInternalProject(project: ProcurementProject, targetStatus: InternalProjectStatus, displayStatus: string) {
  if (project.externalTradeFlag) return;
  const currentIndex = internalProjectStatuses.indexOf(project.status as InternalProjectStatus);
  const targetIndex = internalProjectStatuses.indexOf(targetStatus);
  if (currentIndex >= 0 && targetIndex >= 0 && currentIndex < targetIndex) {
    project.status = targetStatus;
    project.displayStatus = displayStatus;
  }
}

function nextDocumentVersion(ctx: AppContext, projectId: string) {
  const versionNo = Math.max(0, ...ctx.state.procurementDocuments.filter((item) => item.projectId === projectId).map((item) => item.versionNo));
  return versionNo + 1;
}

function createRevision(ctx: AppContext, req: Request, source: ProcurementDocument, project: ProcurementProject) {
  const now = new Date().toISOString();
  const revisionId = `pd-${ctx.state.procurementDocuments.length + 1}`;
  const revision: ProcurementDocument = {
    id: revisionId,
    projectId: source.projectId,
    title: String(req.body?.title ?? source.title),
    versionNo: nextDocumentVersion(ctx, source.projectId),
    status: "draft",
    reviewStatus: "draft",
    contentSummary: String(req.body?.contentSummary ?? source.contentSummary),
    attachmentMetadata: resolveAttachments(ctx, req.body?.attachmentMetadata, {
      fallbackPrefix: revisionId,
      objectType: "procurement_document",
      objectId: revisionId,
      attachmentKind: "procurement_document",
      projectId: project.id,
      uploadedBy: req.auth.user.id
    }),
    previousDocumentId: source.id,
    createdBy: req.auth.user.id,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    lockedAt: null
  };
  if (revision.attachmentMetadata.length === 0) revision.attachmentMetadata = structuredClone(source.attachmentMetadata);
  ctx.state.procurementDocuments.push(revision);
  advanceInternalProject(project, "document_preparing", "document preparing");
  const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
    req.auth,
    "procurement-document.revision.create",
    "procurement_document",
    revision.id,
    project.id,
    `previous=${source.id}`
  );
  return { revision, auditLog };
}

function latestLockedDocument(ctx: AppContext, projectId: string) {
  return ctx.state.procurementDocuments
    .filter((item) => item.projectId === projectId && item.status === "locked")
    .sort((a, b) => b.versionNo - a.versionNo)[0];
}

function isAnnouncementVisibleToSupplier(ctx: AppContext, announcement: ProcurementAnnouncement, supplierId: string) {
  if (announcement.status !== "published") return false;
  const project = ctx.state.projects.find((item) => item.id === announcement.projectId);
  if (!project || project.externalTradeFlag) return false;
  if (announcement.scope === "public_internal") return true;
  return ctx.state.supplierInvitations.some((item) => item.announcementId === announcement.id && item.supplierId === supplierId);
}

function visibleAnnouncements(ctx: AppContext, req: Request) {
  if (req.auth.roleId === "admin") {
    ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "announcement", "list");
  }
  if (isSupplierRole(req.auth.roleId)) {
    const supplierId = req.auth.user.supplierId ?? "";
    return ctx.state.procurementAnnouncements.filter((item) => isAnnouncementVisibleToSupplier(ctx, item, supplierId));
  }
  return ctx.state.procurementAnnouncements.filter((announcement) => {
    const project = ctx.state.projects.find((item) => item.id === announcement.projectId);
    return project ? canReadProject(req, project) : false;
  });
}

function createInvitations(ctx: AppContext, req: Request, announcement: ProcurementAnnouncement, supplierIds: string[]) {
  const now = new Date().toISOString();
  const created = supplierIds
    .filter((supplierId, index, array) => supplierId && array.indexOf(supplierId) === index)
    .filter((supplierId) => !ctx.state.supplierInvitations.some((item) => item.announcementId === announcement.id && item.supplierId === supplierId))
    .map((supplierId) => ({
      id: `inv-${ctx.state.supplierInvitations.length + 1}-${supplierId}`,
      projectId: announcement.projectId,
      announcementId: announcement.id,
      supplierId,
      status: "sent" as const,
      notificationStatus: "sent" as const,
      notifiedAt: now,
      createdAt: now
    }));
  ctx.state.supplierInvitations.push(...created);
  for (const invitation of created) ctx.r4SourcingRepository.upsertSupplierInvitation(invitation);
  if (created.length > 0) {
    ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      "supplier-invitation.send",
      "announcement",
      announcement.id,
      announcement.projectId,
      `supplierCount=${created.length}`
    );
  }
  return created;
}

function visibleClarifications(project: ProcurementProject, req: Request) {
  const records = project.clarificationRecords ?? [];
  if (isSupplierRole(req.auth.roleId)) {
    const supplierId = req.auth.user.supplierId ?? "";
    return records.filter((record) => record.visibility === "public_to_invited" || record.supplierId === supplierId);
  }
  return records;
}

function ensureClarification(project: ProcurementProject, clarificationId: string, res: Response) {
  const record = (project.clarificationRecords ?? []).find((item) => item.id === clarificationId);
  if (!record) {
    res.status(404).json({ error: { code: "CLARIFICATION_NOT_FOUND", message: "Clarification does not exist." } });
    return null;
  }
  return record;
}

export function procurementParticipationRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/procurement-documents", (req, res) => {
    const documents = ctx.state.procurementDocuments.filter((document) => {
      const project = ctx.state.projects.find((item) => item.id === document.projectId);
      if (!project) return false;
      if (document.status === "voided") return false;
      if (isSupplierRole(req.auth.roleId)) {
        const supplierId = req.auth.user.supplierId ?? "";
        const hasVisibleAnnouncement = ctx.state.procurementAnnouncements.some(
          (announcement) => announcement.projectId === project.id && isAnnouncementVisibleToSupplier(ctx, announcement, supplierId)
        );
        return document.status === "locked" && (project.participantSupplierIds.includes(supplierId) || hasVisibleAnnouncement);
      }
      return canReadProject(req, project);
    });
    return res.json({ procurementDocuments: documents });
  });

  router.post("/projects/:projectId/procurement-documents", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_document", "new")) return;
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    const now = new Date().toISOString();
    const id = `pd-${ctx.state.procurementDocuments.length + 1}`;
    const document: ProcurementDocument = {
      id,
      projectId: project.id,
      title: String(req.body?.title ?? `${project.name} procurement document`),
      versionNo: nextDocumentVersion(ctx, project.id),
      status: "draft",
      reviewStatus: "draft",
      contentSummary: String(req.body?.contentSummary ?? ""),
      attachmentMetadata: resolveAttachments(ctx, req.body?.attachmentMetadata, {
        fallbackPrefix: id,
        objectType: "procurement_document",
        objectId: id,
        attachmentKind: "procurement_document",
        projectId: project.id,
        uploadedBy: req.auth.user.id
      }),
      createdBy: req.auth.user.id,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      lockedAt: null
    };
    ctx.state.procurementDocuments.push(document);
    advanceInternalProject(project, "document_preparing", "document preparing");
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-document.create", "procurement_document", document.id, project.id);
    return res.status(201).json({ procurementDocument: document, auditLogId: auditLog.id });
  });

  router.patch("/procurement-documents/:documentId", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_document", req.params.documentId)) return;
    const document = ensureDocument(ctx, req.params.documentId, res);
    if (!document) return;
    const project = ensureProject(ctx, document.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    if (document.status === "voided") {
      return denyResponse(ctx, req, res, 400, "PROCUREMENT_DOCUMENT_VOIDED", "Voided procurement documents cannot be revised directly.", "procurement-document.update.denied", "procurement_document", document.id, project.id);
    }
    if (document.status === "locked") {
      const { revision, auditLog } = createRevision(ctx, req, document, project);
      ctx.r4SourcingRepository.upsertProject(project);
      return res.status(201).json({ procurementDocument: revision, previousDocument: document, auditLogId: auditLog.id });
    }
    const now = new Date().toISOString();
    document.title = req.body?.title === undefined ? document.title : String(req.body.title);
    document.contentSummary = req.body?.contentSummary === undefined ? document.contentSummary : String(req.body.contentSummary);
    document.attachmentMetadata =
      req.body?.attachmentMetadata === undefined
        ? document.attachmentMetadata
        : resolveAttachments(ctx, req.body.attachmentMetadata, {
            fallbackPrefix: document.id,
            objectType: "procurement_document",
            objectId: document.id,
            attachmentKind: "procurement_document",
            projectId: project.id,
            uploadedBy: req.auth.user.id
          });
    document.updatedAt = now;
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-document.update", "procurement_document", document.id, project.id);
    return res.json({ procurementDocument: document, auditLogId: auditLog.id });
  });

  router.post("/procurement-documents/:documentId/void", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_document", req.params.documentId)) return;
    const document = ensureDocument(ctx, req.params.documentId, res);
    if (!document) return;
    const project = ensureProject(ctx, document.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    if (document.status === "voided") {
      return denyResponse(ctx, req, res, 400, "PROCUREMENT_DOCUMENT_ALREADY_VOIDED", "Procurement document is already voided.", "procurement-document.void.denied", "procurement_document", document.id, project.id);
    }
    document.status = "voided";
    document.reviewStatus = "voided";
    document.updatedAt = new Date().toISOString();
    const reason = String(req.body?.reason ?? "采购文件停用").trim() || "采购文件停用";
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-document.void", "procurement_document", document.id, project.id, reason);
    return res.json({ procurementDocument: document, auditLogId: auditLog.id });
  });

  router.post("/procurement-documents/:documentId/submit-review", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_document", req.params.documentId)) return;
    const document = ensureDocument(ctx, req.params.documentId, res);
    if (!document) return;
    const project = ensureProject(ctx, document.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    if (document.status === "voided") {
      return denyResponse(ctx, req, res, 400, "PROCUREMENT_DOCUMENT_VOIDED", "Voided procurement documents cannot be submitted.", "procurement-document.submit.denied", "procurement_document", document.id, project.id);
    }
    if (document.status === "locked") {
      return denyResponse(ctx, req, res, 400, "PROCUREMENT_DOCUMENT_LOCKED", "Published procurement documents are locked.", "procurement-document.submit.denied", "procurement_document", document.id, project.id);
    }
    document.status = "reviewing";
    document.reviewStatus = "submitted";
    document.updatedAt = new Date().toISOString();
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-document.submit-review", "procurement_document", document.id, project.id);
    return res.json({ procurementDocument: document, auditLogId: auditLog.id });
  });

  router.post("/procurement-documents/:documentId/publish", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_document", req.params.documentId)) return;
    const document = ensureDocument(ctx, req.params.documentId, res);
    if (!document) return;
    const project = ensureProject(ctx, document.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    if (document.status === "voided") {
      return denyResponse(ctx, req, res, 400, "PROCUREMENT_DOCUMENT_VOIDED", "Voided procurement documents cannot be published.", "procurement-document.publish.denied", "procurement_document", document.id, project.id);
    }
    const now = new Date().toISOString();
    document.status = "locked";
    document.reviewStatus = "approved";
    document.publishedAt = now;
    document.lockedAt = now;
    document.updatedAt = now;
    advanceInternalProject(project, "document_published", "document published");
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-document.publish-lock", "procurement_document", document.id, project.id);
    return res.json({ procurementDocument: document, auditLogId: auditLog.id });
  });

  router.post("/procurement-documents/:documentId/revisions", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_document", req.params.documentId)) return;
    const document = ensureDocument(ctx, req.params.documentId, res);
    if (!document) return;
    const project = ensureProject(ctx, document.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    const { revision, auditLog } = createRevision(ctx, req, document, project);
    return res.status(201).json({ procurementDocument: revision, previousDocument: document, auditLogId: auditLog.id });
  });

  router.get("/inquiry-sheets", (req, res) => {
    const inquiries = ctx.state.inquirySheets.filter((inquiry) => {
      const project = ctx.state.projects.find((item) => item.id === inquiry.projectId);
      return project ? inquiryVisible(req, project, inquiry) : false;
    });
    return res.json({ inquirySheets: inquiries });
  });

  router.get("/projects/:projectId/inquiry-sheets", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const inquirySheets = ctx.state.inquirySheets.filter((item) => item.projectId === project.id && inquiryVisible(req, project, item));
    return res.json({ inquirySheets });
  });

  router.post("/projects/:projectId/inquiry-sheets", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "inquiry_sheet", "new")) return;
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    const timestamp = new Date().toISOString();
    const supplierIds = Array.isArray(req.body?.supplierIds) ? req.body.supplierIds.map(String) : [...project.participantSupplierIds];
    const inquiry: InquirySheet = {
      id: `inq-${ctx.state.inquirySheets.length + 1}`,
      projectId: project.id,
      inquiryNo: String(req.body?.inquiryNo ?? `INQ-${project.code}-${ctx.state.inquirySheets.length + 1}`),
      title: String(req.body?.title ?? `${project.name} 询价单`),
      supplierIds,
      currentRound: Number(req.body?.currentRound ?? 1),
      maxRounds: Number(req.body?.maxRounds ?? req.body?.priceRounds ?? 1),
      quoteRuleConfig: normalizeInquiryRuleConfig(req.body?.quoteRuleConfig ?? req.body),
      status: "draft",
      deadlineAt: String(req.body?.deadlineAt ?? req.body?.quoteDeadlineAt ?? project.quoteDeadlineAt ?? "2099-12-31T17:00:00.000Z"),
      createdBy: req.auth.user.id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    ctx.state.inquirySheets.push(inquiry);
    project.quoteDeadlineAt = inquiry.deadlineAt;
    project.beforeDeadline = new Date(inquiry.deadlineAt).getTime() > Date.now();
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "inquiry_sheet.create", "inquiry_sheet", inquiry.id, project.id, `suppliers=${supplierIds.length}`);
    return res.status(201).json({ inquirySheet: inquiry, auditLogId: auditLog.id });
  });

  router.post("/inquiry-sheets/:inquiryId/publish", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "inquiry_sheet", req.params.inquiryId)) return;
    const inquiry = ensureInquiry(ctx, req.params.inquiryId, res);
    if (!inquiry) return;
    const project = ensureProject(ctx, inquiry.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    inquiry.status = "published";
    inquiry.updatedAt = new Date().toISOString();
    for (const supplierId of inquiry.supplierIds) {
      if (!project.participantSupplierIds.includes(supplierId)) project.participantSupplierIds.push(supplierId);
    }
    advanceInternalProject(project, "registration_open", "inquiry published");
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "inquiry_sheet.publish", "inquiry_sheet", inquiry.id, project.id);
    return res.json({ inquirySheet: inquiry, auditLogId: auditLog.id });
  });

  router.post("/inquiry-sheets/:inquiryId/rounds", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "inquiry_sheet", req.params.inquiryId)) return;
    const inquiry = ensureInquiry(ctx, req.params.inquiryId, res);
    if (!inquiry) return;
    const project = ensureProject(ctx, inquiry.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const requestedRound = Number(req.body?.roundNo ?? inquiry.currentRound + 1);
    if (!Number.isFinite(requestedRound) || requestedRound <= inquiry.currentRound || requestedRound > inquiry.maxRounds) {
      return res.status(400).json({ error: { code: "INQUIRY_ROUND_INVALID", message: "Inquiry round is outside configured range." } });
    }
    inquiry.currentRound = requestedRound;
    inquiry.status = "round_open";
    inquiry.deadlineAt = String(req.body?.deadlineAt ?? inquiry.deadlineAt);
    inquiry.quoteRuleConfig = normalizeInquiryRuleConfig(req.body?.quoteRuleConfig ?? inquiry.quoteRuleConfig);
    inquiry.updatedAt = new Date().toISOString();
    project.quoteDeadlineAt = inquiry.deadlineAt;
    project.beforeDeadline = new Date(inquiry.deadlineAt).getTime() > Date.now();
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "inquiry_sheet.round.open", "inquiry_sheet", inquiry.id, project.id, `round=${inquiry.currentRound}`);
    return res.json({ inquirySheet: inquiry, auditLogId: auditLog.id });
  });

  router.post("/inquiry-sheets/:inquiryId/pricing", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "inquiry_sheet", req.params.inquiryId)) return;
    const inquiry = ensureInquiry(ctx, req.params.inquiryId, res);
    if (!inquiry) return;
    const project = ensureProject(ctx, inquiry.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const selectedSupplierId = String(req.body?.selectedSupplierId ?? "");
    if (!selectedSupplierId || !inquiry.supplierIds.includes(selectedSupplierId)) {
      return res.status(400).json({ error: { code: "INQUIRY_PRICING_SUPPLIER_INVALID", message: "Selected supplier must be in inquiry scope." } });
    }
    const timestamp = new Date().toISOString();
    inquiry.pricingDecision = {
      selectedSupplierId,
      pricingMethod: String(req.body?.pricingMethod ?? "lowest_valid_quote"),
      effectiveFrom: String(req.body?.effectiveFrom ?? timestamp.slice(0, 10)),
      effectiveTo: req.body?.effectiveTo === undefined ? undefined : String(req.body.effectiveTo),
      decisionSummary: String(req.body?.decisionSummary ?? "询价定价完成，本地留痕，正式定价规则待客户确认。"),
      decidedBy: req.auth.user.id,
      decidedAt: timestamp
    };
    inquiry.status = "priced";
    inquiry.updatedAt = timestamp;
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "inquiry_sheet.pricing", "inquiry_sheet", inquiry.id, project.id, `selected=${selectedSupplierId}`);
    return res.json({ inquirySheet: inquiry, auditLogId: auditLog.id });
  });

  router.get("/announcements", (req, res) => res.json({ announcements: visibleAnnouncements(ctx, req) }));

  router.get("/projects/:projectId/announcements", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (isSupplierRole(req.auth.roleId)) {
      const supplierId = req.auth.user.supplierId ?? "";
      return res.json({
        announcements: ctx.state.procurementAnnouncements.filter((item) => item.projectId === project.id && isAnnouncementVisibleToSupplier(ctx, item, supplierId))
      });
    }
    if (!assertProjectReadable(ctx, req, res, project)) return;
    return res.json({ announcements: ctx.state.procurementAnnouncements.filter((item) => item.projectId === project.id) });
  });

  router.post("/projects/:projectId/announcements", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "announcement", "new")) return;
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    const documentId = String(req.body?.documentId ?? latestLockedDocument(ctx, project.id)?.id ?? "");
    const document = ctx.state.procurementDocuments.find((item) => item.id === documentId && item.projectId === project.id);
    if (!document || document.status !== "locked") {
      return denyResponse(
        ctx,
        req,
        res,
        400,
        "PROCUREMENT_DOCUMENT_LOCKED_REQUIRED",
        "Announcement requires a published and locked procurement document.",
        "announcement.create.denied",
        "project",
        project.id,
        project.id,
        "locked procurement document is required"
      );
    }
    const now = new Date().toISOString();
    const id = `ann-${ctx.state.procurementAnnouncements.length + 1}`;
    const announcement: ProcurementAnnouncement = {
      id,
      projectId: project.id,
      documentId: document.id,
      title: String(req.body?.title ?? `${project.name} announcement`),
      contentSummary: String(req.body?.contentSummary ?? document.contentSummary),
      procurementMethod: String(req.body?.procurementMethod ?? project.type),
      methodFields: methodSpecificFields(project, req.body),
      noticeTemplateCode: String(req.body?.noticeTemplateCode ?? "PDF_BID_NOTICE_TEMPLATE_V1"),
      supplierInstructions: String(req.body?.supplierInstructions ?? "供应商须按公告、须知、必传文件清单和答疑补遗要求完成报名、应标、报价和文件上传。"),
      evaluationMethod: String(req.body?.evaluationMethod ?? "综合评分法：技术、商务、服务、价格评分项汇总后形成推荐。"),
      requiredFileRules: normalizeRuleFiles(req.body?.requiredFileRules),
      abandonmentRules: {
        allowedBeforeDeadline: req.body?.abandonmentRules?.allowedBeforeDeadline === undefined ? true : Boolean(req.body.abandonmentRules.allowedBeforeDeadline),
        reasonRequired: req.body?.abandonmentRules?.reasonRequired === undefined ? true : Boolean(req.body.abandonmentRules.reasonRequired),
        noticeScope: req.body?.abandonmentRules?.noticeScope === "buyer_and_invited" ? "buyer_and_invited" : "buyer_only"
      },
      sampleRules: {
        required: Boolean(req.body?.sampleRules?.required ?? req.body?.sampleRequired ?? false),
        receiveLocation: req.body?.sampleRules?.receiveLocation === undefined ? undefined : String(req.body.sampleRules.receiveLocation),
        returnRequired: req.body?.sampleRules?.returnRequired === undefined ? undefined : Boolean(req.body.sampleRules.returnRequired)
      },
      scope: (req.body?.scope === "invited_suppliers" ? "invited_suppliers" : "public_internal") as ProcurementAnnouncementScope,
      status: "draft",
      registrationDeadlineAt: String(req.body?.registrationDeadlineAt ?? "2099-12-20T17:00:00.000Z"),
      quoteDeadlineAt: String(req.body?.quoteDeadlineAt ?? "2099-12-31T17:00:00.000Z"),
      createdBy: req.auth.user.id,
      createdAt: now,
      updatedAt: now,
      publishedAt: null
    };
    ctx.state.procurementAnnouncements.push(announcement);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "announcement.create", "announcement", announcement.id, project.id);
    return res.status(201).json({ announcement, auditLogId: auditLog.id });
  });

  router.post("/announcements/:announcementId/publish", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "announcement", req.params.announcementId)) return;
    const announcement = ensureAnnouncement(ctx, req.params.announcementId, res);
    if (!announcement) return;
    const project = ensureProject(ctx, announcement.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    const now = new Date().toISOString();
    announcement.status = "published";
    announcement.publishedAt = now;
    announcement.updatedAt = now;
    project.quoteDeadlineAt = announcement.quoteDeadlineAt;
    project.beforeDeadline = new Date(announcement.quoteDeadlineAt).getTime() > Date.now();
    advanceInternalProject(project, "registration_open", "registration open");
    const invitedSupplierIds = Array.isArray(req.body?.supplierIds) ? req.body.supplierIds.map(String) : [];
    const invitations = createInvitations(ctx, req, announcement, invitedSupplierIds);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "announcement.publish", "announcement", announcement.id, project.id);
    return res.json({ announcement, invitations, auditLogId: auditLog.id });
  });

  router.post("/announcements/:announcementId/invitations", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "announcement", req.params.announcementId)) return;
    const announcement = ensureAnnouncement(ctx, req.params.announcementId, res);
    if (!announcement) return;
    const project = ensureProject(ctx, announcement.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_announcement");
    const supplierIds = Array.isArray(req.body?.supplierIds) ? req.body.supplierIds.map(String) : [];
    const invitations = createInvitations(ctx, req, announcement, supplierIds);
    ctx.r4SourcingRepository.upsertProject(project);
    return res.status(201).json({ invitations });
  });

  router.get("/supplier-invitations", (req, res) => {
    if (isSupplierRole(req.auth.roleId)) {
      return res.json({ supplierInvitations: ctx.state.supplierInvitations.filter((item) => item.supplierId === req.auth.user.supplierId) });
    }
    const invitations = ctx.state.supplierInvitations.filter((invitation) => {
      const project = ctx.state.projects.find((item) => item.id === invitation.projectId);
      return project ? canReadProject(req, project) : false;
    });
    return res.json({ supplierInvitations: invitations });
  });

  router.get("/registrations", (req, res) => {
    if (isSupplierRole(req.auth.roleId)) {
      return res.json({ registrations: ctx.state.supplierRegistrations.filter((item) => item.supplierId === req.auth.user.supplierId) });
    }
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "registration", "list");
    }
    const registrations = ctx.state.supplierRegistrations.filter((registration) => {
      const project = ctx.state.projects.find((item) => item.id === registration.projectId);
      return project ? canReadProject(req, project) : false;
    });
    return res.json({ registrations });
  });

  router.post("/announcements/:announcementId/registrations", (req, res) => {
    if (!isSupplierQuotationRole(req.auth.roleId) || !req.auth.user.supplierId) {
      return denyResponse(
        ctx,
        req,
        res,
        403,
        "SUPPLIER_ROLE_REQUIRED",
        "Only supplier quotation accounts can submit registrations.",
        "registration.submit.denied",
        "announcement",
        req.params.announcementId,
        undefined,
        `role=${req.auth.roleId}`
      );
    }
    const announcement = ensureAnnouncement(ctx, req.params.announcementId, res);
    if (!announcement) return;
    const project = ensureProject(ctx, announcement.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_registration");
    const supplier = ensureSupplier(ctx, req.auth.user.supplierId, res);
    if (!supplier) return;
    const normalized = normalizedSupplier(supplier);
    if (announcement.status !== "published") {
      return denyResponse(ctx, req, res, 400, "ANNOUNCEMENT_NOT_PUBLISHED", "Registration requires a published announcement.", "registration.submit.denied", "announcement", announcement.id, project.id, `status=${announcement.status}`);
    }
    if (!isAnnouncementVisibleToSupplier(ctx, announcement, supplier.id)) {
      return denyResponse(ctx, req, res, 403, "ANNOUNCEMENT_SCOPE_DENIED", "Current supplier cannot access this announcement.", "registration.scope.denied", "announcement", announcement.id, project.id);
    }
    if (new Date(announcement.registrationDeadlineAt).getTime() < Date.now()) {
      return denyResponse(ctx, req, res, 400, "REGISTRATION_DEADLINE_PASSED", "Registration deadline has passed.", "registration.submit.denied", "announcement", announcement.id, project.id);
    }
    if (normalized.admissionStatus === "restricted") {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_RESTRICTED", "供应商已列入限制名单，不能继续参与内部采购项目报名。", "registration.supplier.denied", "supplier", supplier.id, project.id, "supplier is restricted");
    }
    if (!hasActiveCategoryAuthorization(supplier, project.category)) {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_CATEGORY_NOT_AUTHORIZED", "Supplier is not authorized for this procurement category.", "registration.category.denied", "supplier", supplier.id, project.id, `project category=${project.category}`);
    }
    if (ctx.state.supplierRegistrations.some((item) => item.announcementId === announcement.id && item.supplierId === supplier.id)) {
      return denyResponse(ctx, req, res, 409, "REGISTRATION_DUPLICATE", "Supplier has already registered for this announcement.", "registration.duplicate.denied", "announcement", announcement.id, project.id, supplier.id);
    }
    const now = new Date().toISOString();
    const registration: SupplierRegistration = {
      id: `reg-${ctx.state.supplierRegistrations.length + 1}`,
      projectId: project.id,
      announcementId: announcement.id,
      supplierId: supplier.id,
      status: "submitted",
      materialMetadata: resolveAttachments(ctx, req.body?.materialMetadata, {
        fallbackPrefix: `reg-${ctx.state.supplierRegistrations.length + 1}`,
        objectType: "registration",
        objectId: `reg-${ctx.state.supplierRegistrations.length + 1}`,
        attachmentKind: "supplier_registration_material",
        projectId: project.id,
        supplierId: supplier.id,
        uploadedBy: req.auth.user.id
      }),
      supplementMaterialMetadata: resolveAttachments(ctx, req.body?.supplementMaterialMetadata, {
        fallbackPrefix: `reg-${ctx.state.supplierRegistrations.length + 1}-supplement`,
        objectType: "registration",
        objectId: `reg-${ctx.state.supplierRegistrations.length + 1}`,
        attachmentKind: "supplier_registration_supplement",
        projectId: project.id,
        supplierId: supplier.id,
        uploadedBy: req.auth.user.id
      }),
      submittedAt: now
    };
    ctx.state.supplierRegistrations.push(registration);
    if (!project.participantSupplierIds.includes(supplier.id)) project.participantSupplierIds.push(supplier.id);
    const invitation = ctx.state.supplierInvitations.find((item) => item.announcementId === announcement.id && item.supplierId === supplier.id);
    if (invitation) {
      invitation.status = "registered";
      ctx.r4SourcingRepository.upsertSupplierInvitation(invitation);
    }
    ctx.r4SourcingRepository.upsertSupplierParticipation(registration);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "registration.submit", "registration", registration.id, project.id);
    return res.status(201).json({ registration, auditLogId: auditLog.id });
  });

  router.post("/registrations/:registrationId/qualify", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "registration", req.params.registrationId)) return;
    const registration = ctx.state.supplierRegistrations.find((item) => item.id === req.params.registrationId);
    if (!registration) return res.status(404).json({ error: { code: "REGISTRATION_NOT_FOUND", message: "Registration does not exist." } });
    const project = ensureProject(ctx, registration.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_registration");
    const decision = req.body?.status === "rejected" ? "rejected" : "qualified";
    registration.status = decision;
    registration.qualifiedAt = new Date().toISOString();
    registration.qualificationReason = String(req.body?.reason ?? decision);
    ctx.r4SourcingRepository.upsertSupplierParticipation(registration);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "registration.qualify", "registration", registration.id, project.id, `status=${decision}`);
    return res.json({ registration, auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId/clarifications", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    return res.json({ clarifications: visibleClarifications(project, req) });
  });

  router.post("/projects/:projectId/clarifications", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    if (project.status === "cancelled" || project.status === "closed") {
      return denyResponse(ctx, req, res, 400, "CLARIFICATION_PROJECT_CLOSED", "Closed or cancelled projects cannot accept new clarifications.", "clarification.create.denied", "project", project.id, project.id);
    }
    const now = new Date().toISOString();
    if (isSupplierQuotationRole(req.auth.roleId)) {
      const supplierId = req.auth.user.supplierId ?? "";
      if (!project.participantSupplierIds.includes(supplierId)) {
        return denyResponse(ctx, req, res, 403, "CLARIFICATION_SUPPLIER_SCOPE_DENIED", "Supplier can only ask questions on participated projects.", "clarification.supplier.denied", "project", project.id, project.id);
      }
      const question = String(req.body?.question ?? "").trim();
      if (!question) return res.status(400).json({ error: { code: "CLARIFICATION_QUESTION_REQUIRED", message: "Question is required." } });
      const clarification: ProjectClarificationRecord = {
        id: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}`,
        question,
        answer: "",
        supplierId,
        visibility: req.body?.visibility === "public_to_invited" ? "public_to_invited" : "supplier_self",
        status: "open",
        askedAt: now,
        answeredBy: "",
        answeredAt: "",
        questionAttachments: resolveAttachments(ctx, req.body?.questionAttachments ?? req.body?.attachmentMetadata, {
          fallbackPrefix: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}-q`,
          objectType: "clarification",
          objectId: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}`,
          attachmentKind: "clarification_question",
          projectId: project.id,
          supplierId,
          uploadedBy: req.auth.user.id
        }),
        notificationTrace: {
          eventType: "clarification.question.submitted",
          recipientScope: "buyer",
          notifiedAt: now,
          adapterStatus: "local_message_recorded"
        }
      };
      project.clarificationRecords = [...(project.clarificationRecords ?? []), clarification];
      ctx.r8WorkflowTaskRepository.createNotification({
        eventType: "clarification.question.submitted",
        businessType: "procurement_request",
        businessId: project.id,
        projectId: project.id,
        supplierId,
        recipientRoleId: "buyer",
        title: `Clarification question ${project.code}`,
        contentSummary: question,
        sourceJson: { clarificationId: clarification.id, visibility: clarification.visibility }
      });
      ctx.r4SourcingRepository.upsertClarification(project.id, clarification);
      ctx.r4SourcingRepository.upsertProject(project);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "clarification.ask", "clarification", clarification.id, project.id);
      return res.status(201).json({ clarification, auditLogId: auditLog.id });
    }
    if (!ensureProcurementMaintainer(ctx, req, res, "clarification", "new")) return;
    const notificationTrace = {
      eventType: String(req.body?.answer ?? "").trim() ? "clarification.answer.published" : "clarification.question.created",
      recipientScope: req.body?.visibility === "supplier_self" ? "supplier_self" : "invited_suppliers",
      notifiedAt: now,
      adapterStatus: "local_message_recorded" as const
    };
    const clarification: ProjectClarificationRecord = {
      id: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}`,
      question: String(req.body?.question ?? "").trim(),
      answer: String(req.body?.answer ?? "").trim(),
      supplierId: req.body?.supplierId === undefined ? undefined : String(req.body.supplierId),
      visibility: req.body?.visibility === "supplier_self" ? "supplier_self" : "public_to_invited",
      status: String(req.body?.answer ?? "").trim() ? "answered" : "open",
      askedAt: now,
      answeredBy: req.auth.user.name,
      answeredAt: String(req.body?.answer ?? "").trim() ? now : "",
      questionAttachments: resolveAttachments(ctx, req.body?.questionAttachments, {
        fallbackPrefix: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}-q`,
        objectType: "clarification",
        objectId: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}`,
        attachmentKind: "clarification_question",
        projectId: project.id,
        supplierId: req.body?.supplierId === undefined ? undefined : String(req.body.supplierId),
        uploadedBy: req.auth.user.id
      }),
      answerAttachments: resolveAttachments(ctx, req.body?.answerAttachments ?? req.body?.attachmentMetadata, {
        fallbackPrefix: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}-a`,
        objectType: "clarification",
        objectId: `qc-${project.id}-${(project.clarificationRecords ?? []).length + 1}`,
        attachmentKind: "clarification_answer",
        projectId: project.id,
        supplierId: req.body?.supplierId === undefined ? undefined : String(req.body.supplierId),
        uploadedBy: req.auth.user.id
      }),
      notificationTrace
    };
    if (!clarification.question) return res.status(400).json({ error: { code: "CLARIFICATION_QUESTION_REQUIRED", message: "Question is required." } });
    project.clarificationRecords = [...(project.clarificationRecords ?? []), clarification];
    ctx.r8WorkflowTaskRepository.createNotification({
      eventType: notificationTrace.eventType,
      businessType: "procurement_request",
      businessId: project.id,
      projectId: project.id,
      supplierId: clarification.supplierId,
      recipientRoleId: clarification.visibility === "supplier_self" ? "supplier" : "supplier_quotation",
      title: `Clarification ${project.code}`,
      contentSummary: clarification.answer || clarification.question,
      sourceJson: { clarificationId: clarification.id, visibility: clarification.visibility }
    });
    ctx.r4SourcingRepository.upsertClarification(project.id, clarification);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "clarification.create", "clarification", clarification.id, project.id);
    return res.status(201).json({ clarification, auditLogId: auditLog.id });
  });

  router.post("/projects/:projectId/clarifications/:clarificationId/answer", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "clarification", req.params.clarificationId)) return;
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const clarification = ensureClarification(project, req.params.clarificationId, res);
    if (!clarification) return;
    const answer = String(req.body?.answer ?? "").trim();
    if (!answer) return res.status(400).json({ error: { code: "CLARIFICATION_ANSWER_REQUIRED", message: "Answer is required." } });
    clarification.answer = answer;
    clarification.visibility = req.body?.visibility === "supplier_self" ? "supplier_self" : "public_to_invited";
    clarification.status = "answered";
    clarification.answeredBy = req.auth.user.name;
    clarification.answeredAt = new Date().toISOString();
    if (req.body?.answerAttachments !== undefined || req.body?.attachmentMetadata !== undefined) {
      clarification.answerAttachments = resolveAttachments(ctx, req.body?.answerAttachments ?? req.body?.attachmentMetadata, {
        fallbackPrefix: `${clarification.id}-a`,
        objectType: "clarification",
        objectId: clarification.id,
        attachmentKind: "clarification_answer",
        projectId: project.id,
        supplierId: clarification.supplierId,
        uploadedBy: req.auth.user.id
      });
    }
    clarification.notificationTrace = {
      eventType: "clarification.answer.published",
      recipientScope: clarification.visibility === "supplier_self" ? "supplier_self" : "invited_suppliers",
      notifiedAt: clarification.answeredAt,
      adapterStatus: "local_message_recorded"
    };
    ctx.r8WorkflowTaskRepository.createNotification({
      eventType: "clarification.answer.published",
      businessType: "procurement_request",
      businessId: project.id,
      projectId: project.id,
      supplierId: clarification.supplierId,
      recipientRoleId: clarification.visibility === "supplier_self" ? "supplier" : "supplier_quotation",
      title: `Clarification answer ${project.code}`,
      contentSummary: answer,
      sourceJson: { clarificationId: clarification.id, visibility: clarification.visibility }
    });
    ctx.r4SourcingRepository.upsertClarification(project.id, clarification);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "clarification.answer", "clarification", clarification.id, project.id);
    return res.json({ clarification, auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId/samples", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const samples = ctx.state.projectSampleReceipts.filter((item) => {
      if (item.projectId !== project.id) return false;
      if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, item.supplierId);
      return true;
    });
    return res.json({ samples });
  });

  router.post("/projects/:projectId/samples", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "project_sample", "new")) return;
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const supplierId = String(req.body?.supplierId ?? "");
    if (!supplierId || !project.participantSupplierIds.includes(supplierId)) {
      return res.status(400).json({ error: { code: "PROJECT_SAMPLE_SUPPLIER_INVALID", message: "Sample supplier must be a project participant." } });
    }
    const timestamp = new Date().toISOString();
    const sampleId = `psr-${ctx.state.projectSampleReceipts.length + 1}`;
    const sample: ProjectSampleReceipt = {
      id: sampleId,
      projectId: project.id,
      supplierId,
      sampleName: String(req.body?.sampleName ?? "投标样品"),
      quantity: Number(req.body?.quantity ?? 1),
      status: "received",
      receivedBy: req.auth.user.id,
      receivedAt: timestamp,
      returnRequired: req.body?.returnRequired === undefined ? undefined : Boolean(req.body.returnRequired),
      attachmentMetadata: resolveAttachments(ctx, req.body?.attachmentMetadata, {
        fallbackPrefix: sampleId,
        objectType: "project_sample",
        objectId: sampleId,
        attachmentKind: "project_sample_receipt",
        projectId: project.id,
        supplierId,
        uploadedBy: req.auth.user.id
      }),
      handlingNote: req.body?.handlingNote === undefined ? undefined : String(req.body.handlingNote)
    };
    ctx.state.projectSampleReceipts.push(sample);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "project_sample.receive", "project_sample", sample.id, project.id, `supplier=${supplierId}`);
    return res.status(201).json({ sample, auditLogId: auditLog.id });
  });

  router.post("/project-samples/:sampleId/return", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "project_sample", req.params.sampleId)) return;
    const sample = ensureProjectSample(ctx, req.params.sampleId, res);
    if (!sample) return;
    const project = ensureProject(ctx, sample.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    sample.status = req.body?.discarded === true ? "discarded" : "returned";
    sample.returnedBy = req.auth.user.id;
    sample.returnedAt = new Date().toISOString();
    sample.handlingNote = req.body?.handlingNote === undefined ? sample.handlingNote : String(req.body.handlingNote);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "project_sample.return", "project_sample", sample.id, project.id, sample.status);
    return res.json({ sample, auditLogId: auditLog.id });
  });

  return router;
}
