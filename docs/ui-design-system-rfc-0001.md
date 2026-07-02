# RFC 0001: Enterprise UI Design System Baseline

## Decision

Adopt the custom token-based enterprise design system as the only primary UI system for the Vue 3 + Vite procurement frontend.

## Scope

- `apps/web/src/design-system`
- `apps/web/src/components/base`
- `apps/web/src/layouts`
- page classification and feature-route page migration
- UI platform tooling under `scripts/ui-platform.mjs`

## Governance

Changes to tokens, base components, or layout primitives must update `apps/web/src/design-system/governance.json` and keep the UI validation chain green.

## Validation

- `npm.cmd run ui:platform`
- `npm.cmd run ui:scan`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- browser smoke or visual regression when visible page structure changes
