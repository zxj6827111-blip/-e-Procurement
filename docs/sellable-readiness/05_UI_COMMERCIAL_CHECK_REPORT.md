# UI Commercial Check Report

- Generated at: 2026-07-03T15:12:06.563Z
- Result: PASS
- Pass: 40
- Failures: 0
- TODO / blocker records: 0

| Check | Status | Evidence |
| --- | --- | --- |
| token:color.primary | PASS | apps/web/src/design-system/tokens.json -> color.primary |
| token:color.accent | PASS | apps/web/src/design-system/tokens.json -> color.accent |
| token:color.sidebar | PASS | apps/web/src/design-system/tokens.json -> color.sidebar |
| token:color.panel | PASS | apps/web/src/design-system/tokens.json -> color.panel |
| token:color.infoSoft | PASS | apps/web/src/design-system/tokens.json -> color.infoSoft |
| token:color.lockedSoft | PASS | apps/web/src/design-system/tokens.json -> color.lockedSoft |
| token:shadow.md | PASS | apps/web/src/design-system/tokens.json -> shadow.md |
| token:layout.sidebarWidth | PASS | apps/web/src/design-system/tokens.json -> layout.sidebarWidth |
| token:density.tableRowHeight | PASS | apps/web/src/design-system/tokens.json -> density.tableRowHeight |
| token:focus.ring | PASS | apps/web/src/design-system/tokens.json -> focus.ring |
| shell:grouped-navigation | PASS | apps/web/src/layouts/AppShell.vue renders grouped nav, icons, environment badge and role badge. |
| role-model:navigation-metadata | PASS | apps/web/src/permissions/role-model.ts preserves role entries and adds commercial grouping metadata. |
| login:commercial-layout | PASS | apps/web/src/pages/login/LoginPageShell.vue contains branded product login layout. |
| login:production-hides-local-access | PASS | apps/web/src/pages/login/useLoginPage.ts hides local role quick entry when mode is production. |
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
| dashboard:role-workbench | PASS | apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue contains ActionCard, 岗位工作台. |
| request-detail:split-layout | PASS | apps/web/src/pages/procurement-requests/ProcurementRequestDetailShell.vue contains SplitDetailLayout, RiskAlertPanel, 流程进度. |
| project-detail:split-layout | PASS | apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 下一步关注. |
| sourcing:control-panel | PASS | apps/web/src/pages/project-sourcing/SourcingPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 招采控制点. |
| fulfillment:control-panel | PASS | apps/web/src/pages/project-fulfillment/FulfillmentPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 履约与结算关注. |
| settlement:review-sidebar | PASS | apps/web/src/pages/settlement-materials/SettlementPageShell.vue contains SplitDetailLayout, RiskAlertPanel, 结算审核关注. |
| supplier-portal:status-summary | PASS | apps/web/src/pages/supplier-portal/SupplierPortalPageShell.vue contains 供应商门户, SummaryCards, StatusTag. |
| expert-scoring:status-summary | PASS | apps/web/src/pages/expert-scoring/ExpertScoringPageShell.vue contains 专家评分, SummaryCards, StatusTag. |
| archive:audit-summary | PASS | apps/web/src/pages/archive-audit/ArchiveAuditPageShell.vue contains 项目档案与审计, SummaryCards, 只读. |
| audit:table-state | PASS | apps/web/src/pages/audit/AuditPageShell.vue contains 审计日志, DataTable, StatusTag. |
| sellable:commercial-gate | PASS | scripts/sellable-readiness.mjs includes ui:commercial-check in sellable aggregation. |
| visual-evidence:script | PASS | scripts/ui-visual-evidence.mjs and package.json script exist. |
| docs:visual-report | PASS | docs/sellable-readiness/04_VISUAL_REDESIGN_REPORT.md exists. |
| docs:commercial-report | PASS | docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md exists. |

## Scope Boundary

This check validates Sprint 4-8 UI productization evidence only. It does not convert Production NO_GO to Production GO, and it does not weaken role navigation, route access, copy scan, sellable readiness, production gate, Process Layer, Workflow, BPMN shadow or API tests.
