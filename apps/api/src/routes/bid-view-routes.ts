import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { BidViewApproval, BidViewContent } from "../types.js";
import { isProcurementBuyerRole, userOrgScope } from "../role-groups.js";

const requesterRoles = new Set(["buyer", "group_manager", "auditor"]);
const approverRoles = new Set(["group_manager", "auditor"]);

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

function ensureApproval(ctx: AppContext, approvalId: string, res: Response) {
  const approval = ctx.state.bidViewApprovals.find((item) => item.id === approvalId);
  if (!approval) {
    res.status(404).json({ error: { code: "APPROVAL_NOT_FOUND", message: "Bid view approval does not exist." } });
    return null;
  }
  return approval;
}

function canReadProject(req: Request, ctx: AppContext, projectId: string) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) return false;
  if (isProcurementBuyerRole(req.auth.roleId)) return (req.auth.user.managedProjectIds?.includes(project.id) ?? false) || userOrgScope(req.auth.user).includes(project.orgId);
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return userOrgScope(req.auth.user).includes(project.orgId);
  return false;
}

function supplierBelongsToProject(ctx: AppContext, projectId: string, supplierId: string) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  return Boolean(
    project?.participantSupplierIds.includes(supplierId) ||
      ctx.state.supplierRegistrations.some((item) => item.projectId === projectId && item.supplierId === supplierId && item.status === "qualified") ||
      ctx.state.bids.some((item) => item.projectId === projectId && item.supplierId === supplierId)
  );
}

function assertRequesterRole(ctx: AppContext, req: Request, res: Response, objectId: string, projectId?: string) {
  if (requesterRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "BID_VIEW_APPROVAL_ROLE_DENIED", "Current role cannot request abnormal bid view approval.", "bid_view_approval.role.denied", "bid_view_approval", objectId, projectId);
  return false;
}

function assertApproverRole(ctx: AppContext, req: Request, res: Response, approval: BidViewApproval) {
  if (approverRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "BID_VIEW_APPROVAL_APPROVER_DENIED", "Current role cannot approve abnormal bid view requests.", "bid_view_approval.approve.denied", "bid_view_approval", approval.id, approval.projectId);
  return false;
}

function assertApprovalApplicant(ctx: AppContext, req: Request, res: Response, approval: BidViewApproval, action: string) {
  if (approval.applicantId === req.auth.user.id) return true;
  denyResponse(ctx, req, res, 403, "BID_VIEW_APPROVAL_OWNER_DENIED", "Only the approval applicant can use this abnormal view approval.", `bid_view_approval.${action}.denied`, "bid_view_approval", approval.id, approval.projectId);
  return false;
}

function recordAllowedBidView(ctx: AppContext, req: Request, approval: BidViewApproval, content: BidViewContent, download: boolean) {
  ctx.state.bidViewLogs.push({
    id: `bvl-${String(ctx.state.bidViewLogs.length + 1).padStart(6, "0")}`,
    approvalId: approval.id,
    actorId: req.auth.user.id,
    projectId: approval.projectId,
    supplierId: approval.targetSupplierId,
    content,
    downloadFlag: download,
    result: "allowed",
    createdAt: new Date().toISOString()
  });
}

export function bidViewRoutes(ctx: AppContext) {
  const router = Router();

  router.post("/bid-view-approvals", (req, res) => {
    if (!assertRequesterRole(ctx, req, res, "new", String(req.body?.projectId ?? ""))) return;
    const projectId = String(req.body?.projectId ?? "");
    if (!canReadProject(req, ctx, projectId)) {
      return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot request approval for this project.", "bid_view_approval.project.denied", "project", projectId, projectId);
    }
    const targetSupplierId = String(req.body?.targetSupplierId ?? "");
    if (!supplierBelongsToProject(ctx, projectId, targetSupplierId)) {
      return denyResponse(ctx, req, res, 400, "BID_VIEW_TARGET_INVALID", "Target supplier must belong to the project.", "bid_view_approval.target.denied", "supplier", targetSupplierId, projectId);
    }
    const approval: BidViewApproval = {
      id: `bva-${ctx.state.bidViewApprovals.length + 1}`,
      projectId,
      applicantId: req.auth.user.id,
      targetSupplierId,
      viewContent: (req.body?.viewContent ?? "response_file_metadata") as BidViewContent,
      allowDownload: Boolean(req.body?.allowDownload),
      validFrom: String(req.body?.validFrom ?? new Date().toISOString()),
      validUntil: String(req.body?.validUntil ?? "2099-12-31T23:59:59.000Z"),
      approvalStatus: "draft"
    };
    ctx.state.bidViewApprovals.push(approval);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_view_approval.create", "bid_view_approval", approval.id, approval.projectId);
    return res.status(201).json({ approval, auditLogId: log.id });
  });

  router.post("/bid-view-approvals/:approvalId/submit", (req, res) => {
    const approval = ensureApproval(ctx, req.params.approvalId, res);
    if (!approval) return;
    if (approval.applicantId !== req.auth.user.id) {
      return denyResponse(ctx, req, res, 403, "BID_VIEW_APPROVAL_OWNER_DENIED", "Only the applicant can submit this approval.", "bid_view_approval.submit.denied", "bid_view_approval", approval.id, approval.projectId);
    }
    approval.approvalStatus = "submitted";
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_view_approval.submit", "bid_view_approval", approval.id, approval.projectId);
    return res.json({ approval, auditLogId: log.id });
  });

  router.post("/bid-view-approvals/:approvalId/approve", (req, res) => {
    const approval = ensureApproval(ctx, req.params.approvalId, res);
    if (!approval) return;
    if (!assertApproverRole(ctx, req, res, approval)) return;
    if (!canReadProject(req, ctx, approval.projectId)) {
      return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot approve this project.", "bid_view_approval.approve.project.denied", "bid_view_approval", approval.id, approval.projectId);
    }
    if (approval.applicantId === req.auth.user.id) {
      return denyResponse(ctx, req, res, 403, "BID_VIEW_APPROVAL_SELF_APPROVAL_DENIED", "Applicant cannot approve their own abnormal bid view request.", "bid_view_approval.self_approve.denied", "bid_view_approval", approval.id, approval.projectId);
    }
    if (approval.approvalStatus !== "submitted") {
      return denyResponse(ctx, req, res, 400, "BID_VIEW_APPROVAL_STATUS_DENIED", "Only submitted abnormal bid view requests can be approved.", "bid_view_approval.status.denied", "bid_view_approval", approval.id, approval.projectId, `status=${approval.approvalStatus}`);
    }
    approval.approvalStatus = Boolean(req.body?.approved ?? true) ? "active" : "rejected";
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_view_approval.approve", "bid_view_approval", approval.id, approval.projectId, "approval chain is mock/stub");
    return res.json({ approval, auditLogId: log.id });
  });

  router.get("/bid-view-approvals/active", (req, res) => {
    const now = Date.now();
    const active = ctx.state.bidViewApprovals.filter(
      (item) => item.applicantId === req.auth.user.id && item.approvalStatus === "active" && new Date(item.validFrom).getTime() <= now && new Date(item.validUntil).getTime() >= now
    );
    return res.json({ approvals: active });
  });

  router.post("/bid-view-approvals/:approvalId/validate", (req, res) => {
    const approval = ensureApproval(ctx, req.params.approvalId, res);
    if (!approval) return;
    if (!assertApprovalApplicant(ctx, req, res, approval, "validate")) return;
    const bid = ctx.state.bids.find((item) => item.projectId === approval.projectId && item.supplierId === String(req.body?.supplierId ?? approval.targetSupplierId));
    if (!bid) return res.status(404).json({ error: { code: "BID_NOT_FOUND", message: "Bid does not exist." } });
    const content = (req.body?.content ?? approval.viewContent) as BidViewContent;
    const download = Boolean(req.body?.download);
    ctx.policies.bidConfidentiality.assertBidAccess(req.auth, bid, content, { approvalId: approval.id, download });
    recordAllowedBidView(ctx, req, approval, content, download);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_view_approval.validate.allowed", "bid_view_approval", approval.id, approval.projectId);
    return res.json({ allowed: true, approvalId: approval.id, auditLogId: log.id });
  });

  router.get("/bid-view-approvals/:approvalId/content", (req, res) => {
    const approval = ensureApproval(ctx, req.params.approvalId, res);
    if (!approval) return;
    if (!assertApprovalApplicant(ctx, req, res, approval, "content")) return;
    const bid = ctx.state.bids.find((item) => item.projectId === approval.projectId && item.supplierId === approval.targetSupplierId);
    if (!bid) return res.status(404).json({ error: { code: "BID_NOT_FOUND", message: "Bid does not exist." } });
    ctx.policies.bidConfidentiality.assertBidAccess(req.auth, bid, approval.viewContent, { approvalId: approval.id, download: approval.viewContent === "response_file_download" });
    recordAllowedBidView(ctx, req, approval, approval.viewContent, approval.viewContent === "response_file_download");
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_view_approval.content.allowed", "bid_view_approval", approval.id, approval.projectId);
    return res.json({
      content: {
        projectId: bid.projectId,
        supplierId: bid.supplierId,
        viewContent: approval.viewContent,
        amount: approval.viewContent === "amount" ? bid.amount : undefined,
        fileName: approval.viewContent !== "amount" ? bid.fileName : undefined
      },
      approvalId: approval.id,
      auditLogId: log.id
    });
  });

  router.get("/bid-view-logs", (req, res) => {
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "bid_view_log", "list");
    }
    if (!["buyer", "group_manager", "auditor"].includes(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "BID_VIEW_LOG_ROLE_DENIED", "Current role cannot view abnormal bid view logs.", "bid_view_log.read.denied", "bid_view_log", "list");
    }
    return res.json({ bidViewLogs: ctx.state.bidViewLogs });
  });

  return router;
}
