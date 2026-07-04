# Sprint 3 Sellable Check Report

- Generated at: 2026-07-04T15:47:42.719Z
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
| npm run ui:commercial-check | PASS | 0 | - |
| npm run ui:visual-review-pack | PASS | 0 | - |
| npm run ui:login-role-smoke | PASS | 0 | - |
| npm run ui:layout-check | PASS | 0 | - |
| npm run ui:smoke | PASS | 0 | - |
| npm run ui:role-flow | PASS | 0 | - |
| npm run role:menu-snapshot | PASS | 0 | - |
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
   Start at  23:37:44
   Duration  305.78s (transform 8.96s, setup 0ms, import 41.54s, tests 1148.43s, environment 7ms)


```

- stderr tail:

```
and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:29836) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:22532) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:33980) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:61580) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:43772) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8640) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:53796) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:60636) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:40288) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:63788) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:51648) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:39232) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8268) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:21904) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:34404) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:56972) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:35740) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:17784) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:17396) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:54304) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:13988) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:45184) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:62952) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:25540) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:45440) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:22784) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:58392) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:28604) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:56972) ExperimentalWarning: SQLite is an experimental feature and might change at any time
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
passed: Dashboard without enough tables
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
  "warnings": 14,
  "informational": 42,
  "report": "docs/sellable-readiness/01_UI_COPY_SCAN_REPORT.md"
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
al-trade",
      "redirected": false,
      "bodyLength": 969,
      "counts": {
        ".eds-page-header": 7,
        ".eds-summary-grid": 1,
        ".eds-tabs": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/integration-boundary",
      "sampledPath": "/integration-boundary",
      "kind": "LIST_PAGE",
      "userId": "u5",
      "finalUrl": "http://127.0.0.1:5174/integration-boundary",
      "finalPath": "/integration-boundary",
      "redirected": false,
      "bodyLength": 14850,
      "counts": {
        ".eds-page-header": 4,
        ".eds-filter-bar": 1,
        ".eds-table": 2,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/file-center",
      "sampledPath": "/file-center",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5174/file-center",
      "finalPath": "/file-center",
      "redirected": false,
      "bodyLength": 9065,
      "counts": {
        ".eds-page-header": 4,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/supply-mall",
      "sampledPath": "/supply-mall",
      "kind": "LIST_PAGE",
      "userId": "u8",
      "finalUrl": "http://127.0.0.1:5174/supply-mall",
      "finalPath": "/supply-mall",
      "redirected": false,
      "bodyLength": 1016,
      "counts": {
        ".eds-page-header": 3,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/supply-mall/:section",
      "sampledPath": "/supply-mall/orders",
      "kind": "DETAIL_PAGE",
      "userId": "u8",
      "finalUrl": "http://127.0.0.1:5174/supply-mall/orders",
      "finalPath": "/supply-mall/orders",
      "redirected": false,
      "bodyLength": 619,
      "counts": {
        ".eds-page-header": 5,
        ".eds-summary-grid": 1,
        ".eds-tabs": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/order-fulfillment",
      "sampledPath": "/order-fulfillment",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5174/order-fulfillment",
      "finalPath": "/order-fulfillment",
      "redirected": false,
      "bodyLength": 890,
      "counts": {
        ".eds-page-header": 6,
        ".eds-filter-bar": 1,
        ".eds-table": 3,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/settlement-materials",
      "sampledPath": "/settlement-materials",
      "kind": "LIST_PAGE",
      "userId": "u13",
      "finalUrl": "http://127.0.0.1:5174/settlement-materials",
      "finalPath": "/settlement-materials",
      "redirected": false,
      "bodyLength": 1948,
      "counts": {
        ".eds-page-header": 12,
        ".eds-filter-bar": 1,
        ".eds-table": 4,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/payment-status",
      "sampledPath": "/payment-status",
      "kind": "LIST_PAGE",
      "userId": "u13",
      "finalUrl": "http://127.0.0.1:5174/payment-status",
      "finalPath": "/payment-status",
      "redirected": false,
      "bodyLength": 969,
      "counts": {
        ".eds-page-header": 7,
        ".eds-filter-bar": 1,
        ".eds-table": 3,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/archive-audit",
      "sampledPath": "/archive-audit",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5174/archive-audit",
      "finalPath": "/archive-audit",
      "redirected": false,
      "bodyLength": 9292,
      "counts": {
        ".eds-page-header": 10,
        ".eds-filter-bar": 1,
        ".eds-table": 4,
        ".eds-pagination": 2
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/audit",
      "sampledPath": "/audit",
      "kind": "LIST_PAGE",
      "userId": "u5",
      "finalUrl": "http://127.0.0.1:5174/audit",
      "finalPath": "/audit",
      "redirected": false,
      "bodyLength": 529,
      "counts": {
        ".eds-page-header": 2,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
      "stateMatched": true,
      "passed": true
    },
    {
      "route": "/:pathMatch(.*)*",
      "sampledPath": "/not-found-visual-check",
      "kind": "DETAIL_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5174/not-found-visual-check",
      "finalPath": "/not-found-visual-check",
      "redirected": false,
      "bodyLength": 306,
      "counts": {
        ".eds-page-header": 1,
        ".eds-state-error": 1
      },
      "stateMatched": true,
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
e-procurement-mvp@0.1.0 ui:role-flow
> node scripts/ui-role-flow-regression.mjs

{
  "passed": true,
  "flowTrace": [
    "酒店采购:发起采购申请",
    "酒店采购:提交审批",
    "集团审批:需求审批通过",
    "采购经办:判定采购方式",
    "采购经办:生成采购项目",
    "采购经办:编制采购文件",
    "采购经办:发布锁定采购文件",
    "采购经办:创建公告",
    "采购经办:发布公告并邀请供应商(sup-3)",
    "供应商报价:报名应标",
    "采购经办:报名资格审核通过",
    "供应商报价:提交报价草稿",
    "供应商报价:正式提交报价",
    "采购经办:截标并锁定报价",
    "采购经办:抽取专家",
    "专家评审:确认回避纪律保密",
    "专家评审:评分并锁定",
    "采购经办:生成并冻结评审报告",
    "采购经办:创建定标审批",
    "采购经办:提交定标审批",
    "集团审批:定标审批通过",
    "采购经办:发送中标结果"
  ],
  "menuChecks": [
    {
      "label": "采购经办",
      "userId": "u2",
      "navText": "工作\n\n工作台\n今日事项\n我的待办\n流程任务\n\n采购\n\n采购申请\n需求发起\n采购项目\n执行进度\n商品目录\n集采商品\n评审定标\n专家与评审\n定标审批\n结果审批\n\n履约结算\n\n订单履约\n发货验收\n\n审计与配置\n\n档案审计\n归档追溯",
      "utilityText": "消息\n账号安全\n刘明 / 采购经办人",
      "directForbiddenPath": "/approval-rules",
      "directForbiddenRedirected": true,
      "directForbiddenFinalPath": "/permission-denied",
      "directForbiddenTextMatched": true,
      "passed": true
    },
    {
      "label": "平台运营",
      "userId": "u10",
      "navText": "工作\n\n工作台\n今日事项\n我的待办\n流程任务\n\n采购\n\n采购申请\n需求发起\n采购项目\n执行进度\n商品目录\n集采商品\n评审定标\n专家与评审\n评分模板\n评分规则\n定标审批\n结果审批\n\n履约结算\n\n订单履约\n发货验收\n\n审计与配置\n\n档案审计\n归档追溯",
      "utilityText": "消息\n账号安全\n平台运营 / 运营维护",
      "directForbiddenPath": "/approval-rules",
      "directForbiddenRedirected": true,
      "directForbiddenFinalPath": "/permission-denied",
      "directForbiddenTextMatched": true,
      "passed": true
    },
    {
      "label": "集团采购管理",
      "userId": "u1",
      "navText": "工作\n\n工作台\n今日事项\n我的待办\n流程任务\n\n采购\n\n需求审批\n需求准入\n采购项目\n执行进度\n商品目录\n集采商品\n报价进度\n截止与保密\n评审定标\n专家与评审\n评分模板\n评分规则\n定标审批\n结果审批\n\n供应商\n\n供应商\n准入档案\n\n审计与配置\n\n档案审计\n归档追溯\n审批规则\n规则配置",
      "utilityText": "消息\n账号安全\n陈静 / 集团采购管理人",
      "directForbiddenPath": "",
      "directForbiddenRedirected": true,
      "directForbiddenFinalPath": "",
      "directForbiddenTextMatched": true,
      "passed": true
    }
  ],
  "flowPageChecks": [
    {
      "userId": "u8",
      "label": "酒店采购申请列表",
      "path": "/procurement-requests",
      "requiredText": "采购申请",
      "finalPath": "/procurement-requests",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u1",
      "label": "集团需求审批详情",
      "path": "/procurement-requests/req-45",
      "requiredText": "需求",
      "finalPath": "/procurement-requests/req-45",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u2",
      "label": "采购项目执行详情",
      "path": "/project-workbench/p-new-37",
      "requiredText": "酒店食材供应补采项目-1783179911217",
      "finalPath": "/project-workbench/p-new-37",
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
      "path": "/project-workbench/p-new-37/sourcing",
      "requiredText": "招采",
      "finalPath": "/project-workbench/p-new-37/sourcing",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u17",
      "label": "供应商报名页",
      "path": "/supplier-registration",
      "requiredText": "报名",
      "finalPath": "/supplier-registration",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u17",
      "label": "供应商报价页",
      "path": "/bidding",
      "requiredText": "报价",
      "finalPath": "/bidding",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u4",
      "label": "专家评分页",
      "path": "/expert-scoring",
      "requiredText": "评分",
      "finalPath": "/expert-scoring",
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
      "path": "/award-result/p-new-37",
      "requiredText": "定标",
      "finalPath": "/award-result/p-new-37",
      "passed": true,
      "pathLoaded": true,
      "contentLoaded": true,
      "blocked": false,
      "consoleErrors": [],
      "httpErrors": []
    },
    {
      "userId": "u17",
      "label": "供应商中标结果",
      "path": "/award-result/p-new-37",
      "requiredText": "结果",
      "finalPath": "/award-result/p-new-37",
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
  "generatedAt": "2026-07-04T15:45:38.664Z",
  "scope": "M6-B local/UAT backup restore drill",
  "source": {
    "dataRoot": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data\\files"
  },
  "backup": {
    "backupRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-04T15-45-38-658Z",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-04T15-45-38-658Z\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-04T15-45-38-658Z\\files",
    "copiedCompanionFiles": [
      "runtime.sqlite-wal",
      "runtime.sqlite-shm"
    ]
  },
  "restore": {
    "restoreRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-04T15-45-38-658Z",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-04T15-45-38-658Z\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-04T15-45-38-658Z\\files"
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
(node:25936) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

```

### npm run m6c:browser-smoke

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 m6c:browser-smoke
> node scripts/m6c-browser-role-smoke.mjs

[api] 
> @eprocurement/api@0.1.0 dev
> tsx watch src/server.ts

[web] 
> @eprocurement/web@0.1.0 dev
> vite --host 127.0.0.1 --port 5276

[web] 
  [32m[1mVITE[22m v6.4.3[39m  [2mready in [0m[1m1352[22m[2m[0m ms[22m

[web]   [32m➜[39m  [1mLocal[22m:   [36mhttp://127.0.0.1:[1m5276[22m/[39m
[api] e-procurement API listening on http://127.0.0.1:3216
[browser] validating 集团采购管理
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
[api] (node:58164) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[api] npm error Lifecycle script `dev` failed with error:
[api] npm error code 1
[api] npm error path E:\Software Development\‌e-Procurement\apps\api
[api] npm error workspace @eprocurement/api@0.1.0
[api] npm error location E:\Software Development\‌e-Procurement\apps\api
[api] npm error command failed
[api] npm error command C:\Windows\system32\cmd.exe /d /s /c tsx watch src/server.ts

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
[32m✓[39m 670 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.48 kB[22m[1m[22m[2m │ gzip:   0.34 kB[22m
[2mdist/[22m[35massets/index-AvudKLTf.css  [39m[1m[2m 36.44 kB[22m[1m[22m[2m │ gzip:   5.94 kB[22m
[2mdist/[22m[36massets/index-DX0VhPo6.js   [39m[1m[33m830.19 kB[39m[22m[2m │ gzip: 226.81 kB[22m
[32m✓ built in 5.07s[39m

```

- stderr tail:

```
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m

```
