# Sprint 7 Page Templates

## Workbench

- Header: role-specific title, health/status indicator and current responsibility.
- Primary surface: KPI summary using `SummaryCards`.
- Role workbench: `ActionCard` sections for today's focus, risk signals, actions and permission boundaries.
- Supporting tables: todo and activity tables with status tags and clear row actions.

## List Page

- `PageHeader` with business context.
- `FilterBar` for keyword/status/type filters.
- `EnterpriseSurface` containing `DataTable`.
- Empty rows use `eds-state` instead of a plain text row.
- `PaginationBar` remains visible for table rhythm.

## Detail Page

- `PageHeader` with business ID and status.
- `EnterpriseTabs` for detail/history/attachments/logs.
- `SplitDetailLayout` for main content plus risk/process/audit side rail.
- `SummaryCards` for project/request/settlement overview.

## Form Page

- `FormSection` for grouped inputs.
- `SubmitPanel` for persistent action area.
- `FeedbackMessage`, `ErrorState` and `PermissionState` for business-readable feedback.

## Flow Page

- `ProcessStepBar`, `BusinessTimeline`, `RiskAlertPanel` and `AuditRail` are available for sourcing, fulfillment, settlement and archive flows.
