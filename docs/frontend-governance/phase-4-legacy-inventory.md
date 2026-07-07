# Phase 4 React Directory Productization

## Current Productized Entrypoints

- `apps/web/src/gemini-react/core/` owns the governed React shell, runtime provider, route rendering, and error-boundary entry.
- `apps/web/src/gemini-react/features/` owns business views, business components, and reference data used by the current React modules.
- `apps/web/src/gemini-react/shared/` owns shared types, UI primitives, and formatting utilities.
- `apps/web/src/gemini-react/legacy/legacy-inventory.ts` records any remaining legacy implementation scope.

## Legacy Scope

- The previous temporary React implementation directory has been physically removed from the formal React tree.
- `reactLegacyInventory` is currently empty.
- Vue business pages are still retained because Route Matrix keeps business routes as `hybrid` and `canRemoveVue === false`.
