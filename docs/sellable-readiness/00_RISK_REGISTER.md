# Preflight Risk Register

- Generated at: 2026-07-02T16:28:18.033Z

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Full npm test suite has existing failures. | High | Do not delete tests or lower permission/security checks; record as blocker unless safely fixed. |
| Production external integrations are contract boundaries only. | High | Production remains NO_GO without customer SSO/OA/ERP/WMS/Finance/file-service evidence. |
| SQLite/local file storage are local/UAT posture. | High | Production gate requires formal database and object/file-service storage evidence. |
| Frontend navigation can hide backend capabilities but cannot be security truth. | Medium | Keep backend guards for permissions, data scope, field visibility, attachment download and status transitions. |
| Process Layer/BPMN shadow could be misrepresented as production execution. | High | Production gate enforces R8 Workflow as execution source and blocks BPMN production mode. |
| CodeGraph index is not initialized in this workspace. | Low | Use local search and existing code evidence; initialize CodeGraph only if the user later approves. |
