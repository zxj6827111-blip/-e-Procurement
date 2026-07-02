import type { AuditRow, OrderRow, ProductRow, ProjectRow, SupplierRow } from "./types";

export const procurementRoles = new Set(["group_manager", "buyer", "hotel_buyer", "platform_operator"]);
export const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
export const financeRoles = new Set(["hotel_finance", "finance_reviewer"]);
export const auditRoles = new Set(["auditor"]);

export function isTestLabel(value?: string) {
  return /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? ""));
}

export function isFormalProject(project: ProjectRow) {
  return !isTestLabel(project.name) && !isTestLabel(project.title);
}

export function canReadProjects(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor", "supplier", "supplier_admin", "supplier_quotation"].includes(roleId);
}

export function canReadSuppliers(roleId: string) {
  return ["group_manager", "buyer", "platform_operator", "supplier", "supplier_admin", "auditor"].includes(roleId);
}

export function canReadAuditLogs(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "finance_reviewer", "auditor"].includes(roleId);
}

export function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

export function productPrice(product: ProductRow) {
  const price = product.activePrice;
  if (!price) return "待定价";
  return money(price.salePrice ?? price.price);
}

export function supplierName(supplierId: string, suppliers: SupplierRow[]) {
  return suppliers.find((item) => item.id === supplierId)?.name ?? "供应商";
}

export function combineOrders(mallOrders: OrderRow[], procurementOrders: OrderRow[]) {
  const seen = new Set<string>();
  return [...procurementOrders, ...mallOrders].filter((order) => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}

export function isBusinessAuditLog(log: AuditRow) {
  return !log.action.startsWith("auth.") && log.objectType !== "auth_account" && log.objectType !== "auth_provider";
}

export function canUseCatalogActivities(roleId: string) {
  return ["buyer", "platform_operator", "hotel_buyer", "supplier", "supplier_admin", "supplier_quotation"].includes(roleId);
}

export function auditActivityTarget(roleId: string) {
  if (auditRoles.has(roleId)) return "/audit";
  if (financeRoles.has(roleId)) return "/settlement-materials";
  if (roleId === "group_manager") return "/archive-audit";
  return "/archive-audit";
}

export function roleTitle(roleId: string) {
  if (roleId === "group_manager") return "集团审批工作台";
  if (roleId === "buyer" || roleId === "platform_operator") return "采购经办工作台";
  if (roleId === "expert") return "专家评审工作台";
  if (supplierRoles.has(roleId)) return "供应商业务工作台";
  if (financeRoles.has(roleId)) return "财务结算工作台";
  if (auditRoles.has(roleId)) return "监督审计工作台";
  if (roleId === "admin") return "系统配置工作台";
  return "采购业务工作台";
}
