export type RoleId =
  | "group_manager"
  | "buyer"
  | "hotel_buyer"
  | "hotel_finance"
  | "platform_operator"
  | "supplier"
  | "supplier_admin"
  | "supplier_quotation"
  | "expert"
  | "finance_reviewer"
  | "auditor"
  | "admin";

export interface NavItem {
  label: string;
  to: string;
  roles: RoleId[];
  menuKey: string;
}

export const allRoleIds: RoleId[] = [
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
  "admin"
];

export const roleLabels: Record<RoleId, string> = {
  group_manager: "集团采购管理人",
  buyer: "采购经办人",
  hotel_buyer: "酒店采购",
  hotel_finance: "酒店财务",
  platform_operator: "运营维护",
  supplier: "供应商",
  supplier_admin: "供应商管理员",
  supplier_quotation: "供应商报价人员",
  expert: "专家",
  finance_reviewer: "财务审核",
  auditor: "纪检审计",
  admin: "系统管理员"
};

export const groupManagerRoles: RoleId[] = ["group_manager"];
export const procurementExecutorRoles: RoleId[] = ["buyer", "platform_operator"];
export const procurementBusinessRoles: RoleId[] = [...groupManagerRoles, ...procurementExecutorRoles];
export const hotelBuyerRoles: RoleId[] = ["hotel_buyer"];
export const supplierRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
export const financeRoles: RoleId[] = ["hotel_finance", "finance_reviewer"];
export const auditRoles: RoleId[] = ["auditor"];
export const businessRoles: RoleId[] = [...procurementBusinessRoles, ...hotelBuyerRoles, ...supplierRoles, ...financeRoles, ...auditRoles, "expert"];

export const navItems: NavItem[] = [
  { label: "工作台", to: "/", roles: [...businessRoles], menuKey: "dashboard" },
  { label: "我的待办", to: "/my-tasks", roles: [...businessRoles], menuKey: "myTasks" },
  { label: "审批规则", to: "/approval-rules", roles: [...groupManagerRoles, ...auditRoles, "admin"], menuKey: "admin" },
  { label: "需求审批", to: "/procurement-requests", roles: [...groupManagerRoles], menuKey: "needs" },
  { label: "采购项目", to: "/project-workbench", roles: [...groupManagerRoles, ...procurementExecutorRoles], menuKey: "projects" },
  { label: "报价进度", to: "/bid-control", roles: [...groupManagerRoles], menuKey: "bidSecrecy" },
  { label: "评审定标", to: "/expert-review", roles: [...groupManagerRoles, ...procurementExecutorRoles], menuKey: "expertReview" },
  { label: "评分模板", to: "/scoring-templates", roles: [...groupManagerRoles, "platform_operator"], menuKey: "expertReview" },
  { label: "定标审批", to: "/award-result", roles: [...groupManagerRoles, ...procurementExecutorRoles], menuKey: "award" },
  { label: "供应商", to: "/suppliers", roles: [...groupManagerRoles], menuKey: "suppliers" },
  { label: "采购申请", to: "/procurement-requests", roles: [...procurementExecutorRoles, ...hotelBuyerRoles], menuKey: "needs" },
  { label: "商品目录", to: "/supply-mall", roles: [...groupManagerRoles, ...procurementExecutorRoles, ...hotelBuyerRoles], menuKey: "projects" },
  { label: "商品维护", to: "/supply-mall", roles: [...supplierRoles], menuKey: "projects" },
  { label: "供应商档案", to: "/supplier-portal", roles: [...supplierRoles], menuKey: "suppliers" },
  { label: "报名资料", to: "/supplier-registration", roles: [...supplierRoles], menuKey: "supplierRegistration" },
  { label: "报价响应", to: "/bidding", roles: [...supplierRoles], menuKey: "bidding" },
  { label: "中标结果", to: "/award-result", roles: [...supplierRoles], menuKey: "contracts" },
  { label: "订单履约", to: "/order-fulfillment", roles: [...procurementExecutorRoles, ...hotelBuyerRoles, ...supplierRoles], menuKey: "contracts" },
  { label: "结算材料", to: "/settlement-materials", roles: [...supplierRoles], menuKey: "contracts" },
  { label: "结算付款", to: "/settlement-materials", roles: [...financeRoles], menuKey: "contracts" },
  { label: "付款进度", to: "/payment-status", roles: [...financeRoles], menuKey: "contracts" },
  { label: "档案审计", to: "/archive-audit", roles: [...groupManagerRoles, ...procurementExecutorRoles, ...auditRoles], menuKey: "archives" },
  { label: "采购监督", to: "/procurement-requests", roles: [...auditRoles], menuKey: "needs" },
  { label: "定标监督", to: "/award-result", roles: [...auditRoles], menuKey: "award" },
  { label: "供应商监督", to: "/suppliers", roles: [...auditRoles], menuKey: "suppliers" },
  { label: "操作日志", to: "/audit", roles: [...auditRoles], menuKey: "audit" },
  { label: "集成配置", to: "/integration-boundary", roles: ["auditor"], menuKey: "externalTrade" },
  { label: "系统管理", to: "/modules", roles: ["admin"], menuKey: "admin" },
  { label: "系统设置", to: "/permissions", roles: ["admin"], menuKey: "admin" }
];

export const utilityItems: NavItem[] = [
  { label: "消息", to: "/messages", roles: [...businessRoles], menuKey: "myTasks" },
  { label: "账号安全", to: "/account-security", roles: [...businessRoles], menuKey: "dashboard" }
];

export const routeTitles: Record<string, string> = {
  "/": "工作台",
  "/procurement-requests": "采购申请",
  "/project-initiation": "采购申请",
  "/project-workbench": "采购项目",
  "/procurement-documents": "采购文件",
  "/announcements-invitations": "公告与邀请",
  "/supplier-registration": "报名资料",
  "/bidding": "报价响应",
  "/bid-control": "报价进度",
  "/expert-review": "专家抽取与评审",
  "/scoring-templates": "评分模板",
  "/expert-scoring": "专家评审",
  "/award-result": "定标结果",
  "/external-trade": "外部交易备案",
  "/integration-boundary": "集成配置",
  "/file-center": "文件中心",
  "/supply-mall": "商品目录",
  "/suppliers": "供应商档案",
  "/suppliers/new": "新增供应商",
  "/supplier-portal": "我的供应商档案",
  "/procurement-requests/new": "新建采购申请",
  "/account-security": "账号安全",
  "/order-fulfillment": "订单履约",
  "/contract-performance": "订单履约",
  "/settlement-materials": "结算付款",
  "/settlement-documents": "结算材料",
  "/settlement-invoices": "结算付款",
  "/invoice-review": "结算付款",
  "/payment-status": "付款进度",
  "/funds": "付款进度",
  "/archive-audit": "档案审计",
  "/audit": "操作日志",
  "/approval-rules": "审批规则",
  "/modules": "系统管理",
  "/permissions": "系统设置",
  "/my-tasks": "我的待办",
  "/messages": "消息中心",
  "/role-switch": "账号入口"
};

const routeAccessRules: Array<{ test: (path: string) => boolean; roles: RoleId[]; mockOnly?: boolean }> = [
  { test: (path) => path === "/role-switch", roles: allRoleIds, mockOnly: true },
  { test: (path) => ["/my-tasks", "/messages"].includes(path), roles: businessRoles },
  { test: (path) => path === "/modules", roles: ["admin"] },
  { test: (path) => path === "/permissions", roles: ["admin"] },
  { test: (path) => path === "/approval-rules", roles: ["group_manager", "auditor", "admin"] },
  { test: (path) => path === "/procurement-requests/new", roles: ["hotel_buyer"] },
  { test: (path) => path === "/procurement-requests" || path.startsWith("/procurement-requests/"), roles: ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"] },
  { test: (path) => path === "/expert-scoring", roles: ["expert"] },
  { test: (path) => path === "/scoring-templates", roles: ["group_manager", "platform_operator", "auditor"] },
  { test: (path) => path === "/integration-boundary", roles: ["auditor"] },
  { test: (path) => path === "/supply-mall" || path.startsWith("/supply-mall/"), roles: ["group_manager", "buyer", "platform_operator", "hotel_buyer", "supplier", "supplier_admin", "supplier_quotation"] },
  { test: (path) => path === "/suppliers/new", roles: ["group_manager"] },
  { test: (path) => path === "/supplier-portal" || path.startsWith("/supplier-portal/"), roles: ["supplier", "supplier_admin", "supplier_quotation"] },
  { test: (path) => path === "/suppliers" || path.startsWith("/suppliers/"), roles: ["group_manager", "auditor"] },
  { test: (path) => path === "/account-security", roles: businessRoles },
  { test: (path) => path === "/award-result" || path.startsWith("/award-result/"), roles: ["group_manager", "buyer", "platform_operator", "auditor", "supplier", "supplier_admin", "supplier_quotation"] },
  { test: (path) => path === "/project-workbench" || path.startsWith("/project-workbench/"), roles: ["group_manager", "buyer", "platform_operator", "auditor"] },
  { test: (path) => ["/procurement-documents", "/announcements-invitations", "/bid-control", "/expert-review", "/external-trade", "/file-center"].includes(path), roles: ["group_manager", "buyer", "platform_operator", "auditor"] },
  { test: (path) => path === "/project-initiation", roles: ["buyer", "platform_operator"] },
  { test: (path) => path === "/supplier-registration", roles: ["supplier", "supplier_admin", "supplier_quotation", "buyer", "platform_operator", "auditor"] },
  { test: (path) => path === "/order-fulfillment", roles: ["buyer", "platform_operator", "hotel_buyer", "supplier", "supplier_admin", "supplier_quotation"] },
  { test: (path) => path === "/settlement-materials", roles: ["supplier", "supplier_admin", "supplier_quotation", "hotel_finance", "finance_reviewer"] },
  { test: (path) => path === "/payment-status", roles: ["hotel_finance", "finance_reviewer"] },
  { test: (path) => path === "/archive-audit", roles: ["group_manager", "buyer", "platform_operator", "auditor"] },
  { test: (path) => path === "/audit", roles: ["auditor"] }
];

export function visibleNavItems(roleId: string) {
  return navItems.filter((item) => item.roles.includes(roleId as RoleId));
}

export function visibleUtilityItems(roleId: string) {
  return utilityItems.filter((item) => item.roles.includes(roleId as RoleId));
}

export function routeAllowed(path: string, roleId: string, mockAuthEnabled = false) {
  const rule = routeAccessRules.find((item) => item.test(path));
  if (rule) return (!rule.mockOnly || mockAuthEnabled) && rule.roles.includes(roleId as RoleId);
  return visibleNavItems(roleId).some((item) => item.to === path);
}

export function roleHome(roleId: string) {
  if (roleId === "admin") return "/permissions";
  if (roleId === "supplier_quotation") return "/bidding";
  if (roleId === "expert") return "/expert-scoring";
  if (roleId === "hotel_buyer") return "/procurement-requests";
  return visibleNavItems(roleId)[0]?.to ?? "/";
}

export function pageTitle(path: string, roleId: string) {
  if (path === "/procurement-requests") {
    if (roleId === "group_manager") return "需求审批";
    if (roleId === "buyer" || roleId === "platform_operator") return "采购申请";
    if (roleId === "auditor") return "采购监督";
    return "采购申请";
  }
  if (path.startsWith("/procurement-requests/")) {
    if (path === "/procurement-requests/new") return "新建采购申请";
    if (roleId === "group_manager") return "需求审批详情";
    if (roleId === "buyer" || roleId === "platform_operator") return "采购申请详情";
    return "采购申请详情";
  }
  if (path.includes("/sourcing")) return "招采执行详情";
  if (path.includes("/fulfillment")) return "履约结算与归档";
  if (path.startsWith("/supply-mall/")) return "商品目录详情";
  if (path.startsWith("/project-workbench/")) return "采购项目详情";
  if (path.startsWith("/award-result/")) return supplierRoles.includes(roleId as RoleId) ? "中标结果详情" : "定标结果详情";
  if (path === "/suppliers/new") return "新增供应商";
  if (path.startsWith("/suppliers/")) return "供应商档案详情";
  const visible = visibleNavItems(roleId).find((item) => item.to === path);
  return visible?.label ?? routeTitles[path] ?? "采购业务";
}
