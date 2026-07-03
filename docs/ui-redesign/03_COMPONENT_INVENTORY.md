# Sprint 6 Component Inventory

## Existing Components Upgraded

- `PageHeader`
- `EnterpriseSurface`
- `EnterpriseButton`
- `DataTable`
- `FilterBar`
- `FormSection`
- `StatusTag`
- `SummaryCards`
- `FeedbackMessage`
- `PaginationBar`
- `EnterpriseDialog`
- `EnterpriseTabs`
- `SubmitPanel`

## New Components

- `KpiCard`
- `ActionCard`
- `ProcessStepBar`
- `RiskAlertPanel`
- `PageSection`
- `EmptyState`
- `PermissionState`
- `ErrorState`
- `AuditRail`
- `BusinessTimeline`
- `EnvironmentBadge`
- `RoleBadge`
- `SplitDetailLayout`

## Usage Rule

New page work should prefer exported components from `apps/web/src/components/base/index.ts` and token-backed `eds-`/`enterprise-` classes. Page-specific custom classes remain discouraged unless added to the design system.
