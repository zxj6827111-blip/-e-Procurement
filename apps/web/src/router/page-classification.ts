export const pageKinds = ["LIST_PAGE", "DETAIL_PAGE", "FORM_PAGE", "DASHBOARD_PAGE"] as const;

export type PageKind = (typeof pageKinds)[number];

export interface PageClassification {
  path: string;
  domain: string;
  kind: PageKind;
  component?: string;
  exceptionReason?: string;
}

export const pageClassifications: PageClassification[] = [
  { path: "/", domain: "dashboard", kind: "DASHBOARD_PAGE", component: "DashboardPage" },
  { path: "/login", domain: "identity", kind: "FORM_PAGE", component: "LoginPage", exceptionReason: "Authentication entry is a controlled form page." },
  {
    path: "/supplier-onboarding-register",
    domain: "supplier",
    kind: "FORM_PAGE",
    component: "SupplierOnboardingRegisterPage",
    exceptionReason: "Supplier onboarding is the approved wizard-style complex creation flow."
  },
  { path: "/role-switch", domain: "identity", kind: "FORM_PAGE", component: "RoleSwitchPage", exceptionReason: "Mock role switch is a controlled system form." },
  { path: "/my-tasks", domain: "workbench", kind: "LIST_PAGE", component: "MyTasksPage" },
  { path: "/messages", domain: "message", kind: "LIST_PAGE", component: "MessageCenterPage" },
  { path: "/account-security", domain: "identity", kind: "FORM_PAGE", component: "AccountSecurityPage" },
  { path: "/approval-rules", domain: "approval", kind: "LIST_PAGE", component: "ApprovalRulesPage" },
  { path: "/permissions", domain: "security", kind: "LIST_PAGE", component: "PermissionsPage" },
  { path: "/modules", domain: "navigation", kind: "LIST_PAGE", component: "ModuleEntrypointsPage" },
  { path: "/suppliers", domain: "supplier", kind: "LIST_PAGE", component: "SupplierListPage" },
  { path: "/suppliers/new", domain: "supplier", kind: "FORM_PAGE", component: "SupplierCreatePage" },
  { path: "/suppliers/:supplierId", domain: "supplier", kind: "DETAIL_PAGE", component: "SupplierManagementPage" },
  { path: "/suppliers/:supplierId/:section", domain: "supplier", kind: "DETAIL_PAGE", component: "SupplierManagementPage" },
  { path: "/supplier-portal", domain: "supplier", kind: "DETAIL_PAGE", component: "SupplierPortalPage" },
  { path: "/supplier-portal/:section", domain: "supplier", kind: "DETAIL_PAGE", component: "SupplierPortalPage" },
  { path: "/procurement-requests", domain: "procurement-request", kind: "LIST_PAGE", component: "ProcurementRequestsPage" },
  { path: "/procurement-requests/new", domain: "procurement-request", kind: "FORM_PAGE", component: "ProcurementRequestCreatePage" },
  { path: "/procurement-requests/:requestId", domain: "procurement-request", kind: "DETAIL_PAGE", component: "ProcurementRequestDetailPage" },
  { path: "/project-workbench", domain: "project", kind: "LIST_PAGE", component: "ProjectWorkbenchListPage" },
  { path: "/project-workbench/:projectId", domain: "project", kind: "DETAIL_PAGE", component: "ProjectWorkbenchPage" },
  { path: "/project-workbench/:projectId/sourcing", domain: "project-sourcing", kind: "DETAIL_PAGE", component: "ProjectSourcingPage" },
  { path: "/project-workbench/:projectId/fulfillment", domain: "project-fulfillment", kind: "DETAIL_PAGE", component: "ProjectFulfillmentPage" },
  { path: "/procurement-documents", domain: "procurement-document", kind: "LIST_PAGE", component: "ProcurementDocumentsPage" },
  { path: "/announcements-invitations", domain: "announcement", kind: "LIST_PAGE", component: "AnnouncementsInvitationsPage" },
  { path: "/supplier-registration", domain: "supplier-registration", kind: "FORM_PAGE", component: "SupplierRegistrationPage" },
  { path: "/bidding", domain: "bidding", kind: "FORM_PAGE", component: "BiddingPage" },
  { path: "/bid-control", domain: "bid-control", kind: "LIST_PAGE", component: "BidControlPage" },
  { path: "/expert-review", domain: "expert-review", kind: "LIST_PAGE", component: "ExpertReviewPage" },
  { path: "/scoring-templates", domain: "scoring-template", kind: "FORM_PAGE", component: "ScoringTemplatesPage" },
  { path: "/expert-scoring", domain: "expert-scoring", kind: "FORM_PAGE", component: "ExpertScoringPage" },
  { path: "/award-result", domain: "award", kind: "LIST_PAGE", component: "AwardResultListPage" },
  { path: "/award-result/:projectId", domain: "award", kind: "DETAIL_PAGE", component: "AwardResultPage" },
  { path: "/external-trade", domain: "external-trade", kind: "DETAIL_PAGE", component: "ExternalTradePage" },
  { path: "/integration-boundary", domain: "integration", kind: "LIST_PAGE", component: "IntegrationBoundaryPage" },
  { path: "/file-center", domain: "file", kind: "LIST_PAGE", component: "FileCenterPage" },
  { path: "/supply-mall", domain: "supply-mall", kind: "LIST_PAGE", component: "SupplyMallPage" },
  { path: "/supply-mall/:section", domain: "supply-mall", kind: "DETAIL_PAGE", component: "SupplyMallSectionPage" },
  { path: "/order-fulfillment", domain: "order-fulfillment", kind: "LIST_PAGE", component: "OrderFulfillmentPage" },
  { path: "/settlement-materials", domain: "settlement", kind: "LIST_PAGE", component: "SettlementMaterialsPage" },
  { path: "/payment-status", domain: "payment", kind: "LIST_PAGE", component: "PaymentStatusPage" },
  { path: "/archive-audit", domain: "archive", kind: "LIST_PAGE", component: "ArchiveAuditPage" },
  { path: "/audit", domain: "audit", kind: "LIST_PAGE", component: "AuditPage" }
];

export const redirectRoutePaths = [
  "/project-initiation",
  "/contract-performance",
  "/settlement-documents",
  "/settlement-invoices",
  "/invoice-review",
  "/funds"
] as const;

export function getPageClassification(path: string) {
  const classification = pageClassifications.find((item) => item.path === path);
  return classification ? { ...classification } : {};
}
