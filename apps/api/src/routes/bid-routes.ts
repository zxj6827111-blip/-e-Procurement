import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import type { AppContext } from "../app-context.js";
import type {
  Bid,
  BidStatus,
  BidViewContent,
  ComparisonReport,
  ComparisonReportRow,
  InternalProjectStatus,
  ProcurementDocumentAttachment,
  ProcurementProject
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

function ensureProject(ctx: AppContext, projectId: string, res: Response) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  return project;
}

function ensureBid(ctx: AppContext, bidId: string, res: Response) {
  const bid = ctx.state.bids.find((item) => item.id === bidId);
  if (!bid) {
    res.status(404).json({ error: { code: "BID_NOT_FOUND", message: "Bid does not exist." } });
    return null;
  }
  return bid;
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
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot access this project.", "bid.project.scope.denied", "project", project.id, project.id);
  return false;
}

function assertSupplierBidOwner(ctx: AppContext, req: Request, res: Response, bid: Bid) {
  if (!isSupplierQuotationRole(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "SUPPLIER_ROLE_REQUIRED", "Only supplier quotation accounts can maintain bids.", "bid.supplier-role.denied", "bid", bid.id, bid.projectId);
  }
  if (supplierIdMatches(req.auth.user, bid.supplierId)) return true;
  denyResponse(ctx, req, res, 403, "SUPPLIER_BID_SCOPE_DENIED", "Suppliers can only maintain their own bids.", "bid.supplier.scope.denied", "bid", bid.id, bid.projectId);
  return false;
}

function assertSupplierCanBid(ctx: AppContext, req: Request, res: Response, project: ProcurementProject) {
  if (!isSupplierQuotationRole(req.auth.roleId) || !req.auth.user.supplierId) {
    return denyResponse(ctx, req, res, 403, "SUPPLIER_ROLE_REQUIRED", "Only supplier quotation accounts can submit bids.", "bid.supplier-role.denied", "project", project.id, project.id);
  }
  if (!project.participantSupplierIds.includes(req.auth.user.supplierId)) {
    return denyResponse(ctx, req, res, 403, "SUPPLIER_NOT_REGISTERED", "Supplier must complete registration before bidding.", "bid.registration.denied", "project", project.id, project.id);
  }
  return true;
}

function isBeforeDeadline(project: ProcurementProject) {
  if (!project.quoteDeadlineAt) return false;
  return new Date(project.quoteDeadlineAt).getTime() > Date.now();
}

function normalizeFileMetadata(raw: unknown, fallbackPrefix: string, now: string): ProcurementDocumentAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const input = (item ?? {}) as Record<string, unknown>;
    const size = Number(input.sizeBytes ?? 0);
    return {
      id: String(input.id ?? `${fallbackPrefix}-file-${index + 1}`),
      fileName: String(input.fileName ?? `response-${index + 1}.pdf`),
      contentType: String(input.contentType ?? "application/pdf"),
      sizeBytes: Number.isFinite(size) ? size : 0,
      uploadedAt: String(input.uploadedAt ?? now)
    };
  });
}

function amountFromLineItems(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(input.lineItems)) return Number(input.amount ?? 0);
  const total = input.lineItems.reduce((sum, item) => {
    const value = (item ?? {}) as Record<string, unknown>;
    return sum + Number(value.totalPrice ?? 0);
  }, 0);
  return total > 0 ? total : Number(input.amount ?? 0);
}

function parseLineItems(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  if (!Array.isArray(input.lineItems)) return undefined;
  return input.lineItems.map((item, index) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const quantity = Number(value.quantity ?? 0);
    const unitPrice = Number(value.unitPrice ?? 0);
    const taxRate = Number(value.taxRate ?? 0);
    const totalPrice = Number(value.totalPrice ?? quantity * unitPrice);
    return {
      id: String(value.id ?? `bid-line-${index + 1}`),
      itemName: String(value.itemName ?? `item-${index + 1}`),
      quantity,
      unit: String(value.unit ?? "项"),
      unitPrice,
      taxRate,
      totalPrice,
      deliveryDays: Number(value.deliveryDays ?? value.deliveryCycleDays ?? 0)
    };
  });
}

function bidFileMetadata(bid: Bid): ProcurementDocumentAttachment[] {
  return bid.responseFileMetadata ?? [
    {
      id: bid.fileId,
      fileName: bid.fileName,
      contentType: "application/pdf",
      sizeBytes: 0,
      uploadedAt: bid.submittedAt ?? new Date().toISOString()
    }
  ];
}

function latestVersionNo(ctx: AppContext, bidId: string) {
  return Math.max(0, ...ctx.state.bidVersions.filter((item) => item.bidId === bidId).map((item) => item.versionNo));
}

function recordBidVersion(ctx: AppContext, bid: Bid, reason: string) {
  const versionNo = latestVersionNo(ctx, bid.id) + 1;
  const version = {
    id: `bv-${ctx.state.bidVersions.length + 1}`,
    bidId: bid.id,
    projectId: bid.projectId,
    supplierId: bid.supplierId,
    versionNo,
    amount: bid.amount,
    taxRate: bid.taxRate,
    taxInclusive: bid.taxInclusive,
    taxNote: bid.taxNote,
    deliveryDays: bid.deliveryDays,
    responseSummary: bid.responseSummary,
    serviceCommitment: bid.serviceCommitment,
    status: bid.status,
    responseFileMetadata: structuredClone(bidFileMetadata(bid)),
    snapshotJson: {
      amount: bid.amount,
      taxRate: bid.taxRate,
      taxInclusive: bid.taxInclusive,
      taxNote: bid.taxNote,
      status: bid.status,
      submittedAt: bid.submittedAt,
      lockedAt: bid.lockedAt,
      fileId: bid.fileId,
      fileName: bid.fileName,
      deliveryDays: bid.deliveryDays,
      responseSummary: bid.responseSummary,
      serviceCommitment: bid.serviceCommitment,
      withdrawnAt: bid.withdrawnAt,
      withdrawalReason: bid.withdrawalReason,
      abandonedAt: bid.abandonedAt,
      abandonmentReason: bid.abandonmentReason
    },
    createdAt: new Date().toISOString(),
    reason
  };
  ctx.state.bidVersions.push(version);
  bid.versionNo = versionNo;
  return version;
}

function publicBidShape(req: Request, project: ProcurementProject, bid: Bid) {
  const base = {
    id: bid.id,
    projectId: bid.projectId,
    supplierId: bid.supplierId,
    status: bid.status,
    submittedAt: bid.submittedAt,
    quoteDeadlineAt: bid.quoteDeadlineAt,
    lockedAt: bid.lockedAt,
    versionNo: bid.versionNo ?? latestVersionNoFromBid(bid)
  };
  const canSeeBidBody =
    (isSupplierRole(req.auth.roleId) && supplierIdMatches(req.auth.user, bid.supplierId)) ||
    (isOrgReaderRole(req.auth.roleId) && !isBeforeDeadline(project));
  if (canSeeBidBody) {
    return {
      ...base,
      amount: bid.amount,
      taxRate: bid.taxRate,
      taxInclusive: bid.taxInclusive,
      taxNote: bid.taxNote,
      deliveryDays: bid.deliveryDays,
      responseSummary: bid.responseSummary,
      serviceCommitment: bid.serviceCommitment,
      withdrawalReason: bid.withdrawalReason,
      abandonedAt: bid.abandonedAt,
      abandonmentReason: bid.abandonmentReason,
      fileId: bid.fileId,
      fileName: bid.fileName,
      responseFileMetadata: bidFileMetadata(bid)
    };
  }
  return base;
}

function latestVersionNoFromBid(bid: Bid) {
  return bid.versionNo ?? 1;
}

function advanceProjectToBiddingLocked(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "bidding_locked" satisfies InternalProjectStatus;
  project.displayStatus = "bidding locked";
  project.beforeDeadline = false;
}

function advanceProjectToBiddingOpen(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "bidding_open" satisfies InternalProjectStatus;
  project.displayStatus = "bidding open";
  project.beforeDeadline = true;
}

function compareRows(ctx: AppContext, projectId: string): ComparisonReportRow[] {
  const bids = ctx.state.bids
    .filter((item) => item.projectId === projectId && item.status === "locked")
    .sort((a, b) => a.amount - b.amount);
  const submittedScores = ctx.state.scoringSheets.filter((item) => item.projectId === projectId && ["submitted_locked", "resubmitted_locked"].includes(item.status));
  const average = (supplierId: string, selector: (score: (typeof submittedScores)[number]) => number) => {
    const supplierScores = submittedScores.filter((item) => item.supplierId === supplierId);
    if (supplierScores.length === 0) return undefined;
    return Number((supplierScores.reduce((sum, item) => sum + selector(item), 0) / supplierScores.length).toFixed(2));
  };
  return bids.map((bid, index) => {
    const expertTotalScore = average(bid.supplierId, (score) => score.total);
    return {
      supplierId: bid.supplierId,
      supplierName: ctx.state.suppliers.find((item) => item.id === bid.supplierId)?.name ?? bid.supplierId,
      amount: bid.amount,
      deliveryDays: bid.deliveryDays ?? 0,
      serviceCommitment: bid.serviceCommitment ?? bid.responseSummary ?? "",
      technicalScore: average(bid.supplierId, (score) => score.technical),
      serviceScore: average(bid.supplierId, (score) => score.service),
      priceScore: average(bid.supplierId, (score) => score.price),
      expertTotalScore,
      finalScore: expertTotalScore,
      submittedScoreCount: submittedScores.filter((item) => item.supplierId === bid.supplierId).length,
      rank: index + 1,
      isLowestPrice: index === 0
    };
  });
}

function buildComparisonReport(ctx: AppContext, req: Request, project: ProcurementProject) {
  const rows = compareRows(ctx, project.id);
  const frozenReview = ctx.state.reviewReports
    .filter((item) => item.projectId === project.id)
    .reverse()
    .find((item) => item.status === "frozen");
  const reviewRecommendation = ((frozenReview?.summaryJson ?? {}) as { recommendation?: { supplierId?: string } }).recommendation;
  const winningByScore =
    reviewRecommendation?.supplierId ?? rows[0]?.supplierId;
  const lowest = rows[0];
  const recommendedSupplierId = winningByScore ?? lowest?.supplierId ?? "";
  const nonLowestPriceReason =
    lowest && recommendedSupplierId && lowest.supplierId !== recommendedSupplierId
      ? "最高综合评分供应商并非最低价，定标审批需补充非最低价原因。"
      : undefined;
  const report: ComparisonReport = {
    id: `cr-${ctx.state.comparisonReports.length + 1}`,
    projectId: project.id,
    reportNo: `CR-${project.code}`,
    status: "generated",
    comparisonRows: rows,
    recommendedSupplierId,
    awardReason: recommendedSupplierId === lowest?.supplierId ? "最低价且响应满足要求。" : "结合价格、商务和技术/服务维度形成推荐。",
    nonLowestPriceReason,
    generatedBy: req.auth.user.id,
    generatedAt: new Date().toISOString(),
    frozenAt: null
  };
  return report;
}

function ensureBidBeforeDeadline(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, bid: Bid) {
  if (bid.status === "locked" || project.status === "bidding_locked") {
    return denyResponse(ctx, req, res, 400, "BID_LOCKED", "Locked bids cannot be modified.", "bid.modify.denied", "bid", bid.id, project.id, "bid locked");
  }
  if (!isBeforeDeadline(project)) {
    return denyResponse(ctx, req, res, 400, "BID_DEADLINE_PASSED", "Bid deadline has passed.", "bid.deadline.denied", "bid", bid.id, project.id, "deadline passed");
  }
  return true;
}

function ensureProjectDeadlineReached(ctx: AppContext, req: Request, res: Response, project: ProcurementProject) {
  if (isBeforeDeadline(project)) {
    return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Bid locking is only allowed after the quote deadline.", "bid.lock.deadline.denied", "project", project.id, project.id, "deadline not reached");
  }
  return true;
}

export function bidRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/projects/:projectId/bids/summary", (req, res) => {
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "bid", "summary", req.params.projectId);
    }
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const projectBids = ctx.state.bids.filter((item) => item.projectId === project.id);
    if (req.auth.roleId === "expert" || (isBeforeDeadline(project) && !isSupplierRole(req.auth.roleId))) {
      const submittedCount = projectBids.filter((item) => item.status === "submitted").length;
      return res.json({ projectId: project.id, beforeDeadline: isBeforeDeadline(project), submittedCount, totalInvitedSuppliers: project.participantSupplierIds.length });
    }
    const visibleBids = isSupplierRole(req.auth.roleId) ? projectBids.filter((bid) => supplierIdMatches(req.auth.user, bid.supplierId)) : projectBids;
    return res.json({ projectId: project.id, beforeDeadline: isBeforeDeadline(project), bids: visibleBids.map((bid) => publicBidShape(req, project, bid)) });
  });

  router.post("/projects/:projectId/bids", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertSupplierCanBid(ctx, req, res, project)) return;
    if (!isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_PASSED", "Bid deadline has passed.", "bid.create.denied", "project", project.id, project.id);
    }
    const supplierId = req.auth.user.supplierId!;
    const existing = ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === supplierId && item.status !== "withdrawn");
    if (existing) {
      return denyResponse(ctx, req, res, 409, "BID_ALREADY_EXISTS", "Supplier already has an active bid for this project.", "bid.create.denied", "bid", existing.id, project.id);
    }
    const amount = amountFromLineItems(req.body);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: { code: "BID_AMOUNT_INVALID", message: "Bid amount must be a positive number." } });
    }
    const now = new Date().toISOString();
    const responseFileMetadata = resolveAttachments(ctx, req.body?.responseFileMetadata, {
      fallbackPrefix: `bid-${ctx.state.bids.length + 1}`,
      objectType: "bid",
      objectId: `bid-${ctx.state.bids.length + 1}`,
      attachmentKind: "bid_response_file",
      projectId: project.id,
      supplierId,
      uploadedBy: req.auth.user.id
    });
    const firstResponseFile = responseFileMetadata[0];
    const bid: Bid = {
      id: `bid-${ctx.state.bids.length + 1}`,
      projectId: project.id,
      supplierId,
      amount,
      taxRate: req.body?.taxRate === undefined ? undefined : Number(req.body.taxRate),
      taxInclusive: Boolean(req.body?.taxInclusive ?? false),
      taxNote: req.body?.taxNote === undefined ? undefined : String(req.body.taxNote),
      lineItems: parseLineItems(req.body),
      deliveryDays: req.body?.deliveryDays === undefined ? undefined : Number(req.body.deliveryDays),
      responseSummary: req.body?.responseSummary === undefined ? undefined : String(req.body.responseSummary),
      serviceCommitment: req.body?.serviceCommitment === undefined ? undefined : String(req.body.serviceCommitment),
      status: "draft",
      submittedAt: null,
      quoteDeadlineAt: project.quoteDeadlineAt ?? String(req.body?.quoteDeadlineAt ?? "2099-12-31T17:00:00.000Z"),
      lockedAt: null,
      fileId: firstResponseFile?.id ?? `file-bid-${ctx.state.bids.length + 1}`,
      fileName: firstResponseFile?.fileName ?? String(req.body?.fileName ?? "response-file.pdf"),
      versionNo: 0,
      withdrawnAt: null,
      responseFileMetadata
    };
    ctx.state.bids.push(bid);
    advanceProjectToBiddingOpen(project);
    ctx.r4SourcingRepository.upsertBid(bid);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.draft.create", "bid", bid.id, project.id);
    return res.status(201).json({ bid: publicBidShape(req, project, bid), auditLogId: auditLog.id });
  });

  router.post("/projects/:projectId/bids/abandon", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertSupplierCanBid(ctx, req, res, project)) return;
    if (!isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_PASSED", "Bid abandonment is only allowed before the deadline.", "bid.abandon.denied", "project", project.id, project.id);
    }
    const supplierId = req.auth.user.supplierId!;
    const existing = ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === supplierId && item.status !== "withdrawn");
    if (existing) {
      return denyResponse(ctx, req, res, 409, "BID_ACTIVE_EXISTS", "Supplier already has an active bid; withdraw that bid instead.", "bid.abandon.denied", "bid", existing.id, project.id);
    }
    const reason = String(req.body?.reason ?? req.body?.abandonmentReason ?? "").trim();
    if (!reason) return res.status(400).json({ error: { code: "BID_ABANDON_REASON_REQUIRED", message: "Abandonment reason is required." } });
    const timestamp = new Date().toISOString();
    const responseFileMetadata = resolveAttachments(ctx, req.body?.responseFileMetadata ?? req.body?.attachmentMetadata, {
      fallbackPrefix: `bid-abandon-${ctx.state.bids.length + 1}`,
      objectType: "bid",
      objectId: `bid-${ctx.state.bids.length + 1}`,
      attachmentKind: "bid_abandonment_file",
      projectId: project.id,
      supplierId,
      uploadedBy: req.auth.user.id
    });
    const bid: Bid = {
      id: `bid-${ctx.state.bids.length + 1}`,
      projectId: project.id,
      supplierId,
      amount: 0,
      taxInclusive: false,
      responseSummary: `供应商放弃应标：${reason}`,
      status: "withdrawn",
      submittedAt: null,
      quoteDeadlineAt: project.quoteDeadlineAt ?? String(req.body?.quoteDeadlineAt ?? "2099-12-31T17:00:00.000Z"),
      lockedAt: null,
      fileId: responseFileMetadata[0]?.id ?? `file-bid-abandon-${ctx.state.bids.length + 1}`,
      fileName: responseFileMetadata[0]?.fileName ?? "abandonment-record.txt",
      versionNo: 0,
      withdrawnAt: timestamp,
      abandonmentReason: reason,
      abandonedAt: timestamp,
      responseFileMetadata
    };
    ctx.state.bids.push(bid);
    const version = recordBidVersion(ctx, bid, "abandon");
    ctx.r4SourcingRepository.upsertBid(bid);
    ctx.r8WorkflowTaskRepository.createNotification({
      eventType: "bid.abandoned",
      businessType: "procurement_request",
      businessId: project.id,
      projectId: project.id,
      supplierId,
      recipientRoleId: "buyer",
      title: `Bid abandoned ${project.code}`,
      contentSummary: reason,
      sourceJson: { bidId: bid.id, versionNo: version.versionNo }
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.abandon", "bid", bid.id, project.id, reason);
    return res.status(201).json({ bid: publicBidShape(req, project, bid), version, auditLogId: auditLog.id });
  });

  router.patch("/bids/:bidId", (req, res) => {
    const bid = ensureBid(ctx, req.params.bidId, res);
    if (!bid) return;
    const project = ensureProject(ctx, bid.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertSupplierBidOwner(ctx, req, res, bid)) return;
    if (!ensureBidBeforeDeadline(ctx, req, res, project, bid)) return;
    if (!["draft", "withdrawn"].includes(bid.status)) {
      return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only draft or withdrawn bids can be edited.", "bid.update.denied", "bid", bid.id, project.id, `status=${bid.status}`);
    }
    const amount = req.body?.amount === undefined && req.body?.lineItems === undefined ? bid.amount : amountFromLineItems(req.body);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: { code: "BID_AMOUNT_INVALID", message: "Bid amount must be a positive number." } });
    }
    const now = new Date().toISOString();
    bid.amount = amount;
    bid.taxRate = req.body?.taxRate === undefined ? bid.taxRate : Number(req.body.taxRate);
    bid.taxInclusive = req.body?.taxInclusive === undefined ? bid.taxInclusive : Boolean(req.body.taxInclusive);
    bid.taxNote = req.body?.taxNote === undefined ? bid.taxNote : String(req.body.taxNote);
    bid.lineItems = req.body?.lineItems === undefined ? bid.lineItems : parseLineItems(req.body);
    bid.deliveryDays = req.body?.deliveryDays === undefined ? bid.deliveryDays : Number(req.body.deliveryDays);
    bid.responseSummary = req.body?.responseSummary === undefined ? bid.responseSummary : String(req.body.responseSummary);
    bid.serviceCommitment = req.body?.serviceCommitment === undefined ? bid.serviceCommitment : String(req.body.serviceCommitment);
    if (req.body?.responseFileMetadata !== undefined) {
      const responseFileMetadata = resolveAttachments(ctx, req.body.responseFileMetadata, {
        fallbackPrefix: bid.id,
        objectType: "bid",
        objectId: bid.id,
        attachmentKind: "bid_response_file",
        projectId: project.id,
        supplierId: bid.supplierId,
        uploadedBy: req.auth.user.id
      });
      if (responseFileMetadata.length > 0) {
        bid.responseFileMetadata = responseFileMetadata;
        bid.fileId = responseFileMetadata[0].id;
        bid.fileName = responseFileMetadata[0].fileName;
      }
    } else if (req.body?.fileName !== undefined) {
      bid.fileName = String(req.body.fileName);
    }
    ctx.r4SourcingRepository.upsertBid(bid);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.draft.update", "bid", bid.id, project.id);
    return res.json({ bid: publicBidShape(req, project, bid), auditLogId: auditLog.id });
  });

  router.post("/bids/:bidId/submit", (req, res) => {
    const bid = ensureBid(ctx, req.params.bidId, res);
    if (!bid) return;
    const project = ensureProject(ctx, bid.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertSupplierBidOwner(ctx, req, res, bid)) return;
    if (!ensureBidBeforeDeadline(ctx, req, res, project, bid)) return;
    if (!["draft", "withdrawn"].includes(bid.status)) {
      return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only draft or withdrawn bids can be submitted.", "bid.submit.denied", "bid", bid.id, project.id, `status=${bid.status}`);
    }
    bid.status = "submitted";
    bid.submittedAt = new Date().toISOString();
    bid.withdrawnAt = null;
    const version = recordBidVersion(ctx, bid, "submit");
    ctx.r4SourcingRepository.upsertBid(bid);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.submit", "bid", bid.id, project.id, `version=${version.versionNo}`);
    return res.json({ bid: publicBidShape(req, project, bid), version, auditLogId: auditLog.id });
  });

  router.post("/bids/:bidId/withdraw", (req, res) => {
    const bid = ensureBid(ctx, req.params.bidId, res);
    if (!bid) return;
    const project = ensureProject(ctx, bid.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertSupplierBidOwner(ctx, req, res, bid)) return;
    if (!ensureBidBeforeDeadline(ctx, req, res, project, bid)) return;
    if (bid.status !== "submitted") {
      return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only submitted bids can be withdrawn.", "bid.withdraw.denied", "bid", bid.id, project.id, `status=${bid.status}`);
    }
    bid.status = "withdrawn";
    bid.withdrawnAt = new Date().toISOString();
    bid.withdrawalReason = req.body?.reason === undefined ? bid.withdrawalReason : String(req.body.reason);
    const version = recordBidVersion(ctx, bid, `withdraw${bid.withdrawalReason ? `: ${bid.withdrawalReason}` : ""}`);
    ctx.r4SourcingRepository.upsertBid(bid);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.withdraw", "bid", bid.id, project.id, `version=${version.versionNo}`);
    return res.json({ bid: publicBidShape(req, project, bid), version, auditLogId: auditLog.id });
  });

  router.post("/bids/:bidId/resubmit", (req, res) => {
    const bid = ensureBid(ctx, req.params.bidId, res);
    if (!bid) return;
    const project = ensureProject(ctx, bid.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertSupplierBidOwner(ctx, req, res, bid)) return;
    if (!ensureBidBeforeDeadline(ctx, req, res, project, bid)) return;
    if (bid.status !== "withdrawn") {
      return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only withdrawn bids can be resubmitted.", "bid.resubmit.denied", "bid", bid.id, project.id, `status=${bid.status}`);
    }
    const amount = req.body?.amount === undefined && req.body?.lineItems === undefined ? bid.amount : amountFromLineItems(req.body);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: { code: "BID_AMOUNT_INVALID", message: "Bid amount must be a positive number." } });
    }
    const now = new Date().toISOString();
    bid.amount = amount;
    bid.taxRate = req.body?.taxRate === undefined ? bid.taxRate : Number(req.body.taxRate);
    bid.taxInclusive = req.body?.taxInclusive === undefined ? bid.taxInclusive : Boolean(req.body.taxInclusive);
    bid.taxNote = req.body?.taxNote === undefined ? bid.taxNote : String(req.body.taxNote);
    bid.lineItems = req.body?.lineItems === undefined ? bid.lineItems : parseLineItems(req.body);
    bid.deliveryDays = req.body?.deliveryDays === undefined ? bid.deliveryDays : Number(req.body.deliveryDays);
    bid.responseSummary = req.body?.responseSummary === undefined ? bid.responseSummary : String(req.body.responseSummary);
    bid.serviceCommitment = req.body?.serviceCommitment === undefined ? bid.serviceCommitment : String(req.body.serviceCommitment);
    bid.status = "submitted";
    bid.submittedAt = now;
    bid.withdrawnAt = null;
    if (req.body?.responseFileMetadata !== undefined) {
      const responseFileMetadata = resolveAttachments(ctx, req.body.responseFileMetadata, {
        fallbackPrefix: bid.id,
        objectType: "bid",
        objectId: bid.id,
        attachmentKind: "bid_response_file",
        projectId: project.id,
        supplierId: bid.supplierId,
        uploadedBy: req.auth.user.id
      });
      if (responseFileMetadata.length > 0) {
        bid.responseFileMetadata = responseFileMetadata;
        bid.fileId = responseFileMetadata[0].id;
        bid.fileName = responseFileMetadata[0].fileName;
      }
    } else if (req.body?.fileName !== undefined) {
      bid.fileName = String(req.body.fileName);
    }
    const version = recordBidVersion(ctx, bid, "resubmit");
    ctx.r4SourcingRepository.upsertBid(bid);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.resubmit", "bid", bid.id, project.id, `version=${version.versionNo}`);
    return res.json({ bid: publicBidShape(req, project, bid), version, auditLogId: auditLog.id });
  });

  router.post("/projects/:projectId/bids/lock", (req, res) => {
    if (!isProcurementMaintainerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "PHASE3_BUSINESS_ACTION_DENIED", "Only procurement business roles can lock bids.", "bid.lock.denied", "project", req.params.projectId);
    }
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertProjectReadable(ctx, req, res, project)) return;
    if (!ensureProjectDeadlineReached(ctx, req, res, project)) return;
    const now = new Date().toISOString();
    const bids = ctx.state.bids.filter((item) => item.projectId === project.id && item.status === "submitted");
    for (const bid of bids) {
      bid.status = "locked";
      bid.lockedAt = now;
      recordBidVersion(ctx, bid, "lock");
      ctx.r4SourcingRepository.upsertBid(bid);
    }
    advanceProjectToBiddingLocked(project);
    ctx.r4SourcingRepository.upsertProject(project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.lock", "project", project.id, project.id, `lockedCount=${bids.length}`);
    return res.json({ project, lockedCount: bids.length, auditLogId: auditLog.id });
  });

  router.get("/projects/:projectId/opening-room", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const projectBids = ctx.state.bids.filter((item) => item.projectId === project.id);
    const expertTasks = ctx.state.scoringSheets
      .filter((sheet) => sheet.projectId === project.id)
      .map((sheet) => ({
        sheetId: sheet.id,
        expertId: sheet.expertId,
        supplierId: sheet.supplierId,
        status: sheet.status
      }));
    const securityBoundary = {
      cutoffEnforced: !isBeforeDeadline(project),
      bidBodyHiddenBeforeDeadline: true,
      lockRequiredBeforeComparison: true,
      caAdapterStatus: "mock_boundary_only",
      encryptionBoundary: "本地以截止时间、锁标、权限和审计模拟加解密/CA 等价边界；未接入真实 CA、电子签章或加密机。",
      integrationDependency: "真实 CA 证书、签章服务、时间戳服务和加解密接口资料待客户提供。"
    };
    return res.json({
      projectId: project.id,
      beforeDeadline: isBeforeDeadline(project),
      submittedCount: projectBids.filter((item) => item.status === "submitted").length,
      lockedCount: projectBids.filter((item) => item.status === "locked").length,
      abandonedCount: projectBids.filter((item) => item.abandonedAt).length,
      expertTasks,
      securityBoundary
    });
  });

  router.post("/projects/:projectId/comparison-report", (req, res) => {
    if (!isProcurementMaintainerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "PHASE3_BUSINESS_ACTION_DENIED", "Only procurement business roles can generate comparison reports.", "comparison_report.generate.denied", "project", req.params.projectId);
    }
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertProjectReadable(ctx, req, res, project)) return;
    if (isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Comparison report can only be generated after quote deadline.", "comparison_report.generate.denied", "project", project.id, project.id);
    }
    const rows = compareRows(ctx, project.id);
    if (rows.length === 0) {
      return denyResponse(ctx, req, res, 400, "COMPARISON_REPORT_EMPTY", "Locked bids are required before generating comparison report.", "comparison_report.generate.denied", "project", project.id, project.id);
    }
    const existingGenerated = ctx.state.comparisonReports.find((item) => item.projectId === project.id && item.status === "generated");
    if (existingGenerated) {
      return res.json({ comparisonReport: existingGenerated });
    }
    const report = buildComparisonReport(ctx, req, project);
    ctx.state.comparisonReports.push(report);
    ctx.r5ReviewAwardRepository.upsertComparisonReport(report);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "comparison_report.generate", "comparison_report", report.id, project.id);
    return res.status(201).json({ comparisonReport: report, auditLogId: auditLog.id });
  });

  router.post("/projects/:projectId/comparison-report/freeze", (req, res) => {
    if (!isProcurementMaintainerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "PHASE3_BUSINESS_ACTION_DENIED", "Only procurement business roles can freeze comparison reports.", "comparison_report.freeze.denied", "project", req.params.projectId);
    }
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_bid");
    if (!assertProjectReadable(ctx, req, res, project)) return;
    const report = [...ctx.state.comparisonReports].reverse().find((item) => item.projectId === project.id && item.status === "generated");
    if (!report) {
      return res.status(404).json({ error: { code: "COMPARISON_REPORT_NOT_FOUND", message: "Generated comparison report does not exist." } });
    }
    report.status = "frozen";
    report.frozenAt = new Date().toISOString();
    ctx.r5ReviewAwardRepository.upsertComparisonReport(report);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "comparison_report.freeze", "comparison_report", report.id, project.id);
    return res.json({ comparisonReport: report, auditLogId: auditLog.id });
  });

  router.get("/bids/:bidId/versions", (req, res) => {
    const bid = ensureBid(ctx, req.params.bidId, res);
    if (!bid) return;
    const project = ensureProject(ctx, bid.projectId, res);
    if (!project) return;
    if (isSupplierRole(req.auth.roleId) && !supplierIdMatches(req.auth.user, bid.supplierId)) {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_BID_SCOPE_DENIED", "Suppliers can only view their own bid versions.", "bid.version.scope.denied", "bid", bid.id, project.id);
    }
    if (req.auth.roleId === "expert") {
      return denyResponse(ctx, req, res, 403, "EXPERT_BID_DENIED", "Experts cannot read full bid versions through bid APIs.", "bid.version.expert.denied", "bid", bid.id, project.id);
    }
    if (!isSupplierRole(req.auth.roleId) && !assertProjectReadable(ctx, req, res, project)) return;
    if (!isSupplierRole(req.auth.roleId) && isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 403, "BID_CONFIDENTIALITY_DENIED", "Bid versions are confidential before the deadline.", "bid.version.confidential.denied", "bid", bid.id, project.id);
    }
    return res.json({ versions: ctx.state.bidVersions.filter((item) => item.bidId === bid.id) });
  });

  router.post("/bids/:bidId/view-check", (req, res) => {
    const bid = ensureBid(ctx, req.params.bidId, res);
    if (!bid) return;
    const content = String(req.body?.content ?? "amount") as BidViewContent;
    ctx.policies.bidConfidentiality.assertBidAccess(req.auth, bid, content, { approvalId: req.body?.approvalId });
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid.view_check.allowed", "bid", bid.id, bid.projectId);
    return res.json({ allowed: true, auditLogId: log.id });
  });

  router.post("/bid-files/:fileId/view-check", (req, res) => {
    const bid = ctx.state.bids.find((item) => item.fileId === req.params.fileId);
    if (!bid) return res.status(404).json({ error: { code: "BID_FILE_NOT_FOUND", message: "Bid file does not exist." } });
    const content = String(req.body?.content ?? "response_file_metadata") as BidViewContent;
    ctx.policies.bidConfidentiality.assertBidAccess(req.auth, bid, content, { approvalId: req.body?.approvalId, download: Boolean(req.body?.download) });
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_file.view_check.allowed", "bid_file", bid.fileId, bid.projectId);
    return res.json({ allowed: true, file: { id: bid.fileId, fileName: bid.fileName }, auditLogId: log.id });
  });

  router.get("/bid-files/:fileId/download", (req, res) => {
    const bid = ctx.state.bids.find((item) => item.fileId === req.params.fileId);
    if (!bid) return res.status(404).json({ error: { code: "BID_FILE_NOT_FOUND", message: "Bid file does not exist." } });
    ctx.policies.bidConfidentiality.assertBidAccess(req.auth, bid, "response_file_download", { approvalId: String(req.query.approvalId ?? ""), download: true });
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "bid_file.download.allowed", "bid_file", bid.fileId, bid.projectId);
    const stored = ctx.fileStore.get(bid.fileId);
    if (!stored) {
      return res.status(404).json({ error: { code: "BID_FILE_STORAGE_NOT_FOUND", message: "Stored bid file does not exist." } });
    }
    res.setHeader("x-audit-log-id", log.id);
    res.setHeader("content-type", stored.contentType);
    res.setHeader("content-disposition", `attachment; filename="${encodeURIComponent(stored.originalName)}"`);
    return res.send(fs.readFileSync(stored.absolutePath));
  });

  return router;
}
