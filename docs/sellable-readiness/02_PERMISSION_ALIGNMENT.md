# Sprint 2 Permission Alignment

- Generated at: 2026-07-06T13:04:10.956Z
- Result: PASS
- Frontend entries that are not represented in backend menu keys: 0

| Role | Status | Frontend menu keys | Backend menus | Frontend only | Backend only |
| --- | --- | --- | --- | --- | --- |
| group_manager | BACKEND_CAPABILITY_HIDDEN | admin, archives, award, bidSecrecy, dashboard, expertReview, myTasks, needs, projects, suppliers | admin, announcements, archives, audit, award, bidSecrecy, contracts, dashboard, expertReview, externalTrade, myTasks, needs, procurementDocuments, projects, registrations, suppliers | - | announcements, audit, contracts, externalTrade, procurementDocuments, registrations |
| buyer | BACKEND_CAPABILITY_HIDDEN | archives, award, contracts, dashboard, expertReview, myTasks, needs, projects | announcements, archives, audit, award, bidSecrecy, contracts, dashboard, expertReview, myTasks, needs, procurementDocuments, projects, registrations, suppliers | - | announcements, audit, bidSecrecy, procurementDocuments, registrations, suppliers |
| hotel_buyer | BACKEND_CAPABILITY_HIDDEN | contracts, dashboard, myTasks, needs, projects | archives, audit, contracts, dashboard, myTasks, needs, projects, suppliers | - | archives, audit, suppliers |
| hotel_finance | BACKEND_CAPABILITY_HIDDEN | contracts, dashboard, myTasks | audit, contracts, dashboard, myTasks | - | audit |
| platform_operator | BACKEND_CAPABILITY_HIDDEN | archives, award, contracts, dashboard, expertReview, myTasks, needs, projects | archives, audit, award, contracts, dashboard, expertReview, myTasks, needs, projects, suppliers | - | audit, suppliers |
| supplier | ALIGNED | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | - | - |
| supplier_admin | ALIGNED | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | - | - |
| supplier_quotation | ALIGNED | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | bidding, contracts, dashboard, myTasks, projects, supplierRegistration, suppliers | - | - |
| expert | BACKEND_CAPABILITY_HIDDEN | dashboard, myTasks | dashboard, expertReview, expertScoring, myTasks, projects | - | expertReview, expertScoring, projects |
| finance_reviewer | BACKEND_CAPABILITY_HIDDEN | contracts, dashboard, myTasks | audit, contracts, dashboard, myTasks | - | audit |
| auditor | BACKEND_CAPABILITY_HIDDEN | admin, archives, audit, award, dashboard, externalTrade, myTasks, needs, suppliers | admin, announcements, archives, audit, award, bidSecrecy, contracts, dashboard, expertReview, externalTrade, myTasks, needs, procurementDocuments, projects, registrations, suppliers | - | announcements, bidSecrecy, contracts, expertReview, procurementDocuments, projects, registrations |
| admin | BACKEND_CAPABILITY_HIDDEN | admin | admin, dashboard | - | dashboard |

## Interpretation

- BACKEND_CAPABILITY_HIDDEN means backend menu capability exists but the current customer-facing navigation intentionally hides it for this role.
- FRONTEND_ENTRY_REVIEW means frontend exposes an entry whose menuKey is not in /me/menus rolePermissions; this is a Sprint 2 blocker.
- PASS means there are no frontend-visible menu entries missing from backend /me/menus. Backend-only capabilities can remain hidden from customer-facing navigation when route guards and action checks still enforce the security boundary.
- This report does not weaken backend authorization. Security remains enforced by backend route guards and policies.
