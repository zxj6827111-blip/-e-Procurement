# Sprint 3 Critical Flow Test Report

- Generated at: 2026-07-02T16:54:02.618Z
- Focused existing tests: p0-permissions.test.ts, m6c-final-security-ops.test.ts, r10-final-uat-production.test.ts, phase3-bidding.test.ts, phase4-expert-review.test.ts, phase5-award-result.test.ts, r6-order-fulfillment.test.ts, r7-settlement-finance.test.ts, m4d-fulfillment-settlement-archive-process.test.ts.
- Current full-suite result must be read from 03_SELLABLE_CHECK_REPORT.md after sellable:check runs.

| Boundary | Coverage expectation |
| --- | --- |
| Supplier isolation | Supplier can only access own supplier data, own bid files and own order/settlement records. |
| Bid confidentiality | Amounts/files remain hidden before cutoff unless abnormal view approval allows scoped metadata. |
| Expert scoring isolation | Expert can only score assigned sheets and locked scores cannot be directly overwritten. |
| Audit read-only | Auditor can inspect scoped evidence but cannot mutate business objects. |
| Archive seal | Sealed archive items reject direct update and require supplement workflow where applicable. |
| Admin boundary | System admin is restricted to config/account management and cannot read/mutate business payloads. |
