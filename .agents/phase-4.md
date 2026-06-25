# Phase 4 Agent Notes

## Scope

Phase 4 initializes the formal MVP skeleton for expert review, scoring summary and review report freeze.

Included:
- Expert directory and project assignment records.
- Mock draw, appointed expert and replacement flows with mandatory reasons.
- Expert avoidance, discipline and confidentiality confirmations.
- Expert-only scoring sheets with submit-lock and reevaluation versions.
- Buyer/group-manager scoring summary and review report snapshot/freeze.
- External-trade blocking for internal expert review actions.

Excluded:
- Award approval and result notification.
- Contract, performance, supplier evaluation and archive closeout.
- CA, e-signature, opening hall, decrypt ceremony, trusted timestamp and tamper-proof evidence.

## Verification Targets

- `npm run typecheck`
- `npm run test:api`
- `npm run openapi:validate`
- `npm run build`
- HTTP smoke for `/expert-review` and `/expert-scoring`
