# Phase 6 Agent Notes

## Scope

Phase 6 initializes the formal MVP skeleton for external-trade filing.

Included:
- External-trade filing project creation.
- Internal approval evidence record.
- External platform name and external project code registration.
- External announcement and result material metadata records.
- External result filing.
- External-trade block logs.
- Hard blocking for internal announcement, registration, bid, expert review and award actions.

Excluded:
- Real external exchange integration.
- External platform crawling or synchronization.
- Internal announcement, registration, bid, expert review or award for external-trade projects.
- Contract, performance, supplier evaluation and archive closeout.

## Verification Targets

- `npm run typecheck`
- `npm run test:api`
- `npm run openapi:validate`
- `npm run build`
- HTTP smoke for `/external-trade`
