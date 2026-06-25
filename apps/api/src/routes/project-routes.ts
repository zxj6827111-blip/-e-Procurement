import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { validateProjectStatus } from "../state-machines.js";
import type {
  ProcurementDocumentAttachment,
  ProcurementProject,
  ProcurementRequest,
  ProcurementRequestApprovalStatus,
  ProcurementRequestLineItem,
  ProcurementRequestStatus
} from "../types.js";
import { resolveAttachments } from "./file-helpers.js";

const procurementMaintainerRoles = new Set(["buyer", "group_manager"]);

function denyBusinessAction(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action: "phase1.business-action.denied",
    objectType,
    objectId,
    result: "denied",
    reason: `${req.auth.roleId} cannot maintain procurement request or project data`
  });
  return res.status(403).json({
    error: {
      code: "PHASE1_BUSINESS_ACTION_DENIED",
      message: "Only procurement business roles can maintain Phase 1 request and project data.",
      auditLogId: auditLog.id
    }
  });
}

function ensureProcurementMaintainer(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  if (procurementMaintainerRoles.has(req.auth.roleId)) return true;
  denyBusinessAction(ctx, req, res, objectType, objectId);
  return false;
}

function canReadOrg(req: Request, orgId: string) {
  if (req.auth.roleId === "buyer") return req.auth.orgScope.includes(orgId);
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(orgId);
  return false;
}

function canReadProject(req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer") return req.auth.user.managedProjectIds?.includes(project.id) ?? false;
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(project.orgId);
  if (req.auth.roleId === "supplier") return project.participantSupplierIds.includes(req.auth.user.supplierId ?? "");
  if (req.auth.roleId === "expert") return project.assignedExpertIds.includes(req.auth.user.expertId ?? "");
  return false;
}

function visibleRequests(ctx: AppContext, req: Request) {
  if (req.auth.roleId === "admin") {
    ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "procurement_request", "list");
  }
  if (req.auth.roleId === "buyer") {
    return ctx.state.procurementRequests.filter((item) => canReadProcurementRequest(ctx, req, normalizeRequest(item)));
  }
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") {
    return ctx.state.procurementRequests.filter((item) => req.auth.orgScope.includes(item.orgId));
  }
  if (req.auth.roleId === "supplier") {
    const supplierId = req.auth.user.supplierId ?? "";
    const projectIds = ctx.state.projects.filter((project) => project.participantSupplierIds.includes(supplierId)).map((project) => project.id);
    return ctx.state.procurementRequests.filter((item) => item.projectId && projectIds.includes(item.projectId));
  }
  if (req.auth.roleId === "expert") {
    const expertId = req.auth.user.expertId ?? "";
    const projectIds = ctx.state.projects.filter((project) => project.assignedExpertIds.includes(expertId)).map((project) => project.id);
    return ctx.state.procurementRequests.filter((item) => item.projectId && projectIds.includes(item.projectId));
  }
  return [];
}

function canReadProcurementRequest(ctx: AppContext, req: Request, request: ProcurementRequest) {
  if (req.auth.roleId === "buyer") {
    if (request.projectId) {
      const project = ctx.state.projects.find((item) => item.id === request.projectId);
      return project ? canReadProject(req, project) : false;
    }
    return req.auth.orgScope.includes(request.orgId) && request.createdBy === req.auth.user.id;
  }
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(request.orgId);
  if (!request.projectId) return false;
  const project = ctx.state.projects.find((item) => item.id === request.projectId);
  return project ? canReadProject(req, project) : false;
}

function normalizeRequest(request: ProcurementRequest): ProcurementRequest {
  const status = request.status ?? (request.projectId ? "project_created" : "draft");
  return {
    ...request,
    code: request.code ?? request.id.toUpperCase(),
    projectId: request.projectId ?? null,
    requestDepartment: request.requestDepartment ?? "",
    requesterName: request.requesterName ?? "",
    category: request.category ?? "unclassified",
    description: request.description ?? "",
    lineItems: request.lineItems ?? [],
    attachments: request.attachments ?? [],
    status,
    createdBy: request.createdBy ?? "u2",
    createdAt: request.createdAt ?? "2026-06-23T00:00:00.000Z",
    updatedAt: request.updatedAt ?? "2026-06-23T00:00:00.000Z"
  };
}

function parseLineItems(raw: unknown, fallbackPrefix?: string): ProcurementRequestLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const input = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(input.id ?? `${fallbackPrefix ? `${fallbackPrefix}-` : ""}line-${index + 1}`),
      itemName: String(input.itemName ?? input.name ?? "").trim(),
      category: input.category === undefined ? undefined : String(input.category),
      specification: String(input.specification ?? ""),
      quantity: Number(input.quantity ?? 0),
      unit: String(input.unit ?? "项"),
      estimatedUnitPrice: input.estimatedUnitPrice === undefined ? undefined : Number(input.estimatedUnitPrice),
      budgetAmount: input.budgetAmount === undefined ? undefined : Number(input.budgetAmount),
      requiredByDate: input.requiredByDate === undefined ? undefined : String(input.requiredByDate),
      remark: input.remark === undefined ? undefined : String(input.remark)
    };
  });
}

function resolveRequestAttachments(
  ctx: AppContext,
  req: Request,
  requestId: string,
  attachments: unknown,
  projectId?: string
): ProcurementDocumentAttachment[] {
  return resolveAttachments(ctx, attachments, {
    fallbackPrefix: requestId,
    objectType: "procurement_request",
    objectId: requestId,
    attachmentKind: "procurement_request_attachment",
    projectId,
    uploadedBy: req.auth.user.id
  });
}

function requestReadyForSubmit(procurementRequest: ProcurementRequest) {
  const normalized = normalizeRequest(procurementRequest);
  return Boolean(
    normalized.title.trim() &&
      normalized.requestDepartment?.trim() &&
      normalized.requesterName?.trim() &&
      normalized.lineItems &&
      normalized.lineItems.length > 0
  );
}

function ensureRequest(ctx: AppContext, requestId: string, res: Response) {
  const request = ctx.state.procurementRequests.find((item) => item.id === requestId);
  if (!request) {
    res.status(404).json({ error: { code: "PROCUREMENT_REQUEST_NOT_FOUND", message: "Procurement request does not exist." } });
    return null;
  }
  return request;
}

function nextStatusAllowed(current: ProcurementRequestStatus, next: ProcurementRequestStatus) {
  const allowed: Record<ProcurementRequestStatus, ProcurementRequestStatus[]> = {
    draft: ["draft", "submitted"],
    submitted: ["submitted", "method_decided"],
    method_decided: ["method_decided", "project_created"],
    project_created: ["project_created"],
    cancelled: ["cancelled"]
  };
  return allowed[current].includes(next);
}

function pickMethodRule(ctx: AppContext, methodSuggestion: string) {
  return (
    ctx.state.procurementMethodRules.find((rule) => rule.ruleCode === methodSuggestion || rule.resultMethod === methodSuggestion || rule.id === methodSuggestion) ??
    ctx.state.procurementMethodRules[0]
  );
}

function orgName(ctx: AppContext, orgId: string) {
  return ctx.state.organizations.find((item) => item.id === orgId)?.name ?? orgId;
}

function assertRequestReadable(ctx: AppContext, req: Request, request: ProcurementRequest, res: Response) {
  if (canReadProcurementRequest(ctx, req, request)) return true;
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action: "procurement-request.scope.denied",
    objectType: "procurement_request",
    objectId: request.id,
    result: "denied",
    reason: `role ${req.auth.roleId} cannot read request org ${request.orgId}`
  });
  res.status(403).json({
    error: {
      code: "PROCUREMENT_REQUEST_SCOPE_DENIED",
      message: "Current user cannot access this procurement request.",
      auditLogId: auditLog.id
    }
  });
  return false;
}

function assertProjectReadable(ctx: AppContext, req: Request, project: ProcurementProject, res: Response) {
  if (canReadProject(req, project)) return true;
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action: "project.scope.denied",
    objectType: "project",
    objectId: project.id,
    projectId: project.id,
    result: "denied",
    reason: `role ${req.auth.roleId} cannot access project ${project.id}`
  });
  res.status(403).json({
    error: {
      code: "PROJECT_SCOPE_DENIED",
      message: "Current user cannot access this project.",
      auditLogId: auditLog.id
    }
  });
  return false;
}

function assertSequentialProjectTransition(project: ProcurementProject, nextStatus: string) {
  const internalOrder = [
    "draft",
    "request_submitted",
    "method_decided",
    "project_created",
    "document_preparing",
    "document_published",
    "registration_open",
    "bidding_open",
    "bidding_locked",
    "expert_reviewing",
    "review_report_frozen",
    "award_approving",
    "awarded_pending_order",
    "result_notified",
    "contract_registered",
    "performing",
    "evaluated",
    "archived",
    "closed",
    "cancelled"
  ];
  const externalOrder = [
    "external_draft",
    "internal_approval_recorded",
    "external_project_recorded",
    "external_announcement_uploaded",
    "external_result_uploaded",
    "external_result_recorded",
    "external_contract_registered",
    "external_performing",
    "external_evaluated",
    "external_archived",
    "external_closed"
  ];
  const order = project.externalTradeFlag ? externalOrder : internalOrder;
  const currentIndex = order.indexOf(String(project.status));
  const nextIndex = order.indexOf(nextStatus);
  if (nextStatus === project.status) return true;
  return currentIndex >= 0 && nextIndex === currentIndex + 1;
}

export function projectRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/projects", (req, res) => {
    let projects = ctx.state.projects;
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "project", "list");
    }
    if (req.auth.roleId === "supplier") {
      projects = projects.filter((project) => project.participantSupplierIds.includes(req.auth.user.supplierId ?? ""));
    } else if (req.auth.roleId === "expert") {
      projects = projects.filter((project) => project.assignedExpertIds.includes(req.auth.user.expertId ?? ""));
    } else if (req.auth.roleId === "buyer") {
      projects = projects.filter((project) => req.auth.user.managedProjectIds?.includes(project.id));
    } else if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") {
      projects = projects.filter((project) => req.auth.orgScope.includes(project.orgId));
    }
    return res.json({ projects });
  });

  router.post("/projects", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "project", "new")) return;
    const requestId = String(req.body?.requestId ?? "");
    const sourceRequest = ensureRequest(ctx, requestId, res);
    if (!sourceRequest) return;
    const normalizedRequest = normalizeRequest(sourceRequest);
    if (!assertRequestReadable(ctx, req, normalizedRequest, res)) return;
    if (normalizedRequest.status !== "method_decided" || normalizedRequest.approvalStatus !== "approved") {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "project.create.denied",
        objectType: "procurement_request",
        objectId: sourceRequest.id,
        result: "denied",
        reason: `request status=${normalizedRequest.status}, approvalStatus=${normalizedRequest.approvalStatus}`
      });
      return res.status(400).json({
        error: {
          code: "PROCUREMENT_REQUEST_NOT_READY",
          message: "Procurement request must be approved and complete method decision before project creation.",
          auditLogId: auditLog.id
        }
      });
    }
    const idPrefix = normalizedRequest.externalTradeFlag ? "p-ext-new" : "p-new";
    const id = `${idPrefix}-${ctx.state.projects.length + 1}`;
    const now = new Date().toISOString();
    const project: ProcurementProject = {
      id,
      code: `${normalizedRequest.externalTradeFlag ? "EXT" : "CG"}-${now.slice(0, 10).replaceAll("-", "")}-${String(ctx.state.projects.length + 1).padStart(3, "0")}`,
      sourceRequestId: sourceRequest.id,
      name: String(req.body?.name ?? normalizedRequest.title),
      orgId: normalizedRequest.orgId,
      orgName: orgName(ctx, normalizedRequest.orgId),
      type: normalizedRequest.methodSuggestion,
      status: normalizedRequest.externalTradeFlag ? "external_project_recorded" : "project_created",
      displayStatus: normalizedRequest.externalTradeFlag ? "external trade filing recorded" : "project created",
      category: normalizedRequest.category ?? "unclassified",
      budgetLabel: normalizedRequest.budgetLabel,
      budgetAmount: normalizedRequest.budgetAmount,
      requestDepartment: normalizedRequest.requestDepartment,
      requesterName: normalizedRequest.requesterName,
      receivingLocation: normalizedRequest.receivingLocation,
      expectedArrivalAt: normalizedRequest.expectedArrivalAt,
      buyer: req.auth.user.name,
      attachments: structuredClone(normalizedRequest.attachments ?? []),
      sourceLineItems: structuredClone(normalizedRequest.lineItems ?? []),
      quoteDeadlineAt: null,
      beforeDeadline: false,
      externalTradeFlag: normalizedRequest.externalTradeFlag,
      participantSupplierIds: [],
      assignedExpertIds: []
    };
    sourceRequest.projectId = project.id;
    sourceRequest.status = "project_created";
    sourceRequest.updatedAt = now;
    ctx.state.projects.push(project);
    ctx.r4SourcingRepository.upsertProcurementRequest(sourceRequest);
    ctx.r4SourcingRepository.upsertProject(project);
    ctx.state.projectPackages.push({
      id: `pkg-${project.id}-1`,
      projectId: project.id,
      packageCode: normalizedRequest.externalTradeFlag ? "PKG-EXT" : "PKG-001",
      packageName: normalizedRequest.externalTradeFlag ? "External trade filing package" : "Default package",
      status: normalizedRequest.externalTradeFlag ? "recorded" : "active"
    });
    req.auth.user.managedProjectIds = [...(req.auth.user.managedProjectIds ?? []), project.id];
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "project.create-from-request", "project", project.id, project.id, `request=${sourceRequest.id}`);
    return res.status(201).json({ project, procurementRequest: normalizeRequest(sourceRequest), auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId", (req, res) => {
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "project", req.params.projectId, req.params.projectId);
    }
    const project = ctx.state.projects.find((item) => item.id === req.params.projectId);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    if (!assertProjectReadable(ctx, req, project, res)) return;
    if (req.auth.roleId === "expert") {
      ctx.policies.expertAssignment.assertExpertProjectAccess(req.auth, project.id);
    }
    if (req.auth.roleId === "supplier" && !project.participantSupplierIds.includes(req.auth.user.supplierId ?? "")) {
      ctx.policies.supplierDataIsolation.assertSupplierAccess(req.auth, "not-participant", "project", project.id);
    }
    return res.json({ project });
  });

  router.post("/projects/:projectId/transitions", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "project", req.params.projectId)) return;
    const project = ctx.state.projects.find((item) => item.id === req.params.projectId);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    if (!assertProjectReadable(ctx, req, project, res)) return;
    const nextStatus = String(req.body?.status ?? "");
    const validation = validateProjectStatus(project, nextStatus);
    if (!validation.allowed) {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "project.transition.denied",
        objectType: "project",
        objectId: project.id,
        projectId: project.id,
        result: "denied",
        reason: `invalid status=${nextStatus}`
      });
      return res.status(400).json({ error: { code: validation.code, message: validation.message, auditLogId: auditLog.id } });
    }
    if (!assertSequentialProjectTransition(project, nextStatus)) {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "project.transition.denied",
        objectType: "project",
        objectId: project.id,
        projectId: project.id,
        result: "denied",
        reason: `non sequential transition ${project.status} -> ${nextStatus}`
      });
      return res.status(400).json({
        error: {
          code: "PROJECT_STATUS_TRANSITION_DENIED",
          message: "Project status must move through the approved sequence.",
          auditLogId: auditLog.id
        }
      });
    }
    project.status = validation.status;
    project.displayStatus = nextStatus;
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "project.transition", "project", project.id, project.id, `next=${nextStatus}`);
    return res.json({ project, auditLogId: log.id });
  });

  router.post("/projects/:projectId/internal-actions/:action", (req, res) => {
    const project = ctx.state.projects.find((item) => item.id === req.params.projectId);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, req.params.action as never);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, `internal.${req.params.action}`, "project", project.id, project.id);
    return res.json({ ok: true, auditLogId: log.id });
  });

  router.get("/procurement-requests", (req, res) => res.json({ procurementRequests: visibleRequests(ctx, req).map(normalizeRequest) }));

  router.post("/procurement-requests", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", "new")) return;
    const title = String(req.body?.title ?? "").trim();
    const orgId = String(req.body?.orgId ?? req.auth.user.orgId);
    if (!title) {
      return res.status(400).json({ error: { code: "PROCUREMENT_REQUEST_INVALID", message: "Request title is required." } });
    }
    if (!req.auth.orgScope.includes(orgId)) {
      return res.status(403).json({ error: { code: "PROCUREMENT_REQUEST_ORG_DENIED", message: "Request org is outside current user scope." } });
    }
    const now = new Date().toISOString();
    const nextSequence = ctx.state.procurementRequests.length + 1;
    const requestId = `req-${nextSequence}`;
    const procurementRequest: ProcurementRequest = {
      id: requestId,
      code: `REQ-${now.slice(0, 10).replaceAll("-", "")}-${String(nextSequence).padStart(3, "0")}`,
      projectId: null,
      title,
      orgId,
      requestDepartment: String(req.body?.requestDepartment ?? ""),
      requesterName: String(req.body?.requesterName ?? req.auth.user.name),
      category: String(req.body?.category ?? "unclassified"),
      description: String(req.body?.description ?? ""),
      budgetLabel: String(req.body?.budgetLabel ?? "configured by customer policy"),
      budgetAmount: req.body?.budgetAmount === undefined ? undefined : Number(req.body.budgetAmount),
      purpose: req.body?.purpose === undefined ? undefined : String(req.body.purpose),
      expectedArrivalAt: req.body?.expectedArrivalAt === undefined ? undefined : String(req.body.expectedArrivalAt),
      receivingLocation: req.body?.receivingLocation === undefined ? undefined : String(req.body.receivingLocation),
      lineItems: parseLineItems(req.body?.lineItems, requestId),
      attachments: resolveRequestAttachments(ctx, req, requestId, req.body?.attachments),
      methodSuggestion: String(req.body?.methodSuggestion ?? "pending"),
      externalTradeFlag: Boolean(req.body?.externalTradeFlag ?? false),
      status: "draft",
      approvalStatus: "draft",
      createdBy: req.auth.user.id,
      createdAt: now,
      updatedAt: now
    };
    ctx.state.procurementRequests.push(procurementRequest);
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.create", "procurement_request", procurementRequest.id);
    return res.status(201).json({ procurementRequest: normalizeRequest(procurementRequest), auditLogId: auditLog.id });
  });

  router.get("/procurement-requests/:requestId", (req, res) => {
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    return res.json({ procurementRequest: normalized });
  });

  router.patch("/procurement-requests/:requestId", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (normalized.status !== "draft") {
      return res.status(400).json({ error: { code: "PROCUREMENT_REQUEST_LOCKED", message: "Only draft requests can be edited." } });
    }
    procurementRequest.title = req.body?.title === undefined ? procurementRequest.title : String(req.body.title);
    procurementRequest.requestDepartment = req.body?.requestDepartment === undefined ? procurementRequest.requestDepartment : String(req.body.requestDepartment);
    procurementRequest.requesterName = req.body?.requesterName === undefined ? procurementRequest.requesterName : String(req.body.requesterName);
    procurementRequest.category = req.body?.category === undefined ? procurementRequest.category : String(req.body.category);
    procurementRequest.description = req.body?.description === undefined ? procurementRequest.description : String(req.body.description);
    procurementRequest.budgetLabel = req.body?.budgetLabel === undefined ? procurementRequest.budgetLabel : String(req.body.budgetLabel);
    procurementRequest.budgetAmount = req.body?.budgetAmount === undefined ? procurementRequest.budgetAmount : Number(req.body.budgetAmount);
    procurementRequest.purpose = req.body?.purpose === undefined ? procurementRequest.purpose : String(req.body.purpose);
    procurementRequest.expectedArrivalAt = req.body?.expectedArrivalAt === undefined ? procurementRequest.expectedArrivalAt : String(req.body.expectedArrivalAt);
    procurementRequest.receivingLocation = req.body?.receivingLocation === undefined ? procurementRequest.receivingLocation : String(req.body.receivingLocation);
    procurementRequest.lineItems = req.body?.lineItems === undefined ? procurementRequest.lineItems : parseLineItems(req.body.lineItems);
    procurementRequest.attachments =
      req.body?.attachments === undefined
        ? procurementRequest.attachments
        : resolveRequestAttachments(ctx, req, procurementRequest.id, req.body.attachments, procurementRequest.projectId ?? undefined);
    procurementRequest.externalTradeFlag = req.body?.externalTradeFlag === undefined ? procurementRequest.externalTradeFlag : Boolean(req.body.externalTradeFlag);
    procurementRequest.updatedAt = new Date().toISOString();
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.update", "procurement_request", procurementRequest.id);
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), auditLogId: auditLog.id });
  });

  router.delete("/procurement-requests/:requestId", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (normalized.status !== "draft") {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "procurement-request.delete.denied",
        objectType: "procurement_request",
        objectId: procurementRequest.id,
        result: "denied",
        reason: `request status=${normalized.status}`
      });
      return res.status(400).json({
        error: {
          code: "PROCUREMENT_REQUEST_DELETE_DENIED",
          message: "Only draft procurement requests can be deleted. Submitted requests should be cancelled instead.",
          auditLogId: auditLog.id
        }
      });
    }
    ctx.state.procurementRequests = ctx.state.procurementRequests.filter((item) => item.id !== procurementRequest.id);
    ctx.r4SourcingRepository.deleteProcurementRequest(procurementRequest.id);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.delete", "procurement_request", procurementRequest.id);
    return res.json({ deleted: true, procurementRequestId: procurementRequest.id, auditLogId: auditLog.id });
  });

  router.post("/procurement-requests/:requestId/cancel", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (normalized.status === "project_created") {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "procurement-request.cancel.denied",
        objectType: "procurement_request",
        objectId: procurementRequest.id,
        projectId: normalized.projectId ?? undefined,
        result: "denied",
        reason: "project already created"
      });
      return res.status(400).json({
        error: {
          code: "PROCUREMENT_REQUEST_CANCEL_DENIED",
          message: "Procurement request already created a project and cannot be cancelled from this page.",
          auditLogId: auditLog.id
        }
      });
    }
    procurementRequest.status = "cancelled";
    procurementRequest.approvalStatus = "cancelled";
    procurementRequest.updatedAt = new Date().toISOString();
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      "procurement-request.cancel",
      "procurement_request",
      procurementRequest.id,
      undefined,
      String(req.body?.reason ?? "cancelled by procurement maintainer")
    );
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), auditLogId: auditLog.id });
  });

  router.post("/procurement-requests/:requestId/submit", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!nextStatusAllowed(normalized.status as ProcurementRequestStatus, "submitted")) {
      return res.status(400).json({ error: { code: "PROCUREMENT_REQUEST_STATUS_INVALID", message: "Request cannot be submitted from current status." } });
    }
    if (!requestReadyForSubmit(procurementRequest)) {
      return res.status(400).json({
        error: {
          code: "PROCUREMENT_REQUEST_INCOMPLETE",
          message: "Request must include department, requester and at least one line item before submission."
        }
      });
    }
    let workflow: ReturnType<AppContext["r8WorkflowTaskRepository"]["startApproval"]>;
    try {
      workflow = ctx.r8WorkflowTaskRepository.startApproval({
        businessType: "procurement_request",
        businessId: procurementRequest.id,
        title: procurementRequest.title,
        amount: procurementRequest.budgetAmount,
        methodType: procurementRequest.methodSuggestion,
        projectId: procurementRequest.projectId ?? undefined,
        orgId: procurementRequest.orgId,
        initiator: req.auth.user,
        sourceJson: { route: "procurement_request.submit", requestStatus: normalized.status }
      });
    } catch (error) {
      return res.status(400).json({
        error: {
          code: "PROCUREMENT_REQUEST_WORKFLOW_BLOCKED",
          message: error instanceof Error ? error.message : "Procurement request workflow blocked."
        }
      });
    }
    procurementRequest.status = "submitted";
    procurementRequest.approvalStatus = "submitted";
    procurementRequest.updatedAt = new Date().toISOString();
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.submit", "procurement_request", procurementRequest.id);
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), workflow, auditLogId: auditLog.id });
  });

  router.post("/procurement-requests/:requestId/approve", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!["submitted", "rejected"].includes(String(normalized.approvalStatus))) {
      return res.status(400).json({
        error: { code: "PROCUREMENT_REQUEST_APPROVAL_INVALID", message: "Current request is not in an approvable state." }
      });
    }
    const approved = Boolean(req.body?.approved ?? true);
    procurementRequest.approvalStatus = approved ? "approved" : "rejected";
    procurementRequest.approvalOpinion = String(req.body?.opinion ?? (approved ? "approved" : "rejected"));
    procurementRequest.approvalBy = req.auth.user.id;
    procurementRequest.approvedAt = new Date().toISOString();
    procurementRequest.updatedAt = procurementRequest.approvedAt;
    try {
      ctx.r8WorkflowTaskRepository.recordApprovalAction({
        businessType: "procurement_request",
        businessId: procurementRequest.id,
        actor: req.auth.user,
        action: approved ? "approve" : "reject",
        opinion: procurementRequest.approvalOpinion,
        sourceJson: { route: "procurement_request.approve" }
      });
    } catch {
      // Legacy approval API remains compatible; strict R8 assignee checks live on /workflow actions.
    }
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      approved ? "procurement-request.approve" : "procurement-request.reject",
      "procurement_request",
      procurementRequest.id,
      undefined,
      procurementRequest.approvalOpinion
    );
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), auditLogId: auditLog.id });
  });

  router.post("/procurement-requests/:requestId/method-decision", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "procurement_request", req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!nextStatusAllowed(normalized.status as ProcurementRequestStatus, "method_decided")) {
      return res.status(400).json({ error: { code: "PROCUREMENT_REQUEST_STATUS_INVALID", message: "Request must be submitted before method decision." } });
    }
    if (normalized.approvalStatus !== "approved") {
      return res.status(400).json({
        error: { code: "PROCUREMENT_REQUEST_APPROVAL_REQUIRED", message: "Procurement request must be approved before method decision." }
      });
    }
    const rule = pickMethodRule(ctx, String(req.body?.ruleId ?? req.body?.methodSuggestion ?? normalized.methodSuggestion));
    const ruleForcesExternal = rule.resultMethod === "external_trade" || rule.ruleCode.includes("external");
    procurementRequest.methodRuleId = rule.id;
    procurementRequest.methodSuggestion = rule.resultMethod;
    procurementRequest.externalTradeFlag = ruleForcesExternal ? true : Boolean(req.body?.externalTradeFlag ?? normalized.externalTradeFlag);
    procurementRequest.status = "method_decided";
    procurementRequest.approvalStatus = "approved";
    procurementRequest.updatedAt = new Date().toISOString();
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.method-decision", "procurement_request", procurementRequest.id, undefined, `rule=${rule.id}`);
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), methodRule: rule, auditLogId: auditLog.id });
  });

  router.get("/procurement-project-packages", (_req, res) => res.json({ procurementProjectPackages: ctx.state.projectPackages }));

  return router;
}
