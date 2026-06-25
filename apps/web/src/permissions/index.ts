export const p0RouteAllowlist = [
  "/api/me",
  "/api/me/menus",
  "/api/me/actions",
  "/api/projects",
  "/api/suppliers",
  "/api/audit-logs"
];

export const phase1RouteAllowlist = [
  ...p0RouteAllowlist,
  "/api/projects/:projectId",
  "/api/projects/:projectId/transitions",
  "/api/suppliers/admissions",
  "/api/suppliers/:supplierId/qualifications",
  "/api/suppliers/:supplierId/category-authorizations",
  "/api/suppliers/:supplierId/restrictions",
  "/api/suppliers/:supplierId/status",
  "/api/suppliers/:supplierId/project-participations",
  "/api/procurement-requests",
  "/api/procurement-requests/:requestId",
  "/api/procurement-requests/:requestId/submit",
  "/api/procurement-requests/:requestId/cancel",
  "/api/procurement-requests/:requestId/method-decision"
];

export const phase2RouteAllowlist = [
  ...phase1RouteAllowlist,
  "/api/procurement-documents",
  "/api/projects/:projectId/procurement-documents",
  "/api/procurement-documents/:documentId",
  "/api/procurement-documents/:documentId/submit-review",
  "/api/procurement-documents/:documentId/publish",
  "/api/procurement-documents/:documentId/revisions",
  "/api/announcements",
  "/api/projects/:projectId/announcements",
  "/api/announcements/:announcementId/publish",
  "/api/announcements/:announcementId/invitations",
  "/api/supplier-invitations",
  "/api/registrations",
  "/api/announcements/:announcementId/registrations",
  "/api/registrations/:registrationId/qualify"
];

export const phase3RouteAllowlist = [
  ...phase2RouteAllowlist,
  "/api/projects/:projectId/bids/summary",
  "/api/projects/:projectId/bids",
  "/api/bids/:bidId",
  "/api/bids/:bidId/submit",
  "/api/bids/:bidId/withdraw",
  "/api/bids/:bidId/resubmit",
  "/api/projects/:projectId/bids/lock",
  "/api/bids/:bidId/versions",
  "/api/bids/:bidId/view-check",
  "/api/bid-files/:fileId/view-check",
  "/api/bid-files/:fileId/download",
  "/api/bid-view-approvals",
  "/api/bid-view-approvals/:approvalId/submit",
  "/api/bid-view-approvals/:approvalId/approve",
  "/api/bid-view-approvals/active",
  "/api/bid-view-approvals/:approvalId/content",
  "/api/bid-view-approvals/:approvalId/validate",
  "/api/bid-view-logs"
];

export const phase4RouteAllowlist = [
  ...phase3RouteAllowlist,
  "/api/experts",
  "/api/experts/:expertId",
  "/api/projects/:projectId/expert-assignments",
  "/api/projects/:projectId/expert-assignments/draw",
  "/api/projects/:projectId/expert-assignments/appoint",
  "/api/expert-assignments/:assignmentId/replace",
  "/api/expert-assignments/:assignmentId/confirm",
  "/api/expert-review/my-scoring-sheets",
  "/api/scoring-sheets/:sheetId",
  "/api/scoring-sheets/:sheetId/save",
  "/api/scoring-sheets/:sheetId/submit-lock",
  "/api/scoring-sheets/:sheetId/reevaluation-request",
  "/api/scoring-sheets/:sheetId/reevaluation-approve",
  "/api/scoring-sheets/:sheetId/versions",
  "/api/expert-review/:projectId/materials/view-check",
  "/api/projects/:projectId/scoring-summary",
  "/api/projects/:projectId/review-report",
  "/api/projects/:projectId/review-report/freeze"
];

export const phase5RouteAllowlist = [
  ...phase4RouteAllowlist,
  "/api/projects/:projectId/award-recommendation",
  "/api/projects/:projectId/award-approvals",
  "/api/award-approvals/:approvalId/submit",
  "/api/award-approvals/:approvalId/mock-approve",
  "/api/projects/:projectId/result-notifications",
  "/api/projects/:projectId/internal-publicity"
];

export const phase6RouteAllowlist = [
  ...phase5RouteAllowlist,
  "/api/external-trades",
  "/api/external-trades/projects",
  "/api/external-trades/:projectId",
  "/api/external-trades/:projectId/internal-approval",
  "/api/external-trades/:projectId/external-project",
  "/api/external-trades/:projectId/announcement-materials",
  "/api/external-trades/:projectId/result-materials",
  "/api/external-trades/:projectId/result-record",
  "/api/external-trades/:projectId/block-check",
  "/api/external-trades/:projectId/records",
  "/api/external-trade-block-logs"
];

export const phase7RouteAllowlist = [
  ...phase6RouteAllowlist,
  "/api/contracts",
  "/api/projects/:projectId/contracts",
  "/api/contracts/:contractId/performance-nodes",
  "/api/performance-nodes/:nodeId/status",
  "/api/contracts/:contractId/acceptance-payments",
  "/api/contracts/:contractId/supplier-evaluations",
  "/api/suppliers/:supplierId/evaluations"
];

export const phase8RouteAllowlist = [
  ...phase7RouteAllowlist,
  "/api/archive-templates",
  "/api/archive-items",
  "/api/projects/:projectId/archive-items",
  "/api/projects/:projectId/archive-snapshot",
  "/api/projects/:projectId/archive-check",
  "/api/projects/:projectId/archive-seal",
  "/api/archive-items/:itemId/update",
  "/api/archive-items/:itemId/supplement-requests",
  "/api/archive-supplement-requests",
  "/api/archive-supplement-requests/:requestId/approve",
  "/api/archive-supplement-requests/:requestId/apply",
  "/api/projects/:projectId/audit-trail",
  "/api/users/:userId/audit-logs",
  "/api/sensitive-action-logs",
  "/api/result-notification-logs",
  "/api/archive-audit-logs"
];

export const hotelClosedLoopRouteAllowlist = [
  ...phase8RouteAllowlist,
  "/api/project-workbench/projects/:projectId",
  "/api/project-workbench/projects/:projectId/purchase-orders/generate",
  "/api/project-workbench/purchase-orders/:orderId/confirm",
  "/api/project-workbench/purchase-orders/:orderId/receipts",
  "/api/project-workbench/purchase-orders/:orderId/settlement-materials"
];
