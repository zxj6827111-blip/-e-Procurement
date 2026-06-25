# Phase 7 Agent Notes

## Scope

Phase 7 initializes the formal MVP skeleton for contract ledger, performance nodes, acceptance/payment records and supplier evaluation.

Included:
- Contract ledger registration from procurement result.
- Contract system link and attachment metadata only.
- Performance node creation and status updates.
- Acceptance/payment metadata records.
- Supplier evaluation history and supplier profile score update.
- Supplier self-only visibility for contract/performance/evaluation data.
- External-trade projects entering contract/performance/evaluation path.

Excluded:
- Contract body editing.
- Contract approval.
- Contract signing.
- E-signature.
- Replacing contract, OA or finance systems.

## Verification Targets

- `npm run typecheck`
- `npm run test:api`
- `npm run openapi:validate`
- `npm run build`
- HTTP smoke for `/contract-performance`
