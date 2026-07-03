import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { ArchiveSupplementRequest } from "../types.js";
import { isOrgReaderRole, isProcurementMaintainerRole, isSupplierGovernanceRole, isSupplierRole, supplierIdMatches } from "../role-groups.js";
import { canReadProject, denyResponse } from "./permission-helpers.js";
import { ensureArchiveSnapshot } from "./project-workbench-routes.js";

function ensureProject(ctx: AppContext, projectId: string) {
  return ctx.state.projects.find((entry) => entry.id === projectId) ?? null;
}

function ensureArchiveItem(ctx: AppContext, itemId: string) {
  return ctx.state.archiveItems.find((entry) => entry.id === itemId) ?? null;
}

function assertReadable(ctx: AppContext, req: Request, res: Response, projectId: string, action: string) {
  const project = ensureProject(ctx, projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  if (isSupplierRole(req.auth.roleId)) {
    if (project.participantSupplierIds.some((supplierId) => supplierIdMatches(req.auth.user, supplierId))) return project;
    denyResponse(ctx, req, res, 403, "SUPPLIER_ARCHIVE_SCOPE_DENIED", "Supplier can only read own project archive.", action, "project", project.id, project.id);
    return null;
  }
  if (!isOrgReaderRole(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "ARCHIVE_READ_DENIED", "Current role cannot read archive data.", action, "project", project.id, project.id);
    return null;
  }
  if (canReadProject(req, project)) return project;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read this project archive.", action, "project", project.id, project.id);
  return null;
}

function assertMaintainer(ctx: AppContext, req: Request, res: Response, projectId: string, action: string) {
  const project = assertReadable(ctx, req, res, projectId, action);
  if (!project) return null;
  if (!isProcurementMaintainerRole(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "ARCHIVE_MAINTAINER_REQUIRED", "Only procurement business roles can maintain archive data.", action, "project", project.id, project.id);
    return null;
  }
  return project;
}

function assertSupplementApprover(ctx: AppContext, req: Request, res: Response, projectId: string, action: string) {
  const project = assertReadable(ctx, req, res, projectId, action);
  if (!project) return null;
  if (!isSupplierGovernanceRole(req.auth.roleId) && !isProcurementMaintainerRole(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "ARCHIVE_SUPPLEMENT_APPROVER_REQUIRED", "Only authorized procurement approvers can approve archive supplement requests.", action, "project", project.id, project.id);
    return null;
  }
  return project;
}

function readableArchiveProjectIds(ctx: AppContext, req: Request) {
  return new Set(ctx.state.projects.filter((project) => canReadProject(req, project)).map((project) => project.id));
}

function syncArchiveStatus(items: AppContext["state"]["archiveItems"]) {
  const missing = items.filter((entry) => entry.requiredFlag && !entry.collectedFlag);
  const status = missing.length > 0 ? "incomplete" : "complete";
  for (const entry of items) {
    if (!entry.sealed) entry.status = status;
  }
  return { status, missing };
}

function archiveCloseoutReady(ctx: AppContext, project: NonNullable<ReturnType<typeof ensureProject>>) {
  const allowedStatuses = new Set(["evaluated", "closed", "external_evaluated", "external_closed"]);
  if (!allowedStatuses.has(project.status)) return false;
  const hasEvaluation = ctx.state.supplierEvaluations.some((entry) => entry.projectId === project.id && entry.status === "submitted_locked");
  const hasClosedOrder = ctx.state.purchaseOrders.some((entry) => entry.projectId === project.id && ["received", "closed"].includes(entry.status));
  const hasCompletedContract = ctx.state.contractLedgers.some((entry) => entry.projectId === project.id && ["performing", "completed"].includes(entry.status));
  return hasEvaluation || hasClosedOrder || hasCompletedContract;
}

export function archiveRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/archive-templates", (_req, res) => res.json({ archiveTemplates: ctx.state.archiveTemplates }));
  router.get("/archive-items", (req, res) => {
    const readableProjectIds = readableArchiveProjectIds(ctx, req);
    if (readableProjectIds.size === 0) {
      return denyResponse(ctx, req, res, 403, "ARCHIVE_READ_DENIED", "Current role cannot read archive data.", "archive.read.denied", "archive", "archive-items");
    }
    return res.json({ archiveItems: ctx.state.archiveItems.filter((entry) => readableProjectIds.has(entry.projectId)) });
  });

  router.get("/projects/:projectId/archive-items", (req, res) => {
    const project = assertReadable(ctx, req, res, req.params.projectId, "archive.read.denied");
    if (!project) return;
    ensureArchiveSnapshot(ctx, project);
    if (req.auth.roleId === "auditor") {
      ctx.eventBus.emit({
        eventCode: "ArchiveAuditViewed",
        businessType: "archive",
        businessId: project.id,
        businessTitle: project.name,
        actor: req.auth.user,
        orgId: project.orgId,
        projectId: project.id,
        idempotencyKey: `archive:${project.id}:audit_view:${req.auth.user.id}`,
        payloadJson: {
          projectId: project.id,
          projectName: project.name
        }
      });
    }
    return res.json({ archiveItems: ctx.state.archiveItems.filter((entry) => entry.projectId === req.params.projectId) });
  });

  router.post("/projects/:projectId/archive-snapshot", (req, res) => {
    const project = assertMaintainer(ctx, req, res, req.params.projectId, "archive.snapshot.denied");
    if (!project) return;
    ensureArchiveSnapshot(ctx, project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive.snapshot", "project", project.id, project.id);
    ctx.eventBus.emit({
      eventCode: "ArchiveSnapshotCreated",
      businessType: "archive",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `archive:${project.id}:snapshot`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name
      }
    });
    return res.status(201).json({
      projectId: project.id,
      archiveItems: ctx.state.archiveItems.filter((entry) => entry.projectId === project.id),
      auditLogId: log.id
    });
  });

  router.post("/projects/:projectId/archive-check", (req, res) => {
    const project = assertReadable(ctx, req, res, req.params.projectId, "archive.check.denied");
    if (!project) return;
    ensureArchiveSnapshot(ctx, project);
    const items = ctx.state.archiveItems.filter((entry) => entry.projectId === req.params.projectId);
    const { status, missing } = syncArchiveStatus(items);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive.check", "project", req.params.projectId, req.params.projectId, `missing=${missing.length}`);
    ctx.eventBus.emit({
      eventCode: "ArchiveChecked",
      businessType: "archive",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `archive:${project.id}:check:${status}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        status,
        missingCount: missing.length
      }
    });
    return res.json({ projectId: req.params.projectId, status, missingItems: missing, auditLogId: log.id });
  });

  router.post("/projects/:projectId/archive-seal", (req, res) => {
    const project = assertMaintainer(ctx, req, res, req.params.projectId, "archive.seal.denied");
    if (!project) return;
    ensureArchiveSnapshot(ctx, project);
    const items = ctx.state.archiveItems.filter((entry) => entry.projectId === req.params.projectId);
    const { missing } = syncArchiveStatus(items);
    if (missing.length > 0) {
      denyResponse(ctx, req, res, 400, "ARCHIVE_INCOMPLETE", "Archive cannot be sealed while required items are missing.", "archive.seal.denied", "project", project.id, project.id, `missing=${missing.length}`);
      return;
    }
    if (!archiveCloseoutReady(ctx, project)) {
      denyResponse(
        ctx,
        req,
        res,
        400,
        "ARCHIVE_CLOSEOUT_NOT_READY",
        "Archive can be sealed only after the project reaches a completed fulfillment/evaluation state.",
        "archive.seal.closeout.denied",
        "project",
        project.id,
        project.id,
        `status=${project.status}`
      );
      return;
    }
    const sealedAt = new Date().toISOString();
    items.forEach((entry) => {
      entry.sealed = true;
      entry.status = "sealed";
      entry.snapshotJson = { ...entry.snapshotJson, sealedAt, sealedBy: req.auth.user.id };
    });
    project.status = project.externalTradeFlag ? "external_archived" : "archived";
    project.displayStatus = "档案已封存";
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive.seal", "project", req.params.projectId, req.params.projectId);
    ctx.eventBus.emit({
      eventCode: "ArchiveSealed",
      businessType: "archive",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `archive:${project.id}:sealed`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name
      }
    });
    return res.json({ projectId: req.params.projectId, archiveItems: items, auditLogId: log.id });
  });

  router.post("/archive-items/:itemId/update", (req, res) => {
    const item = ensureArchiveItem(ctx, req.params.itemId);
    if (!item) return res.status(404).json({ error: { code: "ARCHIVE_ITEM_NOT_FOUND", message: "Archive item does not exist." } });
    const project = assertMaintainer(ctx, req, res, item.projectId, "archive_item.update.denied");
    if (!project) return;
    if (item.sealed) {
      denyResponse(ctx, req, res, 403, "ARCHIVE_ITEM_SEALED", "Archive item is sealed and must go through supplement flow.", "archive_item.update.denied", "archive_item", item.id, item.projectId);
      return;
    }
    item.collectedFlag = Boolean(req.body?.collectedFlag ?? item.collectedFlag);
    item.status = item.collectedFlag ? "complete" : "collecting";
    item.snapshotJson = { ...item.snapshotJson, updatedAt: new Date().toISOString(), updatedBy: req.auth.user.id };
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive_item.update", "archive_item", item.id, item.projectId);
    return res.json({ archiveItem: item, auditLogId: log.id });
  });

  router.post("/archive-items/:itemId/supplement-requests", (req, res) => {
    const item = ensureArchiveItem(ctx, req.params.itemId);
    if (!item) return res.status(404).json({ error: { code: "ARCHIVE_ITEM_NOT_FOUND", message: "Archive item does not exist." } });
    const project = assertMaintainer(ctx, req, res, item.projectId, "archive_supplement_request.submit.denied");
    if (!project) return;
    const now = new Date().toISOString();
    const request: ArchiveSupplementRequest = {
      id: `asr-${ctx.state.archiveSupplementRequests.length + 1}`,
      projectId: item.projectId,
      archiveItemId: item.id,
      reason: String(req.body?.reason ?? "补档申请"),
      approvalStatus: "submitted" as const,
      submittedBy: req.auth.user.id,
      submittedAt: now
    };
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive_supplement_request.submit", "archive_item", item.id, item.projectId);
    request.auditLogId = log.id;
    ctx.state.archiveSupplementRequests.push(request);
    item.status = "supplement_requested";
    ctx.eventBus.emit({
      eventCode: "ArchiveSupplementRequested",
      businessType: "archive",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `archive:${project.id}:supplement_requested:${request.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        supplementRequestId: request.id,
        archiveItemId: item.id
      }
    });
    return res.status(201).json({ supplementRequest: request, auditLogId: log.id });
  });

  router.post("/archive-supplement-requests/:requestId/approve", (req, res) => {
    const supplementRequest = ctx.state.archiveSupplementRequests.find((entry) => entry.id === req.params.requestId);
    if (!supplementRequest) return res.status(404).json({ error: { code: "SUPPLEMENT_REQUEST_NOT_FOUND", message: "Supplement request does not exist." } });
    const project = assertSupplementApprover(ctx, req, res, supplementRequest.projectId, "archive_supplement_request.approve.denied");
    if (!project) return;
    const item = ctx.state.archiveItems.find((entry) => entry.id === supplementRequest.archiveItemId);
    const approved = Boolean(req.body?.approved ?? true);
    supplementRequest.approvalStatus = approved ? "approved" : "rejected";
    supplementRequest.approvedBy = req.auth.user.id;
    supplementRequest.approvedAt = new Date().toISOString();
    if (item) {
      item.status = approved ? "supplement_approved" : "supplement_rejected";
    }
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      approved ? "archive_supplement_request.approve" : "archive_supplement_request.reject",
      "archive_supplement_request",
      supplementRequest.id,
      supplementRequest.projectId
    );
    supplementRequest.auditLogId = log.id;
    ctx.eventBus.emit({
      eventCode: approved ? "ArchiveSupplementApproved" : "ArchiveSupplementRejected",
      businessType: "archive",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `archive:${project.id}:supplement_${approved ? "approved" : "rejected"}:${supplementRequest.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        supplementRequestId: supplementRequest.id,
        archiveItemId: supplementRequest.archiveItemId,
        approved
      }
    });
    return res.json({ supplementRequest, archiveItem: item, auditLogId: log.id });
  });

  router.post("/archive-supplement-requests/:requestId/apply", (req, res) => {
    const supplementRequest = ctx.state.archiveSupplementRequests.find((entry) => entry.id === req.params.requestId);
    if (!supplementRequest) return res.status(404).json({ error: { code: "SUPPLEMENT_REQUEST_NOT_FOUND", message: "Supplement request does not exist." } });
    const project = assertMaintainer(ctx, req, res, supplementRequest.projectId, "archive_supplement.apply.denied");
    if (!project) return;
    if (supplementRequest.approvalStatus !== "approved") {
      denyResponse(ctx, req, res, 400, "SUPPLEMENT_REQUEST_NOT_APPROVED", "Supplement request must be approved before applying.", "archive_supplement.apply.denied", "archive_supplement_request", supplementRequest.id, supplementRequest.projectId);
      return;
    }
    const item = ctx.state.archiveItems.find((entry) => entry.id === supplementRequest.archiveItemId);
    if (!item) return res.status(404).json({ error: { code: "ARCHIVE_ITEM_NOT_FOUND", message: "Archive item does not exist." } });
    const now = new Date().toISOString();
    item.collectedFlag = true;
    item.sealed = false;
    item.status = "supplemented";
    item.snapshotJson = {
      ...item.snapshotJson,
      supplementAppliedAt: now,
      supplementAppliedBy: req.auth.user.id,
      supplementMetadata: {
        fileId: req.body?.fileId === undefined ? undefined : String(req.body.fileId),
        fileName: String(req.body?.fileName ?? "supplement-file.pdf"),
        contentType: req.body?.contentType === undefined ? undefined : String(req.body.contentType),
        sizeBytes: req.body?.sizeBytes === undefined ? undefined : Number(req.body.sizeBytes),
        uploadedAt: req.body?.uploadedAt === undefined ? now : String(req.body.uploadedAt),
        sourceRequestId: supplementRequest.id
      }
    };
    supplementRequest.appliedBy = req.auth.user.id;
    supplementRequest.appliedAt = now;
    const projectItems = ctx.state.archiveItems.filter((entry) => entry.projectId === item.projectId);
    const { status, missing } = syncArchiveStatus(projectItems);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive_supplement.apply", "archive_supplement_request", supplementRequest.id, item.projectId, `missing=${missing.length}`);
    supplementRequest.auditLogId = log.id;
    ctx.eventBus.emit({
      eventCode: "ArchiveSupplementApplied",
      businessType: "archive",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `archive:${project.id}:supplement_applied:${supplementRequest.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        supplementRequestId: supplementRequest.id,
        archiveItemId: item.id,
        status,
        missingCount: missing.length
      }
    });
    return res.json({ supplementRequest, archiveItem: item, status, auditLogId: log.id });
  });

  router.get("/archive-supplement-requests", (req, res) => {
    const readableProjectIds = readableArchiveProjectIds(ctx, req);
    if (readableProjectIds.size === 0) {
      return denyResponse(ctx, req, res, 403, "ARCHIVE_SUPPLEMENT_READ_DENIED", "Current role cannot read archive supplement requests.", "archive_supplement_request.read.denied", "archive_supplement_request", "archive-supplement-requests");
    }
    return res.json({ archiveSupplementRequests: ctx.state.archiveSupplementRequests.filter((entry) => readableProjectIds.has(entry.projectId)) });
  });

  return router;
}
