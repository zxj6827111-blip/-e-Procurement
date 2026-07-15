import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { resolveAttachments } from "./file-helpers.js";
import type {
  ArchiveItem,
  Bid,
  ProcurementDocumentAttachment,
  ProcurementProject,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderStatus,
  ReceiptExceptionType,
  ReceiptHandlingStatus,
  ReceiptRecord,
  SettlementMaterial,
  SettlementMaterialStatus,
  SettlementMaterialType,
  SupplierEvaluation,
  SupplierEvaluationDimensions
} from "../types.js";
import { canReadAuditLog, canReadProject, denyResponse } from "./permission-helpers.js";
import { isFinanceReviewRole, isProcurementBuyerRole, isSupplierAdminRole, isSupplierRole, supplierIdMatches } from "../role-groups.js";
import type { R7Overview } from "../repositories/r7-settlement-finance-repository.js";

const procurementExecutionRoles = new Set(["buyer", "platform_operator"]);

type FulfillmentOverviewStatus =
  | "pending_contract_confirmation"
  | "pending_order_generation"
  | "pending_supplier_confirmation"
  | "pending_receipt"
  | "partially_received"
  | "exception"
  | "pending_evaluation"
  | "completed";

const fulfillmentStatusPriority: Record<FulfillmentOverviewStatus, number> = {
  exception: 0,
  pending_receipt: 1,
  partially_received: 2,
  pending_evaluation: 3,
  pending_supplier_confirmation: 4,
  pending_order_generation: 5,
  pending_contract_confirmation: 6,
  completed: 7
};

type SettlementOverviewStatus =
  | "pending_bill_creation"
  | "pending_materials"
  | "pending_submission"
  | "pending_review"
  | "pending_payment"
  | "completed";

const settlementStatusPriority: Record<SettlementOverviewStatus, number> = {
  pending_bill_creation: 0,
  pending_materials: 1,
  pending_submission: 2,
  pending_review: 3,
  pending_payment: 4,
  completed: 5
};

function isWorkbenchBusinessReader(roleId: string) {
  return isProcurementBuyerRole(roleId) || roleId === "group_manager" || roleId === "auditor" || isFinanceReviewRole(roleId);
}

function isWorkbenchBusinessMaintainer(roleId: string) {
  return procurementExecutionRoles.has(roleId);
}

function isSettlementVerifier(roleId: string) {
  return procurementExecutionRoles.has(roleId) || isFinanceReviewRole(roleId);
}

function canReadFulfillmentProject(req: Request, project: ProcurementProject) {
  if (isSupplierRole(req.auth.roleId)) {
    return project.participantSupplierIds.some((supplierId) => supplierIdMatches(req.auth.user, supplierId));
  }
  return canReadProject(req, project);
}

function fulfillmentStatusForOrder(
  order: PurchaseOrder,
  receipts: ReceiptRecord[],
  evaluations: SupplierEvaluation[]
): FulfillmentOverviewStatus {
  const hasOpenException =
    order.status === "exception" ||
    receipts.some((receipt) => receipt.receiptType === "exception" && receipt.handlingStatus !== "closed");
  if (hasOpenException) return "exception";
  if (order.status === "pending_confirmation") return "pending_supplier_confirmation";
  if (order.status === "supplier_confirmed" || order.status === "performing") return "pending_receipt";
  if (order.status === "partially_received") return "partially_received";
  if (order.status === "received" || order.status === "closed") {
    return evaluations.some((evaluation) => evaluation.status === "submitted_locked") ? "completed" : "pending_evaluation";
  }
  return "pending_receipt";
}

function fulfillmentNextAction(status: FulfillmentOverviewStatus, supplierSide: boolean) {
  switch (status) {
    case "pending_contract_confirmation":
      return supplierSide ? "确认合同" : "等待供应商确认合同";
    case "pending_order_generation":
      return supplierSide ? "等待采购生成订单" : "生成采购订单";
    case "pending_supplier_confirmation":
      return supplierSide ? "确认采购订单" : "等待供应商确认订单";
    case "pending_receipt":
    case "partially_received":
      return supplierSide ? "查看履约进度" : "登记收货";
    case "exception":
      return supplierSide ? "查看异常" : "处理收货异常";
    case "pending_evaluation":
      return supplierSide ? "查看履约结果" : "提交履约评价";
    default:
      return "查看履约详情";
  }
}

function settlementStatusForOrder(
  bill: R7Overview["settlementBills"][number] | undefined,
  overview: R7Overview
): SettlementOverviewStatus {
  if (!bill) return "pending_bill_creation";
  const materials = overview.settlementMaterials.filter((item) => item.purchaseOrderId === bill.purchaseOrderId);
  const invoices = overview.invoices.filter((item) => item.settlementBillId === bill.id);
  const ledgerEntries = overview.fundLedgerEntries.filter((item) => item.settlementBillId === bill.id);

  if (bill.status === "paid" || ledgerEntries.some((item) => item.status === "paid")) return "completed";
  if (["approved", "payable"].includes(bill.status)) return "pending_payment";
  if (bill.status === "submitted" || materials.some((item) => item.status === "pending_verification") || invoices.some((item) => item.status === "pending_verification")) {
    return "pending_review";
  }
  if (
    materials.length === 0 ||
    invoices.length === 0 ||
    materials.some((item) => item.status === "rejected") ||
    invoices.some((item) => item.status === "rejected")
  ) {
    return "pending_materials";
  }
  return "pending_submission";
}

function settlementNextAction(status: SettlementOverviewStatus, supplierSide: boolean, financeSide: boolean) {
  switch (status) {
    case "pending_bill_creation":
      return supplierSide ? "等待生成结算单" : "生成结算单";
    case "pending_materials":
      return "补充结算资料";
    case "pending_submission":
      return "提交结算审核";
    case "pending_review":
      return financeSide ? "审核结算资料" : "查看审核进度";
    case "pending_payment":
      return financeSide ? "登记付款" : "查看付款进度";
    default:
      return "查看结算记录";
  }
}

const archiveItemCatalog = [
  "采购申请",
  "审批记录",
  "公告/邀请",
  "报名和资格审查",
  "响应/报价记录",
  "比价/评审报告",
  "定标审批",
  "采购订单",
  "收货验收",
  "供应商评价",
  "结算资料",
  "审计日志"
] as const;

function ensureProject(ctx: AppContext, projectId: string, res: Response) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  return project;
}

function ensureOrder(ctx: AppContext, orderId: string, res: Response) {
  const order = ctx.state.purchaseOrders.find((item) => item.id === orderId);
  if (!order) {
    res.status(404).json({ error: { code: "PURCHASE_ORDER_NOT_FOUND", message: "Purchase order does not exist." } });
    return null;
  }
  return order;
}

function ensureReceipt(ctx: AppContext, receiptId: string, res: Response) {
  const receipt = ctx.state.receiptRecords.find((item) => item.id === receiptId);
  if (!receipt) {
    res.status(404).json({ error: { code: "RECEIPT_RECORD_NOT_FOUND", message: "Receipt record does not exist." } });
    return null;
  }
  return receipt;
}

function ensureSettlementMaterial(ctx: AppContext, materialId: string, res: Response) {
  const material = ctx.state.settlementMaterials.find((item) => item.id === materialId);
  if (!material) {
    res.status(404).json({ error: { code: "SETTLEMENT_MATERIAL_NOT_FOUND", message: "Settlement material does not exist." } });
    return null;
  }
  return material;
}

function ensureArchiveItem(ctx: AppContext, itemId: string, res: Response) {
  const item = ctx.state.archiveItems.find((entry) => entry.id === itemId);
  if (!item) {
    res.status(404).json({ error: { code: "ARCHIVE_ITEM_NOT_FOUND", message: "Archive item does not exist." } });
    return null;
  }
  return item;
}

function assertWorkbenchReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject) {
  if (req.auth.roleId === "admin" || req.auth.roleId === "system") {
    denyResponse(
      ctx,
      req,
      res,
      403,
      "PROJECT_WORKBENCH_READ_DENIED",
      "System administrator is isolated from business workbench data.",
      "project_workbench.read.denied",
      "project",
      project.id,
      project.id
    );
    return false;
  }
  if (req.auth.roleId === "expert") {
    denyResponse(
      ctx,
      req,
      res,
      403,
      "PROJECT_WORKBENCH_READ_DENIED",
      "Experts cannot enter fulfillment and archive workbench.",
      "project_workbench.read.denied",
      "project",
      project.id,
      project.id
    );
    return false;
  }
  if (isSupplierRole(req.auth.roleId)) {
    const supplierId = req.auth.user.supplierId ?? "";
    if (project.participantSupplierIds.includes(supplierId)) return true;
    denyResponse(
      ctx,
      req,
      res,
      403,
      "SUPPLIER_PROJECT_SCOPE_DENIED",
      "Supplier can only read own participating project workbench.",
      "project_workbench.supplier_scope.denied",
      "project",
      project.id,
      project.id
    );
    return false;
  }
  if (!isWorkbenchBusinessReader(req.auth.roleId)) {
    denyResponse(
      ctx,
      req,
      res,
      403,
      "PROJECT_WORKBENCH_READ_DENIED",
      "Current role cannot read project workbench business data.",
      "project_workbench.read.denied",
      "project",
      project.id,
      project.id
    );
    return false;
  }
  if (canReadProject(req, project)) return true;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot access this project.", "project_workbench.scope.denied", "project", project.id, project.id);
  return false;
}

function assertOrderMaintainer(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!isWorkbenchBusinessMaintainer(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "PURCHASE_ORDER_MAINTAINER_REQUIRED", "Only procurement business roles can maintain fulfillment business data.", action, "project", project.id, project.id);
    return false;
  }
  if (canReadProject(req, project)) return true;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot maintain this project.", action, "project", project.id, project.id);
  return false;
}

function assertSupplierOrderOwner(ctx: AppContext, req: Request, res: Response, order: PurchaseOrder, action: string) {
  if (!isSupplierAdminRole(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "SUPPLIER_ORDER_SCOPE_DENIED", "Supplier can only access own purchase order.", action, "purchase_order", order.id, order.projectId);
    return false;
  }
  if (supplierIdMatches(req.auth.user, order.supplierId)) return true;
  denyResponse(ctx, req, res, 403, "SUPPLIER_ORDER_SCOPE_DENIED", "Supplier can only access own purchase order.", action, "purchase_order", order.id, order.projectId);
  return false;
}

function assertSettlementVerifier(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!isSettlementVerifier(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "SETTLEMENT_VERIFIER_REQUIRED", "Only procurement business roles can verify settlement materials.", action, "project", project.id, project.id);
    return false;
  }
  if (canReadProject(req, project)) return true;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot verify this project settlement material.", action, "project", project.id, project.id);
  return false;
}

function isBeforeDeadline(project: ProcurementProject) {
  if (!project.quoteDeadlineAt) return false;
  return new Date(project.quoteDeadlineAt).getTime() > Date.now();
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

function visibleBid(ctx: AppContext, req: Request, project: ProcurementProject, bid: Bid) {
  const base = {
    id: bid.id,
    projectId: bid.projectId,
    supplierId: bid.supplierId,
    supplierName: ctx.state.suppliers.find((item) => item.id === bid.supplierId)?.name,
    status: bid.status,
    submittedAt: bid.submittedAt,
    quoteDeadlineAt: bid.quoteDeadlineAt,
    lockedAt: bid.lockedAt,
    deliveryDays: bid.deliveryDays,
    serviceCommitment: bid.serviceCommitment
  };
  const isSupplier = isSupplierRole(req.auth.roleId);
  if (isSupplier && !supplierIdMatches(req.auth.user, bid.supplierId)) return null;
  const canSeeBidBody =
    (isSupplier && supplierIdMatches(req.auth.user, bid.supplierId)) ||
    ((procurementExecutionRoles.has(req.auth.roleId) || req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") && !isBeforeDeadline(project));
  if (!canSeeBidBody) return base;
  return {
    ...base,
    amount: bid.amount,
    lineItems: bid.lineItems ?? [],
    fileName: bid.fileName,
    responseFileMetadata: bidFileMetadata(bid)
  };
}

function visibleComparison(ctx: AppContext, req: Request, project: ProcurementProject) {
  if (isBeforeDeadline(project) && !isSupplierRole(req.auth.roleId)) return null;
  if (isSupplierRole(req.auth.roleId)) return null;
  return ctx.state.comparisonReports.find((item) => item.projectId === project.id) ?? null;
}

function visibleOrders(ctx: AppContext, req: Request, project: ProcurementProject) {
  const supplierId = req.auth.user.supplierId ?? "";
  return ctx.state.purchaseOrders.filter((item) => item.projectId === project.id && (!isSupplierRole(req.auth.roleId) || item.supplierId === supplierId));
}

function visibleReceipts(ctx: AppContext, req: Request, project: ProcurementProject) {
  const supplierId = req.auth.user.supplierId ?? "";
  return ctx.state.receiptRecords.filter((item) => item.projectId === project.id && (!isSupplierRole(req.auth.roleId) || item.supplierId === supplierId));
}

function visibleSettlementMaterials(ctx: AppContext, req: Request, project: ProcurementProject) {
  ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
  const supplierId = req.auth.user.supplierId ?? "";
  return ctx.state.settlementMaterials.filter((item) => item.projectId === project.id && (!isSupplierRole(req.auth.roleId) || item.supplierId === supplierId));
}

function visibleSupplierEvaluations(ctx: AppContext, req: Request, project: ProcurementProject) {
  const supplierId = req.auth.user.supplierId ?? "";
  return ctx.state.supplierEvaluations.filter((item) => item.projectId === project.id && (!isSupplierRole(req.auth.roleId) || item.supplierId === supplierId));
}

function lineItemsFromBid(bid: Bid): PurchaseOrderLineItem[] {
  if (bid.lineItems && bid.lineItems.length > 0) {
    return bid.lineItems.map((item) => ({
      id: `po-line-${item.id}`,
      itemName: item.itemName,
      specification: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      totalPrice: item.totalPrice,
      receivedQuantity: 0
    }));
  }
  return [
    {
      id: `po-line-${bid.id}`,
      itemName: "采购明细",
      specification: "按中选报价单",
      quantity: 1,
      unit: "项",
      unitPrice: bid.amount,
      taxRate: 0,
      totalPrice: bid.amount,
      receivedQuantity: 0
    }
  ];
}

function deriveOrderStatus(order: PurchaseOrder, receiptType?: ReceiptRecord["receiptType"]): PurchaseOrderStatus {
  if (receiptType === "exception") return "exception";
  const receivedLines = order.lineItems.filter((item) => item.receivedQuantity > 0).length;
  const allReceived = order.lineItems.every((item) => item.receivedQuantity >= item.quantity);
  if (allReceived) return "received";
  if (receivedLines > 0) return "partially_received";
  if (order.confirmedAt) return "performing";
  return order.status;
}

function syncProjectStatus(project: ProcurementProject, ctx: AppContext) {
  const hasSealedArchive = ctx.state.archiveItems.some((item) => item.projectId === project.id && item.status === "sealed");
  if (hasSealedArchive) {
    project.status = project.externalTradeFlag ? "external_archived" : "archived";
    project.displayStatus = "档案已封存";
    return;
  }
  const hasLockedEvaluation = ctx.state.supplierEvaluations.some((item) => item.projectId === project.id && item.status === "submitted_locked");
  if (hasLockedEvaluation) {
    project.status = project.externalTradeFlag ? "external_evaluated" : "evaluated";
    project.displayStatus = "供应商已评价";
    return;
  }
  const hasOrders = ctx.state.purchaseOrders.some((item) => item.projectId === project.id);
  const hasConfirmedOrder = ctx.state.purchaseOrders.some((item) => item.projectId === project.id && item.confirmedAt);
  if (hasConfirmedOrder) {
    project.status = project.externalTradeFlag ? "external_performing" : "performing";
    project.displayStatus = "履约中";
    return;
  }
  if (hasOrders) {
    project.status = project.externalTradeFlag ? "external_contract_registered" : "contract_registered";
    project.displayStatus = "采购订单已生成";
  }
}

function averageScore(dimensions: SupplierEvaluationDimensions) {
  const values = Object.values(dimensions);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function latestAwardApproval(ctx: AppContext, projectId: string) {
  return [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === projectId && item.approvalStatus === "approved") ?? null;
}

function latestArchiveTemplateVersion(ctx: AppContext) {
  return Math.max(1, ...ctx.state.archiveTemplates.map((item) => item.versionNo));
}

function archiveItemSnapshot(project: ProcurementProject, itemName: string, ctx: AppContext) {
  switch (itemName) {
    case "采购申请": {
      const request = ctx.state.procurementRequests.find((entry) => entry.id === project.sourceRequestId || entry.projectId === project.id);
      return { collectedFlag: Boolean(request), snapshotJson: { sourceId: request?.id, title: request?.title } };
    }
    case "审批记录": {
      const request = ctx.state.procurementRequests.find((entry) => entry.id === project.sourceRequestId || entry.projectId === project.id);
      return { collectedFlag: Boolean(request?.approvalStatus === "approved"), snapshotJson: { sourceId: request?.id, approvalStatus: request?.approvalStatus } };
    }
    case "公告/邀请": {
      const announcement = ctx.state.procurementAnnouncements.find((entry) => entry.projectId === project.id);
      const invitations = ctx.state.supplierInvitations.filter((entry) => entry.projectId === project.id);
      return {
        collectedFlag: Boolean(announcement && invitations.length > 0),
        snapshotJson: { announcementId: announcement?.id, invitationCount: invitations.length }
      };
    }
    case "报名和资格审查": {
      const registrations = ctx.state.supplierRegistrations.filter((entry) => entry.projectId === project.id);
      const qualified = registrations.filter((entry) => entry.status === "qualified");
      return { collectedFlag: registrations.length > 0 && qualified.length > 0, snapshotJson: { registrationCount: registrations.length, qualifiedCount: qualified.length } };
    }
    case "响应/报价记录": {
      const bids = ctx.state.bids.filter((entry) => entry.projectId === project.id && entry.status !== "draft");
      return { collectedFlag: bids.length > 0, snapshotJson: { bidIds: bids.map((item) => item.id) } };
    }
    case "比价/评审报告": {
      const comparison = ctx.state.comparisonReports.find((entry) => entry.projectId === project.id);
      const review = ctx.state.reviewReports.find((entry) => entry.projectId === project.id);
      return { collectedFlag: Boolean(comparison || review), snapshotJson: { comparisonReportId: comparison?.id, reviewReportId: review?.id } };
    }
    case "定标审批": {
      const approval = latestAwardApproval(ctx, project.id);
      return { collectedFlag: Boolean(approval), snapshotJson: { awardApprovalId: approval?.id, selectedSupplierId: approval?.selectedSupplierId } };
    }
    case "采购订单": {
      const orders = ctx.state.purchaseOrders.filter((entry) => entry.projectId === project.id);
      return { collectedFlag: orders.length > 0, snapshotJson: { purchaseOrderIds: orders.map((item) => item.id) } };
    }
    case "收货验收": {
      const receipts = ctx.state.receiptRecords.filter((entry) => entry.projectId === project.id);
      return { collectedFlag: receipts.length > 0, snapshotJson: { receiptRecordIds: receipts.map((item) => item.id) } };
    }
    case "供应商评价": {
      const evaluations = ctx.state.supplierEvaluations.filter((entry) => entry.projectId === project.id && entry.status === "submitted_locked");
      return { collectedFlag: evaluations.length > 0, snapshotJson: { evaluationIds: evaluations.map((item) => item.id) } };
    }
    case "结算资料": {
      const materials = ctx.state.settlementMaterials.filter((entry) => entry.projectId === project.id);
      const verified = materials.filter((entry) => entry.status === "verified");
      return { collectedFlag: materials.length > 0 && verified.length > 0, snapshotJson: { settlementMaterialIds: materials.map((item) => item.id), verifiedCount: verified.length } };
    }
    case "审计日志": {
      const logs = ctx.state.auditLogs.filter((entry) => entry.projectId === project.id);
      return { collectedFlag: logs.length > 0, snapshotJson: { auditLogCount: logs.length } };
    }
    default:
      return { collectedFlag: false, snapshotJson: {} };
  }
}

export function ensureArchiveSnapshot(ctx: AppContext, project: ProcurementProject) {
  const version = latestArchiveTemplateVersion(ctx);
  for (const itemName of archiveItemCatalog) {
    const existing = ctx.state.archiveItems.find((entry) => entry.projectId === project.id && entry.itemName === itemName);
    const derived = archiveItemSnapshot(project, itemName, ctx);
    if (existing) {
      if (!existing.sealed) {
        existing.collectedFlag = derived.collectedFlag;
        existing.status = derived.collectedFlag ? "complete" : "collecting";
      }
      existing.snapshotJson = { ...existing.snapshotJson, ...derived.snapshotJson, templateVersion: version };
      continue;
    }
    ctx.state.archiveItems.push({
      id: `ai-${project.id}-${ctx.state.archiveItems.length + 1}`,
      projectId: project.id,
      itemName,
      requiredFlag: true,
      collectedFlag: derived.collectedFlag,
      sealed: false,
      status: derived.collectedFlag ? "complete" : "collecting",
      snapshotJson: { ...derived.snapshotJson, templateVersion: version, projectStatus: project.status }
    });
  }
}

function ensureArchiveMutable(ctx: AppContext, req: Request, res: Response, projectId: string, objectType: string, objectId: string, action: string) {
  const sealed = ctx.state.archiveItems.some((entry) => entry.projectId === projectId && entry.status === "sealed");
  if (!sealed) return true;
  denyResponse(ctx, req, res, 403, "ARCHIVE_ALREADY_SEALED", "Archive is sealed. Direct fulfillment mutation is blocked until supplement approval flow is used.", action, objectType, objectId, projectId);
  return false;
}

function updateSupplierScore(ctx: AppContext, supplierId: string) {
  const active = ctx.state.supplierEvaluations.filter((item) => item.supplierId === supplierId && item.status === "submitted_locked");
  if (active.length === 0) return;
  const latest = [...active].sort((a, b) => (a.lockedAt < b.lockedAt ? 1 : -1))[0];
  const supplier = ctx.state.suppliers.find((item) => item.id === supplierId);
  if (supplier) supplier.evaluationScore = latest.score;
}

function resolveAttachmentList(
  ctx: AppContext,
  req: Request,
  attachments: unknown,
  objectType: string,
  objectId: string,
  projectId: string,
  supplierId: string
) {
  return resolveAttachments(ctx, attachments, {
    fallbackPrefix: objectId,
    objectType,
    objectId,
    attachmentKind: `${objectType}_attachment`,
    projectId,
    supplierId,
    uploadedBy: req.auth.user.id
  });
}

function handleStoredFile(ctx: AppContext, storedFileId: string) {
  const stored = ctx.fileStore.get(storedFileId);
  if (!stored) return null;
  const attachment: ProcurementDocumentAttachment = {
    id: stored.fileId,
    fileName: stored.originalName,
    contentType: stored.contentType,
    sizeBytes: stored.sizeBytes,
    uploadedAt: stored.createdAt
  };
  return attachment;
}

export function projectWorkbenchRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/project-workbench/fulfillment-overview", (req, res) => {
    const supplierSide = isSupplierRole(req.auth.roleId);
    if (
      req.auth.roleId === "admin" ||
      req.auth.roleId === "system" ||
      req.auth.roleId === "expert" ||
      (!supplierSide && !isWorkbenchBusinessReader(req.auth.roleId))
    ) {
      return denyResponse(
        ctx,
        req,
        res,
        403,
        "FULFILLMENT_OVERVIEW_READ_DENIED",
        "Current role cannot read fulfillment overview.",
        "fulfillment_overview.read.denied",
        "fulfillment_overview",
        "list"
      );
    }

    const keyword = String(req.query.keyword ?? "").trim().toLocaleLowerCase("zh-CN");
    const requestedStatus = String(req.query.status ?? "all");
    const allowedStatuses = new Set<FulfillmentOverviewStatus>(Object.keys(fulfillmentStatusPriority) as FulfillmentOverviewStatus[]);
    const status = allowedStatuses.has(requestedStatus as FulfillmentOverviewStatus)
      ? (requestedStatus as FulfillmentOverviewStatus)
      : null;
    const onlyPending = String(req.query.onlyPending ?? "false") === "true";
    const parsedPage = Number.parseInt(String(req.query.page ?? "1"), 10);
    const parsedPageSize = Number.parseInt(String(req.query.pageSize ?? "20"), 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const pageSize = Number.isFinite(parsedPageSize) ? Math.min(100, Math.max(1, parsedPageSize)) : 20;

    const accessibleProjects = ctx.state.projects.filter((project) => canReadFulfillmentProject(req, project));
    const rows = accessibleProjects.flatMap((project) => {
      const projectOrders = ctx.state.purchaseOrders.filter(
        (order) => order.projectId === project.id && (!supplierSide || supplierIdMatches(req.auth.user, order.supplierId))
      );
      const projectContracts = ctx.state.contractLedgers.filter(
        (contract) => contract.projectId === project.id && (!supplierSide || supplierIdMatches(req.auth.user, contract.supplierId))
      );
      const orderRows = projectOrders.map((order) => {
        const contract = projectContracts.find((item) => item.id === order.contractId) ?? null;
        const receipts = ctx.state.receiptRecords.filter((receipt) => receipt.purchaseOrderId === order.id);
        const evaluations = ctx.state.supplierEvaluations.filter((evaluation) => evaluation.purchaseOrderId === order.id);
        const fulfillmentStatus = fulfillmentStatusForOrder(order, receipts, evaluations);
        const supplier = ctx.state.suppliers.find((item) => item.id === order.supplierId);
        const hasOpenException =
          order.status === "exception" ||
          receipts.some((receipt) => receipt.receiptType === "exception" && receipt.handlingStatus !== "closed");
        return {
          id: `order:${order.id}`,
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
          projectStatus: project.status,
          externalTradeFlag: project.externalTradeFlag,
          contractId: contract?.id ?? order.contractId ?? null,
          contractNo: contract?.contractNo ?? null,
          contractStatus: contract?.status ?? null,
          orderId: order.id,
          orderNo: order.orderNo,
          orderStatus: order.status,
          supplierId: order.supplierId,
          supplierName: supplier?.name ?? order.supplierId,
          amount: order.totalAmount,
          expectedDeliveryAt: order.expectedDeliveryAt,
          receiptCount: receipts.length,
          hasOpenException,
          fulfillmentStatus,
          nextActionLabel: fulfillmentNextAction(fulfillmentStatus, supplierSide),
          lastUpdatedAt: order.updatedAt ?? order.createdAt
        };
      });

      const orderContractIds = new Set(projectOrders.map((order) => order.contractId).filter(Boolean));
      const contractRows = projectContracts
        .filter((contract) => !orderContractIds.has(contract.id))
        .map((contract) => {
          const fulfillmentStatus: FulfillmentOverviewStatus =
            contract.status === "pending_supplier_confirmation"
              ? "pending_contract_confirmation"
              : contract.status === "registered" || contract.status === "performing"
                ? "pending_order_generation"
                : "completed";
          const supplier = ctx.state.suppliers.find((item) => item.id === contract.supplierId);
          return {
            id: `contract:${contract.id}`,
            projectId: project.id,
            projectCode: project.code,
            projectName: project.name,
            projectStatus: project.status,
            externalTradeFlag: project.externalTradeFlag,
            contractId: contract.id,
            contractNo: contract.contractNo,
            contractStatus: contract.status,
            orderId: null,
            orderNo: null,
            orderStatus: null,
            supplierId: contract.supplierId,
            supplierName: supplier?.name ?? contract.supplierId,
            amount: contract.amount,
            expectedDeliveryAt: project.expectedArrivalAt ?? null,
            receiptCount: 0,
            hasOpenException: false,
            fulfillmentStatus,
            nextActionLabel: fulfillmentNextAction(fulfillmentStatus, supplierSide),
            lastUpdatedAt: contract.updatedAt ?? contract.createdAt
          };
        });

      return [...orderRows, ...contractRows];
    });

    const keywordFilteredRows = keyword
      ? rows.filter((row) =>
          [row.projectCode, row.projectName, row.contractNo, row.orderNo, row.supplierName]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("zh-CN").includes(keyword))
        )
      : rows;
    const statusCounts = Object.fromEntries(
      (Object.keys(fulfillmentStatusPriority) as FulfillmentOverviewStatus[]).map((entry) => [
        entry,
        keywordFilteredRows.filter((row) => row.fulfillmentStatus === entry).length
      ])
    );
    const filteredRows = keywordFilteredRows
      .filter((row) => (!status ? true : row.fulfillmentStatus === status))
      .filter((row) => (!onlyPending ? true : row.fulfillmentStatus !== "completed"))
      .sort((left, right) => {
        const priority = fulfillmentStatusPriority[left.fulfillmentStatus] - fulfillmentStatusPriority[right.fulfillmentStatus];
        if (priority !== 0) return priority;
        return String(right.lastUpdatedAt ?? "").localeCompare(String(left.lastUpdatedAt ?? ""));
      });
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const effectivePage = Math.min(page, totalPages);
    const offset = (effectivePage - 1) * pageSize;
    const pagedRows = filteredRows.slice(offset, offset + pageSize);
    const projectOptions = Array.from(
      keywordFilteredRows.reduce((options, row) => {
        const current = options.get(row.projectId);
        if (!current || String(row.lastUpdatedAt ?? "") > String(current.lastUpdatedAt ?? "")) {
          options.set(row.projectId, {
            id: row.projectId,
            code: row.projectCode,
            name: row.projectName,
            status: row.projectStatus,
            fulfillmentStatus: row.fulfillmentStatus,
            externalTradeFlag: row.externalTradeFlag,
            supplierName: row.supplierName,
            lastUpdatedAt: row.lastUpdatedAt
          });
        }
        return options;
      }, new Map<string, {
        id: string;
        code: string;
        name: string;
        status: ProcurementProject["status"];
        fulfillmentStatus: FulfillmentOverviewStatus;
        externalTradeFlag: boolean;
        supplierName: string;
        lastUpdatedAt?: string;
      }>()).values()
    )
      .sort((left, right) => String(right.lastUpdatedAt ?? "").localeCompare(String(left.lastUpdatedAt ?? "")))
      .slice(0, 20);

    return res.json({
      rows: pagedRows,
      projectOptions,
      summary: {
        total: keywordFilteredRows.length,
        pending: keywordFilteredRows.filter((row) => row.fulfillmentStatus !== "completed").length,
        exception: statusCounts.exception ?? 0,
        pendingReceipt: (statusCounts.pending_receipt ?? 0) + (statusCounts.partially_received ?? 0),
        pendingEvaluation: statusCounts.pending_evaluation ?? 0,
        statusCounts
      },
      pagination: {
        page: effectivePage,
        pageSize,
        total,
        totalPages
      }
    });
  });

  router.get("/project-workbench/settlement-overview", (req, res) => {
    const supplierSide = isSupplierRole(req.auth.roleId);
    if (
      req.auth.roleId === "admin" ||
      req.auth.roleId === "system" ||
      req.auth.roleId === "expert" ||
      (!supplierSide && !isWorkbenchBusinessReader(req.auth.roleId))
    ) {
      return denyResponse(
        ctx,
        req,
        res,
        403,
        "SETTLEMENT_OVERVIEW_READ_DENIED",
        "Current role cannot read settlement overview.",
        "settlement_overview.read.denied",
        "settlement_overview",
        "list"
      );
    }

    const keyword = String(req.query.keyword ?? "").trim().toLocaleLowerCase("zh-CN");
    const requestedStatus = String(req.query.status ?? "all");
    const allowedStatuses = new Set<SettlementOverviewStatus>(Object.keys(settlementStatusPriority) as SettlementOverviewStatus[]);
    const status = allowedStatuses.has(requestedStatus as SettlementOverviewStatus)
      ? (requestedStatus as SettlementOverviewStatus)
      : null;
    const onlyPending = String(req.query.onlyPending ?? "false") === "true";
    const parsedPage = Number.parseInt(String(req.query.page ?? "1"), 10);
    const parsedPageSize = Number.parseInt(String(req.query.pageSize ?? "20"), 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const pageSize = Number.isFinite(parsedPageSize) ? Math.min(100, Math.max(1, parsedPageSize)) : 20;
    const overview = ctx.r7SettlementFinanceRepository.listOverview(req.auth.user, req.auth.roleId);
    const billsByOrder = new Map(overview.settlementBills.map((bill) => [bill.purchaseOrderId, bill]));
    const financeSide = isFinanceReviewRole(req.auth.roleId);

    const rows = ctx.state.projects
      .filter((project) => canReadFulfillmentProject(req, project))
      .flatMap((project) =>
        ctx.state.purchaseOrders
          .filter(
            (order) =>
              order.projectId === project.id &&
              (!supplierSide || supplierIdMatches(req.auth.user, order.supplierId)) &&
              (["received", "closed"].includes(order.status) || billsByOrder.has(order.id))
          )
          .map((order) => {
            const bill = billsByOrder.get(order.id);
            const materials = overview.settlementMaterials.filter((item) => item.purchaseOrderId === order.id);
            const invoices = bill ? overview.invoices.filter((item) => item.settlementBillId === bill.id) : [];
            const ledgerEntries = bill ? overview.fundLedgerEntries.filter((item) => item.settlementBillId === bill.id) : [];
            const settlementStatus = settlementStatusForOrder(bill, overview);
            const supplier = ctx.state.suppliers.find((item) => item.id === order.supplierId);
            const timestamps = [
              order.updatedAt,
              order.createdAt,
              bill?.approvedAt,
              bill?.submittedAt,
              bill?.createdAt,
              ...materials.map((item) => item.verifiedAt ?? item.uploadedAt),
              ...invoices.map((item) => item.verifiedAt ?? item.uploadedAt),
              ...ledgerEntries.map((item) => item.operatedAt ?? item.createdAt)
            ].filter((value): value is string => Boolean(value));
            return {
              id: `order:${order.id}`,
              projectId: project.id,
              projectCode: project.code,
              projectName: project.name,
              projectStatus: project.status,
              externalTradeFlag: project.externalTradeFlag,
              orderId: order.id,
              orderNo: order.orderNo,
              orderStatus: order.status,
              supplierId: order.supplierId,
              supplierName: supplier?.name ?? order.supplierId,
              amount: bill?.settlementAmount ?? order.totalAmount,
              settlementBillId: bill?.id ?? null,
              settlementBillNo: bill?.billNo ?? null,
              settlementBillStatus: bill?.status ?? null,
              materialCount: materials.length,
              invoiceCount: invoices.length,
              settlementStatus,
              nextActionLabel: settlementNextAction(settlementStatus, supplierSide, financeSide),
              lastUpdatedAt: timestamps.sort((left, right) => right.localeCompare(left))[0] ?? null
            };
          })
      );

    const keywordFilteredRows = keyword
      ? rows.filter((row) =>
          [row.projectCode, row.projectName, row.orderNo, row.settlementBillNo, row.supplierName]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("zh-CN").includes(keyword))
        )
      : rows;
    const statusCounts = Object.fromEntries(
      (Object.keys(settlementStatusPriority) as SettlementOverviewStatus[]).map((entry) => [
        entry,
        keywordFilteredRows.filter((row) => row.settlementStatus === entry).length
      ])
    ) as Record<SettlementOverviewStatus, number>;
    const filteredRows = keywordFilteredRows
      .filter((row) => (!status ? true : row.settlementStatus === status))
      .filter((row) => (!onlyPending ? true : row.settlementStatus !== "completed"))
      .sort((left, right) => {
        const priority = settlementStatusPriority[left.settlementStatus] - settlementStatusPriority[right.settlementStatus];
        if (priority !== 0) return priority;
        return String(right.lastUpdatedAt ?? "").localeCompare(String(left.lastUpdatedAt ?? ""));
      });
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const effectivePage = Math.min(page, totalPages);
    const offset = (effectivePage - 1) * pageSize;
    const pagedRows = filteredRows.slice(offset, offset + pageSize);
    const projectOptions = Array.from(
      keywordFilteredRows.reduce((options, row) => {
        const current = options.get(row.projectId);
        if (!current || settlementStatusPriority[row.settlementStatus] < settlementStatusPriority[current.settlementStatus] || String(row.lastUpdatedAt ?? "") > String(current.lastUpdatedAt ?? "")) {
          options.set(row.projectId, {
            id: row.projectId,
            code: row.projectCode,
            name: row.projectName,
            status: row.projectStatus,
            settlementStatus: row.settlementStatus,
            externalTradeFlag: row.externalTradeFlag,
            supplierName: row.supplierName,
            settlementBillNo: row.settlementBillNo,
            lastUpdatedAt: row.lastUpdatedAt
          });
        }
        return options;
      }, new Map<string, {
        id: string;
        code: string;
        name: string;
        status: ProcurementProject["status"];
        settlementStatus: SettlementOverviewStatus;
        externalTradeFlag: boolean;
        supplierName: string;
        settlementBillNo: string | null;
        lastUpdatedAt: string | null;
      }>()).values()
    )
      .sort((left, right) => {
        const priority = settlementStatusPriority[left.settlementStatus] - settlementStatusPriority[right.settlementStatus];
        if (priority !== 0) return priority;
        return String(right.lastUpdatedAt ?? "").localeCompare(String(left.lastUpdatedAt ?? ""));
      })
      .slice(0, 20);

    return res.json({
      rows: pagedRows,
      projectOptions,
      summary: {
        total: keywordFilteredRows.length,
        pendingBillCreation: statusCounts.pending_bill_creation,
        pendingMaterials: statusCounts.pending_materials,
        pendingReview: statusCounts.pending_review,
        pendingPayment: statusCounts.pending_payment,
        completed: statusCounts.completed,
        statusCounts
      },
      pagination: {
        page: effectivePage,
        pageSize,
        total,
        totalPages
      }
    });
  });

  router.get("/project-workbench/purchase-orders", (req, res) => {
    const supplierSide = isSupplierRole(req.auth.roleId);
    if (!supplierSide && !isWorkbenchBusinessReader(req.auth.roleId)) {
      return denyResponse(
        ctx,
        req,
        res,
        403,
        "PURCHASE_ORDER_LIST_READ_DENIED",
        "Current role cannot read purchase orders.",
        "purchase_order.list.denied",
        "purchase_order",
        "list"
      );
    }

    const purchaseOrders = ctx.state.purchaseOrders.filter((order) => {
      if (supplierSide) return supplierIdMatches(req.auth.user, order.supplierId);
      const project = ctx.state.projects.find((item) => item.id === order.projectId);
      return Boolean(project && canReadProject(req, project));
    });
    return res.json({ purchaseOrders });
  });

  router.get("/project-workbench/projects/:projectId", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertWorkbenchReader(ctx, req, res, project)) return;

    ensureArchiveSnapshot(ctx, project);
    const request = ctx.state.procurementRequests.find((item) => item.id === project.sourceRequestId || item.projectId === project.id) ?? null;
    const isSupplier = isSupplierRole(req.auth.roleId);
    const supplierIds = isSupplier ? [req.auth.user.supplierId ?? ""] : project.participantSupplierIds;
    const suppliers = ctx.state.suppliers
      .filter((item) => supplierIds.includes(item.id))
      .map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        status: supplier.status,
        admissionStatus: supplier.admissionStatus,
        contactName: supplier.contactName,
        contactPhone: supplier.contactPhone,
        contactEmail: supplier.contactEmail,
        serviceRegions: supplier.serviceRegions ?? [],
        categoryAuthorizations: supplier.categoryAuthorizations ?? [],
        qualification: supplier.qualification,
        qualificationAttachments: supplier.qualificationAttachments ?? [],
        admissionReviews: supplier.admissionReviews ?? [],
        sealSamples: supplier.sealSamples ?? [],
        risk: supplier.risk,
        evaluationScore: supplier.evaluationScore
      }));
    const bids = ctx.state.bids
      .filter((item) => item.projectId === project.id)
      .map((bid) => visibleBid(ctx, req, project, bid))
      .filter((item) => item !== null);
    const auditLogs = isSupplier || req.auth.roleId === "expert" ? [] : ctx.state.auditLogs.filter((log) => log.projectId === project.id && canReadAuditLog(req, ctx, log));

    return res.json({
      project: {
        ...project,
        beforeDeadline: isBeforeDeadline(project)
      },
      procurementRequest: request,
      procurementDocuments: ctx.state.procurementDocuments.filter((item) => item.projectId === project.id),
      announcements: ctx.state.procurementAnnouncements.filter((item) => item.projectId === project.id),
      invitations: ctx.state.supplierInvitations.filter((item) => item.projectId === project.id && (!isSupplier || item.supplierId === req.auth.user.supplierId)),
      registrations: ctx.state.supplierRegistrations.filter((item) => item.projectId === project.id && (!isSupplier || item.supplierId === req.auth.user.supplierId)),
      suppliers,
      bids,
      comparisonReport: visibleComparison(ctx, req, project),
      scoringSheets: isSupplier
        ? []
        : ctx.state.scoringSheets
            .filter((item) => item.projectId === project.id)
            .map((sheet) => ({
              ...sheet,
              expertName: ctx.state.experts.find((item) => item.id === sheet.expertId)?.name,
              supplierName: ctx.state.suppliers.find((item) => item.id === sheet.supplierId)?.name
            })),
      reviewReports: isSupplier ? [] : ctx.state.reviewReports.filter((item) => item.projectId === project.id),
      awardApprovals: isSupplier ? [] : ctx.state.awardApprovals.filter((item) => item.projectId === project.id),
      pricingReports: isSupplier ? [] : ctx.state.pricingReports.filter((item) => item.projectId === project.id),
      resultNotifications: ctx.state.resultNotifications.filter((item) => item.projectId === project.id && (!isSupplier || item.supplierId === req.auth.user.supplierId)),
      contracts: ctx.state.contractLedgers.filter((item) => item.projectId === project.id && (!isSupplier || item.supplierId === req.auth.user.supplierId)),
      purchaseOrders: visibleOrders(ctx, req, project),
      receiptRecords: visibleReceipts(ctx, req, project),
      supplierEvaluations: visibleSupplierEvaluations(ctx, req, project),
      settlementMaterials: visibleSettlementMaterials(ctx, req, project),
      archiveItems: ctx.state.archiveItems.filter((item) => item.projectId === project.id),
      archiveSupplementRequests: ctx.state.archiveSupplementRequests.filter((item) => item.projectId === project.id),
      auditLogs
    });
  });

  router.post("/project-workbench/projects/:projectId/purchase-orders/generate", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "purchase_order.generate.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "project", project.id, "purchase_order.generate.denied")) return;
    if (!["awarded_pending_order", "result_notified", "contract_registered"].includes(project.status)) {
      return denyResponse(ctx, req, res, 400, "PROJECT_STATUS_NOT_READY", "Purchase order can be generated only after contract confirmation and before fulfillment starts.", "purchase_order.generate.denied", "project", project.id, project.id);
    }
    if (isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Purchase order can be generated only after quote deadline.", "purchase_order.generate.denied", "project", project.id, project.id);
    }
    const approved = latestAwardApproval(ctx, project.id);
    if (!approved) {
      return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_NOT_APPROVED", "Approved award decision is required before generating purchase order.", "purchase_order.generate.denied", "project", project.id, project.id);
    }
    const contract = [...ctx.state.contractLedgers]
      .reverse()
      .find(
        (item) =>
          item.projectId === project.id &&
          item.supplierId === approved.selectedSupplierId &&
          ["registered", "performing", "completed"].includes(item.status)
      );
    if (!contract) {
      return denyResponse(
        ctx,
        req,
        res,
        400,
        "CONTRACT_CONFIRMATION_REQUIRED",
        "Supplier-confirmed contract is required before generating purchase order.",
        "purchase_order.generate.denied",
        "project",
        project.id,
        project.id
      );
    }
    if (req.body?.contractId !== undefined && String(req.body.contractId) !== contract.id) {
      return denyResponse(ctx, req, res, 400, "CONTRACT_ID_MISMATCH", "Purchase order contract must match the confirmed awarded-supplier contract.", "purchase_order.generate.denied", "contract_ledger", String(req.body.contractId), project.id);
    }
    const duplicate = ctx.state.purchaseOrders.find((item) => item.projectId === project.id && item.awardApprovalId === approved.id);
    if (duplicate) {
      return denyResponse(ctx, req, res, 400, "PURCHASE_ORDER_ALREADY_EXISTS", "Purchase order already exists for the approved award decision.", "purchase_order.generate.denied", "purchase_order", duplicate.id, project.id);
    }
    const bid = ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === approved.selectedSupplierId);
    if (!bid) {
      return denyResponse(ctx, req, res, 400, "SELECTED_BID_NOT_FOUND", "Selected supplier bid is required before generating purchase order.", "purchase_order.generate.denied", "project", project.id, project.id);
    }
    const request = ctx.state.procurementRequests.find((item) => item.id === project.sourceRequestId || item.projectId === project.id);
    const now = new Date().toISOString();
    const order: PurchaseOrder = {
      id: `po-${ctx.state.purchaseOrders.length + 1}`,
      projectId: project.id,
      supplierId: approved.selectedSupplierId,
      contractId: contract.id,
      sourceRequestId: request?.id,
      awardApprovalId: approved.id,
      selectedBidId: bid.id,
      orderNo: String(req.body?.orderNo ?? `PO-${now.slice(0, 10).replaceAll("-", "")}-${String(ctx.state.purchaseOrders.length + 1).padStart(3, "0")}`),
      status: "pending_confirmation",
      totalAmount: bid.amount,
      lineItems: lineItemsFromBid(bid),
      deliveryDays: bid.deliveryDays,
      expectedDeliveryAt: String(req.body?.expectedDeliveryAt ?? request?.expectedArrivalAt ?? now.slice(0, 10)),
      receivingLocation: String(req.body?.receivingLocation ?? request?.receivingLocation ?? project.orgName),
      statusRemark: "定标审批通过后生成采购订单",
      confirmedAt: null,
      createdBy: req.auth.user.id,
      createdAt: now,
      updatedAt: now
    };
    ctx.state.purchaseOrders.push(order);
    syncProjectStatus(project, ctx);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "purchase_order.generate", "purchase_order", order.id, project.id, `awardApproval=${approved.id}`);
    return res.status(201).json({ purchaseOrder: order, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/purchase-orders/:orderId/confirm", (req, res) => {
    const order = ensureOrder(ctx, req.params.orderId, res);
    if (!order) return;
    if (!assertSupplierOrderOwner(ctx, req, res, order, "purchase_order.confirm.denied")) return;
    if (order.status !== "pending_confirmation") {
      return denyResponse(ctx, req, res, 400, "PURCHASE_ORDER_STATUS_DENIED", "Only pending purchase orders can be confirmed.", "purchase_order.confirm.denied", "purchase_order", order.id, order.projectId);
    }
    order.status = "supplier_confirmed";
    order.confirmedAt = new Date().toISOString();
    order.updatedAt = order.confirmedAt;
    order.statusRemark = "供应商已确认";
    const project = ctx.state.projects.find((item) => item.id === order.projectId);
    if (project) {
      syncProjectStatus(project, ctx);
      ensureArchiveSnapshot(ctx, project);
    }
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "purchase_order.confirm", "purchase_order", order.id, order.projectId);
    return res.json({ purchaseOrder: order, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/purchase-orders/:orderId/change", (req, res) => {
    const order = ensureOrder(ctx, req.params.orderId, res);
    if (!order) return;
    const project = ensureProject(ctx, order.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "purchase_order.change.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "purchase_order", order.id, "purchase_order.change.denied")) return;
    if (["received", "closed"].includes(order.status)) {
      return denyResponse(ctx, req, res, 400, "PURCHASE_ORDER_CHANGE_DENIED", "Received or closed purchase orders cannot be changed directly.", "purchase_order.change.denied", "purchase_order", order.id, project.id);
    }
    order.expectedDeliveryAt = req.body?.expectedDeliveryAt === undefined ? order.expectedDeliveryAt : String(req.body.expectedDeliveryAt);
    order.receivingLocation = req.body?.receivingLocation === undefined ? order.receivingLocation : String(req.body.receivingLocation);
    order.statusRemark = String(req.body?.statusRemark ?? "采购订单已变更");
    order.updatedAt = new Date().toISOString();
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "purchase_order.change", "purchase_order", order.id, project.id, order.statusRemark);
    return res.json({ purchaseOrder: order, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/purchase-orders/:orderId/close", (req, res) => {
    const order = ensureOrder(ctx, req.params.orderId, res);
    if (!order) return;
    const project = ensureProject(ctx, order.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "purchase_order.close.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "purchase_order", order.id, "purchase_order.close.denied")) return;
    if (order.status === "closed") {
      return denyResponse(ctx, req, res, 400, "PURCHASE_ORDER_ALREADY_CLOSED", "Purchase order is already closed.", "purchase_order.close.denied", "purchase_order", order.id, project.id);
    }
    order.status = "closed";
    order.statusRemark = String(req.body?.reason ?? "采购订单已关闭");
    order.updatedAt = new Date().toISOString();
    syncProjectStatus(project, ctx);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "purchase_order.close", "purchase_order", order.id, project.id, order.statusRemark);
    return res.json({ purchaseOrder: order, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/purchase-orders/:orderId/receipts", (req, res) => {
    const order = ensureOrder(ctx, req.params.orderId, res);
    if (!order) return;
    const project = ensureProject(ctx, order.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "receipt.record.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "purchase_order", order.id, "receipt.record.denied")) return;
    if (!["supplier_confirmed", "performing", "partially_received", "received", "exception"].includes(order.status)) {
      return denyResponse(ctx, req, res, 400, "PURCHASE_ORDER_NOT_CONFIRM_READY", "Receipt can be recorded only after supplier confirms the order.", "receipt.record.denied", "purchase_order", order.id, order.projectId);
    }
    const receiptType = String(req.body?.receiptType ?? "partial") as ReceiptRecord["receiptType"];
    if (!["partial", "full", "exception"].includes(receiptType)) {
      return denyResponse(ctx, req, res, 400, "RECEIPT_TYPE_INVALID", "Receipt type is invalid.", "receipt.record.denied", "purchase_order", order.id, order.projectId);
    }
    const exceptionType = req.body?.exceptionType === undefined ? undefined : (String(req.body.exceptionType) as ReceiptExceptionType);
    if (receiptType === "exception" && !["quantity_mismatch", "quality_issue", "delivery_delay", "missing_documents", "other"].includes(exceptionType ?? "")) {
      return denyResponse(ctx, req, res, 400, "RECEIPT_EXCEPTION_TYPE_REQUIRED", "Exception receipt requires a valid exception type.", "receipt.record.denied", "purchase_order", order.id, order.projectId);
    }
    const now = new Date().toISOString();
    const receivedItems = Array.isArray(req.body?.receivedItems)
      ? req.body.receivedItems.map((item: Record<string, unknown>) => ({
          itemName: String(item.itemName ?? "received item"),
          receivedQuantity: Number(item.receivedQuantity ?? 0),
          unit: String(item.unit ?? "项"),
          accepted: Boolean(item.accepted ?? receiptType !== "exception")
        }))
      : order.lineItems.map((item) => ({
          itemName: item.itemName,
          receivedQuantity: receiptType === "partial" ? Math.min(item.quantity, Math.max(item.receivedQuantity + 1, 1)) : item.quantity,
          unit: item.unit,
          accepted: receiptType !== "exception"
        }));
    for (const received of receivedItems) {
      const line = order.lineItems.find((item) => item.itemName === received.itemName);
      if (line) {
        line.receivedQuantity = Math.min(line.quantity, Math.max(line.receivedQuantity, received.receivedQuantity));
      }
    }
    const receiptId = `rrc-${ctx.state.receiptRecords.length + 1}`;
    const attachmentMetadata = Array.isArray(req.body?.attachmentMetadata)
      ? resolveAttachmentList(ctx, req, req.body.attachmentMetadata, "receipt_record", receiptId, order.projectId, order.supplierId)
      : [];
    const receipt: ReceiptRecord = {
      id: receiptId,
      purchaseOrderId: order.id,
      projectId: order.projectId,
      supplierId: order.supplierId,
      receiptType,
      exceptionType,
      acceptanceResult: receiptType === "full" ? "accepted" : receiptType === "partial" ? "accepted" : "accepted_with_exception",
      status: "recorded",
      handlingStatus: receiptType === "exception" ? "pending_resolution" : "none",
      receivedItems,
      summary: String(req.body?.summary ?? "receipt recorded"),
      receiptAt: String(req.body?.receiptAt ?? now),
      operatorId: req.auth.user.id,
      attachmentMetadata,
      createdBy: req.auth.user.id,
      createdAt: now
    };
    ctx.state.receiptRecords.push(receipt);
    order.status = deriveOrderStatus(order, receipt.receiptType);
    order.statusRemark = receipt.receiptType === "exception" ? `异常收货: ${exceptionType ?? "other"}` : receipt.receiptType === "full" ? "已完成收货" : "已登记部分收货";
    order.updatedAt = now;
    syncProjectStatus(project, ctx);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "receipt.record", "receipt_record", receipt.id, order.projectId, `type=${receipt.receiptType}`);
    return res.status(201).json({ receiptRecord: receipt, purchaseOrder: order, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/receipts/:receiptId/handle", (req, res) => {
    const receipt = ensureReceipt(ctx, req.params.receiptId, res);
    if (!receipt) return;
    const project = ensureProject(ctx, receipt.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "receipt.handle.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "receipt_record", receipt.id, "receipt.handle.denied")) return;
    if (receipt.receiptType !== "exception") {
      return denyResponse(ctx, req, res, 400, "RECEIPT_NOT_EXCEPTION", "Only exception receipt records can enter exception handling.", "receipt.handle.denied", "receipt_record", receipt.id, project.id);
    }
    const handlingStatus = String(req.body?.handlingStatus ?? "supplemented") as ReceiptHandlingStatus;
    if (!["pending_resolution", "supplemented", "rejected", "closed"].includes(handlingStatus)) {
      return denyResponse(ctx, req, res, 400, "RECEIPT_HANDLING_STATUS_INVALID", "Receipt handling status is invalid.", "receipt.handle.denied", "receipt_record", receipt.id, project.id);
    }
    receipt.handlingStatus = handlingStatus;
    receipt.handlingNote = req.body?.handlingNote === undefined ? receipt.handlingNote : String(req.body.handlingNote);
    receipt.handledBy = req.auth.user.id;
    receipt.handledAt = new Date().toISOString();
    const order = ctx.state.purchaseOrders.find((item) => item.id === receipt.purchaseOrderId);
    if (order) {
      if (handlingStatus === "supplemented") {
        order.status = deriveOrderStatus(order);
        if (order.status === "supplier_confirmed") order.status = "performing";
        order.statusRemark = "异常已补录处理";
      } else if (handlingStatus === "rejected") {
        order.status = "exception";
        order.statusRemark = "异常已驳回待继续处理";
      } else if (handlingStatus === "closed") {
        order.status = "closed";
        order.statusRemark = "异常处理关闭";
      }
      order.updatedAt = receipt.handledAt;
    }
    syncProjectStatus(project, ctx);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "receipt.handle", "receipt_record", receipt.id, project.id, `status=${handlingStatus}`);
    return res.json({ receiptRecord: receipt, purchaseOrder: order, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/purchase-orders/:orderId/settlement-materials", (req, res) => {
    const order = ensureOrder(ctx, req.params.orderId, res);
    if (!order) return;
    const project = ensureProject(ctx, order.projectId, res);
    if (!project) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "purchase_order", order.id, "settlement_material.upload.denied")) return;
    if (isSupplierRole(req.auth.roleId)) {
      if (!assertSupplierOrderOwner(ctx, req, res, order, "settlement_material.upload.denied")) return;
    } else {
      if (!assertOrderMaintainer(ctx, req, res, project, "settlement_material.upload.denied")) return;
    }
    const materialType = String(req.body?.materialType ?? "invoice") as SettlementMaterialType;
    if (!["invoice", "delivery_note", "acceptance_record", "other"].includes(materialType)) {
      return denyResponse(ctx, req, res, 400, "SETTLEMENT_MATERIAL_TYPE_INVALID", "Settlement material type is invalid.", "settlement_material.upload.denied", "purchase_order", order.id, order.projectId);
    }
    const storedFileId = req.body?.storedFileId === undefined ? undefined : String(req.body.storedFileId);
    let fileId: string | undefined;
    let fileName = String(req.body?.fileName ?? `${materialType}.pdf`);
    if (storedFileId) {
      const attachment = handleStoredFile(ctx, storedFileId);
      if (!attachment) {
        return res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "Stored settlement file does not exist." } });
      }
      fileId = attachment.id;
      fileName = attachment.fileName;
    }
    const material = ctx.r7SettlementFinanceRepository.upsertSettlementMaterial({
      purchaseOrderId: order.id,
      materialType,
      fileId,
      fileName,
      uploadedBy: req.auth.user.id
    });
    ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "settlement_material.upload", "settlement_material", material.id, order.projectId, `type=${material.materialType}`);
    return res.status(201).json({ settlementMaterial: material, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/settlement-materials/:materialId/verify", (req, res) => {
    const material = ensureSettlementMaterial(ctx, req.params.materialId, res);
    if (!material) return;
    const project = ensureProject(ctx, material.projectId, res);
    if (!project) return;
    if (!assertSettlementVerifier(ctx, req, res, project, "settlement_material.verify.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "settlement_material", material.id, "settlement_material.verify.denied")) return;
    const approved = Boolean(req.body?.approved ?? true);
    const reviewed = ctx.r7SettlementFinanceRepository.reviewSettlementMaterial(
      material.id,
      req.auth.user,
      approved,
      String(req.body?.verificationOpinion ?? (approved ? "核验通过" : "核验驳回"))
    );
    Object.assign(material, reviewed);
    ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      approved ? "settlement_material.verify" : "settlement_material.reject",
      "settlement_material",
      material.id,
      project.id,
      material.verificationOpinion
    );
    return res.json({ settlementMaterial: material, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/purchase-orders/:orderId/evaluations", (req, res) => {
    const order = ensureOrder(ctx, req.params.orderId, res);
    if (!order) return;
    const project = ensureProject(ctx, order.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "supplier_evaluation.create.denied")) return;
    if (!ensureArchiveMutable(ctx, req, res, project.id, "purchase_order", order.id, "supplier_evaluation.create.denied")) return;
    if (!["received", "closed"].includes(order.status)) {
      return denyResponse(ctx, req, res, 400, "PURCHASE_ORDER_NOT_EVALUABLE", "Supplier evaluation can be submitted only after order has been fully received or closed.", "supplier_evaluation.create.denied", "purchase_order", order.id, project.id);
    }
    const raw = (typeof req.body?.dimensions === "object" && req.body.dimensions ? req.body.dimensions : {}) as Partial<SupplierEvaluationDimensions>;
    const dimensions: SupplierEvaluationDimensions = {
      quality: Number(raw.quality ?? 90),
      delivery: Number(raw.delivery ?? 90),
      service: Number(raw.service ?? 90),
      cooperation: Number(raw.cooperation ?? 90),
      priceReasonableness: Number(raw.priceReasonableness ?? 90)
    };
    const active = ctx.state.supplierEvaluations.filter((item) => item.purchaseOrderId === order.id && item.status === "submitted_locked");
    for (const item of active) {
      item.status = "superseded";
    }
    const now = new Date().toISOString();
    const latestVersion = active.reduce((max, item) => Math.max(max, item.versionNo), 0);
    const evaluation: SupplierEvaluation = {
      id: `se-${ctx.state.supplierEvaluations.length + 1}`,
      supplierId: order.supplierId,
      projectId: order.projectId,
      contractId: order.contractId,
      purchaseOrderId: order.id,
      dimensions,
      score: Number(req.body?.score ?? averageScore(dimensions)),
      status: "submitted_locked",
      versionNo: latestVersion + 1,
      description: String(req.body?.description ?? "supplier evaluation"),
      improvementSuggestion: req.body?.improvementSuggestion === undefined ? undefined : String(req.body.improvementSuggestion),
      performanceExceptionRef: req.body?.performanceExceptionRef === undefined ? undefined : String(req.body.performanceExceptionRef),
      correctionReason: req.body?.correctionReason === undefined ? undefined : String(req.body.correctionReason),
      previousEvaluationId: active.length > 0 ? active.sort((a, b) => b.versionNo - a.versionNo)[0]?.id : undefined,
      lockedAt: now,
      createdBy: req.auth.user.id,
      createdAt: now
    };
    ctx.state.supplierEvaluations.push(evaluation);
    updateSupplierScore(ctx, order.supplierId);
    ctx.r3SupplierProductRepository.addSupplierEvaluation(evaluation);
    const supplier = ctx.state.suppliers.find((item) => item.id === order.supplierId);
    if (supplier) ctx.r3SupplierProductRepository.upsertSupplier(supplier);
    syncProjectStatus(project, ctx);
    ensureArchiveSnapshot(ctx, project);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier_evaluation.submit_locked", "supplier_evaluation", evaluation.id, project.id, `version=${evaluation.versionNo}`);
    return res.status(201).json({ supplierEvaluation: evaluation, auditLogId: auditLog.id });
  });

  router.post("/project-workbench/archive-items/:itemId/update", (req, res) => {
    const item = ensureArchiveItem(ctx, req.params.itemId, res);
    if (!item) return;
    const project = ensureProject(ctx, item.projectId, res);
    if (!project) return;
    if (!assertOrderMaintainer(ctx, req, res, project, "archive_item.update.denied")) return;
    if (item.sealed || item.status === "sealed") {
      return denyResponse(ctx, req, res, 403, "ARCHIVE_ITEM_SEALED", "Archive item is sealed and cannot be updated directly.", "archive_item.update.denied", "archive_item", item.id, item.projectId);
    }
    item.collectedFlag = Boolean(req.body?.collectedFlag ?? item.collectedFlag);
    item.status = item.collectedFlag ? "complete" : "collecting";
    item.snapshotJson = { ...item.snapshotJson, updatedBy: req.auth.user.id, updatedAt: new Date().toISOString() };
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "archive_item.update", "archive_item", item.id, item.projectId);
    return res.json({ archiveItem: item, auditLogId: auditLog.id });
  });

  return router;
}
