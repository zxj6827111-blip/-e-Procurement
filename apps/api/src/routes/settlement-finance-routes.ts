import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { isFundLedgerStatus, isSettlementMaterialType } from "../repositories/r7-settlement-finance-repository.js";
import { isFinanceReviewRole, isFinanceRole, isProcurementBuyerRole, isSupplierRole, supplierIdMatches } from "../role-groups.js";
import { denyResponse } from "./permission-helpers.js";

function assertFinanceReader(ctx: AppContext, req: Request, res: Response) {
  if (isFinanceRole(req.auth.roleId) || isProcurementBuyerRole(req.auth.roleId) || isSupplierRole(req.auth.roleId) || req.auth.roleId === "auditor") return true;
  denyResponse(ctx, req, res, 403, "SETTLEMENT_FINANCE_READ_DENIED", "Current role cannot read settlement finance data.", "settlement_finance.read.denied", "settlement_finance", "list");
  return false;
}

function assertFinanceWriter(ctx: AppContext, req: Request, res: Response, action: string, objectId = "operation") {
  if (isFinanceReviewRole(req.auth.roleId) || isProcurementBuyerRole(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "SETTLEMENT_FINANCE_WRITE_DENIED", "Only finance/procurement business roles can perform this settlement finance action.", action, "settlement_finance", objectId);
  return false;
}

function assertSupplierBill(ctx: AppContext, req: Request, res: Response, settlementBillId: string) {
  const bill = ctx.r7SettlementFinanceRepository.getSettlementBill(settlementBillId);
  if (!bill) {
    res.status(404).json({ error: { code: "SETTLEMENT_BILL_NOT_FOUND", message: "Settlement bill does not exist." } });
    return null;
  }
  if (isSupplierRole(req.auth.roleId) && !supplierIdMatches(req.auth.user, bill.supplierId)) {
    denyResponse(ctx, req, res, 403, "SUPPLIER_SETTLEMENT_SCOPE_DENIED", "Supplier can only operate own settlement bill.", "settlement_bill.scope.denied", "settlement_bill", settlementBillId, bill.projectId);
    return null;
  }
  if (!ctx.r7SettlementFinanceRepository.canReadBill(req.auth.user, req.auth.roleId, bill)) {
    denyResponse(ctx, req, res, 403, "SETTLEMENT_BILL_SCOPE_DENIED", "Current role cannot access this settlement bill.", "settlement_bill.scope.denied", "settlement_bill", settlementBillId, bill.projectId);
    return null;
  }
  return bill;
}

function syncR7(ctx: AppContext) {
  ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
}

export function settlementFinanceRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/settlement-finance/overview", (req, res) => {
    if (!assertFinanceReader(ctx, req, res)) return;
    return res.json(ctx.r7SettlementFinanceRepository.listOverview(req.auth.user, req.auth.roleId));
  });

  router.post("/settlement-finance/settlement-bills", (req, res) => {
    if (!assertFinanceWriter(ctx, req, res, "settlement_bill.generate.denied")) return;
    const serviceFeeRate = Number(req.body?.serviceFeeRate ?? 0);
    if (!Number.isFinite(serviceFeeRate) || serviceFeeRate < 0 || serviceFeeRate > 1) {
      return denyResponse(ctx, req, res, 400, "SETTLEMENT_SERVICE_FEE_RATE_INVALID", "Service fee rate must be between 0 and 1.", "settlement_bill.generate.denied", "settlement_bill", "operation");
    }
    try {
      const bill = ctx.r7SettlementFinanceRepository.generateSettlementBill(
        String(req.body?.purchaseOrderId ?? req.body?.orderId ?? ""),
        String(req.body?.period ?? new Date().toISOString().slice(0, 7)),
        req.auth.user,
        serviceFeeRate
      );
      syncR7(ctx);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "settlement_bill.generate", "settlement_bill", bill.id, bill.projectId, `amount=${bill.settlementAmount}`);
      return res.status(201).json({ settlementBill: bill, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "SETTLEMENT_BILL_GENERATE_BLOCKED", message: error instanceof Error ? error.message : "Settlement bill generation blocked." } });
    }
  });

  router.post("/settlement-finance/settlement-bills/:billId/submit", (req, res) => {
    const existing = assertSupplierBill(ctx, req, res, req.params.billId);
    if (!existing) return;
    if (!isSupplierRole(req.auth.roleId) && !isFinanceReviewRole(req.auth.roleId) && !isProcurementBuyerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "SETTLEMENT_SUBMIT_DENIED", "Current role cannot submit settlement application.", "settlement_bill.submit.denied", "settlement_bill", existing.id, existing.projectId);
    }
    try {
      const bill = ctx.r7SettlementFinanceRepository.submitSettlementBill(existing.id, req.auth.user);
      const workflow = ctx.r8WorkflowTaskRepository.startApproval({
        businessType: "settlement_bill",
        businessId: bill.id,
        title: `Settlement bill ${bill.billNo}`,
        amount: bill.settlementAmount,
        methodType: "settlement_bill",
        projectId: bill.projectId,
        orgId: bill.orgId,
        supplierId: bill.supplierId,
        initiator: req.auth.user,
        sourceJson: { route: "settlement_bill.submit", purchaseOrderId: bill.purchaseOrderId }
      });
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "settlement_bill.submit", "settlement_bill", bill.id, bill.projectId);
      return res.json({ settlementBill: bill, workflow, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "SETTLEMENT_BILL_SUBMIT_BLOCKED", message: error instanceof Error ? error.message : "Settlement submit blocked." } });
    }
  });

  router.post("/settlement-finance/settlement-bills/:billId/review", (req, res) => {
    const existing = assertSupplierBill(ctx, req, res, req.params.billId);
    if (!existing) return;
    if (!assertFinanceWriter(ctx, req, res, "settlement_bill.review.denied", existing.id)) return;
    try {
      const bill = ctx.r7SettlementFinanceRepository.reviewSettlementBill(existing.id, req.auth.user, req.body?.approved !== false, req.body?.opinion === undefined ? undefined : String(req.body.opinion));
      try {
        ctx.r8WorkflowTaskRepository.recordApprovalAction({
          businessType: "settlement_bill",
          businessId: bill.id,
          actor: req.auth.user,
          action: req.body?.approved === false ? "reject" : "approve",
          opinion: bill.approvalOpinion,
          sourceJson: { route: "settlement_bill.review" }
        });
      } catch {
        // Keep existing R7 review endpoint compatible if the settlement bill pre-dates R8 workflow.
      }
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, req.body?.approved === false ? "settlement_bill.reject" : "settlement_bill.approve", "settlement_bill", bill.id, bill.projectId, bill.approvalOpinion);
      return res.json({ settlementBill: bill, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "SETTLEMENT_BILL_REVIEW_BLOCKED", message: error instanceof Error ? error.message : "Settlement review blocked." } });
    }
  });

  router.post("/settlement-finance/settlement-bills/:billId/materials", (req, res) => {
    const bill = assertSupplierBill(ctx, req, res, req.params.billId);
    if (!bill) return;
    if (req.auth.roleId === "auditor") {
      return denyResponse(ctx, req, res, 403, "AUDITOR_READONLY", "Auditor can only read settlement materials.", "settlement_material.upload.denied", "settlement_bill", bill.id, bill.projectId);
    }
    const materialType = String(req.body?.materialType ?? "other");
    if (!isSettlementMaterialType(materialType)) {
      return denyResponse(ctx, req, res, 400, "SETTLEMENT_MATERIAL_TYPE_INVALID", "Settlement material type is invalid.", "settlement_material.upload.denied", "settlement_bill", bill.id, bill.projectId);
    }
    try {
      const material = ctx.r7SettlementFinanceRepository.upsertSettlementMaterial({
        settlementBillId: bill.id,
        purchaseOrderId: bill.purchaseOrderId,
        materialType,
        fileId: req.body?.fileId === undefined ? req.body?.storedFileId === undefined ? undefined : String(req.body.storedFileId) : String(req.body.fileId),
        fileName: req.body?.fileName === undefined ? undefined : String(req.body.fileName),
        uploadedBy: req.auth.user.id
      });
      syncR7(ctx);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "settlement_material.upload", "settlement_material", material.id, bill.projectId, `type=${material.materialType}`);
      return res.status(201).json({ settlementMaterial: material, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "SETTLEMENT_MATERIAL_UPLOAD_BLOCKED", message: error instanceof Error ? error.message : "Settlement material upload blocked." } });
    }
  });

  router.post("/settlement-finance/materials/:materialId/review", (req, res) => {
    const material = ctx.r7SettlementFinanceRepository.getSettlementMaterial(req.params.materialId);
    if (!material) return res.status(404).json({ error: { code: "SETTLEMENT_MATERIAL_NOT_FOUND", message: "Settlement material does not exist." } });
    if (!assertFinanceWriter(ctx, req, res, "settlement_material.review.denied", material.id)) return;
    if (!ctx.r7SettlementFinanceRepository.canReviewMaterial(req.auth.user, req.auth.roleId, material)) {
      return denyResponse(ctx, req, res, 403, "SETTLEMENT_MATERIAL_SCOPE_DENIED", "Current role cannot review this settlement material.", "settlement_material.scope.denied", "settlement_material", material.id, material.projectId);
    }
    try {
      const reviewed = ctx.r7SettlementFinanceRepository.reviewSettlementMaterial(material.id, req.auth.user, req.body?.approved !== false, req.body?.opinion === undefined ? undefined : String(req.body.opinion));
      syncR7(ctx);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, req.body?.approved === false ? "settlement_material.reject" : "settlement_material.verify", "settlement_material", reviewed.id, reviewed.projectId, reviewed.verificationOpinion);
      return res.json({ settlementMaterial: reviewed, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "SETTLEMENT_MATERIAL_REVIEW_BLOCKED", message: error instanceof Error ? error.message : "Settlement material review blocked." } });
    }
  });

  router.post("/settlement-finance/settlement-bills/:billId/invoices", (req, res) => {
    const bill = assertSupplierBill(ctx, req, res, req.params.billId);
    if (!bill) return;
    if (!isSupplierRole(req.auth.roleId) && !isFinanceReviewRole(req.auth.roleId) && !isProcurementBuyerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "INVOICE_UPLOAD_DENIED", "Current role cannot upload settlement invoices.", "invoice.upload.denied", "settlement_bill", bill.id, bill.projectId);
    }
    try {
      const invoice = ctx.r7SettlementFinanceRepository.uploadInvoice({
        settlementBillId: bill.id,
        invoiceNo: String(req.body?.invoiceNo ?? `INV-${Date.now()}`),
        invoiceType: String(req.body?.invoiceType ?? "special_vat"),
        issueDate: String(req.body?.issueDate ?? new Date().toISOString().slice(0, 10)),
        amount: Number(req.body?.amount ?? 0),
        taxRate: Number(req.body?.taxRate ?? 0),
        taxAmount: req.body?.taxAmount === undefined ? undefined : Number(req.body.taxAmount),
        fileId: req.body?.fileId === undefined ? req.body?.storedFileId === undefined ? undefined : String(req.body.storedFileId) : String(req.body.fileId),
        fileName: req.body?.fileName === undefined ? undefined : String(req.body.fileName),
        uploadedBy: req.auth.user.id
      });
      syncR7(ctx);
      const workflow = ctx.r8WorkflowTaskRepository.startApproval({
        businessType: "invoice",
        businessId: invoice.id,
        title: `Invoice ${invoice.invoiceNo}`,
        amount: invoice.amount,
        methodType: "invoice",
        projectId: bill.projectId,
        orgId: bill.orgId,
        supplierId: bill.supplierId,
        initiator: req.auth.user,
        sourceJson: { route: "invoice.upload", settlementBillId: bill.id }
      });
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "invoice.upload", "invoice", invoice.id, bill.projectId, `amount=${invoice.amount}`);
      return res.status(201).json({ invoice, workflow, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "INVOICE_UPLOAD_BLOCKED", message: error instanceof Error ? error.message : "Invoice upload blocked." } });
    }
  });

  router.post("/settlement-finance/invoices/:invoiceId/review", (req, res) => {
    const invoice = ctx.r7SettlementFinanceRepository.getInvoice(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: { code: "INVOICE_NOT_FOUND", message: "Invoice does not exist." } });
    const bill = assertSupplierBill(ctx, req, res, invoice.settlementBillId);
    if (!bill) return;
    if (!assertFinanceWriter(ctx, req, res, "invoice.review.denied", invoice.id)) return;
    try {
      const reviewed = ctx.r7SettlementFinanceRepository.reviewInvoice(invoice.id, req.auth.user, req.body?.approved !== false, req.body?.opinion === undefined ? undefined : String(req.body.opinion));
      syncR7(ctx);
      try {
        ctx.r8WorkflowTaskRepository.recordApprovalAction({
          businessType: "invoice",
          businessId: reviewed.id,
          actor: req.auth.user,
          action: req.body?.approved === false ? "reject" : "approve",
          opinion: reviewed.verificationOpinion,
          sourceJson: { route: "invoice.review", settlementBillId: bill.id }
        });
      } catch {
        // Keep existing R7 invoice review compatible for pre-R8 invoices.
      }
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, req.body?.approved === false ? "invoice.reject" : "invoice.verify", "invoice", reviewed.id, bill.projectId, reviewed.verificationOpinion);
      return res.json({ invoice: reviewed, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "INVOICE_REVIEW_BLOCKED", message: error instanceof Error ? error.message : "Invoice review blocked." } });
    }
  });

  router.post("/settlement-finance/settlement-bills/:billId/fund-ledger", (req, res) => {
    const bill = assertSupplierBill(ctx, req, res, req.params.billId);
    if (!bill) return;
    if (!assertFinanceWriter(ctx, req, res, "fund_ledger.create.denied", bill.id)) return;
    const status = req.body?.status === undefined ? "payment_requested" : String(req.body.status);
    if (!isFundLedgerStatus(status)) {
      return denyResponse(ctx, req, res, 400, "FUND_LEDGER_STATUS_INVALID", "Fund ledger status is invalid.", "fund_ledger.create.denied", "settlement_bill", bill.id, bill.projectId);
    }
    try {
      const entry = ctx.r7SettlementFinanceRepository.createFundLedgerEntry(
        bill.id,
        req.auth.user,
        status,
        req.body?.note === undefined ? undefined : String(req.body.note)
      );
      const workflow = ctx.r8WorkflowTaskRepository.startApproval({
        businessType: "payment_request",
        businessId: entry.id,
        title: `Payment request ${entry.ledgerNo}`,
        amount: entry.amount,
        methodType: entry.entryType,
        projectId: bill.projectId,
        orgId: bill.orgId,
        supplierId: bill.supplierId,
        initiator: req.auth.user,
        sourceJson: { route: "fund_ledger.create", settlementBillId: bill.id, entryType: entry.entryType }
      });
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "fund_ledger.create", "fund_ledger", entry.id, bill.projectId, `amount=${entry.amount};${entry.note ?? ""}`);
      return res.status(201).json({ fundLedgerEntry: entry, workflow, auditLogId: auditLog.id });
    } catch (error) {
      return res.status(400).json({ error: { code: "FUND_LEDGER_CREATE_BLOCKED", message: error instanceof Error ? error.message : "Fund ledger creation blocked." } });
    }
  });

  return router;
}
