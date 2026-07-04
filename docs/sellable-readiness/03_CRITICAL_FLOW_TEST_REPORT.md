# Sprint 3 Critical Flow Test Report

- Generated at: 2026-07-04T18:51:08.219Z
- Focused existing tests: p0-permissions.test.ts, m6c-final-security-ops.test.ts, r10-final-uat-production.test.ts, phase3-bidding.test.ts, phase4-expert-review.test.ts, phase5-award-result.test.ts, r6-order-fulfillment.test.ts, r7-settlement-finance.test.ts, m4d-fulfillment-settlement-archive-process.test.ts.
- Sprint 3 focused verification passed locally: sellable-critical-boundaries.test.ts (9 tests) and affected boundary suite p0-permissions.test.ts, phase4-expert-review.test.ts, phase8-archive-audit.test.ts, phase11-hotel-closed-loop.test.ts, sellable-critical-boundaries.test.ts (50 tests).
- Current full-suite result must be read from 03_SELLABLE_CHECK_REPORT.md after sellable:check runs.

| Critical action | Focused evidence |
| --- | --- |
| supplier.submit_bid | phase3-bidding.test.ts; sellable-critical-boundaries.test.ts |
| bid.lock_or_close | phase3-bidding.test.ts; m4b-sourcing-process.test.ts; sellable-critical-boundaries.test.ts |
| expert.submit_score | phase4-expert-review.test.ts; p0-permissions.test.ts; sellable-critical-boundaries.test.ts |
| award.submit_approval | phase5-award-result.test.ts; sellable-critical-boundaries.test.ts |
| award.publish_result | phase5-award-result.test.ts; sellable-critical-boundaries.test.ts |
| archive.seal_project | phase8-archive-audit.test.ts; phase11-hotel-closed-loop.test.ts; p0-permissions.test.ts; sellable-critical-boundaries.test.ts |
| order.confirm_or_receive | r6-order-fulfillment.test.ts; phase11-hotel-closed-loop.test.ts; sellable-critical-boundaries.test.ts |
| settlement.submit_or_approve | r7-settlement-finance.test.ts; r8-workflow-task-notification.test.ts; sellable-critical-boundaries.test.ts |
| fulfillment.acceptance_confirm | phase9-full-flow.test.ts; sellable-critical-boundaries.test.ts |

## Boundary Coverage

| Boundary | Coverage expectation |
| --- | --- |
| Supplier isolation | Supplier can only access own supplier data, own bid files and own order/settlement records. |
| Bid confidentiality | Amounts/files remain hidden before cutoff unless abnormal view approval allows scoped metadata. |
| Expert scoring isolation | Expert can only score assigned sheets and locked scores cannot be directly overwritten. |
| Audit read-only | Auditor can inspect scoped evidence but cannot mutate business objects. |
| Archive seal | Sealed archive items reject direct update and require supplement workflow where applicable; seal requires closeout state. |
| Admin boundary | System admin is restricted to config/account management and cannot read/mutate business payloads. |
