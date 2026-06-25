import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { WorkflowRuleError } from "../repositories/r8-workflow-task-repository.js";
import type { ApprovalBusinessType, ApprovalRule, RoleId } from "../types.js";
import { isOrgReaderRole } from "../role-groups.js";
import { denyResponse } from "./permission-helpers.js";

const roleIds: RoleId[] = [
  "group_manager",
  "buyer",
  "hotel_buyer",
  "hotel_finance",
  "platform_operator",
  "supplier",
  "supplier_admin",
  "supplier_quotation",
  "expert",
  "finance_reviewer",
  "auditor",
  "admin",
  "system"
];
const validBusinessTypes: ApprovalBusinessType[] = [
  "procurement_request",
  "award_approval",
  "archive_supplement",
  "price_approval",
  "mall_order",
  "settlement_bill",
  "invoice",
  "payment_request",
  "return_request",
  "expert_scoring"
];

function normalizeStringArray(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).map((item) => item.trim()).filter(Boolean);
}

function isRoleId(value: string): value is RoleId {
  return roleIds.includes(value as RoleId);
}

function normalizeApprovalRoles(raw: unknown) {
  return normalizeStringArray(raw).filter(isRoleId).filter((roleId) => !["system", "admin", "auditor"].includes(roleId));
}

function handleWorkflowError(res: Response, error: unknown) {
  if (error instanceof WorkflowRuleError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  return res.status(400).json({ error: { code: "WORKFLOW_OPERATION_BLOCKED", message: error instanceof Error ? error.message : "Workflow operation blocked." } });
}

function assertAdmin(ctx: AppContext, req: Request, res: Response, objectId: string) {
  if (req.auth.roleId === "admin") return true;
  denyResponse(ctx, req, res, 403, "WORKFLOW_RULE_ADMIN_ONLY", "Only system administrators can maintain workflow rules.", "workflow_rule.write.denied", "approval_rule", objectId);
  return false;
}

function syncStateRule(ctx: AppContext, rule: ApprovalRule) {
  ctx.state.approvalRules ??= [];
  const existing = ctx.state.approvalRules.find((item) => item.id === rule.id);
  if (existing) Object.assign(existing, rule);
  else ctx.state.approvalRules.push(rule);
}

function syncBusinessAfterWorkflowAction(ctx: AppContext, instanceId: string) {
  const instance = ctx.r8WorkflowTaskRepository.getApprovalInstance(instanceId);
  if (!instance) return;
  const workflowStatus = instance.approvalStatus;
  if (!["approved", "rejected", "returned", "cancelled"].includes(workflowStatus)) return;
  const businessApprovalStatus = workflowStatus === "returned" ? "rejected" : workflowStatus;
  if (instance.businessType === "procurement_request" && ["approved", "rejected", "cancelled"].includes(businessApprovalStatus)) {
    const procurementRequest = ctx.state.procurementRequests.find((item) => item.id === instance.businessId);
    if (!procurementRequest) return;
    procurementRequest.approvalStatus = businessApprovalStatus as typeof procurementRequest.approvalStatus;
    procurementRequest.approvalBy = instance.completedBy;
    procurementRequest.approvedAt = instance.completedAt;
    procurementRequest.updatedAt = instance.updatedAt;
    ctx.r4SourcingRepository.upsertProcurementRequest(procurementRequest);
  }
  if (instance.businessType === "award_approval" && ["approved", "rejected"].includes(businessApprovalStatus)) {
    const approval = ctx.state.awardApprovals.find((item) => item.id === instance.businessId);
    if (!approval) return;
    approval.approvalStatus = businessApprovalStatus as typeof approval.approvalStatus;
    approval.approvedAt = instance.completedAt ?? null;
    ctx.r5ReviewAwardRepository.upsertAwardApproval(approval);
  }
}

function resolveManualWorkflowBusiness(ctx: AppContext, businessType: ApprovalBusinessType, businessId: string) {
  if (!businessId) return null;
  if (businessType === "procurement_request") {
    const item = ctx.state.procurementRequests.find((request) => request.id === businessId);
    return item
      ? {
          title: item.title,
          amount: item.budgetAmount,
          methodType: item.methodSuggestion,
          projectId: item.projectId ?? undefined,
          orgId: item.orgId
        }
      : null;
  }
  if (businessType === "award_approval") {
    const item = ctx.state.awardApprovals.find((approval) => approval.id === businessId);
    const project = item ? ctx.state.projects.find((projectItem) => projectItem.id === item.projectId) : undefined;
    return item && project
      ? {
          title: `Award approval ${project.name}`,
          amount: project.budgetAmount,
          methodType: project.type,
          projectId: project.id,
          orgId: project.orgId,
          supplierId: item.selectedSupplierId
        }
      : null;
  }
  if (businessType === "settlement_bill") {
    const item = ctx.r7SettlementFinanceRepository.getSettlementBill(businessId);
    return item
      ? {
          title: `Settlement bill ${item.billNo}`,
          amount: item.settlementAmount,
          methodType: "settlement_bill",
          projectId: item.projectId,
          orgId: item.orgId,
          supplierId: item.supplierId
        }
      : null;
  }
  if (businessType === "invoice") {
    const item = ctx.r7SettlementFinanceRepository.getInvoice(businessId);
    const bill = item ? ctx.r7SettlementFinanceRepository.getSettlementBill(item.settlementBillId) : undefined;
    return item && bill
      ? {
          title: `Invoice ${item.invoiceNo}`,
          amount: item.amount,
          methodType: "invoice",
          projectId: bill.projectId,
          orgId: bill.orgId,
          supplierId: item.supplierId
        }
      : null;
  }
  if (businessType === "payment_request") {
    const item = ctx.r7SettlementFinanceRepository.listFundLedgerEntries().find((entry) => entry.id === businessId);
    const bill = item ? ctx.r7SettlementFinanceRepository.getSettlementBill(item.settlementBillId) : undefined;
    return item && bill
      ? {
          title: `Payment request ${item.ledgerNo}`,
          amount: item.amount,
          methodType: item.entryType,
          projectId: bill.projectId,
          orgId: bill.orgId,
          supplierId: item.supplierId
        }
      : null;
  }
  return null;
}

export function workflowTaskRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/workflow/approval-rules", (req, res) => {
    if (req.auth.roleId !== "admin" && !isOrgReaderRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "WORKFLOW_RULE_READ_DENIED", "Current role cannot read workflow rules.", "workflow_rule.read.denied", "approval_rule", "list");
    }
    return res.json({ approvalRules: ctx.r8WorkflowTaskRepository.listApprovalRules() });
  });

  router.post("/workflow/approval-rules", (req, res) => {
    if (!assertAdmin(ctx, req, res, "new")) return;
    const ruleCode = String(req.body?.ruleCode ?? "").trim();
    const ruleName = String(req.body?.ruleName ?? "").trim();
    const businessType = String(req.body?.businessType ?? "procurement_request") as ApprovalBusinessType;
    if (!ruleCode || !ruleName || !validBusinessTypes.includes(businessType)) {
      return res.status(400).json({ error: { code: "WORKFLOW_RULE_INVALID", message: "Rule code, name and supported business type are required." } });
    }
    if (ctx.r8WorkflowTaskRepository.listApprovalRules().some((item) => item.ruleCode === ruleCode)) {
      return res.status(409).json({ error: { code: "WORKFLOW_RULE_EXISTS", message: "Approval rule code already exists." } });
    }
    const now = new Date().toISOString();
    const rule: ApprovalRule = {
      id: `apr-${Date.now()}`,
      ruleCode,
      ruleName,
      businessType,
      amountMin: req.body?.amountMin === undefined ? undefined : Number(req.body.amountMin),
      amountMax: req.body?.amountMax === undefined ? undefined : Number(req.body.amountMax),
      methodTypes: normalizeStringArray(req.body?.methodTypes),
      nodeRoleIds: normalizeApprovalRoles(req.body?.nodeRoleIds),
      actions: normalizeStringArray(req.body?.actions),
      orgScope: normalizeStringArray(req.body?.orgScope),
      hotelScope: normalizeStringArray(req.body?.hotelScope),
      approvalOrder: normalizeApprovalRoles(req.body?.approvalOrder),
      defaultStrategy: req.body?.defaultStrategy === "reject_without_rule" ? "reject_without_rule" : "manual_review_required",
      status: req.body?.status === "disabled" ? "disabled" : "enabled",
      versionNo: 1,
      updatedAt: now
    };
    ctx.r8WorkflowTaskRepository.upsertApprovalRule(rule);
    syncStateRule(ctx, rule);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "workflow_rule.create", "approval_rule", rule.id, undefined, rule.ruleCode);
    return res.status(201).json({ approvalRule: rule, auditLogId: auditLog.id });
  });

  router.patch("/workflow/approval-rules/:ruleId", (req, res) => {
    if (!assertAdmin(ctx, req, res, req.params.ruleId)) return;
    try {
      const patch: Partial<ApprovalRule> = {};
      if (req.body?.ruleName !== undefined) patch.ruleName = String(req.body.ruleName).trim();
      if (req.body?.amountMin !== undefined) patch.amountMin = Number(req.body.amountMin);
      if (req.body?.amountMax !== undefined) patch.amountMax = Number(req.body.amountMax);
      if (req.body?.methodTypes !== undefined) patch.methodTypes = normalizeStringArray(req.body.methodTypes);
      if (req.body?.nodeRoleIds !== undefined) patch.nodeRoleIds = normalizeApprovalRoles(req.body.nodeRoleIds);
      if (req.body?.actions !== undefined) patch.actions = normalizeStringArray(req.body.actions);
      if (req.body?.orgScope !== undefined) patch.orgScope = normalizeStringArray(req.body.orgScope);
      if (req.body?.hotelScope !== undefined) patch.hotelScope = normalizeStringArray(req.body.hotelScope);
      if (req.body?.approvalOrder !== undefined) patch.approvalOrder = normalizeApprovalRoles(req.body.approvalOrder);
      if (req.body?.status !== undefined && ["enabled", "disabled"].includes(String(req.body.status))) patch.status = String(req.body.status) as ApprovalRule["status"];
      if (req.body?.defaultStrategy !== undefined) patch.defaultStrategy = req.body.defaultStrategy === "reject_without_rule" ? "reject_without_rule" : "manual_review_required";
      const rule = ctx.r8WorkflowTaskRepository.updateApprovalRule(req.params.ruleId, patch);
      syncStateRule(ctx, rule);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "workflow_rule.update", "approval_rule", rule.id, undefined, `version=${rule.versionNo}`);
      return res.json({ approvalRule: rule, auditLogId: auditLog.id });
    } catch (error) {
      return handleWorkflowError(res, error);
    }
  });

  router.get("/workflow/approval-instances", (req, res) => {
    return res.json({ approvalInstances: ctx.r8WorkflowTaskRepository.listApprovalInstances(req.auth.user, req.auth.roleId) });
  });

  router.post("/workflow/approval-instances", (req, res) => {
    if (req.auth.roleId !== "admin") {
      return denyResponse(ctx, req, res, 403, "WORKFLOW_INSTANCE_ADMIN_ONLY", "Only administrators can manually start workflow instances.", "workflow_instance.start.denied", "approval_instance", "new");
    }
    const businessType = String(req.body?.businessType ?? "") as ApprovalBusinessType;
    if (!validBusinessTypes.includes(businessType)) return res.status(400).json({ error: { code: "WORKFLOW_BUSINESS_TYPE_INVALID", message: "Unsupported workflow business type." } });
    const businessId = String(req.body?.businessId ?? "");
    const business = resolveManualWorkflowBusiness(ctx, businessType, businessId);
    if (!business) return res.status(404).json({ error: { code: "WORKFLOW_BUSINESS_NOT_FOUND", message: "Workflow business object was not found." } });
    if (req.body?.orgId !== undefined && String(req.body.orgId) !== business.orgId) {
      return res.status(400).json({ error: { code: "WORKFLOW_BUSINESS_SCOPE_MISMATCH", message: "Workflow org scope does not match the business object." } });
    }
    if (req.body?.supplierId !== undefined && String(req.body.supplierId) !== (business.supplierId ?? "")) {
      return res.status(400).json({ error: { code: "WORKFLOW_BUSINESS_SCOPE_MISMATCH", message: "Workflow supplier scope does not match the business object." } });
    }
    try {
      const result = ctx.r8WorkflowTaskRepository.startApproval({
        businessType,
        businessId,
        title: String(req.body?.title ?? req.body?.businessTitle ?? business.title),
        amount: req.body?.amount === undefined ? business.amount : Number(req.body.amount),
        methodType: req.body?.methodType === undefined ? business.methodType : String(req.body.methodType),
        projectId: business.projectId,
        orgId: business.orgId,
        supplierId: business.supplierId,
        initiator: req.auth.user,
        assigneeRoleId: req.body?.assigneeRoleId === undefined ? undefined : (String(req.body.assigneeRoleId) as RoleId),
        assigneeUserId: req.body?.assigneeUserId === undefined ? undefined : String(req.body.assigneeUserId),
        sourceJson: { manualStart: true }
      });
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "workflow_instance.start", "approval_instance", result.approvalInstance.id, result.approvalInstance.projectId);
      return res.status(201).json({ ...result, auditLogId: auditLog.id });
    } catch (error) {
      return handleWorkflowError(res, error);
    }
  });

  router.post("/workflow/approval-instances/:instanceId/actions", (req, res) => {
    const action = String(req.body?.action ?? "");
    if (!["approve", "reject", "return", "cancel", "revoke"].includes(action)) {
      return res.status(400).json({ error: { code: "WORKFLOW_ACTION_INVALID", message: "Unsupported workflow action." } });
    }
    try {
      const result = ctx.r8WorkflowTaskRepository.recordApprovalAction({
        instanceId: req.params.instanceId,
        actor: req.auth.user,
        action: action as "approve" | "reject" | "return" | "cancel" | "revoke",
        opinion: req.body?.opinion === undefined ? undefined : String(req.body.opinion),
        sourceJson: { route: "workflow" }
      });
      syncBusinessAfterWorkflowAction(ctx, result.approvalInstance.id);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, `workflow_instance.${action}`, "approval_instance", result.approvalInstance.id, result.approvalInstance.projectId);
      return res.json({ ...result, auditLogId: auditLog.id });
    } catch (error) {
      return handleWorkflowError(res, error);
    }
  });

  router.get("/workflow/tasks", (req, res) => {
    return res.json({ tasks: ctx.r8WorkflowTaskRepository.listTasks(req.auth.user, req.auth.roleId) });
  });

  router.post("/workflow/tasks/:taskId/complete", (req, res) => {
    try {
      const task = ctx.r8WorkflowTaskRepository.completeTask(req.params.taskId, req.auth.user);
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "workflow_task.complete", "workflow_task", task.id, task.projectId);
      return res.json({ task, auditLogId: auditLog.id });
    } catch (error) {
      return handleWorkflowError(res, error);
    }
  });

  router.get("/workflow/notifications", (req, res) => {
    return res.json({ notifications: ctx.r8WorkflowTaskRepository.listNotifications(req.auth.user, req.auth.roleId) });
  });

  router.post("/workflow/notifications/:messageId/read", (req, res) => {
    try {
      const notification = ctx.r8WorkflowTaskRepository.markNotificationRead(req.params.messageId, req.auth.user, req.auth.roleId);
      return res.json({ notification });
    } catch (error) {
      return handleWorkflowError(res, error);
    }
  });

  return router;
}
