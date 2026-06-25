import type { Request, Response } from "express";
import type { AppContext } from "../app-context.js";
import type { AuditLog, ProcurementProject, ProcurementRequest } from "../types.js";
import { isAuditReaderRoleId, isOrgReaderRole, isProcurementBuyerRole, isSupplierRole, supplierIdMatches, userOrgScope } from "../role-groups.js";

export function denyResponse(
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

export function canReadOrg(req: Request, orgId: string) {
  if (isOrgReaderRole(req.auth.roleId)) {
    return req.auth.orgScope.includes(orgId);
  }
  return false;
}

export function canReadProject(req: Request, project: ProcurementProject) {
  if (isProcurementBuyerRole(req.auth.roleId)) {
    return (req.auth.user.managedProjectIds?.includes(project.id) ?? false) || userOrgScope(req.auth.user).includes(project.orgId);
  }
  if (req.auth.roleId === "auditor" || req.auth.roleId === "finance_reviewer" || req.auth.roleId === "hotel_finance") return req.auth.orgScope.includes(project.orgId);
  if (isSupplierRole(req.auth.roleId)) return project.participantSupplierIds.some((supplierId) => supplierIdMatches(req.auth.user, supplierId));
  if (req.auth.roleId === "expert") return project.assignedExpertIds.includes(req.auth.user.expertId ?? "");
  return false;
}

export function canReadProcurementRequest(req: Request, ctx: AppContext, procurementRequest: ProcurementRequest) {
  if (canReadOrg(req, procurementRequest.orgId)) return true;
  if (!procurementRequest.projectId) return false;
  const project = ctx.state.projects.find((item) => item.id === procurementRequest.projectId);
  return project ? canReadProject(req, project) : false;
}

export function projectForAuditLog(ctx: AppContext, log: AuditLog) {
  return log.projectId ? ctx.state.projects.find((project) => project.id === log.projectId) : undefined;
}

export function canReadAuditLog(req: Request, ctx: AppContext, log: AuditLog) {
  const project = projectForAuditLog(ctx, log);
  if (project) return canReadProject(req, project);
  return canReadOrg(req, log.orgId);
}

export function isAuditReaderRole(roleId: string) {
  return isAuditReaderRoleId(roleId);
}

export function assertAuditReader(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string, projectId?: string) {
  if (isAuditReaderRole(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "AUDIT_LOG_READ_DENIED", "Current role cannot read audit logs.", "audit_log.read.denied", objectType, objectId, projectId);
  return false;
}
