import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { AwardApproval, InternalProjectStatus, PricingReport, PricingReportItem, ProcurementProject, ResultNotification } from "../types.js";

const awardMaintainerRoles = new Set(["buyer", "group_manager"]);
const awardReaderRoles = new Set(["buyer", "group_manager", "auditor"]);

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

function assertAwardMaintainer(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_award");
  if (!awardMaintainerRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "AWARD_MAINTAINER_REQUIRED", "Only procurement business roles can maintain award approvals.", action, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot maintain award approval for this project.", action, "project", project.id, project.id);
}

function assertAwardReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!awardReaderRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "AWARD_READ_DENIED", "Current role cannot read award approval records.", action, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read award approval for this project.", action, "project", project.id, project.id);
}

function buildAwardRecommendation(ctx: AppContext, projectId: string) {
  const report = [...ctx.state.reviewReports].reverse().find((item) => item.projectId === projectId && item.status === "frozen");
  const comparison = [...ctx.state.comparisonReports].reverse().find((item) => item.projectId === projectId && item.status === "frozen");
  const summary = (report?.summaryJson ?? {}) as { recommendation?: { supplierId?: string; isLowestPrice?: boolean; note?: string }; ranking?: Array<{ supplierId: string; rank: number; total: number }> };
  const recommendedSupplierId = summary.recommendation?.supplierId ?? summary.ranking?.[0]?.supplierId ?? comparison?.recommendedSupplierId ?? "";
  const supplier = ctx.state.suppliers.find((item) => item.id === recommendedSupplierId);
  const lowestBid = ctx.state.bids.filter((item) => item.projectId === projectId).sort((a, b) => a.amount - b.amount)[0];
  const candidateSupplierIds = [
    ...(summary.recommendation?.supplierId ? [summary.recommendation.supplierId] : []),
    ...(summary.ranking?.map((item) => item.supplierId) ?? []),
    ...(comparison?.comparisonRows.map((item) => item.supplierId) ?? [])
  ].filter((supplierId, index, array) => supplierId && array.indexOf(supplierId) === index);
  return {
    projectId,
    recommendedSupplierId,
    recommendedSupplierName: supplier?.name ?? recommendedSupplierId,
    isLowestPrice: lowestBid ? lowestBid.supplierId === recommendedSupplierId : Boolean(summary.recommendation?.isLowestPrice),
    sourceReportId: report?.id ?? comparison?.id ?? null,
    candidateSupplierIds,
    note: summary.recommendation?.note ?? comparison?.awardReason ?? "recommendation from frozen review or comparison report"
  };
}

function isBeforeDeadline(project: ProcurementProject) {
  if (!project.quoteDeadlineAt) return false;
  return new Date(project.quoteDeadlineAt).getTime() > Date.now();
}

function assertFrozenReviewReport(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string, recommendation: ReturnType<typeof buildAwardRecommendation>) {
  if (recommendation.sourceReportId) return true;
  return denyResponse(ctx, req, res, 400, "REVIEW_REPORT_FROZEN_REQUIRED", "Frozen review report or frozen comparison report is required before award approval.", action, "project", project.id, project.id);
}

function assertValidAwardSupplier(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, selectedSupplierId: string) {
  if (isBeforeDeadline(project)) {
    return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Award approval is allowed only after quote deadline.", "award_approval.deadline.denied", "project", project.id, project.id, "deadline not reached");
  }
  const bid = ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === selectedSupplierId && ["submitted", "locked"].includes(item.status));
  if (!bid) {
    return denyResponse(ctx, req, res, 400, "AWARD_SUPPLIER_BID_INVALID", "Selected supplier must have a submitted or locked bid.", "award_approval.bid.denied", "project", project.id, project.id);
  }
  const supplier = ctx.state.suppliers.find((item) => item.id === selectedSupplierId);
  if (!supplier) {
    return denyResponse(ctx, req, res, 404, "AWARD_SUPPLIER_NOT_FOUND", "Selected supplier does not exist.", "award_approval.supplier.denied", "project", project.id, project.id);
  }
  if (supplier.status === "restricted" || supplier.admissionStatus === "restricted" || supplier.restrictionReason || supplier.risk.includes("黑名单")) {
    return denyResponse(ctx, req, res, 400, "AWARD_SUPPLIER_RESTRICTED", "Restricted supplier cannot be selected for award.", "award_approval.supplier_restricted.denied", "supplier", selectedSupplierId, project.id);
  }
  return true;
}

function projectToAwardApproving(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "award_approving" satisfies InternalProjectStatus;
  project.displayStatus = "award approving";
}

function projectToResultNotified(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "result_notified" satisfies InternalProjectStatus;
  project.displayStatus = "result notified";
}

function projectToAwardedPendingOrder(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "awarded_pending_order" satisfies InternalProjectStatus;
  project.displayStatus = "awarded pending order";
}

function ensureAwardApproval(ctx: AppContext, approvalId: string, res: Response) {
  const approval = ctx.state.awardApprovals.find((item) => item.id === approvalId);
  if (!approval) {
    res.status(404).json({ error: { code: "AWARD_APPROVAL_NOT_FOUND", message: "Award approval does not exist." } });
    return null;
  }
  return approval;
}

function buildPricingItems(ctx: AppContext, project: ProcurementProject, approval: AwardApproval, reportId: string): PricingReportItem[] {
  const selectedBid = ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === approval.selectedSupplierId && ["locked", "submitted"].includes(item.status));
  const today = new Date().toISOString().slice(0, 10);
  const effectiveTo = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);
  const sourceItems =
    selectedBid?.lineItems && selectedBid.lineItems.length > 0
      ? selectedBid.lineItems.map((item) => ({
          itemName: item.itemName,
          specification: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          purchasePrice: item.unitPrice
        }))
      : [
          {
            itemName: "中选报价明细",
            specification: "按中选报价单",
            quantity: 1,
            unit: "项",
            purchasePrice: selectedBid?.amount ?? 0
          }
        ];
  return sourceItems.map((item, index) => {
    const serviceFeeRate = 0.08;
    const salePrice = Number((item.purchasePrice * (1 + serviceFeeRate)).toFixed(2));
    const grossMarginRate = salePrice === 0 ? 0 : Number(((salePrice - item.purchasePrice) / salePrice).toFixed(4));
    return {
      id: `${reportId}-item-${index + 1}`,
      itemName: item.itemName,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      purchasePrice: item.purchasePrice,
      salePrice,
      serviceFeeRate,
      grossMarginRate,
      effectiveFrom: today,
      effectiveTo
    };
  });
}

function buildPricingReport(ctx: AppContext, req: Request, project: ProcurementProject, approval: AwardApproval): PricingReport {
  const reportId = `pr-${ctx.state.pricingReports.length + 1}`;
  const now = new Date().toISOString();
  const sourceReportId = buildAwardRecommendation(ctx, project.id).sourceReportId ?? approval.id;
  const items = buildPricingItems(ctx, project, approval, reportId);
  return {
    id: reportId,
    projectId: project.id,
    awardApprovalId: approval.id,
    sourceReportId,
    selectedSupplierId: approval.selectedSupplierId,
    reportNo: `PR-${project.code}`,
    status: "generated",
    items,
    basisJson: {
      sourceReportId,
      awardApprovalId: approval.id,
      selectedSupplierId: approval.selectedSupplierId,
      selectedBidId: ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === approval.selectedSupplierId && ["locked", "submitted"].includes(item.status))?.id,
      serviceFeeRate: 0.08
    },
    createdBy: req.auth.user.id,
    createdAt: now,
    updatedAt: now,
    approvedAt: null
  };
}

function publicResultForSupplier(ctx: AppContext, notification: ResultNotification, supplierId: string) {
  if (notification.scope !== "supplier_self") return null;
  const approval = ctx.state.awardApprovals.find((item) => item.id === notification.awardApprovalId && item.approvalStatus === "approved");
  const selfSelected = approval?.selectedSupplierId === supplierId;
  return {
    id: notification.id,
    projectId: notification.projectId,
    supplierId,
    status: notification.status,
    selected: selfSelected,
    visibilityConfig: notification.visibilityConfig,
    winnerName: notification.visibilityConfig === "show_winner_name" ? ctx.state.suppliers.find((item) => item.id === approval?.selectedSupplierId)?.name : undefined,
    contentSummary: selfSelected ? notification.contentSummary : "supplier self result only"
  };
}

function latestApprovedAwardApproval(ctx: AppContext, projectId: string) {
  return [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === projectId && item.approvalStatus === "approved");
}

function latestSupplierResultNotifications(ctx: AppContext, project: ProcurementProject, supplierId: string) {
  const approval = latestApprovedAwardApproval(ctx, project.id);
  if (!approval) return [];
  const latestBySupplier = new Map<string, ResultNotification>();
  for (const notification of ctx.state.resultNotifications) {
    if (
      notification.projectId !== project.id ||
      notification.awardApprovalId !== approval.id ||
      notification.supplierId !== supplierId ||
      notification.scope !== "supplier_self" ||
      notification.status !== "sent"
    ) {
      continue;
    }
    const existing = latestBySupplier.get(supplierId);
    const existingTime = existing ? new Date(existing.sentAt ?? existing.createdAt).getTime() : -Infinity;
    const currentTime = new Date(notification.sentAt ?? notification.createdAt).getTime();
    if (!existing || currentTime >= existingTime) latestBySupplier.set(supplierId, notification);
  }
  return Array.from(latestBySupplier.values());
}

export function awardRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/projects/:projectId/award-recommendation", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardReader(ctx, req, res, project, "award_recommendation.read.denied")) return;
    return res.json({ recommendation: buildAwardRecommendation(ctx, project.id) });
  });

  router.post("/projects/:projectId/award-approvals", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardMaintainer(ctx, req, res, project, "award_approval.create.denied")) return;
    if (isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Award approval is allowed only after quote deadline.", "award_approval.deadline.denied", "project", project.id, project.id, "deadline not reached");
    }
    const recommendation = buildAwardRecommendation(ctx, project.id);
    if (!assertFrozenReviewReport(ctx, req, res, project, "award_approval.review_report.denied", recommendation)) return;
    const selectedSupplierId = String(req.body?.selectedSupplierId ?? recommendation.recommendedSupplierId);
    if (!project.participantSupplierIds.includes(selectedSupplierId) || !recommendation.candidateSupplierIds.includes(selectedSupplierId)) {
      return denyResponse(ctx, req, res, 400, "AWARD_SUPPLIER_NOT_RECOMMENDED", "Selected supplier must be a project participant and frozen-report candidate.", "award_approval.supplier.denied", "project", project.id, project.id);
    }
    if (!assertValidAwardSupplier(ctx, req, res, project, selectedSupplierId)) return;
    const lowestBid = ctx.state.bids.filter((item) => item.projectId === project.id).sort((a, b) => a.amount - b.amount)[0];
    const isLowestPrice = lowestBid?.supplierId === selectedSupplierId;
    const nonLowestPriceReason = String(req.body?.nonLowestPriceReason ?? "").trim();
    if (!isLowestPrice && !nonLowestPriceReason) {
      return denyResponse(ctx, req, res, 400, "NON_LOWEST_PRICE_REASON_REQUIRED", "Non-lowest-price award reason is required.", "award_approval.reason.denied", "project", project.id, project.id);
    }
    const now = new Date().toISOString();
    const approval: AwardApproval = {
      id: `aa-${ctx.state.awardApprovals.length + 1}`,
      projectId: project.id,
      recommendedSupplierId: recommendation.recommendedSupplierId,
      selectedSupplierId,
      isLowestPrice,
      nonLowestPriceReason: nonLowestPriceReason || undefined,
      approvalStatus: "draft",
      approvalOpinion: String(req.body?.approvalOpinion ?? ""),
      createdBy: req.auth.user.id,
      createdAt: now,
      submittedAt: null,
      approvedAt: null
    };
    ctx.state.awardApprovals.push(approval);
    projectToAwardApproving(project);
    ctx.r5ReviewAwardRepository.upsertAwardApproval(approval);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "award_approval.create", "award_approval", approval.id, project.id);
    return res.status(201).json({ approval, auditLogId: auditLog.id });
  });

  router.post("/award-approvals/:approvalId/submit", (req, res) => {
    const approval = ensureAwardApproval(ctx, req.params.approvalId, res);
    if (!approval) return;
    const project = ensureProject(ctx, approval.projectId, res);
    if (!project) return;
    if (!assertAwardMaintainer(ctx, req, res, project, "award_approval.submit.denied")) return;
    if (approval.approvalStatus !== "draft") {
      return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_STATUS_DENIED", "Only draft award approvals can be submitted.", "award_approval.status.denied", "award_approval", approval.id, project.id, `status=${approval.approvalStatus}`);
    }
    let workflow: ReturnType<AppContext["r8WorkflowTaskRepository"]["startApproval"]>;
    try {
      workflow = ctx.r8WorkflowTaskRepository.startApproval({
        businessType: "award_approval",
        businessId: approval.id,
        title: `Award approval ${project.name}`,
        amount: project.budgetAmount,
        methodType: project.type,
        projectId: project.id,
        orgId: project.orgId,
        supplierId: approval.selectedSupplierId,
        initiator: req.auth.user,
        sourceJson: { route: "award_approval.submit", projectId: project.id }
      });
    } catch (error) {
      return res.status(400).json({ error: { code: "AWARD_APPROVAL_WORKFLOW_BLOCKED", message: error instanceof Error ? error.message : "Award workflow blocked." } });
    }
    approval.approvalStatus = "submitted";
    approval.submittedAt = new Date().toISOString();
    const adapterLog = ctx.adapters.oa.call("award_approval.submit", { approvalId: approval.id, projectId: project.id });
    approval.adapterCallId = adapterLog.id;
    ctx.r5ReviewAwardRepository.upsertAwardApproval(approval);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "award_approval.submit", "award_approval", approval.id, project.id, `adapter=${adapterLog.id}`);
    return res.json({ approval, workflow, adapterLog, auditLogId: auditLog.id });
  });

  router.post("/award-approvals/:approvalId/mock-approve", (req, res) => {
    const approval = ensureAwardApproval(ctx, req.params.approvalId, res);
    if (!approval) return;
    const project = ensureProject(ctx, approval.projectId, res);
    if (!project) return;
    if (!assertAwardMaintainer(ctx, req, res, project, "award_approval.approve.denied")) return;
    if (approval.approvalStatus !== "submitted") {
      return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_STATUS_DENIED", "Only submitted award approvals can be mock-approved.", "award_approval.status.denied", "award_approval", approval.id, project.id, `status=${approval.approvalStatus}`);
    }
    approval.approvalStatus = Boolean(req.body?.approved ?? true) ? "approved" : "rejected";
    approval.approvalOpinion = String(req.body?.approvalOpinion ?? approval.approvalOpinion ?? "mock approval");
    approval.approvedAt = new Date().toISOString();
    if (approval.approvalStatus === "approved") {
      projectToAwardedPendingOrder(project);
    }
    try {
      ctx.r8WorkflowTaskRepository.recordApprovalAction({
        businessType: "award_approval",
        businessId: approval.id,
        actor: req.auth.user,
        action: approval.approvalStatus === "approved" ? "approve" : "reject",
        opinion: approval.approvalOpinion,
        sourceJson: { route: "award_approval.mock_approve", projectId: project.id }
      });
    } catch {
      // Legacy mock-approve stays compatible with existing R5 tests.
    }
    const adapterLog = ctx.adapters.oa.call("award_approval.mock_approve", { approvalId: approval.id, status: approval.approvalStatus });
    approval.adapterCallId = adapterLog.id;
    ctx.r5ReviewAwardRepository.upsertAwardApproval(approval);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "award_approval.mock_approve", "award_approval", approval.id, project.id, `adapter=${adapterLog.id}`);
    return res.json({ approval, adapterLog, auditLogId: auditLog.id });
  });

  router.post("/projects/:projectId/pricing-reports", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardMaintainer(ctx, req, res, project, "pricing_report.generate.denied")) return;
    const approvalId = req.body?.awardApprovalId === undefined ? undefined : String(req.body.awardApprovalId);
    const approval =
      (approvalId ? ctx.state.awardApprovals.find((item) => item.id === approvalId && item.projectId === project.id) : undefined) ??
      [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === project.id && item.approvalStatus === "approved");
    if (!approval || approval.approvalStatus !== "approved") {
      return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_NOT_APPROVED", "Approved award approval is required before pricing report.", "pricing_report.award.denied", "project", project.id, project.id);
    }
    const existing = ctx.state.pricingReports.find((item) => item.projectId === project.id && item.awardApprovalId === approval.id && item.status !== "voided");
    if (existing) return res.json({ pricingReport: existing });
    const report = buildPricingReport(ctx, req, project, approval);
    ctx.state.pricingReports.push(report);
    ctx.r5ReviewAwardRepository.upsertPricingReport(report);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "pricing_report.generate", "pricing_report", report.id, project.id, `awardApproval=${approval.id}`);
    return res.status(201).json({ pricingReport: report, auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId/pricing-reports", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardReader(ctx, req, res, project, "pricing_report.read.denied")) return;
    return res.json({ pricingReports: ctx.state.pricingReports.filter((item) => item.projectId === project.id) });
  });

  router.get("/projects/:projectId/award-approvals", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardReader(ctx, req, res, project, "award_approval.read.denied")) return;
    return res.json({ approvals: ctx.state.awardApprovals.filter((item) => item.projectId === project.id) });
  });

  router.post("/projects/:projectId/result-notifications", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardMaintainer(ctx, req, res, project, "result_notification.create.denied")) return;
    const approval = latestApprovedAwardApproval(ctx, project.id);
    if (!approval) {
      return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_NOT_APPROVED", "Approved award approval is required before result notification.", "result_notification.approval.denied", "project", project.id, project.id);
    }
    const scope = String(req.body?.scope ?? "supplier_self");
    const visibilityConfig = String(req.body?.visibilityConfig ?? "supplier_self_only");
    if (scope !== "supplier_self" && scope !== "internal_publicity") {
      return denyResponse(ctx, req, res, 400, "RESULT_NOTIFICATION_SCOPE_INVALID", "Result notification scope is invalid.", "result_notification.scope.denied", "project", project.id, project.id);
    }
    if (visibilityConfig !== "supplier_self_only" && visibilityConfig !== "show_winner_name") {
      return denyResponse(ctx, req, res, 400, "RESULT_VISIBILITY_CONFIG_INVALID", "Result visibility config is invalid.", "result_notification.visibility.denied", "project", project.id, project.id);
    }
    const now = new Date().toISOString();
    const baseIndex = ctx.state.resultNotifications.length;
    const notificationTargets = scope === "supplier_self" ? project.participantSupplierIds : [undefined];
    const notifications: ResultNotification[] = notificationTargets.map((supplierId, index) => ({
      id: `rn-${baseIndex + index + 1}`,
      projectId: project.id,
      awardApprovalId: approval.id,
      supplierId,
      scope: scope as ResultNotification["scope"],
      status: "sent",
      visibilityConfig: visibilityConfig as ResultNotification["visibilityConfig"],
      contentSummary:
        scope === "internal_publicity"
          ? "internal result publicity notification"
          : supplierId === approval.selectedSupplierId
            ? "selected supplier notification"
            : "not selected supplier notification",
      sentAt: now,
      createdBy: req.auth.user.id,
      createdAt: now
    }));
    for (const notification of notifications) {
      const adapterLog = ctx.adapters.messageNotification.call("result_notification.send", { projectId: project.id, supplierId: notification.supplierId });
      notification.adapterCallId = adapterLog.id;
      ctx.state.resultNotifications.push(notification);
    }
    projectToResultNotified(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "result_notification.send", "project", project.id, project.id, `count=${notifications.length}`);
    return res.status(201).json({ notifications, auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId/result-notifications", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (req.auth.roleId === "supplier") {
      const supplierId = req.auth.user.supplierId ?? "";
      if (!project.participantSupplierIds.includes(supplierId)) {
        return denyResponse(ctx, req, res, 403, "SUPPLIER_RESULT_SCOPE_DENIED", "Supplier can only read own project result notification.", "result_notification.supplier_scope.denied", "project", project.id, project.id);
      }
      return res.json({
        notifications: latestSupplierResultNotifications(ctx, project, supplierId)
          .map((item) => publicResultForSupplier(ctx, item, supplierId))
          .filter(Boolean)
      });
    }
    if (!assertAwardReader(ctx, req, res, project, "result_notification.read.denied")) return;
    return res.json({ notifications: ctx.state.resultNotifications.filter((item) => item.projectId === project.id) });
  });

  router.post("/projects/:projectId/internal-publicity", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardMaintainer(ctx, req, res, project, "internal_publicity.create.denied")) return;
    const approval = latestApprovedAwardApproval(ctx, project.id);
    if (!approval) {
      return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_NOT_APPROVED", "Approved award approval is required before internal publicity.", "internal_publicity.approval.denied", "project", project.id, project.id);
    }
    const now = new Date().toISOString();
    const record = {
      id: `ipr-${ctx.state.internalPublicityRecords.length + 1}`,
      projectId: project.id,
      awardApprovalId: approval.id,
      status: "published" as const,
      visibilityConfig: "internal_only" as const,
      publishedAt: now,
      contentSummary: String(req.body?.contentSummary ?? "internal result publicity record"),
      createdBy: req.auth.user.id,
      createdAt: now
    };
    ctx.state.internalPublicityRecords.push(record);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "internal_publicity.publish", "internal_publicity", record.id, project.id);
    return res.status(201).json({ publicityRecord: record, auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId/internal-publicity", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertAwardReader(ctx, req, res, project, "internal_publicity.read.denied")) return;
    return res.json({ publicityRecords: ctx.state.internalPublicityRecords.filter((item) => item.projectId === project.id) });
  });

  return router;
}
