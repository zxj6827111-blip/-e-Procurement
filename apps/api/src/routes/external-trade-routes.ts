import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { ExternalProjectStatus, ExternalTradeRecord, ProcurementDocumentAttachment, ProcurementProject } from "../types.js";

const externalMaintainerRoles = new Set(["buyer", "group_manager"]);
const externalReaderRoles = new Set(["buyer", "group_manager", "auditor"]);

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

function ensureProject(ctx: AppContext, projectId: string, res: Response) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  return project;
}

function canReadProject(req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer") return req.auth.user.managedProjectIds?.includes(project.id) ?? false;
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(project.orgId);
  return false;
}

function assertExternalProject(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (project.externalTradeFlag) return true;
  return denyResponse(ctx, req, res, 400, "EXTERNAL_TRADE_PROJECT_REQUIRED", "Only external-trade filing projects can use this action.", action, "project", project.id, project.id);
}

function assertMaintainer(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!externalMaintainerRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "EXTERNAL_TRADE_MAINTAINER_REQUIRED", "Only procurement business roles can maintain external-trade filings.", action, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot maintain this external-trade project.", action, "project", project.id, project.id);
}

function assertReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!externalReaderRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "EXTERNAL_TRADE_READ_DENIED", "Current role cannot read external-trade filings.", action, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read this external-trade project.", action, "project", project.id, project.id);
}

function toAttachment(input: unknown, fallbackId: string): ProcurementDocumentAttachment {
  const value = (typeof input === "object" && input ? input : {}) as Partial<ProcurementDocumentAttachment>;
  return {
    id: String(value.id ?? fallbackId),
    fileName: String(value.fileName ?? "external-trade-material.pdf"),
    contentType: String(value.contentType ?? "application/pdf"),
    sizeBytes: Number(value.sizeBytes ?? 0),
    uploadedAt: String(value.uploadedAt ?? new Date().toISOString())
  };
}

function findRecord(ctx: AppContext, projectId: string) {
  return ctx.state.externalTradeRecords.find((item) => item.projectId === projectId) ?? null;
}

function ensureRecord(ctx: AppContext, req: Request, project: ProcurementProject): ExternalTradeRecord {
  const existing = findRecord(ctx, project.id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const record: ExternalTradeRecord = {
    id: `etr-${ctx.state.externalTradeRecords.length + 1}`,
    projectId: project.id,
    externalPlatformName: "",
    externalProjectCode: "",
    internalApprovalStatus: "draft",
    announcementMaterialMetadata: [],
    resultMaterialMetadata: [],
    resultRecordStatus: "draft",
    status: project.status as ExternalProjectStatus,
    createdBy: req.auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  ctx.state.externalTradeRecords.push(record);
  return record;
}

function setExternalStatus(project: ProcurementProject, record: ExternalTradeRecord, status: ExternalProjectStatus, displayStatus: string) {
  project.status = status;
  project.displayStatus = displayStatus;
  record.status = status;
  record.updatedAt = new Date().toISOString();
}

export function externalTradeRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/external-trades", (req, res) => {
    const projects = ctx.state.projects.filter((project) => project.externalTradeFlag && canReadProject(req, project));
    return res.json({
      externalTrades: projects.map((project) => ({
        project,
        record: findRecord(ctx, project.id)
      }))
    });
  });

  router.post("/external-trades/:projectId/block-check", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    const action = String(req.body?.action ?? "internal_bid");
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, action as never);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.block_check.allowed", "project", project.id, project.id);
    return res.json({ allowed: true, projectId: project.id, externalTradeFlag: project.externalTradeFlag, auditLogId: log.id });
  });

  router.post("/external-trades/projects", (req, res) => {
    if (!externalMaintainerRoles.has(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "EXTERNAL_TRADE_MAINTAINER_REQUIRED", "Only procurement business roles can create external-trade projects.", "external_trade.project.create.denied", "project", "new");
    }
    const id = `p-ext-${ctx.state.projects.length + 1}`;
    const now = new Date().toISOString();
    const project: ProcurementProject = {
      id,
      code: `EXT-${ctx.state.projects.length + 1}`,
      name: String(req.body?.name ?? "外部交易备案项目"),
      orgId: String(req.body?.orgId ?? req.auth.user.orgId),
      orgName: String(req.body?.orgName ?? "酒店集团"),
      type: "external_trade",
      status: "internal_approval_recorded",
      displayStatus: "内部审批已备案",
      category: String(req.body?.category ?? "按集团制度备案"),
      buyer: req.auth.user.name,
      quoteDeadlineAt: null,
      beforeDeadline: false,
      externalTradeFlag: true,
      participantSupplierIds: [],
      assignedExpertIds: []
    };
    ctx.state.projects.push(project);
    req.auth.user.managedProjectIds = [...(req.auth.user.managedProjectIds ?? []), project.id];
    const record = ensureRecord(ctx, req, project);
    record.internalApprovalStatus = "recorded";
    record.internalApprovalOpinion = String(req.body?.internalApprovalOpinion ?? "内部审批已备案");
    setExternalStatus(project, record, "internal_approval_recorded", "内部审批已备案");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.project.create", "project", id, id);
    return res.status(201).json({ project, record, auditLogId: log.id });
  });

  router.get("/external-trades/:projectId", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.read.denied")) return;
    if (!assertReader(ctx, req, res, project, "external_trade.read.denied")) return;
    return res.json({ project, record: ensureRecord(ctx, req, project) });
  });

  router.post("/external-trades/:projectId/internal-approval", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.internal_approval.denied")) return;
    if (!assertMaintainer(ctx, req, res, project, "external_trade.internal_approval.denied")) return;
    const record = ensureRecord(ctx, req, project);
    record.internalApprovalStatus = "recorded";
    record.internalApprovalOpinion = String(req.body?.opinion ?? "internal approval recorded");
    setExternalStatus(project, record, "internal_approval_recorded", "internal approval recorded");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.internal_approval.record", "external_trade_record", record.id, project.id);
    return res.json({ project, record, auditLogId: log.id });
  });

  router.post("/external-trades/:projectId/external-project", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.project_record.denied")) return;
    if (!assertMaintainer(ctx, req, res, project, "external_trade.project_record.denied")) return;
    const record = ensureRecord(ctx, req, project);
    record.externalPlatformName = String(req.body?.externalPlatformName ?? record.externalPlatformName ?? "").trim();
    record.externalProjectCode = String(req.body?.externalProjectCode ?? record.externalProjectCode ?? "").trim();
    if (!record.externalPlatformName || !record.externalProjectCode) {
      return denyResponse(ctx, req, res, 400, "EXTERNAL_PROJECT_CODE_REQUIRED", "External platform name and project code are required.", "external_trade.project_record.invalid", "external_trade_record", record.id, project.id);
    }
    setExternalStatus(project, record, "external_project_recorded", "external project recorded");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.project_record", "external_trade_record", record.id, project.id);
    return res.json({ project, record, auditLogId: log.id });
  });

  router.post("/external-trades/:projectId/announcement-materials", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.announcement_material.denied")) return;
    if (!assertMaintainer(ctx, req, res, project, "external_trade.announcement_material.denied")) return;
    const record = ensureRecord(ctx, req, project);
    const material = toAttachment(req.body?.material, `ext-ann-${record.announcementMaterialMetadata.length + 1}`);
    record.announcementMaterialMetadata.push(material);
    setExternalStatus(project, record, "external_announcement_uploaded", "external announcement material uploaded");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.announcement_material.upload", "external_trade_record", record.id, project.id, material.fileName);
    return res.status(201).json({ project, record, material, auditLogId: log.id });
  });

  router.post("/external-trades/:projectId/result-materials", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.result_material.denied")) return;
    if (!assertMaintainer(ctx, req, res, project, "external_trade.result_material.denied")) return;
    const record = ensureRecord(ctx, req, project);
    const material = toAttachment(req.body?.material, `ext-result-${record.resultMaterialMetadata.length + 1}`);
    record.resultMaterialMetadata.push(material);
    setExternalStatus(project, record, "external_result_uploaded", "external result material uploaded");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.result_material.upload", "external_trade_record", record.id, project.id, material.fileName);
    return res.status(201).json({ project, record, material, auditLogId: log.id });
  });

  router.post("/external-trades/:projectId/result-record", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.result_record.denied")) return;
    if (!assertMaintainer(ctx, req, res, project, "external_trade.result_record.denied")) return;
    const record = ensureRecord(ctx, req, project);
    if (record.resultMaterialMetadata.length === 0) {
      return denyResponse(ctx, req, res, 400, "EXTERNAL_RESULT_MATERIAL_REQUIRED", "External result material metadata is required before result filing.", "external_trade.result_record.invalid", "external_trade_record", record.id, project.id);
    }
    record.resultRecordStatus = "recorded";
    setExternalStatus(project, record, "external_result_recorded", "external result recorded");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.result_record", "external_trade_record", record.id, project.id);
    return res.json({ project, record, auditLogId: log.id });
  });

  router.post("/external-trades/:projectId/records", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertExternalProject(ctx, req, res, project, "external_trade.record.denied")) return;
    if (!assertMaintainer(ctx, req, res, project, "external_trade.record.denied")) return;
    const record = ensureRecord(ctx, req, project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "external_trade.record.save", "external_trade_record", record.id, project.id);
    return res.json({ record, auditLogId: log.id });
  });

  return router;
}
