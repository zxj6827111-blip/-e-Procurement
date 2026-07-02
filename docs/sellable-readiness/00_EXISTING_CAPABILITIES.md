# Preflight Existing Capabilities

- Generated at: 2026-07-02T16:28:18.027Z
- Branch target: codex/ui-de-ai-sellable-readiness
- Source branch: codex/ui-de-ai

| Area | Observed capability |
| --- | --- |
| Workflow | R8 Workflow is still the primary execution source; Process Layer and BPMN are shadow/configuration only. |
| Runtime health | /health exposes readiness checks for auth, database, file storage, integrations, workflow source and operations. |
| Role isolation | Backend policies exist for supplier data, bid confidentiality, expert assignment, audit-required actions and admin business isolation. |
| UI | Existing enterprise shell, route guards, role-based navigation and browser smoke scripts are available. |
| Operations | OpenAPI validation, backup/restore drill, M6C browser smoke and UI scan scripts are available. |
