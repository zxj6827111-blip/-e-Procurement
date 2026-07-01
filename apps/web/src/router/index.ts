import { createRouter, createWebHistory } from "vue-router";
import AccountSecurityPage from "../pages/AccountSecurityPage.vue";
import AuditPage from "../pages/AuditPage.vue";
import AnnouncementsInvitationsPage from "../pages/AnnouncementsInvitationsPage.vue";
import ApprovalRulesPage from "../pages/ApprovalRulesPage.vue";
import ArchiveAuditPage from "../pages/ArchiveAuditPage.vue";
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
import ProcurementRequestDetailPage from "../pages/ProcurementRequestDetailPage.vue";
import ProcurementRequestsPage from "../pages/ProcurementRequestsPage.vue";
import ProjectWorkbenchPage from "../pages/ProjectWorkbenchPage.vue";
import RoleSwitchPage from "../pages/RoleSwitchPage.vue";
import SettlementMaterialsPage from "../pages/SettlementMaterialsPage.vue";
import ScoringTemplatesPage from "../pages/ScoringTemplatesPage.vue";
import SupplierManagementPage from "../pages/SupplierManagementPage.vue";
import SupplierOnboardingRegisterPage from "../pages/SupplierOnboardingRegisterPage.vue";
import SupplierRegistrationPage from "../pages/SupplierRegistrationPage.vue";
import SupplyMallPage from "../pages/SupplyMallPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: DashboardPage },
    { path: "/login", component: LoginPage },
    { path: "/supplier-onboarding-register", component: SupplierOnboardingRegisterPage },
    { path: "/role-switch", component: RoleSwitchPage },
    { path: "/my-tasks", component: MyTasksPage },
    { path: "/messages", component: MessageCenterPage },
    { path: "/account-security", component: AccountSecurityPage },
    { path: "/approval-rules", component: ApprovalRulesPage },
    { path: "/permissions", component: PermissionsPage },
    { path: "/modules", component: ModuleEntrypointsPage },
    { path: "/suppliers", component: SupplierManagementPage },
    { path: "/procurement-requests", component: ProcurementRequestsPage },
    { path: "/procurement-requests/:requestId", component: ProcurementRequestDetailPage },
    { path: "/project-initiation", redirect: "/procurement-requests" },
    { path: "/project-workbench", component: ProjectWorkbenchPage },
    { path: "/procurement-documents", component: ProcurementDocumentsPage },
    { path: "/announcements-invitations", component: AnnouncementsInvitationsPage },
    { path: "/supplier-registration", component: SupplierRegistrationPage },
    { path: "/bidding", component: BiddingPage },
    { path: "/bid-control", component: BidControlPage },
    { path: "/expert-review", component: ExpertReviewPage },
    { path: "/scoring-templates", component: ScoringTemplatesPage },
    { path: "/expert-scoring", component: ExpertScoringPage },
    { path: "/award-result", component: AwardResultPage },
    { path: "/external-trade", component: ExternalTradePage },
    { path: "/integration-boundary", component: IntegrationBoundaryPage },
    { path: "/file-center", component: FileCenterPage },
    { path: "/supply-mall", component: SupplyMallPage },
    { path: "/order-fulfillment", component: OrderFulfillmentPage },
    { path: "/contract-performance", redirect: "/order-fulfillment" },
    { path: "/settlement-materials", component: SettlementMaterialsPage },
    { path: "/settlement-documents", redirect: "/settlement-materials" },
    { path: "/settlement-invoices", redirect: "/settlement-materials" },
    { path: "/invoice-review", redirect: "/settlement-materials" },
    { path: "/payment-status", component: PaymentStatusPage },
    { path: "/funds", redirect: "/payment-status" },
    { path: "/archive-audit", component: ArchiveAuditPage },
    { path: "/audit", component: AuditPage }
  ]
});
