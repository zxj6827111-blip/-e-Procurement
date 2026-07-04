# Sprint 2 Production Gate Report

- Generated at: 2026-07-04T17:19:55.897Z
- Evaluated mode: production
- Result: FAIL
- Failures: 15

| Check | Status | Message |
| --- | --- | --- |
| app_env | PASS | APP_ENV must be production for production gate; evaluated production. |
| mock_auth_disabled | FAIL | DISABLE_MOCK_AUTH=true is required in production. |
| local_password_disabled | FAIL | ALLOW_LOCAL_PASSWORD_LOGIN=false is required in production. |
| seed_disabled | FAIL | APP_SEED_ON_BOOT=false is required in production. |
| cookie_secure | FAIL | SESSION_COOKIE_SECURE=true is required in production. |
| session_secret | FAIL | SESSION_SECRET must be non-placeholder and at least 32 characters. |
| cors_whitelist | FAIL | CORS_ALLOWED_ORIGINS must be explicit in production. |
| workflow_source | PASS | R8 Workflow must remain the primary execution source. |
| process_layer_shadow | PASS | Process Layer must not be production execution. |
| bpmn_not_production | PASS | BPMN pilot must not be production execution. |
| production_database | FAIL | Formal production requires a customer-approved non-SQLite database and DATABASE_URL. |
| file_storage | FAIL | Formal production requires object storage or approved file-service storage, not local file storage. |
| antivirus | FAIL | Production file uploads require antivirus scan adapter evidence. |
| integration_sso | FAIL | Production requires configured and verified sso integration evidence. |
| integration_oa | FAIL | Production requires configured and verified oa integration evidence. |
| integration_erp | FAIL | Production requires configured and verified erp integration evidence. |
| integration_wms | FAIL | Production requires configured and verified wms integration evidence. |
| integration_finance | FAIL | Production requires configured and verified finance integration evidence. |
| integration_fileService | FAIL | Production requires configured and verified fileService integration evidence. |

## Boundary

This gate intentionally keeps Production at NO_GO unless real customer SSO/OA/ERP/WMS/Finance/file-service, production database, object storage, upload scanning and backup/restore evidence exist. Local/test mock capability is not removed; it must stay isolated outside production.
