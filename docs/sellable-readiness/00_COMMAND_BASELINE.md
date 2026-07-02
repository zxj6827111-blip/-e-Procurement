# Preflight Command Baseline

- Generated at: 2026-07-02T16:28:18.032Z
- Baseline was captured before sellable-readiness implementation changes.

| Command | Baseline result | Notes |
| --- | --- | --- |
| npm run typecheck | PASS | API and web type checks completed. |
| npm run test | FAIL | Existing baseline failures across procurement request creation, supplier admission/review preconditions, award/archive authorization and several older phase tests. These were not introduced by sellable-readiness edits. |
| npm run openapi:validate | PASS | Required OpenAPI paths validated. |
| npm run ui:scan:test | PASS | UI scan unit check passed. |
| npm run ui:scan | PASS | Existing UI violation scan passed. |
| npm run ui:smoke | PASS | Browser route smoke passed against local API/web services. |
| npm run ui:role-flow | FAIL | Preflight script selected a supplier that current local data had marked restricted; script was later changed to select an admitted supplier dynamically. |
| npm run m6b:backup-restore | PASS | Local/UAT backup restore drill passed; not production backup evidence. |
| npm run m6c:browser-smoke | FAIL | Preflight route expectations still matched old navigation; script was later aligned to the narrowed role entry model. |
