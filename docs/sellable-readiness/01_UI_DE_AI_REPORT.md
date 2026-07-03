# Sprint 1 UI De-AI Report

- Generated at: 2026-07-03T02:02:00+08:00
- Scope: customer-visible UI copy, role navigation, role home/workbench content, empty/error/permission-state wording and API messages that can surface to users.
- Result: PASS for Sprint 1 acceptance commands after role workbench completion.

## Completed Changes

| Area | Change |
| --- | --- |
| Login and role entry | Replaced demo-facing labels with local verification / trial-account wording while keeping local/test account capability. |
| Role navigation | Extracted role labels, menu entries, route access rules, titles and role home rules into `apps/web/src/permissions/role-model.ts`. |
| Role workbench | Added role-specific workbench content for group manager, buyer, hotel buyer, finance, platform operator, supplier, supplier admin, supplier quotation, expert, finance reviewer, auditor and admin. Each home page now shows today focus, risk signals, allowed actions and denied business boundaries. |
| Commercial empty states | Replaced the generic dashboard empty messages with role-specific business explanations and changed the DataTable fallback from `暂无数据` to a customer-readable business-record message. |
| Integration boundary | Replaced visible "联调" copy with "集成/集成验证" language and kept adapter boundary disclaimers conservative. |
| Supplier pages | Replaced "治理" customer-facing copy with "管理/档案" wording. |
| Permission pages | Replaced "治理" copy with "管理" wording where customer-facing. |
| API messages | Removed P0 whitelist / Mock / Demo wording from user-facing error messages while leaving local/test mock endpoints intact. |

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | API and web type checks passed after role workbench changes. |
| `npm run ui:scan:test` | PASS | UI governance regression tests passed. |
| `npm run ui:scan` | PASS | UI governance scan passed with the new `eds-` workbench classes. |
| `npm run ui:copy-scan` | PASS | `docs/sellable-readiness/01_UI_COPY_SCAN_REPORT.md` |
| `npm run ui:smoke` | PASS | Browser smoke loaded dashboard and all classified routes on the live Vite service. |
| `npm run ui:role-flow` | PASS | End-to-end role flow and role menu checks passed on the live Vite service. |
| `npm run build` | PASS | API and web production build passed; Vite retained the existing large chunk warning. |

## Remaining Notes

- Code identifiers such as mock route names, local storage keys and compatibility-only endpoint names remain because local/test capability must not be deleted.
- R8 / Process / BPMN names remain in internal workflow and configuration surfaces; they are not used to claim Production Go.
- Sprint 1 intentionally keeps the existing design system and base components; this is a role/workflow content upgrade, not a visual-system rebuild.
