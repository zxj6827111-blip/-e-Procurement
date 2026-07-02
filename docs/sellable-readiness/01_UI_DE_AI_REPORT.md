# Sprint 1 UI De-AI Report

- Generated at: 2026-07-02T00:00:00.000Z
- Scope: customer-visible UI copy, local/test account entry wording, integration boundary wording and API messages that can surface to users.
- Result: PASS after `npm run ui:copy-scan`.

## Completed Changes

| Area | Change |
| --- | --- |
| Login and role entry | Replaced demo-facing labels with local verification / trial-account wording while keeping local/test account capability. |
| Role navigation | Extracted role labels, menu entries, route access rules, titles and role home rules into `apps/web/src/permissions/role-model.ts`. |
| Integration boundary | Replaced visible "联调" copy with "集成/集成验证" language and kept adapter boundary disclaimers conservative. |
| Supplier pages | Replaced "治理" customer-facing copy with "管理/档案" wording. |
| Permission pages | Replaced "治理" copy with "管理" wording where customer-facing. |
| API messages | Removed P0 whitelist / Mock / Demo wording from user-facing error messages while leaving local/test mock endpoints intact. |

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run ui:copy-scan` | PASS | `docs/sellable-readiness/01_UI_COPY_SCAN_REPORT.md` |

## Remaining Notes

- Code identifiers such as mock route names, local storage keys and compatibility-only endpoint names remain because local/test capability must not be deleted.
- R8 / Process / BPMN names remain in internal workflow and configuration surfaces; they are not used to claim Production Go.
