# Phase 3 Agent Configuration: Bidding, Locking And Confidential View

## Phase Goal

Implement the formal MVP skeleton for supplier bidding, bid withdrawal/resubmission, bid cutoff locking, pre-deadline confidentiality and abnormal bid-view approval.

## Main Agent Responsibilities

- Reuse the existing P0 bid confidentiality policy and abnormal view approval skeleton.
- Add only Phase 3 bid workflow behavior; do not add encrypted bid packages, opening hall, decryption ceremony, CA, e-signature, trusted timestamp or real external integration.
- Preserve Phase 0/1/2 tests and keep `demo/` unchanged.

## code-mapper

Read-only responsibilities:

- Locate existing `bid-routes`, `bid-view-routes`, `bid-confidentiality-policy`, seed and tests.
- Identify reuse points for supplier bid isolation, pre-deadline secrecy and `internal_bid` external-trade blocking.
- Report missing bid write and lock workflow before implementation.

## backend-slice-implementer

Responsible files:

- `apps/api/src/types.ts`
- `apps/api/src/seed/data.ts`
- `apps/api/src/routes/bid-routes.ts`
- `apps/api/src/routes/bid-view-routes.ts`
- `apps/api/src/policies/bid-confidentiality-policy.ts`
- `apps/api/tests/phase3-bidding.test.ts`

Deliverables:

- Bid draft, submit, withdraw, resubmit, lock and version trace APIs.
- Pre-deadline desensitized summary for buyer/group/auditor.
- Supplier self-scope bid reads and writes.
- Abnormal view approval role control, content-scope control, expiry and download limits.
- Audit logs for sensitive actions and denials.

## frontend-slice-implementer

Responsible files:

- `apps/web/src/router/index.ts`
- `apps/web/src/App.vue`
- `apps/web/src/permissions/index.ts`
- `apps/web/src/pages/BiddingPage.vue`
- `apps/web/src/pages/BidControlPage.vue`
- `apps/web/src/styles.css`

Deliverables:

- Supplier bidding page.
- Bid lock, summary and abnormal view approval page.

## boundary-risk-reviewer

Read-only checks:

- Suppliers cannot see or modify other suppliers' bids.
- Buyer/group/auditor cannot see amount or response file before cutoff without valid approval.
- Expert and admin roles remain blocked from bid business data.
- Approval scope includes content type, target supplier, validity window and download flag.
- Locked bids cannot be modified.
- External-trade projects cannot create internal bids.

## Phase Gate

Must pass:

- `npm run typecheck`
- `npm run test:api`
- `npm run openapi:validate`
- `npm run build`
- API health and at least one Phase 3 page smoke check
