import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type {
  AcceptancePaymentRecord,
  AwardApproval,
  ContractLedger,
  PerformanceNode,
  ProcurementDocumentAttachment,
  ProcurementProject,
  SupplierEvaluation,
  SupplierEvaluationDimensions
} from "../types.js";
import { isSupplierRole, supplierIdMatches } from "../role-groups.js";

const maintainerRoles = new Set(["buyer", "platform_operator"]);
const readerRoles = new Set(["buyer", "platform_operator", "group_manager", "auditor"]);

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

function supplierCanReadProjectContract(ctx: AppContext, project: ProcurementProject, supplierId: string) {
  if (!supplierId) return false;
  return (
    project.participantSupplierIds.includes(supplierId) ||
    ctx.state.contractLedgers.some((item) => item.projectId === project.id && item.supplierId === supplierId) ||
    ctx.state.awardApprovals.some((item) => item.projectId === project.id && item.selectedSupplierId === supplierId && item.approvalStatus === "approved") ||
    ctx.state.resultNotifications.some((item) => item.projectId === project.id && item.supplierId === supplierId && item.status === "sent") ||
    ctx.state.bids.some((item) => item.projectId === project.id && item.supplierId === supplierId) ||
    ctx.state.supplierRegistrations.some((item) => item.projectId === project.id && item.supplierId === supplierId && item.status !== "rejected") ||
    ctx.state.purchaseOrders.some((item) => item.projectId === project.id && item.supplierId === supplierId)
  );
}

function canReadProject(ctx: AppContext, req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer" || req.auth.roleId === "platform_operator") {
    return (req.auth.user.managedProjectIds?.includes(project.id) ?? false) || req.auth.orgScope.includes(project.orgId);
  }
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(project.orgId);
  if (isSupplierRole(req.auth.roleId)) return supplierCanReadProjectContract(ctx, project, req.auth.user.supplierId ?? "");
  return false;
}

function ensureProject(ctx: AppContext, projectId: string, res: Response) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  return project;
}

function ensureContract(ctx: AppContext, contractId: string, res: Response) {
  const contract = ctx.state.contractLedgers.find((item) => item.id === contractId);
  if (!contract) {
    res.status(404).json({ error: { code: "CONTRACT_LEDGER_NOT_FOUND", message: "Contract ledger does not exist." } });
    return null;
  }
  return contract;
}

function assertMaintainer(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!maintainerRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "CONTRACT_BUSINESS_ROLE_REQUIRED", "Only procurement business roles can maintain contract and performance data.", action, "project", project.id, project.id);
  }
  if (canReadProject(ctx, req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot maintain this project.", action, "project", project.id, project.id);
}

function assertReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (isSupplierRole(req.auth.roleId)) {
    if (supplierCanReadProjectContract(ctx, project, req.auth.user.supplierId ?? "")) return true;
    return denyResponse(ctx, req, res, 403, "SUPPLIER_CONTRACT_SCOPE_DENIED", "Supplier can only read own contract and performance data.", action, "project", project.id, project.id);
  }
  if (!readerRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "CONTRACT_READ_DENIED", "Current role cannot read contract and performance data.", action, "project", project.id, project.id);
  }
  if (canReadProject(ctx, req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read this project.", action, "project", project.id, project.id);
}

function visibleContracts(ctx: AppContext, req: Request, projectId?: string) {
  let contracts = ctx.state.contractLedgers;
  if (projectId) contracts = contracts.filter((item) => item.projectId === projectId);
  return contracts.filter((contract) => {
    if (isSupplierRole(req.auth.roleId)) return contract.supplierId === req.auth.user.supplierId;
    const project = ctx.state.projects.find((item) => item.id === contract.projectId);
    return project ? readerRoles.has(req.auth.roleId) && canReadProject(ctx, req, project) : false;
  });
}

function latestApprovedAwardApproval(ctx: AppContext, projectId: string) {
  return [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === projectId && item.approvalStatus === "approved");
}

function latestPricingReport(ctx: AppContext, project: ProcurementProject, approval?: AwardApproval) {
  return [...ctx.state.pricingReports]
    .reverse()
    .find((item) => item.projectId === project.id && item.status !== "voided" && (!approval || item.awardApprovalId === approval.id));
}

function contractAmountFromAward(ctx: AppContext, project: ProcurementProject, approval?: AwardApproval) {
  const report = latestPricingReport(ctx, project, approval);
  if (report?.items.length) {
    return Number(report.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0).toFixed(2));
  }
  const selectedBid = approval
    ? ctx.state.bids.find((item) => item.projectId === project.id && item.supplierId === approval.selectedSupplierId && ["submitted", "locked"].includes(item.status))
    : undefined;
  return selectedBid?.amount ?? project.budgetAmount ?? 0;
}

function nextContractId(ctx: AppContext) {
  let index = ctx.state.contractLedgers.length + 1;
  let id = `cl-${index}`;
  while (ctx.state.contractLedgers.some((item) => item.id === id)) {
    index += 1;
    id = `cl-${index}`;
  }
  return id;
}

function buildContract(ctx: AppContext, req: Request, project: ProcurementProject, supplierId: string, status: ContractLedger["status"], amount: number): ContractLedger {
  const now = new Date().toISOString();
  const id = nextContractId(ctx);
  return {
    id,
    projectId: project.id,
    supplierId,
    contractNo: String(req.body?.contractNo ?? `HT-${project.code}-${String(ctx.state.contractLedgers.length + 1).padStart(3, "0")}`),
    amount,
    status,
    contractSystemLink: req.body?.contractSystemLink ? String(req.body.contractSystemLink) : undefined,
    attachmentMetadata: Array.isArray(req.body?.attachmentMetadata)
      ? req.body.attachmentMetadata.map((item: unknown, index: number) => toAttachment(item, `contract-att-${id}-${index + 1}`))
      : [],
    createdBy: req.auth.user.id,
    createdAt: now,
    updatedAt: now
  };
}

function toAttachment(input: unknown, fallbackId: string): ProcurementDocumentAttachment {
  const value = (typeof input === "object" && input ? input : {}) as Partial<ProcurementDocumentAttachment>;
  return {
    id: String(value.id ?? fallbackId),
    fileName: String(value.fileName ?? "attachment-metadata.pdf"),
    contentType: String(value.contentType ?? "application/pdf"),
    sizeBytes: Number(value.sizeBytes ?? 0),
    uploadedAt: String(value.uploadedAt ?? new Date().toISOString())
  };
}

function normalizeEvaluationDimensions(dimensions: Record<string, number>): SupplierEvaluationDimensions {
  return {
    quality: Number(dimensions.quality ?? 90),
    delivery: Number(dimensions.delivery ?? 90),
    service: Number(dimensions.service ?? 90),
    cooperation: Number(dimensions.cooperation ?? 90),
    priceReasonableness: Number(dimensions.priceReasonableness ?? 90)
  };
}

function scoreFromDimensions(dimensions: SupplierEvaluationDimensions) {
  const values = Object.values(dimensions);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function contractPerformanceRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/contracts", (req, res) => {
    if (isSupplierRole(req.auth.roleId)) return res.json({ contracts: visibleContracts(ctx, req) });
    if (!readerRoles.has(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "CONTRACT_READ_DENIED", "Current role cannot read contract ledger data.", "contract.read.denied", "contract_ledger", "list");
    }
    return res.json({ contracts: visibleContracts(ctx, req) });
  });

  router.get("/projects/:projectId/contracts", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReader(ctx, req, res, project, "contract.read.denied")) return;
    return res.json({ contracts: visibleContracts(ctx, req, project.id) });
  });

  router.post("/projects/:projectId/contracts/signing", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertMaintainer(ctx, req, res, project, "contract_signing.create.denied")) return;
    const approvedAward = latestApprovedAwardApproval(ctx, project.id);
    if (!approvedAward) {
      return denyResponse(ctx, req, res, 400, "CONTRACT_AWARD_APPROVAL_REQUIRED", "Approved award approval is required before contract signing.", "contract_signing.award.denied", "project", project.id, project.id);
    }
    const supplierId = String(req.body?.supplierId ?? approvedAward.selectedSupplierId);
    if (supplierId !== approvedAward.selectedSupplierId) {
      return denyResponse(ctx, req, res, 400, "CONTRACT_SUPPLIER_MUST_BE_AWARD_WINNER", "Contract supplier must be the awarded supplier.", "contract_signing.supplier.denied", "project", project.id, project.id);
    }
    const existing = ctx.state.contractLedgers.find((item) => item.projectId === project.id && item.supplierId === supplierId && item.status !== "cancelled");
    if (existing) return res.json({ contract: existing });
    const amount = Number(req.body?.amount ?? contractAmountFromAward(ctx, project, approvedAward));
    const contract = buildContract(ctx, req, project, supplierId, "pending_supplier_confirmation", amount);
    ctx.state.contractLedgers.push(contract);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "contract_signing.create", "contract_ledger", contract.id, project.id, `supplier=${supplierId}`);
    ctx.eventBus.emit({
      eventCode: "ContractLedgerCreated",
      businessType: "contract_preparation",
      businessId: contract.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      supplierId,
      projectId: project.id,
      idempotencyKey: `contract_preparation:${project.id}:contract_signing:${contract.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        contractId: contract.id,
        supplierId,
        status: contract.status
      }
    });
    return res.status(201).json({ contract, auditLogId: auditLog.id });
  });

  router.post("/projects/:projectId/contracts", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertMaintainer(ctx, req, res, project, "contract.create.denied")) return;
    const supplierId = String(req.body?.supplierId ?? project.participantSupplierIds[0] ?? "");
    if (!supplierId || !project.participantSupplierIds.includes(supplierId)) {
      return denyResponse(ctx, req, res, 400, "CONTRACT_SUPPLIER_INVALID", "Contract supplier must be a project participant.", "contract.supplier.denied", "project", project.id, project.id);
    }
    const now = new Date().toISOString();
    const contract: ContractLedger = {
      id: `cl-${ctx.state.contractLedgers.length + 1}`,
      projectId: project.id,
      supplierId,
      contractNo: String(req.body?.contractNo ?? `HT-${String(ctx.state.contractLedgers.length + 1).padStart(4, "0")}`),
      amount: Number(req.body?.amount ?? 0),
      status: "registered",
      contractSystemLink: req.body?.contractSystemLink ? String(req.body.contractSystemLink) : undefined,
      attachmentMetadata: Array.isArray(req.body?.attachmentMetadata)
        ? req.body.attachmentMetadata.map((item: unknown, index: number) => toAttachment(item, `contract-att-${ctx.state.contractLedgers.length + 1}-${index + 1}`))
        : [],
      createdBy: req.auth.user.id,
      createdAt: now,
      updatedAt: now
    };
    ctx.state.contractLedgers.push(contract);
    project.status = project.externalTradeFlag ? "external_contract_registered" : "contract_registered";
    project.displayStatus = "contract registered";
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "contract_ledger.register", "contract_ledger", contract.id, project.id);
    ctx.eventBus.emit({
      eventCode: "ContractLedgerCreated",
      businessType: "contract_preparation",
      businessId: contract.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      supplierId,
      projectId: project.id,
      idempotencyKey: `contract_preparation:${project.id}:contract_ledger:${contract.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        contractId: contract.id,
        supplierId
      }
    });
    return res.status(201).json({ contract, auditLogId: auditLog.id });
  });

  router.post("/contracts/:contractId/confirm", (req, res) => {
    const contract = ensureContract(ctx, req.params.contractId, res);
    if (!contract) return;
    const project = ensureProject(ctx, contract.projectId, res);
    if (!project) return;
    if (!isSupplierRole(req.auth.roleId) || !supplierIdMatches(req.auth.user, contract.supplierId)) {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_CONTRACT_CONFIRM_DENIED", "Supplier can only confirm own contract.", "contract_signing.confirm.denied", "contract_ledger", contract.id, project.id);
    }
    if (contract.status === "cancelled") {
      return denyResponse(ctx, req, res, 400, "CONTRACT_CANCELLED", "Cancelled contract cannot be confirmed.", "contract_signing.confirm.denied", "contract_ledger", contract.id, project.id);
    }
    if (Array.isArray(req.body?.attachmentMetadata) && req.body.attachmentMetadata.length > 0) {
      const existingCount = contract.attachmentMetadata.length;
      contract.attachmentMetadata = [
        ...contract.attachmentMetadata,
        ...req.body.attachmentMetadata.map((item: unknown, index: number) => toAttachment(item, `contract-confirm-${contract.id}-${existingCount + index + 1}`))
      ];
    }
    const now = new Date().toISOString();
    contract.status = "registered";
    contract.updatedAt = now;
    project.status = project.externalTradeFlag ? "external_contract_registered" : "contract_registered";
    project.displayStatus = "contract registered";
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "contract_signing.confirm", "contract_ledger", contract.id, project.id, `supplier=${contract.supplierId}`);
    return res.json({ contract, auditLogId: auditLog.id });
  });

  router.post("/contracts/:contractId/performance-nodes", (req, res) => {
    const contract = ensureContract(ctx, req.params.contractId, res);
    if (!contract) return;
    const project = ensureProject(ctx, contract.projectId, res);
    if (!project) return;
    if (!assertMaintainer(ctx, req, res, project, "performance_node.create.denied")) return;
    const now = new Date().toISOString();
    const node: PerformanceNode = {
      id: `pn-${ctx.state.performanceNodes.length + 1}`,
      contractId: contract.id,
      projectId: contract.projectId,
      supplierId: contract.supplierId,
      nodeName: String(req.body?.nodeName ?? "performance node"),
      planDate: String(req.body?.planDate ?? now.slice(0, 10)),
      status: "planned",
      attachmentMetadata: [],
      updatedBy: req.auth.user.id,
      updatedAt: now
    };
    ctx.state.performanceNodes.push(node);
    contract.status = "performing";
    contract.updatedAt = now;
    project.status = project.externalTradeFlag ? "external_performing" : "performing";
    project.displayStatus = "performing";
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "performance_node.create", "performance_node", node.id, project.id);
    return res.status(201).json({ performanceNode: node, auditLogId: auditLog.id });
  });

  router.post("/performance-nodes/:nodeId/status", (req, res) => {
    const node = ctx.state.performanceNodes.find((item) => item.id === req.params.nodeId);
    if (!node) return res.status(404).json({ error: { code: "PERFORMANCE_NODE_NOT_FOUND", message: "Performance node does not exist." } });
    const project = ensureProject(ctx, node.projectId, res);
    if (!project) return;
    if (!assertMaintainer(ctx, req, res, project, "performance_node.update.denied")) return;
    const status = String(req.body?.status ?? node.status);
    if (!["planned", "completed", "exception"].includes(status)) {
      return denyResponse(ctx, req, res, 400, "PERFORMANCE_NODE_STATUS_INVALID", "Performance node status is invalid.", "performance_node.status.denied", "performance_node", node.id, node.projectId);
    }
    node.status = status as PerformanceNode["status"];
    node.acceptanceRecord = req.body?.acceptanceRecord === undefined ? node.acceptanceRecord : String(req.body.acceptanceRecord);
    node.paymentRecord = req.body?.paymentRecord === undefined ? node.paymentRecord : String(req.body.paymentRecord);
    node.exceptionNote = req.body?.exceptionNote === undefined ? node.exceptionNote : String(req.body.exceptionNote);
    node.updatedBy = req.auth.user.id;
    node.updatedAt = new Date().toISOString();
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "performance_node.update", "performance_node", node.id, node.projectId, `status=${node.status}`);
    return res.json({ performanceNode: node, auditLogId: auditLog.id });
  });

  router.get("/contracts/:contractId/performance-nodes", (req, res) => {
    const contract = ensureContract(ctx, req.params.contractId, res);
    if (!contract) return;
    const project = ensureProject(ctx, contract.projectId, res);
    if (!project) return;
    if (!assertReader(ctx, req, res, project, "performance_node.read.denied")) return;
    if (req.auth.roleId === "supplier" && req.auth.user.supplierId !== contract.supplierId) {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_CONTRACT_SCOPE_DENIED", "Supplier can only read own performance data.", "performance_node.supplier_scope.denied", "contract_ledger", contract.id, contract.projectId);
    }
    return res.json({ performanceNodes: ctx.state.performanceNodes.filter((item) => item.contractId === contract.id) });
  });

  router.post("/contracts/:contractId/acceptance-payments", (req, res) => {
    const contract = ensureContract(ctx, req.params.contractId, res);
    if (!contract) return;
    const project = ensureProject(ctx, contract.projectId, res);
    if (!project) return;
    if (!assertMaintainer(ctx, req, res, project, "acceptance_payment.create.denied")) return;
    const recordType = String(req.body?.recordType ?? "acceptance");
    if (recordType !== "acceptance" && recordType !== "payment") {
      return denyResponse(ctx, req, res, 400, "ACCEPTANCE_PAYMENT_TYPE_INVALID", "Acceptance/payment record type is invalid.", "acceptance_payment.type.denied", "contract_ledger", contract.id, project.id);
    }
    const now = new Date().toISOString();
    const record: AcceptancePaymentRecord = {
      id: `apr-${ctx.state.acceptancePaymentRecords.length + 1}`,
      contractId: contract.id,
      projectId: contract.projectId,
      supplierId: contract.supplierId,
      recordType,
      status: "recorded",
      amount: req.body?.amount === undefined ? undefined : Number(req.body.amount),
      summary: String(req.body?.summary ?? `${recordType} record`),
      attachmentMetadata: Array.isArray(req.body?.attachmentMetadata)
        ? req.body.attachmentMetadata.map((item: unknown, index: number) => toAttachment(item, `apr-att-${ctx.state.acceptancePaymentRecords.length + 1}-${index + 1}`))
        : [],
      createdBy: req.auth.user.id,
      createdAt: now
    };
    ctx.state.acceptancePaymentRecords.push(record);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "acceptance_payment.record", "acceptance_payment", record.id, project.id, `type=${record.recordType}`);
    return res.status(201).json({ acceptancePaymentRecord: record, auditLogId: auditLog.id });
  });

  router.get("/contracts/:contractId/acceptance-payments", (req, res) => {
    const contract = ensureContract(ctx, req.params.contractId, res);
    if (!contract) return;
    const project = ensureProject(ctx, contract.projectId, res);
    if (!project) return;
    if (!assertReader(ctx, req, res, project, "acceptance_payment.read.denied")) return;
    if (req.auth.roleId === "supplier" && req.auth.user.supplierId !== contract.supplierId) {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_CONTRACT_SCOPE_DENIED", "Supplier can only read own acceptance/payment records.", "acceptance_payment.supplier_scope.denied", "contract_ledger", contract.id, contract.projectId);
    }
    return res.json({ acceptancePaymentRecords: ctx.state.acceptancePaymentRecords.filter((item) => item.contractId === contract.id) });
  });

  router.post("/contracts/:contractId/supplier-evaluations", (req, res) => {
    const contract = ensureContract(ctx, req.params.contractId, res);
    if (!contract) return;
    const project = ensureProject(ctx, contract.projectId, res);
    if (!project) return;
    if (!assertMaintainer(ctx, req, res, project, "supplier_evaluation.create.denied")) return;
    const dimensions = normalizeEvaluationDimensions(
      (typeof req.body?.dimensions === "object" && req.body.dimensions ? req.body.dimensions : { delivery: 90, quality: 90, service: 90 }) as Record<string, number>
    );
    const now = new Date().toISOString();
    const evaluation: SupplierEvaluation = {
      id: `se-${ctx.state.supplierEvaluations.length + 1}`,
      supplierId: contract.supplierId,
      projectId: contract.projectId,
      contractId: contract.id,
      purchaseOrderId: undefined,
      dimensions,
      score: Number(req.body?.score ?? scoreFromDimensions(dimensions)),
      status: "submitted_locked",
      versionNo: 1,
      description: String(req.body?.description ?? "supplier evaluation"),
      improvementSuggestion: req.body?.improvementSuggestion === undefined ? undefined : String(req.body.improvementSuggestion),
      performanceExceptionRef: req.body?.performanceExceptionRef === undefined ? undefined : String(req.body.performanceExceptionRef),
      lockedAt: now,
      createdBy: req.auth.user.id,
      createdAt: now
    };
    ctx.state.supplierEvaluations.push(evaluation);
    const supplier = ctx.state.suppliers.find((item) => item.id === contract.supplierId);
    if (supplier) supplier.evaluationScore = evaluation.score;
    ctx.r3SupplierProductRepository.addSupplierEvaluation(evaluation);
    if (supplier) ctx.r3SupplierProductRepository.upsertSupplier(supplier);
    project.status = project.externalTradeFlag ? "external_evaluated" : "evaluated";
    project.displayStatus = "supplier evaluated";
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier_evaluation.create", "supplier_evaluation", evaluation.id, project.id);
    return res.status(201).json({ supplierEvaluation: evaluation, supplier, auditLogId: auditLog.id });
  });

  router.get("/suppliers/:supplierId/evaluations", (req, res) => {
    if (isSupplierRole(req.auth.roleId)) {
      ctx.policies.supplierDataIsolation.assertSupplierAccess(req.auth, req.params.supplierId, "supplier_evaluation", req.params.supplierId);
    } else if (!readerRoles.has(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "SUPPLIER_EVALUATION_READ_DENIED", "Current role cannot read supplier evaluation content.", "supplier_evaluation.read.denied", "supplier", req.params.supplierId);
    }
    const supplierEvaluations = ctx.state.supplierEvaluations.filter((item) => {
      if (item.supplierId !== req.params.supplierId) return false;
      if (isSupplierRole(req.auth.roleId)) return true;
      const project = ctx.state.projects.find((projectItem) => projectItem.id === item.projectId);
      return project ? canReadProject(ctx, req, project) : false;
    });
    return res.json({ supplierEvaluations });
  });

  return router;
}
