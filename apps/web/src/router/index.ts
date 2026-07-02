import { createRouter, createWebHistory } from "vue-router";
import { getPageClassification } from "./page-classification";
import AccountSecurityPage from "../pages/AccountSecurityPage.vue";
import AuditPage from "../pages/AuditPage.vue";
import AnnouncementsInvitationsPage from "../pages/AnnouncementsInvitationsPage.vue";
import ApprovalRulesPage from "../pages/ApprovalRulesPage.vue";
import ArchiveAuditPage from "../pages/ArchiveAuditPage.vue";
import AwardResultListPage from "../pages/AwardResultListPage.vue";
import AwardResultPage from "../pages/AwardResultPage.vue";
import BidControlPage from "../pages/BidControlPage.vue";
import BiddingPage from "../pages/BiddingPage.vue";
import DashboardPage from "../pages/DashboardPage.vue";
import ExpertReviewPage from "../pages/ExpertReviewPage.vue";
import ExpertScoringPage from "../pages/ExpertScoringPage.vue";
import ExternalTradePage from "../pages/ExternalTradePage.vue";
import FileCenterPage from "../pages/FileCenterPage.vue";
import IntegrationBoundaryPage from "../pages/IntegrationBoundaryPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import MessageCenterPage from "../pages/MessageCenterPage.vue";
import ModuleEntrypointsPage from "../pages/ModuleEntrypointsPage.vue";
import MyTasksPage from "../pages/MyTasksPage.vue";
import OrderFulfillmentPage from "../pages/OrderFulfillmentPage.vue";
import PaymentStatusPage from "../pages/PaymentStatusPage.vue";
import PermissionsPage from "../pages/PermissionsPage.vue";
import ProcurementDocumentsPage from "../pages/ProcurementDocumentsPage.vue";
import ProcurementRequestCreatePage from "../pages/ProcurementRequestCreatePage.vue";
import ProcurementRequestDetailPage from "../pages/ProcurementRequestDetailPage.vue";
import ProcurementRequestsPage from "../pages/ProcurementRequestsPage.vue";
import ProjectFulfillmentPage from "../pages/ProjectFulfillmentPage.vue";
import ProjectSourcingPage from "../pages/ProjectSourcingPage.vue";
import ProjectWorkbenchListPage from "../pages/ProjectWorkbenchListPage.vue";
import ProjectWorkbenchPage from "../pages/ProjectWorkbenchPage.vue";
import RoleSwitchPage from "../pages/RoleSwitchPage.vue";
import SettlementMaterialsPage from "../pages/SettlementMaterialsPage.vue";
import ScoringTemplatesPage from "../pages/ScoringTemplatesPage.vue";
import SupplierCreatePage from "../pages/SupplierCreatePage.vue";
import SupplierListPage from "../pages/SupplierListPage.vue";
import SupplierManagementPage from "../pages/SupplierManagementPage.vue";
import SupplierOnboardingRegisterPage from "../pages/SupplierOnboardingRegisterPage.vue";
import SupplierPortalPage from "../pages/SupplierPortalPage.vue";
import SupplierRegistrationPage from "../pages/SupplierRegistrationPage.vue";
import SupplyMallPage from "../pages/SupplyMallPage.vue";
import SupplyMallSectionPage from "../pages/SupplyMallSectionPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: DashboardPage, meta: getPageClassification("/") },
    { path: "/login", component: LoginPage, meta: getPageClassification("/login") },
    { path: "/supplier-onboarding-register", component: SupplierOnboardingRegisterPage, meta: getPageClassification("/supplier-onboarding-register") },
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
    { path: "/audit", component: AuditPage, meta: getPageClassification("/audit") }
  ]
});
