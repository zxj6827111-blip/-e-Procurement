import { allRoleIds, routeAllowed, type RoleId } from "../permissions/role-model";

export type RouteMigrationStatus = "vue" | "react" | "hybrid" | "deprecated";

export type RuntimeOwner = "vue-shell" | "react" | "redirect" | "state" | "blocked";

export type FrontendModuleId =
  | "dashboard"
  | "identity"
  | "workbench"
  | "message"
  | "approval"
  | "security"
  | "navigation"
  | "supplier"
  | "procurement"
  | "project"
  | "sourcing"
  | "document"
  | "announcement"
  | "bidding"
  | "expert"
  | "award"
  | "integration"
  | "file"
  | "mall"
  | "order"
  | "settlement"
  | "finance"
  | "archive"
  | "audit"
  | "state";

export interface RouteMatrixItem {
  route: string;
  moduleId: FrontendModuleId;
  vueOwner: boolean;
  reactOwner: boolean;
  status: RouteMigrationStatus;
  migrationStage: 1 | 2 | 3 | 4 | 5;
  roleAccess: RoleId[];
  apiReady: boolean;
  canRemoveVue: boolean;
  runtimeOwner: RuntimeOwner;
  component?: string;
  redirectTo?: string;
  systemRoute?: boolean;
  notes?: string;
}

type RouteMatrixSourceItem = Omit<RouteMatrixItem, "roleAccess"> & {
  roleAccess?: RoleId[];
};

type RouteMatrixHelperInput = Omit<
  RouteMatrixSourceItem,
  "vueOwner" | "reactOwner" | "status" | "migrationStage" | "canRemoveVue" | "runtimeOwner" | "apiReady"
> &
  Partial<Pick<RouteMatrixSourceItem, "runtimeOwner" | "apiReady" | "migrationStage">>;

const allBusinessRoles = [...allRoleIds];

const hybrid = (item: RouteMatrixHelperInput): RouteMatrixSourceItem => ({
  ...item,
  vueOwner: true,
  reactOwner: true,
  status: "hybrid",
  migrationStage: item.migrationStage ?? 1,
  apiReady: item.apiReady ?? false,
  canRemoveVue: false,
  runtimeOwner: item.runtimeOwner ?? "react"
});

const vueShell = (item: RouteMatrixHelperInput): RouteMatrixSourceItem => ({
  ...item,
  vueOwner: true,
  reactOwner: false,
  status: "vue",
  migrationStage: item.migrationStage ?? 1,
  apiReady: item.apiReady ?? false,
  canRemoveVue: false,
  runtimeOwner: item.runtimeOwner ?? "vue-shell",
  systemRoute: item.systemRoute ?? true
});

const redirect = (route: string, redirectTo: string, moduleId: FrontendModuleId): RouteMatrixSourceItem => ({
  route,
  moduleId,
  vueOwner: true,
  reactOwner: false,
  status: "deprecated",
  migrationStage: 1,
  roleAccess: allBusinessRoles,
  apiReady: false,
  canRemoveVue: false,
  runtimeOwner: "redirect",
  redirectTo,
  systemRoute: true
});

export const routeMatrixSource: RouteMatrixSourceItem[] = [
  hybrid({ route: "/", moduleId: "dashboard", component: "DashboardPage", migrationStage: 2, apiReady: true }),
  vueShell({ route: "/login", moduleId: "identity", component: "LoginPage", roleAccess: [], notes: "Public authentication entry remains in Vue Shell." }),
  vueShell({
    route: "/supplier-onboarding-register",
    moduleId: "supplier",
    component: "SupplierOnboardingRegisterPage",
    roleAccess: [],
    notes: "Public supplier onboarding is kept as a controlled shell route until contract migration is complete."
  }),
  vueShell({ route: "/permission-denied", moduleId: "state", component: "PermissionDeniedPage", roleAccess: [], runtimeOwner: "state" }),
  vueShell({ route: "/role-switch", moduleId: "identity", component: "RoleSwitchPage", roleAccess: allBusinessRoles }),
  hybrid({ route: "/my-tasks", moduleId: "workbench", component: "MyTasksPage" }),
  hybrid({ route: "/messages", moduleId: "message", component: "MessageCenterPage" }),
  hybrid({ route: "/account-security", moduleId: "identity", component: "AccountSecurityPage" }),
  hybrid({ route: "/approval-rules", moduleId: "approval", component: "ApprovalRulesPage" }),
  hybrid({ route: "/permissions", moduleId: "security", component: "PermissionsPage" }),
  hybrid({ route: "/modules", moduleId: "navigation", component: "ModuleEntrypointsPage" }),
  hybrid({ route: "/suppliers", moduleId: "supplier", component: "SupplierListPage" }),
  hybrid({ route: "/suppliers/new", moduleId: "supplier", component: "SupplierCreatePage" }),
  hybrid({ route: "/suppliers/:supplierId", moduleId: "supplier", component: "SupplierManagementPage" }),
  hybrid({ route: "/suppliers/:supplierId/:section", moduleId: "supplier", component: "SupplierManagementPage" }),
  hybrid({ route: "/supplier-portal", moduleId: "supplier", component: "SupplierPortalPage" }),
  hybrid({ route: "/supplier-portal/:section", moduleId: "supplier", component: "SupplierPortalPage" }),
  hybrid({ route: "/procurement-requests", moduleId: "procurement", component: "ProcurementRequestsPage", migrationStage: 2, apiReady: true }),
  hybrid({ route: "/procurement-requests/new", moduleId: "procurement", component: "ProcurementRequestCreatePage", migrationStage: 2, apiReady: true }),
  hybrid({ route: "/procurement-requests/:requestId", moduleId: "procurement", component: "ProcurementRequestDetailPage", migrationStage: 2, apiReady: true }),
  redirect("/project-initiation", "/procurement-requests", "procurement"),
  hybrid({ route: "/project-workbench", moduleId: "project", component: "ProjectWorkbenchListPage", migrationStage: 2, apiReady: true }),
  hybrid({ route: "/project-workbench/:projectId", moduleId: "project", component: "ProjectWorkbenchPage", migrationStage: 2, apiReady: true }),
  hybrid({ route: "/project-workbench/:projectId/sourcing", moduleId: "sourcing", component: "ProjectSourcingPage", migrationStage: 2, apiReady: true }),
  hybrid({ route: "/project-workbench/:projectId/fulfillment", moduleId: "project", component: "ProjectFulfillmentPage", migrationStage: 2, apiReady: true }),
  hybrid({ route: "/procurement-documents", moduleId: "document", component: "ProcurementDocumentsPage" }),
  hybrid({ route: "/announcements-invitations", moduleId: "announcement", component: "AnnouncementsInvitationsPage" }),
  hybrid({ route: "/supplier-registration", moduleId: "supplier", component: "SupplierRegistrationPage" }),
  hybrid({ route: "/bidding", moduleId: "bidding", component: "BiddingPage" }),
  hybrid({ route: "/bid-control", moduleId: "bidding", component: "BidControlPage" }),
  hybrid({ route: "/expert-review", moduleId: "expert", component: "ExpertReviewPage" }),
  hybrid({ route: "/scoring-templates", moduleId: "expert", component: "ScoringTemplatesPage" }),
  hybrid({ route: "/expert-scoring", moduleId: "expert", component: "ExpertScoringPage" }),
  hybrid({ route: "/award-result", moduleId: "award", component: "AwardResultListPage" }),
  hybrid({ route: "/award-result/:projectId", moduleId: "award", component: "AwardResultPage" }),
  hybrid({ route: "/external-trade", moduleId: "integration", component: "ExternalTradePage" }),
  hybrid({ route: "/integration-boundary", moduleId: "integration", component: "IntegrationBoundaryPage" }),
  hybrid({ route: "/file-center", moduleId: "file", component: "FileCenterPage" }),
  hybrid({ route: "/supply-mall", moduleId: "mall", component: "SupplyMallPage" }),
  hybrid({ route: "/supply-mall/:section", moduleId: "mall", component: "SupplyMallSectionPage" }),
  hybrid({ route: "/order-fulfillment", moduleId: "order", component: "OrderFulfillmentPage" }),
  redirect("/contract-performance", "/order-fulfillment", "order"),
  hybrid({ route: "/settlement-materials", moduleId: "settlement", component: "SettlementMaterialsPage" }),
  redirect("/settlement-documents", "/settlement-materials", "settlement"),
  redirect("/settlement-invoices", "/settlement-materials", "settlement"),
  redirect("/invoice-review", "/settlement-materials", "settlement"),
  hybrid({ route: "/payment-status", moduleId: "finance", component: "PaymentStatusPage" }),
  redirect("/funds", "/payment-status", "finance"),
  hybrid({ route: "/archive-audit", moduleId: "archive", component: "ArchiveAuditPage" }),
  hybrid({ route: "/audit", moduleId: "audit", component: "AuditPage" }),
  vueShell({ route: "/:pathMatch(.*)*", moduleId: "state", component: "NotFoundPage", roleAccess: [], runtimeOwner: "state" })
];

function deriveRoleAccess(item: RouteMatrixSourceItem): RoleId[] {
  if (item.roleAccess) return item.roleAccess;
  return allRoleIds.filter((roleId) => routeAllowed(item.route, roleId, true));
}

export const routeMatrix: RouteMatrixItem[] = routeMatrixSource.map((item) => ({
  ...item,
  roleAccess: deriveRoleAccess(item)
}));

export const routeMatrixByRoute = new Map(routeMatrix.map((item) => [item.route, item]));

function routePatternToRegExp(routePattern: string) {
  if (routePattern === "/:pathMatch(.*)*") return /^\/.*$/;
  const escaped = routePattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:([^/]+)/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
}

export function resolveRouteMatrixItem(path: string): RouteMatrixItem | undefined {
  const exact = routeMatrixByRoute.get(path);
  if (exact) return exact;
  return routeMatrix.find((item) => item.route.includes(":") && item.route !== "/:pathMatch(.*)*" && routePatternToRegExp(item.route).test(path));
}

export function listRouteMatrixByModule(moduleId: FrontendModuleId) {
  return routeMatrix.filter((item) => item.moduleId === moduleId);
}
