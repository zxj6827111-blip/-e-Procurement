import { createRouter, createWebHistory } from "vue-router";
import AuditPage from "../pages/AuditPage.vue";
import AnnouncementsInvitationsPage from "../pages/AnnouncementsInvitationsPage.vue";
import ApprovalRulesPage from "../pages/ApprovalRulesPage.vue";
import ArchiveAuditPage from "../pages/ArchiveAuditPage.vue";
import AwardResultPage from "../pages/AwardResultPage.vue";
import BidControlPage from "../pages/BidControlPage.vue";
import BiddingPage from "../pages/BiddingPage.vue";
import ContractPerformancePage from "../pages/ContractPerformancePage.vue";
import DashboardPage from "../pages/DashboardPage.vue";
import ExpertReviewPage from "../pages/ExpertReviewPage.vue";
import ExpertScoringPage from "../pages/ExpertScoringPage.vue";
import ExternalTradePage from "../pages/ExternalTradePage.vue";
import FileCenterPage from "../pages/FileCenterPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import MessageCenterPage from "../pages/MessageCenterPage.vue";
import ModuleEntrypointsPage from "../pages/ModuleEntrypointsPage.vue";
import MyTasksPage from "../pages/MyTasksPage.vue";
import PermissionsPage from "../pages/PermissionsPage.vue";
import ProcurementDocumentsPage from "../pages/ProcurementDocumentsPage.vue";
import ProcurementRequestsPage from "../pages/ProcurementRequestsPage.vue";
import ProjectInitiationPage from "../pages/ProjectInitiationPage.vue";
import ProjectWorkbenchPage from "../pages/ProjectWorkbenchPage.vue";
import RoleSwitchPage from "../pages/RoleSwitchPage.vue";
import SupplierManagementPage from "../pages/SupplierManagementPage.vue";
import SupplierRegistrationPage from "../pages/SupplierRegistrationPage.vue";
import SupplyMallPage from "../pages/SupplyMallPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: DashboardPage },
    { path: "/login", component: LoginPage },
    { path: "/role-switch", component: RoleSwitchPage },
    { path: "/my-tasks", component: MyTasksPage },
    { path: "/messages", component: MessageCenterPage },
    { path: "/approval-rules", component: ApprovalRulesPage },
    { path: "/permissions", component: PermissionsPage },
    { path: "/modules", component: ModuleEntrypointsPage },
    { path: "/suppliers", component: SupplierManagementPage },
    { path: "/procurement-requests", component: ProcurementRequestsPage },
    { path: "/project-initiation", component: ProjectInitiationPage },
    { path: "/project-workbench", component: ProjectWorkbenchPage },
    { path: "/procurement-documents", component: ProcurementDocumentsPage },
    { path: "/announcements-invitations", component: AnnouncementsInvitationsPage },
    { path: "/supplier-registration", component: SupplierRegistrationPage },
    { path: "/bidding", component: BiddingPage },
    { path: "/bid-control", component: BidControlPage },
    { path: "/expert-review", component: ExpertReviewPage },
    { path: "/expert-scoring", component: ExpertScoringPage },
    { path: "/award-result", component: AwardResultPage },
    { path: "/external-trade", component: ExternalTradePage },
    { path: "/file-center", component: FileCenterPage },
    { path: "/supply-mall", component: SupplyMallPage },
    { path: "/contract-performance", component: ContractPerformancePage },
    { path: "/archive-audit", component: ArchiveAuditPage },
    { path: "/audit", component: AuditPage }
  ]
});
