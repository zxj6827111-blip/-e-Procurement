import type { Role, User, ViewState } from "./shared/types";

const roleMap: Record<string, Role> = {
  group_manager: "GROUP_PROCUREMENT_MANAGER",
  buyer: "PROCUREMENT_AGENT",
  hotel_buyer: "HOTEL_PROCUREMENT",
  hotel_finance: "HOTEL_FINANCE",
  platform_operator: "PLATFORM_OPERATIONS",
  supplier: "SUPPLIER",
  supplier_admin: "SUPPLIER_ADMIN",
  supplier_quotation: "SUPPLIER_BIDDER",
  expert: "EXPERT",
  finance_reviewer: "FINANCE_REVIEWER",
  auditor: "DISCIPLINARY_AUDIT",
  admin: "SYSTEM_ADMIN"
};

export const geminiUnmappedRoutes: string[] = [];

export function toGeminiRole(roleId: string): Role | null {
  return roleMap[roleId] ?? null;
}

export function toGeminiUser(input: { id: string; name: string; roleId: string; orgId?: string }): User | null {
  const role = toGeminiRole(input.roleId);
  if (!role) return null;
  return {
    id: input.id,
    name: input.name,
    role,
    organization: input.orgId === "org-hotel" ? "酒店采购中心" : "集团采购中心"
  };
}

export function geminiViewForPath(path: string, roleId: string): ViewState | null {
  if (path === "/") return "DASHBOARD";
  if (path === "/my-tasks") return "TODO";
  if (path === "/messages") return "MESSAGES";
  if (path === "/account-security") return "ACCOUNT_SECURITY";
  if (path === "/supplier-onboarding-register") return "SUPPLIER_ONBOARDING";
  if (path === "/approval-rules") return "APPROVAL_RULES";
  if (path === "/permissions") return "SYSTEM_SETTINGS";
  if (path === "/modules") return "SYS_MANAGE";
  if (path === "/procurement-requests/new") return "PROCUREMENT_REQUEST_CREATE";
  if (/^\/procurement-requests\/[^/]+$/.test(path)) return "PROCUREMENT_REQUEST_DETAIL";
  if (path === "/procurement-requests") {
    if (roleId === "group_manager") return "REQUEST_APPROVE";
    if (roleId === "auditor") return "AUDIT_SUPERVISION";
    return "PURCHASE_REQUEST";
  }
  if (path === "/project-workbench") return "PROJECTS";
  if (/^\/project-workbench\/[^/]+\/sourcing$/.test(path)) return "PROJECT_SOURCING";
  if (/^\/project-workbench\/[^/]+\/fulfillment$/.test(path)) return "PROJECT_FULFILLMENT";
  if (/^\/project-workbench\/[^/]+$/.test(path)) return "PROJECT_DETAIL";
  if (path === "/procurement-documents") return "PROCUREMENT_DOCUMENT";
  if (path === "/announcements-invitations") return "ANNOUNCEMENT";
  if (path === "/supplier-registration") return "REGISTRATION";
  if (path === "/bidding") return "QUOTE_RESPONSE";
  if (path === "/bid-control") return "QUOTE_PROGRESS";
  if (path === "/expert-review") return "REVIEW_AWARD";
  if (path === "/scoring-templates") return "RATING_TEMPLATE";
  if (path === "/expert-scoring") return "EXPERT_RATING";
  if (path === "/award-result") {
    if (roleId === "auditor") return "AWARD_SUPERVISION";
    if (["supplier", "supplier_admin", "supplier_quotation"].includes(roleId)) return "AWARD_RESULT";
    return "AWARD_APPROVE";
  }
  if (/^\/award-result\/[^/]+$/.test(path)) return "AWARD_RESULT_DETAIL";
  if (path === "/suppliers/new") return "SUPPLIER_CREATE";
  if (path === "/suppliers") {
    if (roleId === "auditor") return "SUPPLIER_SUPERVISION";
    return "SUPPLIERS";
  }
  if (/^\/suppliers\/[^/]+(?:\/[^/]+)?$/.test(path)) return "SUPPLIER_DETAIL";
  if (path === "/supplier-portal") return "SUPPLIER_PROFILE";
  if (/^\/supplier-portal\/[^/]+$/.test(path)) return "SUPPLIER_PORTAL";
  if (path === "/supply-mall") {
    if (["supplier", "supplier_admin", "supplier_quotation"].includes(roleId)) return "ITEM_MAINTENANCE";
    return "ITEM_CATALOG";
  }
  if (/^\/supply-mall\/[^/]+$/.test(path)) return "SUPPLY_MALL";
  if (path === "/order-fulfillment") return "ORDER_FULFILLMENT";
  if (path === "/settlement-materials") {
    if (["supplier", "supplier_admin", "supplier_quotation"].includes(roleId)) return "SETTLEMENT_MATS";
    return "SETTLEMENT";
  }
  if (path === "/payment-status") return "PAYMENT_PROGRESS";
  if (path === "/archive-audit") return "AUDIT_LOG";
  if (path === "/audit") return "OPERATION_LOGS";
  if (path === "/integration-boundary") return "INTEGRATION";
  if (path === "/external-trade") return "EXTERNAL_TRADE";
  if (path === "/file-center") return "FILE_CENTER";
  return null;
}

export function routeForGeminiView(view: ViewState, roleId: string, projectId?: string | null): string | null {
  switch (view) {
    case "DASHBOARD":
      return "/";
    case "TODO":
      return "/my-tasks";
    case "MESSAGES":
      return "/messages";
    case "ACCOUNT_SECURITY":
      return "/account-security";
    case "SUPPLIER_ONBOARDING":
      return "/supplier-onboarding-register";
    case "APPROVAL_RULES":
      return "/approval-rules";
    case "SYSTEM_SETTINGS":
      return "/permissions";
    case "SYS_MANAGE":
      return "/modules";
    case "REQUEST_APPROVE":
    case "PURCHASE_REQUEST":
    case "AUDIT_SUPERVISION":
      return "/procurement-requests";
    case "PROCUREMENT_REQUEST_CREATE":
      return "/procurement-requests/new";
    case "PROCUREMENT_REQUEST_DETAIL":
      return "/procurement-requests/REQ-202607-001";
    case "PROJECTS":
      return "/project-workbench";
    case "PROJECT_DETAIL":
      return projectId ? `/project-workbench/${encodeURIComponent(projectId)}` : "/project-workbench";
    case "PROJECT_SOURCING":
      return projectId ? `/project-workbench/${encodeURIComponent(projectId)}/sourcing` : "/project-workbench";
    case "PROJECT_FULFILLMENT":
      return projectId ? `/project-workbench/${encodeURIComponent(projectId)}/fulfillment` : "/project-workbench";
    case "PROCUREMENT_DOCUMENT":
      return "/procurement-documents";
    case "ANNOUNCEMENT":
      return "/announcements-invitations";
    case "REGISTRATION":
      return "/supplier-registration";
    case "QUOTE_RESPONSE":
      return "/bidding";
    case "QUOTE_PROGRESS":
      return "/bid-control";
    case "REVIEW_AWARD":
      return "/expert-review";
    case "RATING_TEMPLATE":
      return "/scoring-templates";
    case "EXPERT_RATING":
      return "/expert-scoring";
    case "AWARD_APPROVE":
    case "AWARD_RESULT":
    case "AWARD_SUPERVISION":
      return "/award-result";
    case "AWARD_RESULT_DETAIL":
      return projectId ? `/award-result/${encodeURIComponent(projectId)}` : "/award-result";
    case "SUPPLIERS":
    case "SUPPLIER_SUPERVISION":
      return "/suppliers";
    case "SUPPLIER_CREATE":
      return "/suppliers/new";
    case "SUPPLIER_DETAIL":
      return "/suppliers/sup-1";
    case "SUPPLIER_PROFILE":
      return "/supplier-portal";
    case "SUPPLIER_PORTAL":
      return "/supplier-portal/profile";
    case "ITEM_CATALOG":
    case "ITEM_MAINTENANCE":
      return "/supply-mall";
    case "SUPPLY_MALL":
      return "/supply-mall/catalog";
    case "ORDER_FULFILLMENT":
      return "/order-fulfillment";
    case "SETTLEMENT":
    case "SETTLEMENT_MATS":
      return "/settlement-materials";
    case "PAYMENT_PROGRESS":
      return "/payment-status";
    case "AUDIT_LOG":
      return "/archive-audit";
    case "OPERATION_LOGS":
      return "/audit";
    case "INTEGRATION":
      return "/integration-boundary";
    case "EXTERNAL_TRADE":
      return "/external-trade";
    case "FILE_CENTER":
      return "/file-center";
    default:
      return roleId === "admin" ? "/permissions" : "/";
  }
}
