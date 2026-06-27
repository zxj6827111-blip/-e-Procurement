import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { ApprovalRule, RoleId, User } from "../types.js";
import { denyResponse } from "./permission-helpers.js";

const adminOnlyConfigResources = new Set(["roles", "role_permissions", "system_dictionaries", "users", "approval_rules"]);
const methodRuleReaderRoles = new Set(["buyer", "group_manager", "hotel_buyer", "platform_operator", "auditor", "admin"]);
const approvalRuleReaderRoles = new Set(["buyer", "group_manager", "auditor", "admin"]);
const allowedApprovalBusinessTypes: ApprovalRule["businessType"][] = [
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

function assertAdminConfigReader(ctx: AppContext, req: Request, res: Response, resource: string) {
  if (req.auth.roleId === "admin") return true;
  const code = adminOnlyConfigResources.has(resource) ? "CONFIG_ADMIN_ONLY" : "CONFIG_READ_DENIED";
  denyResponse(ctx, req, res, 403, code, "Current role cannot read this configuration resource.", "config.read.denied", resource, "list");
  return false;
}

function visibleOrganizations(ctx: AppContext, req: Request) {
  if (req.auth.roleId === "admin") return ctx.state.organizations;
  return ctx.state.organizations.filter((org) => req.auth.orgScope.includes(org.id) || org.id === req.auth.user.orgId);
}

function assertAdminWriter(ctx: AppContext, req: Request, res: Response, resource: string, objectId: string) {
  if (req.auth.roleId === "admin") return true;
  denyResponse(ctx, req, res, 403, "CONFIG_ADMIN_ONLY", "Only system administrators can maintain this configuration resource.", "config.write.denied", resource, objectId);
  return false;
}

function isRoleId(value: string): value is RoleId {
  return ["group_manager", "buyer", "supplier", "expert", "auditor", "admin", "system"].includes(value);
}

function isUserStatus(value: string): value is NonNullable<User["status"]> {
  return ["active", "disabled", "suspended", "offboarded"].includes(value);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeApprovalRoles(value: unknown) {
  return normalizeStringArray(value).filter(isRoleId).filter((roleId) => !["system", "admin", "auditor"].includes(roleId));
}

function findUser(ctx: AppContext, userId: string) {
  return ctx.state.users.find((item) => item.id === userId);
}

export function organizationRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/organizations", (req, res) => res.json({ organizations: visibleOrganizations(ctx, req) }));
  router.post("/organizations", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "organization", "new")) return;
    const id = String(req.body?.id ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const level = String(req.body?.level ?? "").trim();
    const parentId = req.body?.parentId === null || req.body?.parentId === undefined ? null : String(req.body.parentId).trim();
    if (!id || !name || !level) {
      return res.status(400).json({ error: { code: "ORGANIZATION_INVALID", message: "Organization id, name and level are required." } });
    }
    if (ctx.state.organizations.some((item) => item.id === id)) {
      return res.status(409).json({ error: { code: "ORGANIZATION_EXISTS", message: "Organization already exists." } });
    }
    const organization = { id, name, level, parentId, status: "active" as const };
    ctx.state.organizations.push(organization);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "organization.create", "organization", id);
    return res.status(201).json({ organization, auditLogId: log.id });
  });
  router.patch("/organizations/:orgId/status", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "organization", req.params.orgId)) return;
    const organization = ctx.state.organizations.find((item) => item.id === req.params.orgId);
    if (!organization) return res.status(404).json({ error: { code: "ORGANIZATION_NOT_FOUND", message: "Organization was not found." } });
    const status = String(req.body?.status ?? "");
    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ error: { code: "ORGANIZATION_STATUS_INVALID", message: "Organization status must be active or disabled." } });
    }
    organization.status = status as "active" | "disabled";
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "organization.status.update", "organization", organization.id, undefined, status);
    return res.json({ organization, auditLogId: log.id });
  });
  router.get("/roles", (req, res) => {
    if (!assertAdminConfigReader(ctx, req, res, "roles")) return;
    return res.json({ roles: ctx.state.roles });
  });
  router.get("/users", (req, res) => {
    if (!assertAdminConfigReader(ctx, req, res, "users")) return;
    return res.json({ users: ctx.state.users });
  });
  router.patch("/users/:userId/status", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "user", req.params.userId)) return;
    const user = findUser(ctx, req.params.userId);
    if (!user || user.roleId === "system") return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
    const status = String(req.body?.status ?? "");
    if (!isUserStatus(status)) {
      return res.status(400).json({ error: { code: "USER_STATUS_INVALID", message: "User status must be active, disabled, suspended or offboarded." } });
    }
    user.status = status;
    ctx.authStore.setAccountStatus(user.id, status);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "user.status.update", "user", user.id, undefined, status);
    return res.json({ user, auditLogId: log.id });
  });
  router.patch("/users/:userId/role", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "user", req.params.userId)) return;
    const user = findUser(ctx, req.params.userId);
    if (!user || user.roleId === "system") return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
    const roleId = String(req.body?.roleId ?? "");
    if (!isRoleId(roleId) || roleId === "system") {
      return res.status(400).json({ error: { code: "USER_ROLE_INVALID", message: "Role id is invalid." } });
    }
    user.roleId = roleId;
    if (Array.isArray(req.body?.orgScope)) user.orgScope = normalizeStringArray(req.body.orgScope);
    if (req.body?.orgId !== undefined) user.orgId = String(req.body.orgId).trim() || user.orgId;
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "user.role.update", "user", user.id, undefined, roleId);
    return res.json({ user, auditLogId: log.id });
  });
  router.patch("/users/:userId/profile", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "user", req.params.userId)) return;
    const user = findUser(ctx, req.params.userId);
    if (!user || user.roleId === "system") return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
    if (req.body?.name !== undefined) user.name = String(req.body.name).trim() || user.name;
    if (req.body?.departmentId !== undefined) user.departmentId = String(req.body.departmentId).trim() || undefined;
    if (req.body?.position !== undefined) user.position = String(req.body.position).trim() || undefined;
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "user.profile.update", "user", user.id);
    return res.json({ user, auditLogId: log.id });
  });
  router.get("/role-permissions", (req, res) => {
    if (!assertAdminConfigReader(ctx, req, res, "role_permissions")) return;
    return res.json({ rolePermissions: ctx.state.rolePermissions });
  });
  router.get("/system-dictionaries", (req, res) => {
    if (!assertAdminConfigReader(ctx, req, res, "system_dictionaries")) return;
    return res.json({ systemDictionaries: ctx.state.systemDictionaries });
  });
  router.get("/procurement-method-rules", (req, res) => {
    if (!methodRuleReaderRoles.has(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "PROCUREMENT_METHOD_RULE_READ_DENIED", "Current role cannot read procurement method rules.", "procurement_method_rule.read.denied", "procurement_method_rule", "list");
    }
    return res.json({ procurementMethodRules: ctx.state.procurementMethodRules });
  });
  router.get("/approval-rules", (req, res) => {
    if (!approvalRuleReaderRoles.has(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "APPROVAL_RULE_READ_DENIED", "Current role cannot read approval rules.", "approval_rule.read.denied", "approval_rule", "list");
    }
    return res.json({ approvalRules: ctx.r8WorkflowTaskRepository.listApprovalRules() });
  });
  router.post("/approval-rules", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "approval_rule", "new")) return;
    const now = new Date().toISOString();
    const ruleCode = String(req.body?.ruleCode ?? "").trim();
    const ruleName = String(req.body?.ruleName ?? "").trim();
    const businessType = String(req.body?.businessType ?? "procurement_request") as ApprovalRule["businessType"];
    if (!ruleCode || !ruleName || !allowedApprovalBusinessTypes.includes(businessType)) {
      return res.status(400).json({ error: { code: "APPROVAL_RULE_INVALID", message: "Approval rule code, name and business type are required." } });
    }
    if ((ctx.state.approvalRules ?? []).some((item) => item.ruleCode === ruleCode)) {
      return res.status(409).json({ error: { code: "APPROVAL_RULE_EXISTS", message: "Approval rule code already exists." } });
    }
    const nodeRoleIds = normalizeApprovalRoles(req.body?.nodeRoleIds);
    const approvalRule: ApprovalRule = {
      id: `apr-${Date.now()}`,
      ruleCode,
      ruleName,
      businessType,
      amountMin: req.body?.amountMin === undefined ? undefined : Number(req.body.amountMin),
      amountMax: req.body?.amountMax === undefined ? undefined : Number(req.body.amountMax),
      methodTypes: normalizeStringArray(req.body?.methodTypes),
      nodeRoleIds,
      actions: normalizeStringArray(req.body?.actions),
      orgScope: normalizeStringArray(req.body?.orgScope),
      hotelScope: normalizeStringArray(req.body?.hotelScope),
      approvalOrder: normalizeApprovalRoles(req.body?.approvalOrder),
      defaultStrategy: req.body?.defaultStrategy === "reject_without_rule" ? "reject_without_rule" : "manual_review_required",
      status: "enabled",
      versionNo: 1,
      updatedAt: now
    };
    ctx.state.approvalRules = ctx.state.approvalRules ?? [];
    ctx.state.approvalRules.push(approvalRule);
    ctx.r8WorkflowTaskRepository.upsertApprovalRule(approvalRule);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "approval_rule.create", "approval_rule", approvalRule.id);
    return res.status(201).json({ approvalRule, auditLogId: log.id });
  });
  router.patch("/approval-rules/:ruleId", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "approval_rule", req.params.ruleId)) return;
    const rule = (ctx.state.approvalRules ?? []).find((item) => item.id === req.params.ruleId);
    if (!rule) return res.status(404).json({ error: { code: "APPROVAL_RULE_NOT_FOUND", message: "Approval rule was not found." } });
    if (req.body?.ruleName !== undefined) rule.ruleName = String(req.body.ruleName).trim() || rule.ruleName;
    if (req.body?.amountMin !== undefined) rule.amountMin = Number(req.body.amountMin);
    if (req.body?.amountMax !== undefined) rule.amountMax = Number(req.body.amountMax);
    if (req.body?.methodTypes !== undefined) rule.methodTypes = normalizeStringArray(req.body.methodTypes);
    if (req.body?.nodeRoleIds !== undefined) rule.nodeRoleIds = normalizeApprovalRoles(req.body.nodeRoleIds);
    if (req.body?.actions !== undefined) rule.actions = normalizeStringArray(req.body.actions);
    if (req.body?.orgScope !== undefined) rule.orgScope = normalizeStringArray(req.body.orgScope);
    if (req.body?.hotelScope !== undefined) rule.hotelScope = normalizeStringArray(req.body.hotelScope);
    if (req.body?.approvalOrder !== undefined) rule.approvalOrder = normalizeApprovalRoles(req.body.approvalOrder);
    if (req.body?.defaultStrategy !== undefined) rule.defaultStrategy = req.body.defaultStrategy === "reject_without_rule" ? "reject_without_rule" : "manual_review_required";
    if (req.body?.status !== undefined && ["enabled", "disabled"].includes(String(req.body.status))) rule.status = String(req.body.status) as ApprovalRule["status"];
    rule.versionNo += 1;
    rule.updatedAt = new Date().toISOString();
    ctx.r8WorkflowTaskRepository.upsertApprovalRule(rule);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "approval_rule.update", "approval_rule", rule.id, undefined, `version ${rule.versionNo}`);
    return res.json({ approvalRule: rule, auditLogId: log.id });
  });

  return router;
}
