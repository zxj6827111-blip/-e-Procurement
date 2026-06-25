# Phase 2 Agent Configuration: Documents, Announcements And Registration

## Phase Goal

Implement the formal MVP skeleton for procurement document metadata, document versioning, internal announcement/invitation and supplier registration. This phase must keep the Phase 0/1 permission, audit and external-trade boundaries intact.

## Main Agent Responsibilities

- Integrate the backend route, seed state, types, OpenAPI, data dictionary and frontend pages.
- Keep Phase 2 limited to metadata workflows; do not add CA, e-signature, encryption/decryption, trusted timestamp, opening hall, or real external integration.
- Preserve the `demo/` review asset directory unchanged.

## code-mapper

Read-only responsibilities:

- Locate existing Phase 1 project, supplier and external-trade blocking entry points.
- Identify route-level reuse points for `externalTradeBlocking`.
- Confirm supplier self-scope patterns before implementation.

## backend-slice-implementer

Responsible files:

- `apps/api/src/types.ts`
- `apps/api/src/seed/data.ts`
- `apps/api/src/routes/procurement-participation-routes.ts`
- `apps/api/src/app.ts`
- `apps/api/tests/phase2-participation.test.ts`

Deliverables:

- Procurement document create, review, publish-lock and revision APIs.
- Announcement publish and invitation APIs.
- Supplier registration submission, supplier isolation and qualification decision APIs.
- Audit logs for sensitive actions and denials.
- External-trade blocking on internal document, announcement and registration write paths.

## frontend-slice-implementer

Responsible files:

- `apps/web/src/router/index.ts`
- `apps/web/src/App.vue`
- `apps/web/src/permissions/index.ts`
- `apps/web/src/pages/ProcurementDocumentsPage.vue`
- `apps/web/src/pages/AnnouncementsInvitationsPage.vue`
- `apps/web/src/pages/SupplierRegistrationPage.vue`

Deliverables:

- Procurement document management page.
- Announcement and invitation page.
- Supplier registration page using supplier-scoped API calls.

## boundary-risk-reviewer

Read-only checks:

- Locked documents cannot be overwritten in place.
- External-trade projects cannot use internal announcement or registration paths.
- Restricted and unauthorized suppliers cannot register.
- Supplier users cannot view other suppliers' registration material metadata.
- OpenAPI and route allowlists match Phase 2, not later phases.

## Phase Gate

Must pass:

- `npm run typecheck`
- `npm run test:api`
- `npm run openapi:validate`
- `npm run build`
- API health and at least one Phase 2 page smoke check
