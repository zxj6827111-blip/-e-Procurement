import { readFileSync } from "node:fs";
import { join } from "node:path";

const openapi = readFileSync(join(process.cwd(), "docs/openapi/openapi.yaml"), "utf8");

const requiredPaths = [
  "/api/auth/mock-login",
  "/api/me",
  "/api/me/mock-role-switch",
  "/api/me/org-scope",
  "/api/me/menus",
  "/api/me/actions",
  "/api/organizations",
  "/api/roles",
  "/api/role-permissions",
  "/api/system-dictionaries",
  "/api/projects",
  "/api/projects/{projectId}",
  "/api/projects/{projectId}/transitions",
  "/api/suppliers",
  "/api/suppliers/{supplierId}",
  "/api/suppliers/admissions",
  "/api/suppliers/{supplierId}/qualifications",
  "/api/suppliers/{supplierId}/category-authorizations",
  "/api/suppliers/{supplierId}/restrictions",
  "/api/suppliers/{supplierId}/status",
  "/api/suppliers/{supplierId}/project-participations",
  "/api/procurement-requests",
  "/api/procurement-requests/{requestId}",
  "/api/procurement-requests/{requestId}/submit",
  "/api/procurement-requests/{requestId}/cancel",
  "/api/procurement-requests/{requestId}/method-decision",
  "/api/procurement-method-rules",
  "/api/procurement-documents",
  "/api/projects/{projectId}/procurement-documents",
  "/api/procurement-documents/{documentId}",
  "/api/procurement-documents/{documentId}/submit-review",
  "/api/procurement-documents/{documentId}/publish",
  "/api/procurement-documents/{documentId}/revisions",
  "/api/announcements",
  "/api/projects/{projectId}/announcements",
  "/api/announcements/{announcementId}/publish",
  "/api/announcements/{announcementId}/invitations",
  "/api/supplier-invitations",
  "/api/registrations",
  "/api/announcements/{announcementId}/registrations",
  "/api/registrations/{registrationId}/qualify",
  "/api/projects/{projectId}/bids/summary",
  "/api/projects/{projectId}/bids",
  "/api/bids/{bidId}",
  "/api/bids/{bidId}/submit",
  "/api/bids/{bidId}/withdraw",
  "/api/bids/{bidId}/resubmit",
  "/api/projects/{projectId}/bids/lock",
  "/api/bids/{bidId}/versions",
  "/api/bids/{bidId}/view-check",
  "/api/bid-files/{fileId}/view-check",
  "/api/bid-files/{fileId}/download",
  "/api/bid-view-approvals",
  "/api/bid-view-approvals/{approvalId}/submit",
  "/api/bid-view-approvals/{approvalId}/approve",
  "/api/bid-view-approvals/active",
  "/api/bid-view-approvals/{approvalId}/content",
  "/api/bid-view-approvals/{approvalId}/validate",
  "/api/bid-view-logs",
  "/api/experts",
  "/api/experts/{expertId}",
  "/api/projects/{projectId}/expert-assignments",
  "/api/projects/{projectId}/expert-assignments/draw",
  "/api/projects/{projectId}/expert-assignments/appoint",
  "/api/expert-assignments/{assignmentId}/replace",
  "/api/expert-assignments/{assignmentId}/confirm",
  "/api/expert-review/my-scoring-sheets",
  "/api/scoring-sheets/{sheetId}",
  "/api/scoring-sheets/{sheetId}/save",
  "/api/scoring-sheets/{sheetId}/submit-lock",
  "/api/scoring-sheets/{sheetId}/reevaluation-request",
  "/api/scoring-sheets/{sheetId}/reevaluation-approve",
  "/api/scoring-sheets/{sheetId}/versions",
  "/api/expert-review/{projectId}/materials/view-check",
  "/api/projects/{projectId}/scoring-summary",
  "/api/projects/{projectId}/review-report",
  "/api/projects/{projectId}/review-report/freeze",
  "/api/projects/{projectId}/award-recommendation",
  "/api/projects/{projectId}/award-approvals",
  "/api/award-approvals/{approvalId}/submit",
  "/api/award-approvals/{approvalId}/mock-approve",
  "/api/projects/{projectId}/result-notifications",
  "/api/projects/{projectId}/internal-publicity",
  "/api/external-trades",
  "/api/external-trades/projects",
  "/api/external-trades/{projectId}",
  "/api/external-trades/{projectId}/internal-approval",
  "/api/external-trades/{projectId}/external-project",
  "/api/external-trades/{projectId}/announcement-materials",
  "/api/external-trades/{projectId}/result-materials",
  "/api/external-trades/{projectId}/result-record",
  "/api/external-trades/{projectId}/records",
  "/api/external-trades/{projectId}/block-check",
  "/api/external-trade-block-logs",
  "/api/contracts",
  "/api/projects/{projectId}/contracts",
  "/api/contracts/{contractId}/performance-nodes",
  "/api/performance-nodes/{nodeId}/status",
  "/api/contracts/{contractId}/acceptance-payments",
  "/api/contracts/{contractId}/supplier-evaluations",
  "/api/suppliers/{supplierId}/evaluations",
  "/api/archive-templates",
  "/api/archive-items",
  "/api/projects/{projectId}/archive-items",
  "/api/projects/{projectId}/archive-snapshot",
  "/api/projects/{projectId}/archive-check",
  "/api/projects/{projectId}/archive-seal",
  "/api/archive-items/{itemId}/supplement-requests",
  "/api/archive-supplement-requests",
  "/api/archive-supplement-requests/{requestId}/approve",
  "/api/archive-supplement-requests/{requestId}/apply",
  "/api/archive-items/{itemId}/update",
  "/api/projects/{projectId}/audit-trail",
  "/api/users/{userId}/audit-logs",
  "/api/sensitive-action-logs",
  "/api/result-notification-logs",
  "/api/archive-audit-logs",
  "/api/project-workbench/projects/{projectId}",
  "/api/project-workbench/projects/{projectId}/purchase-orders/generate",
  "/api/project-workbench/purchase-orders/{orderId}/confirm",
  "/api/project-workbench/purchase-orders/{orderId}/receipts",
  "/api/project-workbench/purchase-orders/{orderId}/settlement-materials",
  "/api/audit-logs"
];

const missing = requiredPaths.filter((path) => !openapi.includes(`  ${path}:`));
if (missing.length > 0) {
  console.error(`OpenAPI missing required P0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8 paths:\n${missing.join("\n")}`);
  process.exit(1);
}

const requiredPermissionResponses = [
  "/api/roles",
  "/api/role-permissions",
  "/api/system-dictionaries",
  "/api/procurement-requests",
  "/api/procurement-requests/{requestId}",
  "/api/procurement-method-rules",
  "/api/projects/{projectId}/bids/summary",
  "/api/bids/{bidId}/versions",
  "/api/contracts",
  "/api/suppliers/{supplierId}/evaluations",
  "/api/projects/{projectId}/audit-trail",
  "/api/users/{userId}/audit-logs",
  "/api/sensitive-action-logs",
  "/api/result-notification-logs",
  "/api/archive-audit-logs",
  "/api/project-workbench/projects/{projectId}",
  "/api/project-workbench/projects/{projectId}/purchase-orders/generate",
  "/api/project-workbench/purchase-orders/{orderId}/confirm",
  "/api/project-workbench/purchase-orders/{orderId}/receipts",
  "/api/project-workbench/purchase-orders/{orderId}/settlement-materials",
  "/api/audit-logs"
];

function pathBlock(path) {
  const marker = `  ${path}:`;
  const start = openapi.indexOf(marker);
  if (start < 0) return "";
  const next = openapi.indexOf("\n  /", start + marker.length);
  return openapi.slice(start, next < 0 ? openapi.length : next);
}

const permissionMissing = requiredPermissionResponses.filter((path) => !pathBlock(path).includes('"403":'));
if (permissionMissing.length > 0) {
  console.error(`OpenAPI permission-sensitive paths missing 403 responses:\n${permissionMissing.join("\n")}`);
  process.exit(1);
}

const requiredPermissionPhrases = [
  "Expert and admin roles are denied",
  "Supplier, expert and admin roles are denied",
  "System administrator is denied business request content",
  "Experts never receive amount, fileName, responseFileMetadata",
  "Suppliers see only their own enterprise contracts",
  "Only system administrators can read role permission configuration",
  "Expert and system administrator roles are denied the full workbench",
  "Before quote deadline, buyer/group/auditor do not receive amount, fileName, responseFileMetadata",
  "does not implement payment, balance, credit or finance"
];

const missingPhrases = requiredPermissionPhrases.filter((phrase) => !openapi.includes(phrase));
if (missingPhrases.length > 0) {
  console.error(`OpenAPI missing Phase 1 permission boundary descriptions:\n${missingPhrases.join("\n")}`);
  process.exit(1);
}

console.log(`OpenAPI P0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8 + hotel closed-loop path validation passed: ${requiredPaths.length} required paths.`);
