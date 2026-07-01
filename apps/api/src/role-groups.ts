import type { RoleId, User } from "./types.js";

const procurementBuyerRoles = new Set<RoleId>(["buyer", "hotel_buyer", "platform_operator"]);
const mallListingOperatorRoles = new Set<RoleId>(["group_manager", "buyer", "platform_operator"]);
const procurementMaintainerRoles = new Set<RoleId>(["buyer", "platform_operator"]);
const supplierGovernanceRoles = new Set<RoleId>(["group_manager"]);
const supplierRoles = new Set<RoleId>(["supplier", "supplier_admin", "supplier_quotation"]);
const supplierAdminRoles = new Set<RoleId>(["supplier", "supplier_admin"]);
const supplierQuotationRoles = new Set<RoleId>(["supplier", "supplier_admin", "supplier_quotation"]);
const financeRoles = new Set<RoleId>(["group_manager", "hotel_finance", "finance_reviewer"]);
const financeReviewRoles = new Set<RoleId>(["group_manager", "buyer", "hotel_finance", "finance_reviewer"]);
const orgReaderRoles = new Set<RoleId>(["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "finance_reviewer", "auditor"]);
const auditReaderRoles = new Set<RoleId>(["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "finance_reviewer", "auditor"]);

export function isProcurementBuyerRole(roleId: RoleId | string) {
  return procurementBuyerRoles.has(roleId as RoleId);
}

export function isMallListingOperatorRole(roleId: RoleId | string) {
  return mallListingOperatorRoles.has(roleId as RoleId);
}

export function isProcurementMaintainerRole(roleId: RoleId | string) {
  return procurementMaintainerRoles.has(roleId as RoleId);
}

export function isSupplierGovernanceRole(roleId: RoleId | string) {
  return supplierGovernanceRoles.has(roleId as RoleId);
}

export function isSupplierRole(roleId: RoleId | string) {
  return supplierRoles.has(roleId as RoleId);
}

export function isSupplierAdminRole(roleId: RoleId | string) {
  return supplierAdminRoles.has(roleId as RoleId);
}

export function isSupplierQuotationRole(roleId: RoleId | string) {
  return supplierQuotationRoles.has(roleId as RoleId);
}

export function isFinanceRole(roleId: RoleId | string) {
  return financeRoles.has(roleId as RoleId);
}

export function isFinanceReviewRole(roleId: RoleId | string) {
  return financeReviewRoles.has(roleId as RoleId);
}

export function isOrgReaderRole(roleId: RoleId | string) {
  return orgReaderRoles.has(roleId as RoleId);
}

export function isAuditReaderRoleId(roleId: RoleId | string) {
  return auditReaderRoles.has(roleId as RoleId);
}

export function roleMatchesAssignee(actorRoleId: RoleId, assigneeRoleId?: RoleId) {
  if (!assigneeRoleId) return true;
  if (actorRoleId === assigneeRoleId) return true;
  if (assigneeRoleId === "supplier") return isSupplierRole(actorRoleId);
  if (assigneeRoleId === "buyer") return isProcurementBuyerRole(actorRoleId);
  if (assigneeRoleId === "hotel_finance") return isFinanceRole(actorRoleId);
  return false;
}

export function supplierIdMatches(user: User, supplierId?: string) {
  return Boolean(user.supplierId && supplierId && user.supplierId === supplierId);
}

export function userOrgScope(user: User) {
  return user.orgScope ?? [user.orgId];
}
