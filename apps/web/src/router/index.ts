import { createRouter, createWebHistory } from "vue-router";
import { getPageClassification } from "./page-classification";
import { routeAllowed, supplierRoles } from "../permissions/role-model";
import { useSessionStore } from "../stores/session";

const AccountSecurityPage = () => import("../pages/AccountSecurityPage.vue");
const AuditPage = () => import("../pages/AuditPage.vue");
const AnnouncementsInvitationsPage = () => import("../pages/AnnouncementsInvitationsPage.vue");
const ApprovalRulesPage = () => import("../pages/ApprovalRulesPage.vue");
const ArchiveAuditPage = () => import("../pages/ArchiveAuditPage.vue");
const AwardResultListPage = () => import("../pages/AwardResultListPage.vue");
const AwardResultPage = () => import("../pages/AwardResultPage.vue");
const BidControlPage = () => import("../pages/BidControlPage.vue");
const BiddingPage = () => import("../pages/BiddingPage.vue");
const DashboardPage = () => import("../pages/DashboardPage.vue");
const ExpertReviewPage = () => import("../pages/ExpertReviewPage.vue");
const ExpertScoringPage = () => import("../pages/ExpertScoringPage.vue");
const ExternalTradePage = () => import("../pages/ExternalTradePage.vue");
const FileCenterPage = () => import("../pages/FileCenterPage.vue");
const IntegrationBoundaryPage = () => import("../pages/IntegrationBoundaryPage.vue");
const LoginPage = () => import("../pages/LoginPage.vue");
const MessageCenterPage = () => import("../pages/MessageCenterPage.vue");
const ModuleEntrypointsPage = () => import("../pages/ModuleEntrypointsPage.vue");
const MyTasksPage = () => import("../pages/MyTasksPage.vue");
const NotFoundPage = () => import("../pages/NotFoundPage.vue");
const OrderFulfillmentPage = () => import("../pages/OrderFulfillmentPage.vue");
const PaymentStatusPage = () => import("../pages/PaymentStatusPage.vue");
const PermissionDeniedPage = () => import("../pages/PermissionDeniedPage.vue");
const PermissionsPage = () => import("../pages/PermissionsPage.vue");
const ProcurementDocumentsPage = () => import("../pages/ProcurementDocumentsPage.vue");
const ProcurementRequestCreatePage = () => import("../pages/ProcurementRequestCreatePage.vue");
const ProcurementRequestDetailPage = () => import("../pages/ProcurementRequestDetailPage.vue");
const ProcurementRequestsPage = () => import("../pages/ProcurementRequestsPage.vue");
const ProjectFulfillmentPage = () => import("../pages/ProjectFulfillmentPage.vue");
const ProjectSourcingPage = () => import("../pages/ProjectSourcingPage.vue");
const ProjectWorkbenchListPage = () => import("../pages/ProjectWorkbenchListPage.vue");
const ProjectWorkbenchPage = () => import("../pages/ProjectWorkbenchPage.vue");
const RoleSwitchPage = () => import("../pages/RoleSwitchPage.vue");
const SettlementMaterialsPage = () => import("../pages/SettlementMaterialsPage.vue");
const ScoringTemplatesPage = () => import("../pages/ScoringTemplatesPage.vue");
const SupplierCreatePage = () => import("../pages/SupplierCreatePage.vue");
const SupplierListPage = () => import("../pages/SupplierListPage.vue");
const SupplierManagementPage = () => import("../pages/SupplierManagementPage.vue");
const SupplierOnboardingRegisterPage = () => import("../pages/SupplierOnboardingRegisterPage.vue");
const SupplierPortalPage = () => import("../pages/SupplierPortalPage.vue");
const SupplierRegistrationPage = () => import("../pages/SupplierRegistrationPage.vue");
const SupplyMallPage = () => import("../pages/SupplyMallPage.vue");
const SupplyMallSectionPage = () => import("../pages/SupplyMallSectionPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: DashboardPage, meta: getPageClassification("/") },
    { path: "/login", component: LoginPage, meta: getPageClassification("/login") },
    { path: "/supplier-onboarding-register", component: SupplierOnboardingRegisterPage, meta: getPageClassification("/supplier-onboarding-register") },
    { path: "/permission-denied", component: PermissionDeniedPage, meta: getPageClassification("/permission-denied") },
    { path: "/role-switch", component: RoleSwitchPage, meta: getPageClassification("/role-switch") },
    { path: "/my-tasks", component: MyTasksPage, meta: getPageClassification("/my-tasks") },
    { path: "/messages", component: MessageCenterPage, meta: getPageClassification("/messages") },
    { path: "/account-security", component: AccountSecurityPage, meta: getPageClassification("/account-security") },
    { path: "/approval-rules", component: ApprovalRulesPage, meta: getPageClassification("/approval-rules") },
    { path: "/permissions", component: PermissionsPage, meta: getPageClassification("/permissions") },
    { path: "/modules", component: ModuleEntrypointsPage, meta: getPageClassification("/modules") },
    { path: "/suppliers", component: SupplierListPage, meta: getPageClassification("/suppliers") },
    { path: "/suppliers/new", component: SupplierCreatePage, meta: getPageClassification("/suppliers/new") },
    { path: "/suppliers/:supplierId", component: SupplierManagementPage, meta: getPageClassification("/suppliers/:supplierId") },
    { path: "/suppliers/:supplierId/:section", component: SupplierManagementPage, meta: getPageClassification("/suppliers/:supplierId/:section") },
    { path: "/supplier-portal", component: SupplierPortalPage, meta: getPageClassification("/supplier-portal") },
    { path: "/supplier-portal/:section", component: SupplierPortalPage, meta: getPageClassification("/supplier-portal/:section") },
    { path: "/procurement-requests", component: ProcurementRequestsPage, meta: getPageClassification("/procurement-requests") },
    { path: "/procurement-requests/new", component: ProcurementRequestCreatePage, meta: getPageClassification("/procurement-requests/new") },
    { path: "/procurement-requests/:requestId", component: ProcurementRequestDetailPage, meta: getPageClassification("/procurement-requests/:requestId") },
    { path: "/project-initiation", redirect: "/procurement-requests" },
    { path: "/project-workbench", component: ProjectWorkbenchListPage, meta: getPageClassification("/project-workbench") },
    { path: "/project-workbench/:projectId", component: ProjectWorkbenchPage, meta: getPageClassification("/project-workbench/:projectId") },
    { path: "/project-workbench/:projectId/sourcing", component: ProjectSourcingPage, meta: getPageClassification("/project-workbench/:projectId/sourcing") },
    { path: "/project-workbench/:projectId/fulfillment", component: ProjectFulfillmentPage, meta: getPageClassification("/project-workbench/:projectId/fulfillment") },
    { path: "/procurement-documents", component: ProcurementDocumentsPage, meta: getPageClassification("/procurement-documents") },
    { path: "/announcements-invitations", component: AnnouncementsInvitationsPage, meta: getPageClassification("/announcements-invitations") },
    { path: "/supplier-registration", component: SupplierRegistrationPage, meta: getPageClassification("/supplier-registration") },
    { path: "/bidding", component: BiddingPage, meta: getPageClassification("/bidding") },
    { path: "/bid-control", component: BidControlPage, meta: getPageClassification("/bid-control") },
    { path: "/expert-directory", component: ExpertReviewPage, meta: getPageClassification("/expert-directory") },
    { path: "/expert-review", component: ExpertReviewPage, meta: getPageClassification("/expert-review") },
    { path: "/scoring-templates", component: ScoringTemplatesPage, meta: getPageClassification("/scoring-templates") },
    { path: "/expert-scoring", component: ExpertScoringPage, meta: getPageClassification("/expert-scoring") },
    { path: "/award-result", component: AwardResultListPage, meta: getPageClassification("/award-result") },
    { path: "/award-result/:projectId", component: AwardResultPage, meta: getPageClassification("/award-result/:projectId") },
    { path: "/external-trade", component: ExternalTradePage, meta: getPageClassification("/external-trade") },
    { path: "/integration-boundary", component: IntegrationBoundaryPage, meta: getPageClassification("/integration-boundary") },
    { path: "/file-center", component: FileCenterPage, meta: getPageClassification("/file-center") },
    { path: "/supply-mall", component: SupplyMallPage, meta: getPageClassification("/supply-mall") },
    { path: "/supply-mall/:section", component: SupplyMallSectionPage, meta: getPageClassification("/supply-mall/:section") },
    { path: "/order-fulfillment", component: OrderFulfillmentPage, meta: getPageClassification("/order-fulfillment") },
    { path: "/contract-performance", redirect: "/order-fulfillment" },
    { path: "/settlement-materials", component: SettlementMaterialsPage, meta: getPageClassification("/settlement-materials") },
    { path: "/settlement-documents", redirect: "/settlement-materials" },
    { path: "/settlement-invoices", redirect: "/settlement-materials" },
    { path: "/invoice-review", redirect: "/settlement-materials" },
    { path: "/payment-status", component: PaymentStatusPage, meta: getPageClassification("/payment-status") },
    { path: "/funds", redirect: "/payment-status" },
    { path: "/archive-audit", component: ArchiveAuditPage, meta: getPageClassification("/archive-audit") },
    { path: "/audit", component: AuditPage, meta: getPageClassification("/audit") },
    { path: "/:pathMatch(.*)*", component: NotFoundPage, meta: getPageClassification("/:pathMatch(.*)*") }
  ]
});

const publicRoutePaths = new Set(["/login", "/supplier-onboarding-register"]);
const stateRoutePaths = new Set(["/permission-denied"]);

router.beforeEach(async (to) => {
  if (publicRoutePaths.has(to.path) || stateRoutePaths.has(to.path) || to.matched.some((item) => item.path === "/:pathMatch(.*)*")) {
    return true;
  }

  const session = useSessionStore();
  if (to.path === "/role-switch") {
    await session.loadAuthProviders().catch(() => undefined);
    return session.mode !== "production" && session.mockAuthEnabled ? true : "/login";
  }
  if (!session.user) {
    const loaded = await session.loadMe();
    if (!loaded) return "/login";
  }

  if (!session.roleId) return "/login";
  if (session.passwordChangeRequired && to.path !== "/account-security") {
    return "/account-security";
  }

  if (supplierRoles.includes(session.roleId as (typeof supplierRoles)[number]) && to.path.startsWith("/suppliers/")) {
    const section = typeof to.params.section === "string" ? to.params.section : "";
    return section ? `/supplier-portal/${encodeURIComponent(section)}` : "/supplier-portal";
  }

  if (routeAllowed(to.path, session.roleId, session.mockAuthEnabled)) return true;
  return "/permission-denied";
});
