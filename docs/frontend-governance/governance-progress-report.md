# Frontend Governance Progress Report

## Completed Phases

### Phase 0: Branch and Baseline

- Branch `codex/gemini-frontend-governance` was created from `codex/gemini-frontend-integration`.
- `docs/frontend-fusion-commercial-governance-plan.md` exists and was used as the execution baseline.
- Current mixed architecture was recorded in `docs/frontend-governance/phase-0-baseline.md`.

Gate result: PASS.

### Phase 1: Governance Foundation

- Added System Registry, Route Matrix, Feature Flags, Frontend State Contract, API Contracts, Migration Controller, Observability, Menu Adapter, and Migration Dashboard baseline.
- `role-model.ts -> menu-adapter -> System Registry -> React Shell` now governs the React Shell menu path.
- Route Matrix covers all 51 Vue Router routes.
- React Shell no longer exposes independent `getRoleMenus` as its permission/menu truth source.

Gate result: PASS.

### Phase 2: First Core React Business Modules

Covered first batch:

- Dashboard / 工作台
- Procurement / 采购申请
- Workbench / 项目工作台

Changes:

- Dashboard, procurement request, project list/detail/sourcing/fulfillment paths now use contract view models.
- Customer-visible mock/demo/prototype wording was cleared from the first-batch target pages.
- Route Matrix marks first-batch routes as Phase 2 and API/contract ready while keeping Vue removal blocked.
- Governance check includes role smoke for `group_manager`, `buyer`, and `hotel_buyer`.

Gate result: PASS.

### Phase 3: One-way Bridge

- React to Vue output was reduced to `navigate(path)`, `logout()`, and `reportError(error)`.
- React business code no longer exposes view/project-id callbacks to Vue.
- Static search found no direct `vue-router`, Vue store, or `useSessionStore` use under `apps/web/src/gemini-react`.

Gate result: PASS.

### Phase 4: React Directory Productization

Completed:

- Moved the former temporary React implementation into `gemini-react/core/`, `gemini-react/features/`, and `gemini-react/shared/`.
- `GeminiShellApp.tsx` uses `core/GovernedReactShell.tsx` as the formal render entry.
- `GeminiStandaloneViewBridge.vue` now imports from `shared/` and `features/`.
- `apps/web/src/gemini-react/prototype/` has been removed.
- `apps/web/src/gemini-react/legacy/legacy-inventory.ts` is currently an empty structured inventory.

Gate result: PASS.

## Stopped Before Phase 5

No Vue business page was deleted.

Reason:

- Route Matrix still has `canRemoveVue === false` for all business routes.
- Migration Controller would block Vue removal.
- Vue cleanup must wait for route-level React ownership and deletion evidence.

Phase 5 deletion-gate evidence is recorded in `docs/frontend-governance/phase-5-deletion-gate-report.md`.

## Verification

- `npm.cmd --workspace @eprocurement/web run typecheck`: PASS
- `npm.cmd run frontend:governance-check`: PASS
- `npm.cmd run build`: PASS
- Target-page visible `mock/demo/prototype/演示` scan: PASS for Phase 2 target pages
- React-to-Vue bridge static search: PASS
- React productized directory check: PASS

Known warning:

- Vite still reports a large bundle chunk warning after production build. This is not a functional build failure.

## Current Readiness Judgment

- Internal Demo: CONDITIONAL_GO
- Sales Demo: CONDITIONAL_GO
- Controlled Trial: NO_GO
- Production: NO_GO
