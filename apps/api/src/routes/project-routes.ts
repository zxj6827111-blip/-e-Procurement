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

const procurementMaintainerRoles = new Set(["buyer", "platform_operator"]);
const requestInitiatorRoles = new Set(["hotel_buyer"]);
const requestApprovalRoles = new Set(["group_manager"]);
const requestMethodDecisionRoles = new Set(["buyer", "platform_operator"]);
const supplierLikeRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);

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

function denyRequestAction(ctx: AppContext, req: Request, res: Response, code: string, message: string, action: string, requestId: string, reason = code) {
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action,
    objectType: "procurement_request",
    objectId: requestId,
    result: "denied",
    reason
  });
  return res.status(403).json({ error: { code, message, auditLogId: auditLog.id } });
}

function ensureRequestInitiator(ctx: AppContext, req: Request, res: Response, requestId: string) {
  if (requestInitiatorRoles.has(req.auth.roleId)) return true;
  if (!procurementMaintainerRoles.has(req.auth.roleId)) {
    denyBusinessAction(ctx, req, res, "procurement_request", requestId);
    return false;
  }
  denyRequestAction(
    ctx,
    req,
    res,
    "PROCUREMENT_REQUEST_INITIATOR_REQUIRED",
    "Only hotel procurement request initiators can create, edit, submit or cancel procurement requests.",
    "procurement-request.initiator.denied",
    requestId
  );
  return false;
}

function ensureRequestApprovalRole(ctx: AppContext, req: Request, res: Response, requestId: string) {
  if (requestApprovalRoles.has(req.auth.roleId)) return true;
  denyRequestAction(
    ctx,
    req,
    res,
    "PROCUREMENT_REQUEST_APPROVER_REQUIRED",
    "Only authorized procurement approval roles can approve procurement requests.",
    "procurement-request.approver.denied",
    requestId
  );
  return false;
}

function ensureRequestMethodDecisionRole(ctx: AppContext, req: Request, res: Response, requestId: string) {
  if (requestMethodDecisionRoles.has(req.auth.roleId)) return true;
  denyRequestAction(
    ctx,
    req,
    res,
    "PROCUREMENT_REQUEST_METHOD_DECISION_REQUIRED",
    "Only authorized procurement roles can decide the procurement method.",
    "procurement-request.method-decision.role.denied",
    requestId
  );
  return false;
}

function assertRequestOwner(ctx: AppContext, req: Request, request: ProcurementRequest, res: Response, action: string) {
  const normalized = normalizeRequest(request);
  if (normalized.createdBy === req.auth.user.id) return true;
  denyRequestAction(
    ctx,
    req,
    res,
    "PROCUREMENT_REQUEST_OWNER_REQUIRED",
    "Only the procurement request creator can perform this draft action.",
    action,
    request.id,
    `createdBy=${normalized.createdBy}`
  );
  return false;
}

function canReadOrg(req: Request, orgId: string) {
  if (["buyer", "hotel_buyer", "platform_operator", "group_manager", "auditor"].includes(req.auth.roleId)) return req.auth.orgScope.includes(orgId);
  return false;
}

function canReadProject(ctx: AppContext, req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer") {
    return (req.auth.user.managedProjectIds?.includes(project.id) ?? false) || project.buyer === req.auth.user.name;
  }
  if (["hotel_buyer", "platform_operator"].includes(req.auth.roleId)) {
    return (req.auth.user.managedProjectIds?.includes(project.id) ?? false) || req.auth.orgScope.includes(project.orgId);
  }
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(project.orgId);
  if (supplierLikeRoles.has(req.auth.roleId)) return isSupplierProject(ctx, req.auth.user.supplierId ?? "", project);
  if (req.auth.roleId === "expert") return project.assignedExpertIds.includes(req.auth.user.expertId ?? "");
  return false;
}

function isSupplierProject(ctx: AppContext, supplierId: string, project: ProcurementProject) {
  if (!supplierId) return false;
  if (project.participantSupplierIds.includes(supplierId)) return true;
  return (
    ctx.state.procurementAnnouncements.some((item) => item.projectId === project.id && item.status === "published" && item.scope === "public_internal") ||
    ctx.state.supplierInvitations.some((item) => item.projectId === project.id && item.supplierId === supplierId) ||
    ctx.state.supplierRegistrations.some((item) => item.projectId === project.id && item.supplierId === supplierId) ||
    ctx.state.bids.some((item) => item.projectId === project.id && item.supplierId === supplierId) ||
    ctx.state.purchaseOrders.some((item) => item.projectId === project.id && item.supplierId === supplierId)
  );
}

function visibleRequests(ctx: AppContext, req: Request) {
  if (req.auth.roleId === "admin") {
    ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "procurement_request", "list");
  }
  if (req.auth.roleId === "expert") return [];
  if (["buyer", "hotel_buyer", "platform_operator"].includes(req.auth.roleId)) {
    return ctx.state.procurementRequests.filter((item) => canReadProcurementRequest(ctx, req, normalizeRequest(item)));
  }
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") {
    return ctx.state.procurementRequests.filter((item) => {
      const normalized = normalizeRequest(item);
      if (!req.auth.orgScope.includes(normalized.orgId)) return false;
      if (req.auth.roleId === "group_manager") return normalized.status !== "draft";
      return true;
    });
  }
  if (supplierLikeRoles.has(req.auth.roleId)) {
    const supplierId = req.auth.user.supplierId ?? "";
    const projectIds = ctx.state.projects.filter((project) => isSupplierProject(ctx, supplierId, project)).map((project) => project.id);
    return ctx.state.procurementRequests.filter((item) => item.projectId && projectIds.includes(item.projectId));
  }
  return [];
}

function canReadProcurementRequest(ctx: AppContext, req: Request, request: ProcurementRequest) {
  const normalized = normalizeRequest(request);
  if (["buyer", "hotel_buyer", "platform_operator"].includes(req.auth.roleId)) {
    if (request.projectId) {
      const project = ctx.state.projects.find((item) => item.id === request.projectId);
      return project ? canReadProject(ctx, req, project) : false;
    }
    if (req.auth.orgScope.includes(request.orgId) && normalized.createdBy === req.auth.user.id) return true;
    if (
      procurementMaintainerRoles.has(req.auth.roleId) &&
      req.auth.orgScope.includes(request.orgId) &&
      normalized.status !== "draft" &&
      normalized.approvalStatus === "approved"
    ) {
      return true;
    }
    return false;
  }
  if (req.auth.roleId === "group_manager") return req.auth.orgScope.includes(request.orgId) && normalized.status !== "draft";
  if (req.auth.roleId === "auditor") return req.auth.orgScope.includes(request.orgId);
  if (req.auth.roleId === "expert") return false;
  if (!request.projectId) return false;
  const project = ctx.state.projects.find((item) => item.id === request.projectId);
  return project ? canReadProject(ctx, req, project) : false;
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

function parseLineItems(raw: unknown, requestId?: string): ProcurementRequestLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const input = (item ?? {}) as Record<string, unknown>;
    return {
      // 明细主键由服务端按申请范围生成，避免不同申请复用客户端临时 ID 时发生全局主键冲突。
      id: requestId ? `${requestId}-line-${index + 1}` : String(input.id ?? `line-${index + 1}`),
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
): { attachments: ProcurementDocumentAttachment[] } | { error: { code: string; message: string } } {
  const validationError = validateRequestAttachmentReferences(ctx, req, requestId, attachments, projectId);
  if (validationError) return { error: validationError };
  return {
    attachments: resolveAttachments(ctx, attachments, {
    fallbackPrefix: requestId,
    objectType: "procurement_request",
    objectId: requestId,
    attachmentKind: "procurement_request_attachment",
    projectId,
    uploadedBy: req.auth.user.id
    })
  };
}

function validateRequestAttachmentReferences(ctx: AppContext, req: Request, requestId: string, attachments: unknown, projectId?: string) {
  if (!Array.isArray(attachments)) return null;
  for (const item of attachments) {
    const value = (item ?? {}) as Record<string, unknown>;
    if (typeof value.contentBase64 === "string" && value.contentBase64) continue;
    const fileId = String(value.id ?? value.fileId ?? "").trim();
    if (!fileId) {
      return { code: "PROCUREMENT_REQUEST_ATTACHMENT_INVALID", message: "Procurement request attachment metadata must reference an uploaded file." };
    }
    const stored = ctx.fileStore.get(fileId);
    if (!stored) {
      return { code: "PROCUREMENT_REQUEST_ATTACHMENT_INVALID", message: "Procurement request attachment file was not found." };
    }
    if (stored.objectType !== "procurement_request" || stored.attachmentKind !== "procurement_request_attachment") {
      return { code: "PROCUREMENT_REQUEST_ATTACHMENT_SCOPE_DENIED", message: "Attachment does not belong to procurement request scope." };
    }
    if (stored.uploadedBy !== req.auth.user.id) {
      return { code: "PROCUREMENT_REQUEST_ATTACHMENT_SCOPE_DENIED", message: "Only files uploaded by the current request initiator can be attached." };
    }
    if (stored.objectId !== requestId && !stored.objectId.startsWith("pending-request-")) {
      return { code: "PROCUREMENT_REQUEST_ATTACHMENT_SCOPE_DENIED", message: "Attachment cannot be linked to this procurement request." };
    }
    if (stored.projectId && stored.projectId !== projectId) {
      return { code: "PROCUREMENT_REQUEST_ATTACHMENT_SCOPE_DENIED", message: "Attachment project scope does not match this procurement request." };
    }
  }
  return null;
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
  const request = ctx.state.procurementRequests.find((item) => {
    const normalized = normalizeRequest(item);
    return item.id === requestId || item.code === requestId || normalized.code === requestId;
  });
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

function sourceRequestForProject(ctx: AppContext, project: ProcurementProject) {
  return project.sourceRequestId ? ctx.state.procurementRequests.find((item) => item.id === project.sourceRequestId) : undefined;
}

function isGenericProjectTitle(value: string | undefined) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

function sourceRequestProjectTitle(request: ProcurementRequest | undefined) {
  if (!request) return "";
  if (!isGenericProjectTitle(request.title)) return request.title;
  const firstItemName = request.lineItems?.[0]?.itemName?.trim();
  return firstItemName ? `${firstItemName}采购项目` : "";
}

function projectDisplayName(ctx: AppContext, project: ProcurementProject) {
  const sourceRequestTitle = sourceRequestProjectTitle(sourceRequestForProject(ctx, project));
  const projectName = project.name.trim();
  const meaningfulName = !isGenericProjectTitle(projectName) ? projectName : sourceRequestTitle;
  return [project.code, meaningfulName || projectName || project.id].filter(Boolean).join(" / ");
}

function isBeforeQuoteDeadline(project: ProcurementProject) {
  if (!project.quoteDeadlineAt) return false;
  return new Date(project.quoteDeadlineAt).getTime() > Date.now();
}

function projectListRow(ctx: AppContext, project: ProcurementProject) {
  const sourceRequestTitle = sourceRequestProjectTitle(sourceRequestForProject(ctx, project));
  return {
    ...project,
    beforeDeadline: isBeforeQuoteDeadline(project),
    sourceRequestTitle,
    displayName: projectDisplayName(ctx, project)
  };
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
  if (canReadProject(ctx, req, project)) return true;
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

function workflowStatusTerminal(status: string | undefined) {
  return ["approved", "rejected", "returned", "revoked", "cancelled"].includes(String(status ?? ""));
}

function hasVisiblePendingApprovalTask(ctx: AppContext, req: Request, requestId: string) {
  return ctx.r8WorkflowTaskRepository
    .listTasks(req.auth.user, req.auth.roleId)
    .some((task) => task.businessType === "procurement_request" && task.businessId === requestId && task.status === "pending");
}

function workflowErrorBody(error: unknown) {
  if (error && typeof error === "object") {
    const maybe = error as { code?: unknown; status?: unknown; message?: unknown };
    if (maybe.code === "APPROVAL_RULE_NOT_MATCHED") {
      return {
        status: typeof maybe.status === "number" ? maybe.status : 400,
        code: "APPROVAL_RULE_NOT_MATCHED",
        message: "未找到适用于当前采购申请的启用审批规则，请检查审批规则的预算区间、采购方式和组织范围配置。"
      };
    }
    return {
      status: typeof maybe.status === "number" ? maybe.status : 400,
      code: typeof maybe.code === "string" ? maybe.code : "PROCUREMENT_REQUEST_WORKFLOW_ACTION_BLOCKED",
      message: typeof maybe.message === "string" ? maybe.message : "Procurement request workflow action was blocked."
    };
  }
  return { status: 400, code: "PROCUREMENT_REQUEST_WORKFLOW_ACTION_BLOCKED", message: "Procurement request workflow action was blocked." };
}

export function projectRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/projects", (req, res) => {
    let projects = ctx.state.projects;
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "project", "list");
    }
    if (supplierLikeRoles.has(req.auth.roleId)) {
      projects = projects.filter((project) => isSupplierProject(ctx, req.auth.user.supplierId ?? "", project));
    } else if (req.auth.roleId === "expert") {
      projects = projects.filter((project) => project.assignedExpertIds.includes(req.auth.user.expertId ?? ""));
    } else if (["buyer", "hotel_buyer", "platform_operator"].includes(req.auth.roleId)) {
      projects = projects.filter((project) => canReadProject(ctx, req, project));
    } else if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") {
      projects = projects.filter((project) => req.auth.orgScope.includes(project.orgId));
    }
    return res.json({ projects: projects.map((project) => projectListRow(ctx, project)) });
  });

  router.post("/projects", (req, res) => {
    if (!ensureProcurementMaintainer(ctx, req, res, "project", "new")) return;
    if (!ensureRequestMethodDecisionRole(ctx, req, res, "new")) return;
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
    const requestedProjectName = String(req.body?.name ?? "").trim();
    const projectName = !isGenericProjectTitle(requestedProjectName) ? requestedProjectName : sourceRequestProjectTitle(normalizedRequest) || normalizedRequest.title;
    const project: ProcurementProject = {
      id,
      code: `${normalizedRequest.externalTradeFlag ? "EXT" : "CG"}-${now.slice(0, 10).replaceAll("-", "")}-${String(ctx.state.projects.length + 1).padStart(3, "0")}`,
      sourceRequestId: sourceRequest.id,
      name: projectName,
      orgId: normalizedRequest.orgId,
      orgName: orgName(ctx, normalizedRequest.orgId),
      type: normalizedRequest.methodSuggestion,
      status: normalizedRequest.externalTradeFlag ? "external_project_recorded" : "project_created",
      displayStatus: normalizedRequest.externalTradeFlag ? "外部项目已登记" : "已发起项目",
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
    ctx.processService.recordProcurementProjectCreated({ request: normalizeRequest(sourceRequest), project, actor: req.auth.user });
    if (!project.externalTradeFlag) {
      ctx.eventBus.emit({
        eventCode: "SourcingProjectCreated",
        businessType: "project",
        businessId: project.id,
        businessTitle: project.name,
        actor: req.auth.user,
        orgId: project.orgId,
        projectId: project.id,
        idempotencyKey: `project:${project.id}:sourcing_created`,
        payloadJson: {
          projectType: project.type,
          sourceRequestId: sourceRequest.id,
          status: project.status
        }
      });
    }
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
    if (req.auth.roleId === "supplier" && !isSupplierProject(ctx, req.auth.user.supplierId ?? "", project)) {
      ctx.policies.supplierDataIsolation.assertSupplierAccess(req.auth, "not-participant", "project", project.id);
    }
    return res.json({ project: { ...project, beforeDeadline: isBeforeQuoteDeadline(project) } });
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
    if (!ensureRequestInitiator(ctx, req, res, "new")) return;
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
    const resolvedAttachments = resolveRequestAttachments(ctx, req, requestId, req.body?.attachments);
    if ("error" in resolvedAttachments) return res.status(400).json({ error: resolvedAttachments.error });
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
      attachments: resolvedAttachments.attachments,
      methodSuggestion: String(req.body?.methodSuggestion ?? "pending"),
      externalTradeFlag: Boolean(req.body?.externalTradeFlag ?? false),
      status: "draft",
      approvalStatus: "draft",
      createdBy: req.auth.user.id,
      createdAt: now,
      updatedAt: now
    };
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    ctx.state.procurementRequests.push(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.create", "procurement_request", procurementRequest.id);
    ctx.processService.recordProcurementRequestCreated({ request: normalizeRequest(procurementRequest), actor: req.auth.user });
    ctx.eventBus.emit({
      eventCode: "ProcurementRequestCreated",
      businessType: "procurement_request",
      businessId: procurementRequest.id,
      businessTitle: procurementRequest.title,
      actor: req.auth.user,
      orgId: procurementRequest.orgId,
      projectId: procurementRequest.projectId ?? undefined,
      idempotencyKey: `procurement_request:${procurementRequest.id}:created`,
      payloadJson: {
        status: procurementRequest.status,
        approvalStatus: procurementRequest.approvalStatus,
        methodSuggestion: procurementRequest.methodSuggestion,
        externalTradeFlag: procurementRequest.externalTradeFlag
      }
    });
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
    if (!ensureRequestInitiator(ctx, req, res, req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!assertRequestOwner(ctx, req, procurementRequest, res, "procurement-request.update.owner.denied")) return;
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
    procurementRequest.lineItems = req.body?.lineItems === undefined ? procurementRequest.lineItems : parseLineItems(req.body.lineItems, procurementRequest.id);
    if (req.body?.attachments !== undefined) {
      const resolvedAttachments = resolveRequestAttachments(ctx, req, procurementRequest.id, req.body.attachments, procurementRequest.projectId ?? undefined);
      if ("error" in resolvedAttachments) return res.status(400).json({ error: resolvedAttachments.error });
      procurementRequest.attachments = resolvedAttachments.attachments;
    }
    procurementRequest.externalTradeFlag = req.body?.externalTradeFlag === undefined ? procurementRequest.externalTradeFlag : Boolean(req.body.externalTradeFlag);
    procurementRequest.updatedAt = new Date().toISOString();
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "procurement-request.update", "procurement_request", procurementRequest.id);
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), auditLogId: auditLog.id });
  });

  router.delete("/procurement-requests/:requestId", (req, res) => {
    if (!ensureRequestInitiator(ctx, req, res, req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!assertRequestOwner(ctx, req, procurementRequest, res, "procurement-request.delete.owner.denied")) return;
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
    if (!ensureRequestInitiator(ctx, req, res, req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!assertRequestOwner(ctx, req, procurementRequest, res, "procurement-request.cancel.owner.denied")) return;
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
    ctx.r8WorkflowTaskRepository.cancelBusinessWorkflow("procurement_request", procurementRequest.id, req.auth.user, String(req.body?.reason ?? "cancelled by procurement maintainer"));
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
    if (!ensureRequestInitiator(ctx, req, res, req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (!assertRequestOwner(ctx, req, procurementRequest, res, "procurement-request.submit.owner.denied")) return;
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
      const workflowError = workflowErrorBody(error);
      return res.status(400).json({
        error: {
          code: workflowError.code,
          message: workflowError.message
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
    if (!ensureRequestApprovalRole(ctx, req, res, req.params.requestId)) return;
    const procurementRequest = ensureRequest(ctx, req.params.requestId, res);
    if (!procurementRequest) return;
    const normalized = normalizeRequest(procurementRequest);
    if (!assertRequestReadable(ctx, req, normalized, res)) return;
    if (normalized.createdBy === req.auth.user.id) {
      return denyRequestAction(
        ctx,
        req,
        res,
        "PROCUREMENT_REQUEST_SELF_APPROVAL_DENIED",
        "Procurement request creators cannot approve or reject their own requests.",
        "procurement-request.self-approval.denied",
        procurementRequest.id,
        `createdBy=${normalized.createdBy}`
      );
    }
    if (!["submitted", "rejected"].includes(String(normalized.approvalStatus))) {
      return res.status(400).json({
        error: { code: "PROCUREMENT_REQUEST_APPROVAL_INVALID", message: "Current request is not in an approvable state." }
      });
    }
    const instance = ctx.r8WorkflowTaskRepository.getApprovalInstanceByBusiness("procurement_request", procurementRequest.id);
    if (instance && !workflowStatusTerminal(instance.approvalStatus) && !hasVisiblePendingApprovalTask(ctx, req, procurementRequest.id)) {
      return denyRequestAction(
        ctx,
        req,
        res,
        "PROCUREMENT_REQUEST_APPROVAL_TASK_DENIED",
        "Current user does not have the pending approval task for this procurement request.",
        "procurement-request.approval-task.denied",
        procurementRequest.id,
        `workflow=${instance.id};currentRole=${instance.currentRoleId ?? ""}`
      );
    }
    const approved = Boolean(req.body?.approved ?? true);
    try {
      const workflow = ctx.r8WorkflowTaskRepository.recordApprovalAction({
        businessType: "procurement_request",
        businessId: procurementRequest.id,
        actor: req.auth.user,
        action: approved ? "approve" : "reject",
        opinion: String(req.body?.opinion ?? (approved ? "approved" : "rejected")),
        sourceJson: { route: "procurement_request.approve" }
      });
      procurementRequest.approvalStatus = workflow.approvalInstance.approvalStatus === "approved" ? "approved" : "rejected";
      procurementRequest.approvalOpinion = String(req.body?.opinion ?? (approved ? "approved" : "rejected"));
      procurementRequest.approvalBy = workflow.approvalInstance.completedBy ?? req.auth.user.id;
      procurementRequest.approvedAt = workflow.approvalInstance.completedAt ?? new Date().toISOString();
      procurementRequest.updatedAt = procurementRequest.approvedAt;
    } catch (error) {
      const workflowError = workflowErrorBody(error);
      return res.status(workflowError.status).json({ error: { code: workflowError.code, message: workflowError.message } });
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
    if (!ensureRequestMethodDecisionRole(ctx, req, res, req.params.requestId)) return;
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
    ctx.eventBus.emit({
      eventCode: "ProcurementMethodDecided",
      businessType: "procurement_request",
      businessId: procurementRequest.id,
      businessTitle: procurementRequest.title,
      actor: req.auth.user,
      orgId: procurementRequest.orgId,
      projectId: procurementRequest.projectId ?? undefined,
      idempotencyKey: `procurement_request:${procurementRequest.id}:method_decided`,
      payloadJson: {
        status: procurementRequest.status,
        approvalStatus: procurementRequest.approvalStatus,
        methodRuleId: rule.id,
        resultMethod: rule.resultMethod,
        externalTradeFlag: procurementRequest.externalTradeFlag
      }
    });
    return res.json({ procurementRequest: normalizeRequest(procurementRequest), methodRule: rule, auditLogId: auditLog.id });
  });

  router.get("/procurement-project-packages", (_req, res) => res.json({ procurementProjectPackages: ctx.state.projectPackages }));

  return router;
}
