# UI Commercial Check Report

- Generated at: 2026-07-07T00:06:56.232Z
- Result: PASS
- Pass: 51
- Failures: 0
- TODO / blocker records: 0

| Check | Status | Evidence |
| --- | --- | --- |
| token:color.primary | PASS | apps/web/src/design-system/tokens.json -> color.primary |
| token:color.accent | PASS | apps/web/src/design-system/tokens.json -> color.accent |
| token:color.sidebar | PASS | apps/web/src/design-system/tokens.json -> color.sidebar |
| token:color.sidebarActiveBorder | PASS | apps/web/src/design-system/tokens.json -> color.sidebarActiveBorder |
| token:color.bg | PASS | apps/web/src/design-system/tokens.json -> color.bg |
| token:color.surface | PASS | apps/web/src/design-system/tokens.json -> color.surface |
| token:typography.fontFamily | PASS | apps/web/src/design-system/tokens.json -> typography.fontFamily |
| token:typography.fontFamilyNumber | PASS | apps/web/src/design-system/tokens.json -> typography.fontFamilyNumber |
| token:shadow.md | PASS | apps/web/src/design-system/tokens.json -> shadow.md |
| token:layout.sidebarWidth | PASS | apps/web/src/design-system/tokens.json -> layout.sidebarWidth |
| token:layout.topbarHeight | PASS | apps/web/src/design-system/tokens.json -> layout.topbarHeight |
| token:density.tableRowHeight | PASS | apps/web/src/design-system/tokens.json -> density.tableRowHeight |
| token:focus.ring | PASS | apps/web/src/design-system/tokens.json -> focus.ring |
| token:rbac-shell-palette | PASS | Design tokens lock the cloud-spruce shell, restrained primary action, sand-gold micro accent, neutral background and fixed shell dimensions. |
| token:restrained-b2b-typography | PASS | Typography prioritizes Chinese system sans fonts and restrained heading weight. |
| shell:topbar-sidebar-rbac | PASS | AppShell uses a fixed topbar + green sidebar RBAC shell instead of the old grouped navigation. |
| role-model:exact-template-matrix | PASS | role-model.ts preserves the role-to-template mapping, per-role bell visibility and supervision-only menus. |
| login:commercial-layout | PASS | Login page keeps the branded split portal layout. |
| login:production-hides-local-access | PASS | Local role quick entry stays hidden in production mode. |
| login:compact-role-selector | PASS | Local role quick entry uses compact account chips instead of a tall test table. |
| component:EmptyState | PASS | apps/web/src/components/base/EmptyState.vue exported from base index. |
| component:ErrorState | PASS | apps/web/src/components/base/ErrorState.vue exported from base index. |
| component:PermissionState | PASS | apps/web/src/components/base/PermissionState.vue exported from base index. |
| component:KpiCard | PASS | apps/web/src/components/base/KpiCard.vue exported from base index. |
| component:ActionCard | PASS | apps/web/src/components/base/ActionCard.vue exported from base index. |
| component:StepList | PASS | apps/web/src/components/base/StepList.vue exported from base index. |
| component:RiskAlertPanel | PASS | apps/web/src/components/base/RiskAlertPanel.vue exported from base index. |
| component:AuditRail | PASS | apps/web/src/components/base/AuditRail.vue exported from base index. |
| component:ActivityRail | PASS | apps/web/src/components/base/ActivityRail.vue exported from base index. |
| component:SplitDetailLayout | PASS | apps/web/src/components/base/SplitDetailLayout.vue exported from base index. |
| component:EnvironmentBadge | PASS | apps/web/src/components/base/EnvironmentBadge.vue exported from base index. |
| component:RoleBadge | PASS | apps/web/src/components/base/RoleBadge.vue exported from base index. |
| component:EnterpriseDialog | PASS | apps/web/src/components/base/EnterpriseDialog.vue exported from base index. |
| state-pages:routed | PASS | Permission denied and not-found state pages stay inside the AppShell flow. |
| dashboard:gemini-workbench-routing | PASS | Dashboard preserves role templates while rendering the Gemini G-Hotel workbench structure for template A. |
| dashboard:quick-action-center | PASS | Dashboard quick-action center combines primary actions with restrained risk reminders. |
| dashboard:gantt-and-shell-styles | PASS | enterprise.css contains the new A/B/C/D template scaffolding, gantt and waterfall patterns. |
| procurement:business-shell | PASS | Procurement requests use a B-template list workspace with compact ledger context and processing rail. |
| bidding:portal-shell | PASS | Supplier bidding exposes a portal-style context shell instead of a generic dashboard card. |
| expert:avoidance-gate | PASS | Expert scoring forces avoidance confirmation before entering the scoring flow. |
| audit:waterfall-view | PASS | Audit landing combines waterfall trace and dense detail table. |
| permissions:matrix-shell | PASS | System settings page frames the permission matrix inside the D-template shell. |
| sellable:commercial-gate | PASS | sellable-readiness aggregation still includes ui:commercial-check. |
| sellable:layout-gate | PASS | sellable-readiness aggregation still includes ui:layout-check. |
| layout-check:script-present | PASS | ui-second-pass-checks.mjs still exposes the browser layout-check entry points for follow-up visual automation. |
| script:ui:terminology-check | PASS | package.json registers ui:terminology-check via scripts/ui-terminology-check.mjs. |
| script:ui:login-role-smoke | PASS | package.json registers ui:login-role-smoke via scripts/ui-second-pass-checks.mjs. |
| script:ui:layout-check | PASS | package.json registers ui:layout-check via scripts/ui-second-pass-checks.mjs. |
| script:ui:visual-review-pack | PASS | package.json registers ui:visual-review-pack via scripts/ui-second-pass-checks.mjs. |
| docs:visual-report | PASS | docs/sellable-readiness/04_VISUAL_REDESIGN_REPORT.md exists. |
| docs:commercial-report | PASS | docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md exists. |

## Scope Boundary

This check validates the RBAC shell, low-saturation enterprise token system, the four landing templates, and key page-shell evidence only. It does not weaken production readiness, route access, API tests, sellable readiness gates, or process-layer evidence.
