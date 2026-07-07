# Phase 0 Baseline: Frontend Fusion Governance

## Branch Baseline

- Baseline branch: `codex/gemini-frontend-integration`
- Governance branch: `codex/gemini-frontend-governance`
- Plan document: `docs/frontend-fusion-commercial-governance-plan.md`

## Current Mixed Architecture

- `apps/web/src/App.vue` is still the Vue runtime shell. It owns session bootstrap, route guard enforcement, role switch, notification loading, layout selection, and the React mount decision.
- `apps/web/src/router/index.ts` still registers the Vue Router route table and keeps redirects for legacy route names.
- `apps/web/src/permissions/role-model.ts` is the role, menu, title, route access, and role-home authority.
- `apps/web/src/gemini-react/GeminiShellBridge.vue` mounts the React shell from Vue.
- `apps/web/src/gemini-react/prototype/` contains the current Gemini React business UI and still includes prototype-local menu and data assumptions that must be governed before page migration can be considered commercial-ready.

## Phase 0 Gate

- Current workspace preserved without reset, checkout, or revert of uncommitted files.
- New branch `codex/gemini-frontend-governance` was created from `codex/gemini-frontend-integration`.
- The mixed frontend state is recorded here before Phase 1 governance assets are introduced.
