import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { generateTemporaryPassword, type ManagedAccountStatus } from "../runtime/auth-store.js";
import type { ApprovalRule, RoleId, User } from "../types.js";
import { denyResponse } from "./permission-helpers.js";

const adminOnlyConfigResources = new Set(["roles", "role_permissions", "system_dictionaries", "users", "approval_rules"]);
const methodRuleReaderRoles = new Set(["buyer", "group_manager", "hotel_buyer", "platform_operator", "auditor", "admin"]);
const approvalRuleReaderRoles = new Set(["buyer", "group_manager", "auditor", "admin"]);
const allowedApprovalBusinessTypes: ApprovalRule["businessType"][] = [
  "procurement_request",
  "procurement_document",
  "review_award",
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
  return [
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
  ].includes(value);
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

function accountResponse(ctx: AppContext, user: User) {
  const account = ctx.authStore.getAccountsByUserIds([user.id])[0];
  return {
    ...user,
    username: account?.username ?? user.id,
    accountStatus: account?.status ?? user.status ?? "active",
    statusSource: account?.statusSource ?? null,
    passwordChangeRequired: account?.passwordChangeRequired ?? false,
    lastLoginAt: account?.lastLoginAt ?? null
  };
}

function usernameIsValid(username: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._@-]{1,63}$/.test(username);
}

function normalizeOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function validateOrganizationIds(ctx: AppContext, orgId: string, orgScope: string[], existing?: User) {
  const organizationIds = new Set(ctx.state.organizations.filter((item) => (item.status ?? "active") === "active").map((item) => item.id));
  const legacyIds = new Set(existing ? [existing.orgId, ...(existing.orgScope ?? [])] : []);
  return (organizationIds.has(orgId) || legacyIds.has(orgId)) && orgScope.every((item) => organizationIds.has(item) || legacyIds.has(item));
}

function validateSupplierBinding(ctx: AppContext, roleId: RoleId, supplierId: string | undefined) {
  const supplierRoles = new Set<RoleId>(["supplier", "supplier_admin", "supplier_quotation"]);
  if (!supplierRoles.has(roleId)) return supplierId ? "USER_SUPPLIER_ROLE_REQUIRED" : null;
  if (!supplierId || !ctx.state.suppliers.some((item) => item.id === supplierId)) return "USER_SUPPLIER_REQUIRED";
  return null;
}

function remainingActiveAdminCount(ctx: AppContext, excludedUserId: string) {
  return ctx.state.users.filter(
    (item) => item.id !== excludedUserId && item.roleId === "admin" && (item.status ?? "active") === "active"
  ).length;
}

function statusSource(status: ManagedAccountStatus, actorId: string) {
  if (status === "active") return null;
  return `administrator_${status}:${actorId}`;
}

function updateManagedUser(ctx: AppContext, req: Request, res: Response, input: Record<string, unknown>) {
  if (!assertAdminWriter(ctx, req, res, "user", req.params.userId)) return;
  const user = findUser(ctx, req.params.userId);
  if (!user || user.roleId === "system") {
    return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
  }
  const account = ctx.authStore.getAccountsByUserIds([user.id])[0];
  if (!account) {
    return res.status(404).json({ error: { code: "AUTH_ACCOUNT_NOT_FOUND", message: "Login account was not found." } });
  }

  const nextUsername = input.username === undefined ? account.username : String(input.username).trim();
  const nextName = input.name === undefined ? user.name : String(input.name).trim();
  const nextRoleValue = input.roleId === undefined ? user.roleId : String(input.roleId).trim();
  const nextStatusValue = input.status === undefined ? user.status ?? "active" : String(input.status).trim();
  const nextOrgId = input.orgId === undefined ? user.orgId : String(input.orgId).trim();
  const nextOrgScope = input.orgScope === undefined ? user.orgScope ?? [nextOrgId] : normalizeStringArray(input.orgScope);
  const nextSupplierId = input.supplierId === undefined ? user.supplierId : normalizeOptionalString(input.supplierId);

  if (!usernameIsValid(nextUsername)) {
    return res.status(400).json({ error: { code: "USERNAME_INVALID", message: "Username must be 2-64 characters and may contain letters, numbers, dot, underscore, at sign or hyphen." } });
  }
  const duplicate = ctx.state.users
    .filter((item) => item.id !== user.id)
    .map((item) => ctx.authStore.getAccountsByUserIds([item.id])[0]?.username)
    .find((item) => item?.toLowerCase() === nextUsername.toLowerCase());
  if (duplicate) {
    return res.status(409).json({ error: { code: "USERNAME_EXISTS", message: "Username already exists." } });
  }
  if (!nextName) {
    return res.status(400).json({ error: { code: "USER_NAME_REQUIRED", message: "User name is required." } });
  }
  if (!isRoleId(nextRoleValue) || nextRoleValue === "system") {
    return res.status(400).json({ error: { code: "USER_ROLE_INVALID", message: "Role id is invalid." } });
  }
  if (!isUserStatus(nextStatusValue)) {
    return res.status(400).json({ error: { code: "USER_STATUS_INVALID", message: "User status must be active, disabled, suspended or offboarded." } });
  }
  if (!nextOrgId || nextOrgScope.length === 0 || !validateOrganizationIds(ctx, nextOrgId, nextOrgScope, user)) {
    return res.status(400).json({ error: { code: "USER_ORGANIZATION_INVALID", message: "Organization and organization scope must reference active organizations." } });
  }
  const supplierBindingError = validateSupplierBinding(ctx, nextRoleValue, nextSupplierId);
  if (supplierBindingError) {
    return res.status(400).json({ error: { code: supplierBindingError, message: "Supplier roles must be bound to an existing supplier, and other roles cannot retain a supplier binding." } });
  }
  if ((user.status ?? "active") === "offboarded" && nextStatusValue !== "offboarded") {
    return res.status(409).json({ error: { code: "USER_OFFBOARDED_TERMINAL", message: "Offboarded accounts cannot be restored." } });
  }
  if (req.auth.user.id === user.id && nextStatusValue !== "active") {
    return res.status(409).json({ error: { code: "USER_SELF_DISABLE_FORBIDDEN", message: "Administrators cannot disable their own account." } });
  }
  if (req.auth.user.id === user.id && nextRoleValue !== "admin") {
    return res.status(409).json({ error: { code: "USER_SELF_DEMOTION_FORBIDDEN", message: "Administrators cannot remove their own administrator role." } });
  }
  if (
    user.roleId === "admin" &&
    (user.status ?? "active") === "active" &&
    (nextRoleValue !== "admin" || nextStatusValue !== "active") &&
    remainingActiveAdminCount(ctx, user.id) === 0
  ) {
    return res.status(409).json({ error: { code: "FINAL_ADMIN_REQUIRED", message: "The final active administrator cannot be disabled or demoted." } });
  }

  const usernameChanged = nextUsername !== account.username;
  const roleChanged = nextRoleValue !== user.roleId;
  user.name = nextName;
  user.roleId = nextRoleValue;
  user.status = nextStatusValue;
  user.orgId = nextOrgId;
  user.orgScope = nextOrgScope;
  user.departmentId = input.departmentId === undefined ? user.departmentId : normalizeOptionalString(input.departmentId);
  user.position = input.position === undefined ? user.position : normalizeOptionalString(input.position);
  user.supplierId = nextSupplierId;
  if (usernameChanged) ctx.authStore.updateUsername(user.id, nextUsername);
  if (nextStatusValue !== account.status) {
    ctx.authStore.setAccountStatus(user.id, nextStatusValue, statusSource(nextStatusValue, req.auth.user.id));
  } else if (roleChanged || usernameChanged) {
    ctx.authStore.deleteSessionsForUser(user.id);
  }
  const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "user.update", "user", user.id, undefined, `role=${user.roleId};status=${user.status}`);
  return res.json({ user: accountResponse(ctx, user), auditLogId: log.id });
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
    return res.json({ users: ctx.state.users.filter((item) => item.roleId !== "system").map((item) => accountResponse(ctx, item)) });
  });
  router.post("/users", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "user", "new")) return;
    const username = String(req.body?.username ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const roleValue = String(req.body?.roleId ?? "").trim();
    const orgId = String(req.body?.orgId ?? "").trim();
    const orgScope = req.body?.orgScope === undefined ? [orgId] : normalizeStringArray(req.body.orgScope);
    const supplierId = normalizeOptionalString(req.body?.supplierId);
    if (!usernameIsValid(username)) {
      return res.status(400).json({ error: { code: "USERNAME_INVALID", message: "Username must be 2-64 characters and may contain letters, numbers, dot, underscore, at sign or hyphen." } });
    }
    if (!name) {
      return res.status(400).json({ error: { code: "USER_NAME_REQUIRED", message: "User name is required." } });
    }
    if (!isRoleId(roleValue) || roleValue === "system") {
      return res.status(400).json({ error: { code: "USER_ROLE_INVALID", message: "Role id is invalid." } });
    }
    if (!orgId || orgScope.length === 0 || !validateOrganizationIds(ctx, orgId, orgScope)) {
      return res.status(400).json({ error: { code: "USER_ORGANIZATION_INVALID", message: "Organization and organization scope must reference active organizations." } });
    }
    const supplierBindingError = validateSupplierBinding(ctx, roleValue, supplierId);
    if (supplierBindingError) {
      return res.status(400).json({ error: { code: supplierBindingError, message: "Supplier roles must be bound to an existing supplier, and other roles cannot retain a supplier binding." } });
    }
    if (ctx.authStore.getAccountByUsername(username) || ctx.authStore.getAccountsByUserIds(ctx.state.users.map((item) => item.id)).some((item) => item.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: { code: "USERNAME_EXISTS", message: "Username already exists." } });
    }

    const user: User = {
      id: `u-managed-${crypto.randomUUID()}`,
      name,
      roleId: roleValue,
      orgId,
      status: "active",
      orgScope,
      departmentId: normalizeOptionalString(req.body?.departmentId),
      position: normalizeOptionalString(req.body?.position),
      supplierId
    };
    const temporaryPassword = generateTemporaryPassword("Init");
    ctx.state.users.push(user);
    try {
      ctx.authStore.createAccount({ userId: user.id, username, temporaryPassword });
    } catch (error) {
      ctx.state.users.splice(ctx.state.users.indexOf(user), 1);
      throw error;
    }
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "user.create", "user", user.id, undefined, `role=${user.roleId}`);
    return res.status(201).json({ user: accountResponse(ctx, user), temporaryPassword, auditLogId: log.id });
  });
  router.patch("/users/:userId", (req, res) => {
    return updateManagedUser(ctx, req, res, (req.body ?? {}) as Record<string, unknown>);
  });
  router.post("/users/:userId/reset-password", (req, res) => {
    if (!assertAdminWriter(ctx, req, res, "user", req.params.userId)) return;
    const user = findUser(ctx, req.params.userId);
    if (!user || user.roleId === "system") {
      return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
    }
    if ((user.status ?? "active") === "offboarded") {
      return res.status(409).json({ error: { code: "USER_OFFBOARDED_TERMINAL", message: "Offboarded account passwords cannot be reset." } });
    }
    const temporaryPassword = generateTemporaryPassword("Reset");
    const account = ctx.authStore.resetPassword(user.id, temporaryPassword);
    if (!account) {
      return res.status(404).json({ error: { code: "AUTH_ACCOUNT_NOT_FOUND", message: "Login account was not found." } });
    }
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "user.password.reset", "auth_account", user.id, undefined, "administrator reset");
    return res.json({ user: accountResponse(ctx, user), temporaryPassword, auditLogId: log.id });
  });
  router.patch("/users/:userId/status", (req, res) => {
    return updateManagedUser(ctx, req, res, { status: req.body?.status });
  });
  router.patch("/users/:userId/role", (req, res) => {
    return updateManagedUser(ctx, req, res, {
      roleId: req.body?.roleId,
      orgScope: req.body?.orgScope,
      orgId: req.body?.orgId,
      supplierId: req.body?.supplierId
    });
  });
  router.patch("/users/:userId/profile", (req, res) => {
    return updateManagedUser(ctx, req, res, {
      name: req.body?.name,
      departmentId: req.body?.departmentId,
      position: req.body?.position
    });
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
