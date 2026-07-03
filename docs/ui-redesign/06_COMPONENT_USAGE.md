# Sprint 6 Component Usage

## Table and List

Use `FilterBar`, `DataTable`, `StatusTag` and `PaginationBar`. Empty rows should rely on the `DataTable` empty state or `EmptyState`.

## Detail

Use `PageHeader`, `EnterpriseTabs`, `SummaryCards` and `SplitDetailLayout`. Place workflow, risk and audit context in the right rail using `RiskAlertPanel`, `ProcessStepBar`, `BusinessTimeline` or `AuditRail`.

## Forms

Use `FormSection` and `SubmitPanel`. Errors should use `FeedbackMessage` or `ErrorState`; permission boundaries should use `PermissionState`.

## Actions

Use `EnterpriseButton`. Supported types are `default`, `primary`, `accent`, `danger` and `text`. Destructive actions should stay behind existing confirmation/business guards.
