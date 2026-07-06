# Sprint 3 Sellable Check Report

- Generated at: 2026-07-06T13:07:08.846Z
- Overall status: CONDITIONAL_GO
- Blocking/failed commands: 0
- Fail-closed production gates: 1

| Command | Status | Exit | Signal/Error |
| --- | --- | --- | --- |
| npm run typecheck | PASS | 0 | - |
| npm run test | PASS | 0 | - |
| npm run openapi:validate | PASS | 0 | - |
| npm run ui:scan:test | PASS | 0 | - |
| npm run ui:scan | PASS | 0 | - |
| npm run ui:copy-scan | PASS | 0 | - |
| npm run ui:terminology-check | PASS | 0 | - |
| npm run ui:commercial-check | PASS | 0 | - |
| npm run ui:visual-review-pack | PASS | 0 | - |
| npm run ui:login-role-smoke | PASS | 0 | - |
| npm run ui:layout-check | PASS | 0 | - |
| npm run ui:smoke | PASS | 0 | - |
| npm run ui:role-flow | PASS | 0 | - |
| npm run role:menu-snapshot | PASS | 0 | - |
| npm run role:rbac-audit | PASS | 0 | - |
| npm run permission:align | PASS | 0 | - |
| npm run status:inventory | PASS | 0 | - |
| npm run production:gate -- --mode=production | FAIL_CLOSED | 1 | - |
| npm run readiness:strict | PASS | 0 | - |
| npm run m6b:backup-restore | PASS | 0 | - |
| npm run m6c:browser-smoke | PASS | 0 | - |
| npm run build | PASS | 0 | - |

## Interpretation

- FAIL_CLOSED on production:gate means the gate correctly blocked Production because real customer integrations or production infrastructure evidence is missing.
- FAIL_CLOSED is a Production NO_GO condition, not by itself a blocker for Internal Demo, Sales Demo or Controlled Trial decisions.
- FAIL, TIMEOUT and NOT_RUN_MANUAL_REQUIRED remain blockers for controlled trial and sellable-candidate positioning.

## Command Output Tails

### npm run typecheck

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 typecheck
> npm --workspace @eprocurement/api run typecheck && npm --workspace @eprocurement/web run typecheck


> @eprocurement/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit


> @eprocurement/web@0.1.0 typecheck
> vue-tsc --noEmit
```

- stderr tail:

```
(empty)
```

### npm run test

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 test
> npm --workspace @eprocurement/api exec -- vitest run --maxWorkers=4


 RUN  v4.1.9 E:/Software Development/‌e-Procurement/apps/api


 Test Files  49 passed (49)
      Tests  306 passed (306)
   Start at  20:53:22
   Duration  384.17s (transform 9.63s, setup 0ms, import 52.83s, tests 1438.25s, environment 9ms)
```

- stderr tail:

```
ure and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:27472) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:428) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:52840) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:39196) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:6700) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:53048) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:62168) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:52432) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:59700) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:46372) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:61868) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:64212) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:61124) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:54680) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:58764) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:46372) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:56620) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:26900) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:51376) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:62848) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:39272) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:7224) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:4272) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24880) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:18036) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:3812) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:52500) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:40388) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:61024) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
```

### npm run openapi:validate

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 openapi:validate
> node scripts/validate-openapi.mjs

OpenAPI P0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8 + hotel closed-loop path validation passed: 123 required paths.
```

- stderr tail:

```
(empty)
```

### npm run ui:scan:test

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:scan:test
> node scripts/ui-violation-scan.test.mjs

passed: LIST route missing table structure
passed: Component reused across page kinds
passed: Dashboard with KPI matrix instead of task-first workbench
passed: FORM route missing submit panel
```

- stderr tail:

```
(empty)
```

### npm run ui:scan

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:scan
> node scripts/ui-violation-scan.mjs

UI compliance scan passed.
```

- stderr tail:

```
(empty)
```

### npm run ui:copy-scan

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:copy-scan
> node scripts/sellable-readiness.mjs ui-copy-scan

{
  "status": "PASS",
  "blockers": 0,
  "warnings": 8,
  "informational": 44,
  "report": "docs/sellable-readiness/01_UI_COPY_SCAN_REPORT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run ui:terminology-check

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:terminology-check
> node scripts/ui-terminology-check.mjs

{
  "status": "PASS",
  "findings": 0,
  "report": "docs/sellable-readiness/08_UI_TERMINOLOGY_CHECK_REPORT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run ui:commercial-check

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:commercial-check
> node scripts/ui-commercial-check.mjs

{
  "status": "PASS",
  "failures": 0,
  "todos": 0,
  "report": "docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run ui:visual-review-pack

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:visual-review-pack
> node scripts/ui-second-pass-checks.mjs visual-review-pack

{
  "status": "PASS",
  "reportDir": "docs/sellable-readiness",
  "output": "output/ui-second-pass"
}
```

- stderr tail:

```
(empty)
```

### npm run ui:login-role-smoke

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:login-role-smoke
> node scripts/ui-second-pass-checks.mjs login-role-smoke

{
  "status": "PASS",
  "reportDir": "docs/sellable-readiness",
  "output": "output/ui-second-pass"
}
```

- stderr tail:

```
(empty)
```

### npm run ui:layout-check

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 ui:layout-check
> node scripts/ui-second-pass-checks.mjs layout-check

{
  "status": "PASS",
  "reportDir": "docs/sellable-readiness",
  "output": "output/ui-second-pass"
}
```

- stderr tail:

```
(empty)
```

### npm run ui:smoke

- Status: PASS
- stdout tail:

```
: 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/file-center",
      "sampledPath": "/file-center",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5296/file-center",
      "finalPath": "/file-center",
      "routeMatched": true,
      "bodyLength": 540,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/supply-mall",
      "sampledPath": "/supply-mall",
      "kind": "LIST_PAGE",
      "userId": "u8",
      "finalUrl": "http://127.0.0.1:5296/supply-mall",
      "finalPath": "/supply-mall",
      "routeMatched": true,
      "bodyLength": 240,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/supply-mall/:section",
      "sampledPath": "/supply-mall/orders",
      "kind": "DETAIL_PAGE",
      "userId": "u8",
      "finalUrl": "http://127.0.0.1:5296/supply-mall/orders",
      "finalPath": "/supply-mall/orders",
      "routeMatched": true,
      "bodyLength": 617,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/order-fulfillment",
      "sampledPath": "/order-fulfillment",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5296/order-fulfillment",
      "finalPath": "/order-fulfillment",
      "routeMatched": true,
      "bodyLength": 181,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/settlement-materials",
      "sampledPath": "/settlement-materials",
      "kind": "LIST_PAGE",
      "userId": "u13",
      "finalUrl": "http://127.0.0.1:5296/settlement-materials",
      "finalPath": "/settlement-materials",
      "routeMatched": true,
      "bodyLength": 152,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/payment-status",
      "sampledPath": "/payment-status",
      "kind": "LIST_PAGE",
      "userId": "u13",
      "finalUrl": "http://127.0.0.1:5296/payment-status",
      "finalPath": "/payment-status",
      "routeMatched": true,
      "bodyLength": 152,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/archive-audit",
      "sampledPath": "/archive-audit",
      "kind": "LIST_PAGE",
      "userId": "u5",
      "finalUrl": "http://127.0.0.1:5296/archive-audit",
      "finalPath": "/archive-audit",
      "routeMatched": true,
      "bodyLength": 318,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/audit",
      "sampledPath": "/audit",
      "kind": "LIST_PAGE",
      "userId": "u5",
      "finalUrl": "http://127.0.0.1:5296/audit",
      "finalPath": "/audit",
      "routeMatched": true,
      "bodyLength": 334,
      "counts": {
        "[data-ui-check~=\"shell\"]": 1,
        "[data-ui-check~=\"sidebar\"]": 1,
        "[data-ui-check~=\"topbar\"]": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    },
    {
      "route": "/:pathMatch(.*)*",
      "sampledPath": "/not-found-visual-check",
      "kind": "DETAIL_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5296/not-found-visual-check",
      "finalPath": "/not-found-visual-check",
      "routeMatched": true,
      "bodyLength": 540,
      "counts": {
        ".eds-page-header": 1,
        ".eds-state-error": 1
      },
      "allMatched": true,
      "anyMatched": true,
      "textMatched": true,
      "passed": true
    }
  ],
  "consoleErrors": [],
  "httpErrors": []
}
```

- stderr tail:

```
(empty)
```

### npm run ui:role-flow

- Status: PASS
- stdout tail:

```
leErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "采购项目执行详情",
      "path": "/project-workbench/p-new-5",
      "requiredText": "酒店客房布草补采项目-1783343011334",
      "finalPath": "/project-workbench/p-new-5",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "招采执行详情",
      "path": "/project-workbench/p-new-5/sourcing",
      "requiredText": "招采",
      "finalPath": "/project-workbench/p-new-5/sourcing",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "采购项目履约详情",
      "path": "/project-workbench/p-new-5/fulfillment",
      "requiredText": "履约",
      "finalPath": "/project-workbench/p-new-5/fulfillment",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "消息中心",
      "path": "/messages",
      "requiredText": "消息中心",
      "finalPath": "/messages",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "账号安全",
      "path": "/account-security",
      "requiredText": "账号安全",
      "finalPath": "/account-security",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u12",
      "label": "供应商报名页",
      "path": "/supplier-registration",
      "requiredText": "报名",
      "finalPath": "/supplier-registration",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u12",
      "label": "供应商报价页",
      "path": "/bidding",
      "requiredText": "报价",
      "finalPath": "/bidding",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u11",
      "label": "供应商订单履约",
      "path": "/order-fulfillment",
      "requiredText": "履约",
      "finalPath": "/order-fulfillment",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u11",
      "label": "供应商结算材料",
      "path": "/settlement-materials",
      "requiredText": "结算",
      "finalPath": "/settlement-materials",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u13",
      "label": "财务结算审核",
      "path": "/settlement-materials",
      "requiredText": "结算",
      "finalPath": "/settlement-materials",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u7",
      "label": "专家评分页",
      "path": "/expert-scoring",
      "requiredText": "评分",
      "finalPath": "/expert-scoring",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "采购经办定标详情",
      "path": "/award-result/p-new-5",
      "requiredText": "定标",
      "finalPath": "/award-result/p-new-5",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u12",
      "label": "供应商中标结果",
      "path": "/award-result/p-new-5",
      "requiredText": "结果",
      "finalPath": "/award-result/p-new-5",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "采购经办档案审计",
      "path": "/archive-audit",
      "requiredText": "档案",
      "finalPath": "/archive-audit",
      "renderMode": "gemini",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    }
  ]
}
```

- stderr tail:

```
(empty)
```

### npm run role:menu-snapshot

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 role:menu-snapshot
> node scripts/sellable-readiness.mjs role-menu-snapshot

{
  "status": "PASS",
  "report": "docs/sellable-readiness/02_MENU_SNAPSHOT_REPORT.md",
  "roles": 12
}
```

- stderr tail:

```
(empty)
```

### npm run role:rbac-audit

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 role:rbac-audit
> node scripts/sellable-readiness.mjs rbac-role-audit

{
  "status": "PASS",
  "roleFailures": 0,
  "unknownRoleFailures": 0,
  "report": "docs/sellable-readiness/09_RBAC_ROLE_AUDIT_REPORT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run permission:align

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 permission:align
> node scripts/sellable-readiness.mjs permission-align

{
  "status": "PASS",
  "frontendOnlyRoles": 0,
  "report": "docs/sellable-readiness/02_PERMISSION_ALIGNMENT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run status:inventory

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 status:inventory
> node scripts/sellable-readiness.mjs status-inventory

{
  "status": "PASS",
  "directWrites": 333,
  "reports": [
    "docs/sellable-readiness/03_STATUS_WRITE_INVENTORY.md",
    "docs/sellable-readiness/03_CRITICAL_FLOW_REPORT.md",
    "docs/sellable-readiness/03_CRITICAL_FLOW_TEST_REPORT.md"
  ]
}
```

- stderr tail:

```
(empty)
```

### npm run production:gate -- --mode=production

- Status: FAIL_CLOSED
- stdout tail:

```

> e-procurement-mvp@0.1.0 production:gate
> node scripts/sellable-readiness.mjs production-gate --mode=production

{
  "status": "FAIL",
  "failures": 15,
  "report": "docs/sellable-readiness/02_PRODUCTION_GATE_REPORT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run readiness:strict

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 readiness:strict
> node scripts/sellable-readiness.mjs readiness-strict

{
  "status": "PASS",
  "productionDecision": "NO_GO",
  "report": "docs/sellable-readiness/02_READINESS_STRICT_REPORT.md"
}
```

- stderr tail:

```
(empty)
```

### npm run m6b:backup-restore

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 m6b:backup-restore
> node scripts/r10-backup-restore-drill.mjs

{
  "generatedAt": "2026-07-06T13:04:18.663Z",
  "scope": "M6-B local/UAT backup restore drill",
  "source": {
    "dataRoot": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data\\files"
  },
  "backup": {
    "backupRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-06T13-04-18-655Z",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-06T13-04-18-655Z\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-06T13-04-18-655Z\\files",
    "copiedCompanionFiles": [
      "runtime.sqlite-wal",
      "runtime.sqlite-shm"
    ]
  },
  "restore": {
    "restoreRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-06T13-04-18-655Z",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-06T13-04-18-655Z\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-06T13-04-18-655Z\\files"
  },
  "checks": {
    "sourceSqliteExists": true,
    "sourceFilesRootExists": true,
    "sqliteIntegrity": "ok",
    "sourceCounts": {
      "r2_suppliers": null,
      "r2_products": null,
      "r2_procurement_requests": null,
      "r2_sourcing_projects": null,
      "r2_purchase_orders": null,
      "r2_settlement_bills": null,
      "r2_invoices": null,
      "r2_task_items": null,
      "r2_notifications": null,
      "stored_files": 5,
      "audit_logs": 0,
      "integration_jobs": null
    },
    "restoredCounts": {
      "r2_suppliers": null,
      "r2_products": null,
      "r2_procurement_requests": null,
      "r2_sourcing_projects": null,
      "r2_purchase_orders": null,
      "r2_settlement_bills": null,
      "r2_invoices": null,
      "r2_task_items": null,
      "r2_notifications": null,
      "stored_files": 5,
      "audit_logs": 0,
      "integration_jobs": null
    },
    "restoredFileCount": 5,
    "missingRestoredStoredFiles": 0,
    "countMatch": true
  },
  "productionBoundary": {
    "database": "SQLite copy plus PRAGMA integrity_check is a local/UAT drill only. Formal production requires customer-approved PostgreSQL/MySQL or equivalent database-native backup and restore evidence.",
    "fileStorage": "Local files directory is copied for this drill. Formal production object storage restore, lifecycle and antivirus evidence still require customer infrastructure.",
    "externalIntegrations": "integration_jobs are restored as local adapter job evidence only; this does not prove OA/ERP/WMS/finance/payment/invoice external systems are reachable."
  },
  "goNoGo": {
    "demoUat": "conditional_go_when_integrity_and_counts_match",
    "formalProduction": "no_go_without_customer_database_object_storage_and_external_system_restore_evidence"
  },
  "warnings": [
    "SQLite WAL/SHM files were present and copied for this local drill; formal production backup should use a database-native consistent snapshot while the app is stopped or quiesced.",
    "This is a local/UAT SQLite restore drill. Formal production database restore and object storage restore still require customer-provided infrastructure."
  ],
  "evidenceFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\r10-backup-restore-drill-latest.json"
}
```

- stderr tail:

```
(node:54236) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
```

### npm run m6c:browser-smoke

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 m6c:browser-smoke
> node scripts/m6c-browser-role-smoke.mjs

[browser] validating 集团采购管理
[api]
> @eprocurement/api@0.1.0 dev
> tsx watch src/server.ts

[web]
> @eprocurement/web@0.1.0 dev
> vite --host 127.0.0.1 --port 5276

[web] Port 5276 is in use, trying another one...
[web]
  [32m[1mVITE[22m v6.4.3[39m  [2mready in [0m[1m2205[22m[2m[0m ms[22m

[web]   [32m➜[39m  [1mLocal[22m:   [36mhttp://127.0.0.1:[1m5277[22m/[39m
[browser] validating 采购经办
[browser] validating 酒店采购
[browser] validating 供应商管理员
[browser] validating 供应商报价人员
[browser] validating 专家
[browser] validating 财务审核
[browser] validating 审计监督
[browser] validating 系统管理员
{
  "passed": true,
  "evidenceFile": "E:\\Software Development\\‌e-Procurement\\output\\m6c-browser-evidence\\m6c-browser-role-smoke.json",
  "roles": [
    {
      "label": "集团采购管理",
      "passed": true
    },
    {
      "label": "采购经办",
      "passed": true
    },
    {
      "label": "酒店采购",
      "passed": true
    },
    {
      "label": "供应商管理员",
      "passed": true
    },
    {
      "label": "供应商报价人员",
      "passed": true
    },
    {
      "label": "专家",
      "passed": true
    },
    {
      "label": "财务审核",
      "passed": true
    },
    {
      "label": "审计监督",
      "passed": true
    },
    {
      "label": "系统管理员",
      "passed": true
    }
  ]
}
```

- stderr tail:

```
[api] (node:24632) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[api] node:events:486
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use 127.0.0.1:3216
    at Server.setupListenHandle [as _listen2] (node:net:1948:16)
    at listenInCluster (node:net:2005:12)
    at node:net:2214:7
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1984:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '127.0.0.1',
  port: 3216
}

Node.js v24.14.0
```

### npm run build

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 build
> npm --workspace @eprocurement/api run build && npm --workspace @eprocurement/web run build


> @eprocurement/api@0.1.0 build
> tsc -p tsconfig.json


> @eprocurement/web@0.1.0 build
> vue-tsc --noEmit && vite build

[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 2948 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m    0.48 kB[22m[1m[22m[2m │ gzip:   0.34 kB[22m
[2mdist/[22m[35massets/index-C_P_Q8h6.css  [39m[1m[2m  143.97 kB[22m[1m[22m[2m │ gzip:  24.06 kB[22m
[2mdist/[22m[36massets/index-DOASwyc2.js   [39m[1m[33m1,796.59 kB[39m[22m[2m │ gzip: 477.90 kB[22m
[32m✓ built in 24.44s[39m
```

- stderr tail:

```
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
```
