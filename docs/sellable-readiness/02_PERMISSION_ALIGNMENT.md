# Sprint 2 Permission Alignment

- Generated at: 2026-07-02T16:54:01.431Z
- Result: NEEDS_REVIEW
- Frontend entries that are not represented in backend menu keys: 5

| Role | Status | Frontend menu keys | Backend menus | Frontend only | Backend only |
| --- | --- | --- | --- | --- | --- |
| group_manager | FRONTEND_ENTRY_REVIEW | admin, archives, award, bidSecrecy, dashboard, expertReview, myTasks, needs, projects, suppliers | announcements, archives, audit, award, bidSecrecy, contracts, dashboard, expertReview, externalTrade, myTasks, procurementDocuments, projects, registrations, suppliers | admin, needs | announcements, audit, contracts, externalTrade, procurementDocuments, registrations |
| buyer | BACKEND_CAPABILITY_HIDDEN | archives, award, contracts, dashboard, expertReview, myTasks, needs, projects | announcements, archives, audit, award, bidSecrecy, contracts, dashboard, expertReview, myTasks, needs, procurementDocuments, projects, registrations, suppliers | - | announcements, audit, bidSecrecy, procurementDocuments, registrations, suppliers |
| hotel_buyer | BACKEND_CAPABILITY_HIDDEN | contracts, dashboard, myTasks, needs, projects | archives, audit, contracts, dashboard, myTasks, needs, projects, suppliers | - | archives, audit, suppliers |
| hotel_finance | BACKEND_CAPABILITY_HIDDEN | contracts, dashboard, myTasks | audit, contracts, dashboard, myTasks | - | audit |
| platform_operator | FRONTEND_ENTRY_REVIEW | archives, award, contracts, dashboard, expertReview, myTasks, needs, projects | archives, audit, contracts, dashboard, myTasks, projects, suppliers | award, expertReview, needs | audit, suppliers |
| supplier | ALIGNED | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | - | - |
| supplier_admin | ALIGNED | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | - | - |
| supplier_quotation | FRONTEND_ENTRY_REVIEW | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | bidding, contracts, dashboard, myTasks, projects, supplierRegistration | suppliers | - |
| expert | BACKEND_CAPABILITY_HIDDEN | dashboard, myTasks | dashboard, expertReview, expertScoring, myTasks, projects | - | expertReview, expertScoring, projects |
| finance_reviewer | BACKEND_CAPABILITY_HIDDEN | contracts, dashboard, myTasks | audit, contracts, dashboard, myTasks | - | audit |
| auditor | FRONTEND_ENTRY_REVIEW | admin, archives, audit, award, dashboard, externalTrade, myTasks, needs, suppliers | announcements, archives, audit, award, bidSecrecy, contracts, dashboard, expertReview, externalTrade, myTasks, needs, procurementDocuments, projects, registrations, suppliers | admin | announcements, bidSecrecy, contracts, expertReview, procurementDocuments, projects, registrations |
| admin | FRONTEND_ENTRY_REVIEW | admin, externalTrade | admin, dashboard | externalTrade | dashboard |

## Interpretation

- BACKEND_CAPABILITY_HIDDEN means backend menu capability exists but the current customer-facing navigation intentionally hides it for this role.
- FRONTEND_ENTRY_REVIEW means frontend exposes an entry whose menuKey is not in /me/menus rolePermissions; review before considering this aligned.
- This report does not weaken backend authorization. Security remains enforced by backend route guards and policies.
