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
  id: string;
  label: string;
  to: string;
  menuKey: string;
  description?: string;
}

interface RoleProfile {
  label: string;
  home: string;
  template: "A" | "B" | "C" | "D";
  sidebar: string[];
  showMessageBell: boolean;
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

const navCatalog: Record<string, NavItem> = {
  dashboard: { id: "dashboard", label: "工作台", to: "/", menuKey: "dashboard", description: "角色默认总览" },
  myTasks: { id: "myTasks", label: "我的待办", to: "/my-tasks", menuKey: "myTasks", description: "任务处理中心" },
  approvalRules: { id: "approvalRules", label: "审批规则", to: "/approval-rules", menuKey: "admin", description: "流程与规则" },
  demandApproval: { id: "demandApproval", label: "需求审批", to: "/procurement-requests", menuKey: "needs", description: "集团准入审批" },
  procurementRequests: { id: "procurementRequests", label: "采购申请", to: "/procurement-requests", menuKey: "needs", description: "酒店需求申请" },
  procurementSupervision: { id: "procurementSupervision", label: "采购监督", to: "/procurement-requests", menuKey: "needs", description: "需求只读核查" },
  projectWorkbench: { id: "projectWorkbench", label: "采购项目", to: "/project-workbench", menuKey: "projects", description: "项目过程管控" },
  bidControl: { id: "bidControl", label: "报价进度", to: "/bid-control", menuKey: "bidSecrecy", description: "截标与保密" },
  expertReview: { id: "expertReview", label: "评审定标", to: "/expert-review", menuKey: "expertReview", description: "评审与定标" },
  scoringTemplates: { id: "scoringTemplates", label: "评分模板", to: "/scoring-templates", menuKey: "expertReview", description: "评分规则配置" },
  awardApproval: { id: "awardApproval", label: "定标审批", to: "/award-result", menuKey: "award", description: "结果审批流转" },
  awardSupervision: { id: "awardSupervision", label: "定标监督", to: "/award-result", menuKey: "award", description: "定标只读监督" },
  supplierList: { id: "supplierList", label: "供应商", to: "/suppliers", menuKey: "suppliers", description: "准入与档案" },
  supplierSupervision: { id: "supplierSupervision", label: "供应商监督", to: "/suppliers", menuKey: "suppliers", description: "准入只读核查" },
  supplyMall: { id: "supplyMall", label: "商品目录", to: "/supply-mall", menuKey: "projects", description: "集采目录与下单" },
  supplyMallMaintain: { id: "supplyMallMaintain", label: "商品维护", to: "/supply-mall", menuKey: "projects", description: "商品与价格维护" },
  supplierPortal: { id: "supplierPortal", label: "供应商档案", to: "/supplier-portal", menuKey: "suppliers", description: "企业资料与资质" },
  supplierRegistration: { id: "supplierRegistration", label: "报名资料", to: "/supplier-registration", menuKey: "supplierRegistration", description: "报名与资格文件" },
  bidding: { id: "bidding", label: "报价响应", to: "/bidding", menuKey: "bidding", description: "上下分屏报价" },
  awardResultSupplier: { id: "awardResultSupplier", label: "中标结果", to: "/award-result", menuKey: "contracts", description: "结果通知回看" },
  orderFulfillment: { id: "orderFulfillment", label: "订单履约", to: "/order-fulfillment", menuKey: "contracts", description: "发货验收履约" },
  settlementMaterials: { id: "settlementMaterials", label: "结算材料", to: "/settlement-materials", menuKey: "contracts", description: "材料提交与回补" },
  financeSettlement: { id: "financeSettlement", label: "结算付款", to: "/settlement-materials", menuKey: "contracts", description: "财务审核付款" },
  paymentStatus: { id: "paymentStatus", label: "付款进度", to: "/payment-status", menuKey: "contracts", description: "资金进度查看" },
  archiveAudit: { id: "archiveAudit", label: "档案审计", to: "/archive-audit", menuKey: "archives", description: "归档追溯只读" },
  audit: { id: "audit", label: "操作日志", to: "/audit", menuKey: "audit", description: "操作流水瀑布" },
  integrationBoundary: { id: "integrationBoundary", label: "集成配置", to: "/integration-boundary", menuKey: "externalTrade", description: "外部边界与适配" },
  modules: { id: "modules", label: "系统管理", to: "/modules", menuKey: "admin", description: "底层管理入口" },
  permissions: { id: "permissions", label: "系统设置", to: "/permissions", menuKey: "admin", description: "权限矩阵配置" }
};

const utilityCatalog = {
  accountSecurity: { id: "accountSecurity", label: "账号安全", to: "/account-security", menuKey: "dashboard", description: "密码与安全设置" }
} as const;

export const roleProfiles: Record<RoleId, RoleProfile> = {
  group_manager: {
    label: "集团采购管理人",
    home: "/",
    template: "A",
    sidebar: ["myTasks", "approvalRules", "demandApproval", "projectWorkbench", "bidControl", "expertReview", "scoringTemplates", "awardApproval", "supplierList", "supplyMall", "archiveAudit"],
    showMessageBell: true
  },
  buyer: {
    label: "采购经办人",
    home: "/",
    template: "A",
    sidebar: ["myTasks", "procurementRequests", "projectWorkbench", "supplyMall", "expertReview", "awardApproval", "orderFulfillment", "archiveAudit"],
    showMessageBell: true
  },
  platform_operator: {
    label: "平台运营",
    home: "/",
    template: "A",
    sidebar: ["myTasks", "procurementRequests", "projectWorkbench", "supplyMall", "expertReview", "scoringTemplates", "awardApproval", "orderFulfillment", "archiveAudit"],
    showMessageBell: true
  },
  hotel_buyer: {
    label: "酒店采购",
    home: "/procurement-requests",
    template: "B",
    sidebar: ["dashboard", "myTasks", "procurementRequests", "supplyMall", "orderFulfillment"],
    showMessageBell: true
  },
  hotel_finance: {
    label: "酒店财务",
    home: "/",
    template: "B",
    sidebar: ["dashboard", "myTasks", "financeSettlement", "paymentStatus"],
    showMessageBell: true
  },
  finance_reviewer: {
    label: "财务审核",
    home: "/",
    template: "B",
    sidebar: ["dashboard", "myTasks", "financeSettlement", "paymentStatus"],
    showMessageBell: true
  },
  supplier: {
    label: "供应商",
    home: "/",
    template: "C",
    sidebar: ["myTasks", "supplyMallMaintain", "supplierPortal", "supplierRegistration", "bidding", "awardResultSupplier", "orderFulfillment", "settlementMaterials"],
    showMessageBell: true
  },
  supplier_admin: {
    label: "供应商管理员",
    home: "/",
    template: "C",
    sidebar: ["myTasks", "supplyMallMaintain", "supplierPortal", "supplierRegistration", "bidding", "awardResultSupplier", "orderFulfillment", "settlementMaterials"],
    showMessageBell: true
  },
  supplier_quotation: {
    label: "供应商报价人员",
    home: "/bidding",
    template: "C",
    sidebar: ["myTasks", "supplyMallMaintain", "supplierPortal", "supplierRegistration", "bidding", "awardResultSupplier", "orderFulfillment", "settlementMaterials"],
    showMessageBell: true
  },
  expert: {
    label: "专家",
    home: "/expert-scoring",
    template: "C",
    sidebar: ["dashboard", "myTasks"],
    showMessageBell: true
  },
  auditor: {
    label: "纪检审计",
    home: "/",
    template: "D",
    sidebar: ["dashboard", "myTasks", "approvalRules", "archiveAudit", "procurementSupervision", "awardSupervision", "supplierSupervision", "audit", "integrationBoundary"],
    showMessageBell: true
  },
  admin: {
    label: "系统管理员",
    home: "/permissions",
    template: "D",
    sidebar: ["approvalRules", "modules", "permissions"],
    showMessageBell: false
  }
};

export const roleLabels: Record<RoleId, string> = Object.fromEntries(
  Object.entries(roleProfiles).map(([roleId, profile]) => [roleId, profile.label])
) as Record<RoleId, string>;

export function hasRoleProfile(roleId: string): roleId is RoleId {
  return Object.prototype.hasOwnProperty.call(roleProfiles, roleId);
}

export const groupManagerRoles: RoleId[] = ["group_manager"];
export const procurementExecutorRoles: RoleId[] = ["buyer", "platform_operator"];
export const procurementBusinessRoles: RoleId[] = [...groupManagerRoles, ...procurementExecutorRoles];
export const hotelBuyerRoles: RoleId[] = ["hotel_buyer"];
export const supplierRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
export const financeRoles: RoleId[] = ["hotel_finance", "finance_reviewer"];
export const auditRoles: RoleId[] = ["auditor"];
export const businessRoles: RoleId[] = [
  ...procurementBusinessRoles,
  ...hotelBuyerRoles,
  ...supplierRoles,
  ...financeRoles,
  ...auditRoles,
  "expert"
];

const routeTitles: Record<string, string> = {
  "/": "工作台",
  "/my-tasks": "我的待办",
  "/approval-rules": "审批规则",
  "/procurement-requests": "采购申请",
  "/project-workbench": "采购项目",
  "/bid-control": "报价进度",
  "/expert-review": "评审定标",
  "/scoring-templates": "评分模板",
  "/expert-scoring": "专家评分",
  "/award-result": "定标审批",
  "/supplier-registration": "报名资料",
  "/bidding": "报价响应",
  "/supplier-portal": "供应商档案",
  "/suppliers": "供应商",
  "/supply-mall": "商品目录",
  "/order-fulfillment": "订单履约",
  "/settlement-materials": "结算材料",
  "/payment-status": "付款进度",
  "/archive-audit": "档案审计",
  "/audit": "操作日志",
  "/integration-boundary": "集成配置",
  "/modules": "系统管理",
  "/permissions": "系统设置",
  "/account-security": "账号安全",
  "/messages": "消息中心",
  "/role-switch": "角色切换"
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
  { test: (path) => path === "/integration-boundary", roles: ["auditor", "admin"] },
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
  if (!hasRoleProfile(roleId)) return [];
  const profile = roleProfiles[roleId];
  if (!profile) return [];
  return profile.sidebar.map((itemId) => navCatalog[itemId]).filter(Boolean);
}

export function visibleUtilityItems(roleId: string) {
  if (!hasRoleProfile(roleId) || roleId === "admin") return [];
  return [utilityCatalog.accountSecurity];
}

export function roleHasMessageBell(roleId: string) {
  return hasRoleProfile(roleId) ? roleProfiles[roleId].showMessageBell : false;
}

export function roleTemplate(roleId: string) {
  return roleProfiles[roleId as RoleId]?.template ?? "A";
}

export function routeAllowed(path: string, roleId: string, mockAuthEnabled = false) {
  if (!hasRoleProfile(roleId)) return false;
  if (path === roleHome(roleId)) return true;
  const rule = routeAccessRules.find((item) => item.test(path));
  if (rule) return (!rule.mockOnly || mockAuthEnabled) && rule.roles.includes(roleId);
  return visibleNavItems(roleId).some((item) => item.to === path);
}

export function roleHome(roleId: string) {
  return hasRoleProfile(roleId) ? roleProfiles[roleId].home : "/permission-denied";
}

export function pageTitle(path: string, roleId: string) {
  if (path === "/procurement-requests") {
    if (roleId === "group_manager") return "需求审批";
    if (roleId === "auditor") return "采购监督";
    return "采购申请";
  }
  if (path.startsWith("/procurement-requests/")) {
    if (path === "/procurement-requests/new") return "新建采购申请";
    if (roleId === "group_manager") return "需求审批详情";
    if (roleId === "auditor") return "采购监督详情";
    return "采购申请详情";
  }
  if (path === "/award-result") {
    if (supplierRoles.includes(roleId as RoleId)) return "中标结果";
    if (roleId === "auditor") return "定标监督";
    return "定标审批";
  }
  if (path.startsWith("/award-result/")) {
    if (supplierRoles.includes(roleId as RoleId)) return "中标结果详情";
    if (roleId === "auditor") return "定标监督详情";
    return "定标审批详情";
  }
  if (path === "/suppliers") {
    if (roleId === "auditor") return "供应商监督";
    return "供应商";
  }
  if (path.startsWith("/suppliers/")) return roleId === "auditor" ? "供应商监督详情" : "供应商档案详情";
  if (path === "/settlement-materials") return financeRoles.includes(roleId as RoleId) ? "结算付款" : "结算材料";
  if (path === "/expert-scoring") return "专家评分";
  if (path === "/supply-mall") return supplierRoles.includes(roleId as RoleId) ? "商品维护" : "商品目录";
  if (path.startsWith("/supply-mall/")) return supplierRoles.includes(roleId as RoleId) ? "商品维护详情" : "商品目录详情";
  if (path.startsWith("/project-workbench/") && path.includes("/sourcing")) return "采购项目 / 招采执行";
  if (path.startsWith("/project-workbench/") && path.includes("/fulfillment")) return "采购项目 / 履约结算";
  if (path.startsWith("/project-workbench/")) return "采购项目详情";
  const visible = visibleNavItems(roleId).find((item) => item.to === path);
  return visible?.label ?? routeTitles[path] ?? "采购业务";
}
