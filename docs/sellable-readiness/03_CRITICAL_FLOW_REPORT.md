# Sprint 3 Critical Flow Report

- Generated at: 2026-07-06T13:04:12.905Z
- R8 Workflow remains the execution source.
- Process Layer and BPMN are kept in shadow/configuration roles only.

| Critical action | Primary location | Backend boundary | Sprint 3 hardening/evidence | Test evidence | Decision |
| --- | --- | --- | --- | --- | --- |
| supplier.submit_bid | apps/api/src/routes/bid-routes.ts | Supplier role, supplier admission, registration qualification, owner scope, deadline guard, external-trade block, audit and bid version. | Existing guard chain retained; no production execution source was changed. | phase3-bidding.test.ts; sellable-critical-boundaries.test.ts | PASS |
| bid.lock_or_close | apps/api/src/routes/bid-routes.ts | Procurement maintainer role, project visibility, cutoff/deadline precondition, locked bid immutability, audit and event. | Existing cutoff/lock guards retained; downstream expert review still requires locked bidding state. | phase3-bidding.test.ts; m4b-sourcing-process.test.ts; sellable-critical-boundaries.test.ts | PASS |
| expert.submit_score | apps/api/src/routes/expert-review-routes.ts | Assigned expert scope, avoidance/discipline/confidentiality confirmations, locked-sheet protection, mutable report guard and audit. | Reevaluation request/approval roles were split from general review management so group approvers can approve without broadening all review actions. | phase4-expert-review.test.ts; p0-permissions.test.ts; sellable-critical-boundaries.test.ts | PASS |
| award.submit_approval | apps/api/src/routes/award-routes.ts | Award maintainer role, frozen review/comparison source, candidate supplier validation, non-lowest reason, R8 approval start and audit. | Existing R8 approval submission path retained. | phase5-award-result.test.ts; sellable-critical-boundaries.test.ts | PASS |
| award.publish_result | apps/api/src/routes/award-routes.ts | Award maintainer role, approved award approval, supplier-self recipient isolation, audit and notification event. | Hardened with formal workflow/submitted approval check before result notifications can be sent. | phase5-award-result.test.ts; sellable-critical-boundaries.test.ts | PASS |
| archive.seal_project | apps/api/src/routes/archive-routes.ts; apps/api/src/routes/project-workbench-routes.ts | Archive maintainer role, derived archive completeness, closeout-ready project state, sealed-item immutability, supplement workflow and audit. | Hardened with fulfillment/evaluation closeout precondition before archive seal. | phase8-archive-audit.test.ts; phase11-hotel-closed-loop.test.ts; p0-permissions.test.ts; sellable-critical-boundaries.test.ts | PASS |
| order.confirm_or_receive | apps/api/src/routes/mall-routes.ts; apps/api/src/routes/project-workbench-routes.ts | Supplier ownership for confirm, buyer/org scope for receive, order state machine, quantity checks, attachment/file scope and audit. | Existing mall/project-workbench order state guards retained. | r6-order-fulfillment.test.ts; phase11-hotel-closed-loop.test.ts; sellable-critical-boundaries.test.ts | PASS |
| settlement.submit_or_approve | apps/api/src/routes/settlement-finance-routes.ts | Bill scope, supplier/finance/procurement role checks, received-order/material amount checks, R8 approval start/action, audit and event. | Existing repository state preconditions retained; route-level audit and workflow hooks remain. | r7-settlement-finance.test.ts; r8-workflow-task-notification.test.ts; sellable-critical-boundaries.test.ts | PASS |
| fulfillment.acceptance_confirm | apps/api/src/routes/contract-performance-routes.ts | Contract/project scope, procurement maintainer role, record type validation, active performance node and contract status precondition, audit. | Hardened to reject acceptance/payment records before active contract performance exists. | phase9-full-flow.test.ts; sellable-critical-boundaries.test.ts | PASS |

## Status Write Convergence

The inventory focuses review on route-level status mutations. High-risk actions must remain behind backend role checks, supplier/expert/org scope checks, bid confidentiality, attachment policies, audit logging and workflow/state preconditions. No repository SQL persistence line is treated as a risky direct business-status change.

## Sprint 3 Backend Hardening

- award.publish_result now requires an approved award approval with formal workflow/submitted approval evidence before result notifications can be sent.
- archive.seal_project now requires derived archive completeness plus a completed fulfillment/evaluation closeout state before archive sealing.
- fulfillment.acceptance_confirm now rejects acceptance/payment records unless the contract is in active performance/completed state and has a performance node.
- Expert reevaluation request/approval was split from broad review management so group approvers can approve review changes without gaining all review-maintainer actions.
