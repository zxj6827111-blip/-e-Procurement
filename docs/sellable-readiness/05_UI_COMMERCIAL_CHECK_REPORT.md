# UI Commercial Check Report

- Generated at: 2026-07-04T15:43:01.574Z
- Result: PASS
- Pass: 62
- Failures: 0
- TODO / blocker records: 0

| Check | Status | Evidence |
| --- | --- | --- |
| token:color.primary | PASS | apps/web/src/design-system/tokens.json -> color.primary |
| token:color.accent | PASS | apps/web/src/design-system/tokens.json -> color.accent |
| token:color.sidebar | PASS | apps/web/src/design-system/tokens.json -> color.sidebar |
| token:color.sidebarActive | PASS | apps/web/src/design-system/tokens.json -> color.sidebarActive |
| token:color.sidebarText | PASS | apps/web/src/design-system/tokens.json -> color.sidebarText |
| token:color.panel | PASS | apps/web/src/design-system/tokens.json -> color.panel |
| token:color.infoSoft | PASS | apps/web/src/design-system/tokens.json -> color.infoSoft |
| token:color.lockedSoft | PASS | apps/web/src/design-system/tokens.json -> color.lockedSoft |
| token:typography.fontFamilyNumber | PASS | apps/web/src/design-system/tokens.json -> typography.fontFamilyNumber |
| token:typography.cardTitle | PASS | apps/web/src/design-system/tokens.json -> typography.cardTitle |
| token:shadow.md | PASS | apps/web/src/design-system/tokens.json -> shadow.md |
| token:layout.sidebarWidth | PASS | apps/web/src/design-system/tokens.json -> layout.sidebarWidth |
| token:density.tableRowHeight | PASS | apps/web/src/design-system/tokens.json -> density.tableRowHeight |
| token:focus.ring | PASS | apps/web/src/design-system/tokens.json -> focus.ring |
| token:chinese-b2b-typography | PASS | apps/web/src/design-system/tokens.json prioritizes Chinese system fonts and restrained title weight. |
| token:light-commercial-sidebar | PASS | apps/web/src/design-system/tokens.json sets white sidebar and compact <=232px width. |
| shell:grouped-navigation | PASS | apps/web/src/layouts/AppShell.vue renders grouped nav and removes single-character nav icon slots. |
| role-model:navigation-metadata | PASS | apps/web/src/permissions/role-model.ts preserves role entries and grouping metadata without single-character icons. |
| login:commercial-layout | PASS | apps/web/src/pages/login/LoginPageShell.vue contains branded product login layout. |
| login:production-hides-local-access | PASS | apps/web/src/pages/login/useLoginPage.ts hides local role quick entry when mode is production. |
| login:compact-role-selector | PASS | apps/web/src/pages/login/DemoAccountTable.vue uses a compact role selector instead of a tall account table. |
| login:required-local-roles | PASS | apps/web/src/pages/login/display.ts includes all required Local/UAT validation roles. |
| component:EmptyState | PASS | apps/web/src/components/base/EmptyState.vue exported from base index. |
| component:ErrorState | PASS | apps/web/src/components/base/ErrorState.vue exported from base index. |
| component:PermissionState | PASS | apps/web/src/components/base/PermissionState.vue exported from base index. |
| component:KpiCard | PASS | apps/web/src/components/base/KpiCard.vue exported from base index. |
| component:ActionCard | PASS | apps/web/src/components/base/ActionCard.vue exported from base index. |
| component:ProcessStepBar | PASS | apps/web/src/components/base/ProcessStepBar.vue exported from base index. |
| component:RiskAlertPanel | PASS | apps/web/src/components/base/RiskAlertPanel.vue exported from base index. |
| component:AuditRail | PASS | apps/web/src/components/base/AuditRail.vue exported from base index. |
| component:BusinessTimeline | PASS | apps/web/src/components/base/BusinessTimeline.vue exported from base index. |
| component:SplitDetailLayout | PASS | apps/web/src/components/base/SplitDetailLayout.vue exported from base index. |
| component:EnvironmentBadge | PASS | apps/web/src/components/base/EnvironmentBadge.vue exported from base index. |
| component:RoleBadge | PASS | apps/web/src/components/base/RoleBadge.vue exported from base index. |
| state-pages:routed | PASS | Dedicated permission denied and not-found/error state pages are routed through AppShell. |
| dashboard:role-workbench | PASS | apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue contains 风险提醒, 常用操作, eds-workbench-side. |
| dashboard:information-architecture | PASS | apps/web/src/pages/dashboard/DashboardPageShell.vue contains eds-workbench-layout, DashboardTodoSection, DashboardActivitySection, DashboardRoleWorkbenchSection. |
| request-detail:split-layout | PASS | apps/web/src/pages/procurement-requests/ProcurementRequestDetailShell.vue contains SplitDetailLayout, RiskAlertPanel, 流程进度. |
| project-detail:split-layout | PASS | apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 下一步关注. |
| sourcing:control-panel | PASS | apps/web/src/pages/project-sourcing/SourcingPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 招采控制点. |
| fulfillment:control-panel | PASS | apps/web/src/pages/project-fulfillment/FulfillmentPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 履约与结算关注. |
| settlement:review-sidebar | PASS | apps/web/src/pages/settlement-materials/SettlementPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 结算审核关注. |
| supplier-portal:status-summary | PASS | apps/web/src/pages/supplier-portal/SupplierPortalPageShell.vue contains 供应商门户, eds-business-context, eds-ledger-strip, StatusTag. |
| expert-scoring:status-summary | PASS | apps/web/src/pages/expert-scoring/ExpertScoringPageShell.vue contains 评分工作台, 评分台账, StatusTag. |
| archive:audit-summary | PASS | apps/web/src/pages/archive-audit/ArchiveAuditPageShell.vue contains 项目档案与审计, SummaryCards, 只读. |
| audit:table-state | PASS | apps/web/src/pages/audit/AuditPageShell.vue contains 审计日志, DataTable, StatusTag. |
| dashboard:not-function-matrix | PASS | DashboardRoleWorkbenchSection no longer renders the old four-card function matrix. |
| sellable:commercial-gate | PASS | scripts/sellable-readiness.mjs includes ui:commercial-check in sellable aggregation. |
| visual-evidence:script | PASS | scripts/ui-visual-evidence.mjs and package.json script exist. |
| third-pass:plan-exists | PASS | Third-pass visual correction plan records the human-review gap and stricter acceptance rules. |
| third-pass:portal-login | PASS | Login is constrained as a portal-style panel instead of a floating marketing card. |
| third-pass:workbench-anti-template | PASS | Workbench removes horizontal table overflow, badge-stack risks and stacked action buttons. |
| third-pass:layout-gate-strengthened | PASS | ui:layout-check now blocks obvious AI-template regressions. |
| fourth-pass:plan-exists | PASS | Fourth-pass productization plan records key business-page scope and human-review acceptance. |
| fourth-pass:business-context | PASS | Fourth-pass key project pages use business context and ledger-style summaries. |
| fourth-pass:expert-supplier-productized | PASS | Expert scoring and supplier portal now expose real business context instead of generic card scaffolding. |
| fourth-pass:visual-pack-key-business-pages | PASS | Visual review pack captures project detail, sourcing detail and fulfillment detail pages. |
| script:ui:login-role-smoke | PASS | package.json registers ui:login-role-smoke via scripts/ui-second-pass-checks.mjs. |
| script:ui:layout-check | PASS | package.json registers ui:layout-check via scripts/ui-second-pass-checks.mjs. |
| script:ui:visual-review-pack | PASS | package.json registers ui:visual-review-pack via scripts/ui-second-pass-checks.mjs. |
| docs:visual-report | PASS | docs/sellable-readiness/04_VISUAL_REDESIGN_REPORT.md exists. |
| docs:commercial-report | PASS | docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md exists. |

## Scope Boundary

This check validates Sprint 4-8 UI productization evidence only. It does not convert Production NO_GO to Production GO, and it does not weaken role navigation, route access, copy scan, sellable readiness, production gate, Process Layer, Workflow, BPMN shadow or API tests.
