# Sprint 8 Visual Acceptance Checklist

| Area | Status | Evidence |
| --- | --- | --- |
| Design tokens rebuilt | PASS | `npm run ui:tokens` |
| Governance and UI scan | PASS | `npm run ui:governance`, `npm run ui:scan` |
| Login commercial layout | PASS | `LoginPageShell.vue`, visual evidence screenshots |
| AppShell grouped navigation | PASS | `AppShell.vue`, `role-model.ts` |
| Base state components | PASS | Empty/Error/Permission and risk/process/detail components |
| Workbench visual upgrade | PASS | `DashboardRoleWorkbenchSection.vue` |
| Core detail page layout | PASS | request, project, sourcing, fulfillment, settlement shells |
| Supplier portal and expert scoring consistency | PASS | shared `PageHeader`, `EnterpriseSurface`, `SummaryCards`, `StatusTag` |
| Responsive evidence | PASS | `npm run ui:visual-evidence` desktop and mobile screenshots |
| Production readiness boundary | PASS | Production can remain NO_GO for external evidence only |

## Sprint 9-13 TODO / Blocker

- Real production SSO/OA/ERP/WMS/Finance/file-service evidence is not part of Sprint 4-8.
- Production database, object storage, antivirus adapter, backup/restore rehearsal, monitoring and customer UAT signoff remain blockers for Production GO.
