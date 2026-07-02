# Sprint 3 Critical Flow Report

- Generated at: 2026-07-02T16:54:02.617Z
- R8 Workflow remains the execution source.
- Process Layer and BPMN are kept in shadow/configuration roles only.

| Critical action | Primary location | Required guard evidence |
| --- | --- | --- |
| supplier.submit_bid | apps/api/src/routes/bid-routes.ts | assertSupplierCanBid, assertSupplierBidOwner, bid confidentiality policy |
| bid.lock_or_close | apps/api/src/routes/bid-routes.ts | buyer role, cutoff/lock guards, audit events |
| expert.submit_score | apps/api/src/routes/expert-review-routes.ts | assignment ownership, confidentiality confirmation, scoring lock guards |
| award.submit_approval | apps/api/src/routes/award-routes.ts | award maintainer guard, review freeze, R8 approval |
| award.publish_result | apps/api/src/routes/award-routes.ts | approval status guard and supplier self visibility |
| archive.seal_project | apps/api/src/routes/archive-routes.ts | archive maintainer/auditor boundaries and sealed-write denial |
| order.confirm_or_receive | apps/api/src/routes/mall-routes.ts / contract-performance-routes.ts | supplier/hotel buyer ownership and order status checks |
| settlement.submit_or_approve | apps/api/src/routes/settlement-finance-routes.ts | supplier/finance roles and amount/material checks |
| fulfillment.acceptance_confirm | apps/api/src/routes/contract-performance-routes.ts | acceptance role and supplier/order scope checks |

## Status Write Convergence

The inventory focuses review on route-level status mutations. High-risk actions must remain behind backend role checks, supplier/expert/org scope checks, bid confidentiality, attachment policies, audit logging and workflow/state preconditions. No repository SQL persistence line is treated as a risky direct business-status change.
