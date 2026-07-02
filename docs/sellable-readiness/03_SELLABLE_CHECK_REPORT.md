# Sprint 3 Sellable Check Report

- Generated at: 2026-07-02T16:55:44.180Z
- Overall status: NO_GO
- Blocking/failed commands: 2

| Command | Status | Exit | Signal/Error |
| --- | --- | --- | --- |
| npm run typecheck | PASS | 0 | - |
| npm run test | FAIL | 1 | - |
| npm run openapi:validate | PASS | 0 | - |
| npm run ui:scan:test | PASS | 0 | - |
| npm run ui:scan | PASS | 0 | - |
| npm run ui:copy-scan | PASS | 0 | - |
| npm run ui:smoke | PASS | 0 | - |
| npm run ui:role-flow | PASS | 0 | - |
| npm run role:menu-snapshot | PASS | 0 | - |
| npm run permission:align | PASS | 0 | - |
| npm run status:inventory | PASS | 0 | - |
| npm run production:gate -- --mode=production | FAIL | 1 | - |
| npm run readiness:strict | PASS | 0 | - |
| npm run m6b:backup-restore | PASS | 0 | - |
| npm run m6c:browser-smoke | PASS | 0 | - |
| npm run build | PASS | 0 | - |

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

- Status: FAIL
- stdout tail:

```
t


> @eprocurement/api@0.1.0 test
> vitest run


 RUN  v4.1.9 E:/Software Development/‌e-Procurement/apps/api

 ❯ tests/stage2-supplier-request-project.test.ts (3 tests | 1 failed) 16808ms
     × persists supplier admission attachments, request attachments and created project across reboot 5920ms
 ❯ tests/r5-review-award-pricing.test.ts (4 tests | 1 failed) 21198ms
     × persists expert assignments, scoring, comparison, award and pricing reports into r2 tables and restores after restart 5944ms
 ❯ tests/r2-data-model-governance.test.ts (5 tests | 1 failed) 27090ms
     × writes core API changes into R2 formal tables and retains them after API restart 5359ms
 ❯ tests/phase8-archive-audit.test.ts (5 tests | 1 failed) 27106ms
     × requires supplement approval before applying and does not overwrite old snapshot fields 5618ms
 ❯ tests/m4b-sourcing-process.test.ts (4 tests | 1 failed) 27365ms
     × tracks RFQ comparison path and keeps supplier business data scoped 6671ms
 ❯ tests/m6c-final-security-ops.test.ts (6 tests | 2 failed) 31674ms
     × locks process timeline and task DTO redaction while preserving traceable procurement events 5256ms
     × keeps BPMN pilot health permissioned and redacted while R8 and Process remain the execution path 4948ms
 ❯ tests/m5c-bpmn-pilot-governance.test.ts (5 tests | 5 failed) 31982ms
     × updates rollout scope without exposing scoped business ids and keeps out-of-scope events on the legacy path 6760ms
     × switches pilot definition versions and rolls back to the previous enabled BPMN definition 6232ms
     × rolls back to R8 Process fallback when no previous BPMN version exists and still leaves R8 usable 6600ms
     × enforces governance permissions and rejects invalid switch or rollback targets 6137ms
     × honors environment rollout scope so production-scoped pilots do not run in test 6250ms
 ❯ tests/r3-supplier-product-center.test.ts (4 tests | 1 failed) 32761ms
     × writes supplier profile, qualifications, reviews, restrictions and seal samples into R2/R3 formal tables and retains them after reboot 7152ms
 ❯ tests/phase11-hotel-closed-loop.test.ts (4 tests | 1 failed) 32850ms
     × supports exception receipt handling and archive supplement workflow 6568ms
 ❯ tests/stage7-business-tables.test.ts (1 test | 1 failed) 6542ms
     × syncs seed and API writes into formal business tables across reboot 6538ms
 ❯ tests/r4-sourcing-procurement.test.ts (3 tests | 3 failed) 21636ms
     × writes procurement requests, sourcing projects, invitations and participations into R2/R4 formal tables 7225ms
     × writes bids, bid lines, response files and clarifications into formal tables with confidentiality and file permissions 7106ms
     × retains R4 request, project, participation, bid, response file and clarification data across API restart 7300ms
 ❯ tests/r10-final-uat-production.test.ts (3 tests | 1 failed) 19445ms
     × runs the buyer, supplier, finance and audit closed loop needed for final UAT 6295ms
 ❯ tests/m5b-bpmn-pilot.test.ts (3 tests | 3 failed) 15515ms
     × runs a procurement request BPMN shadow pilot only for the scoped test request while R8 and Process remain the execution path 5034ms
     × records fallback when the pilot BPMN diverges and still leaves the legacy procurement request flow usable 5111ms
     × enforces pilot permissions, keeps auditors read-only and rejects disabled or mismatched definitions 5367ms
 ❯ tests/m5a-bpmn-definition.test.ts (7 tests | 1 failed) 45900ms
     × keeps BPMN failures isolated from existing R8 and Process Layer execution 6585ms
 ❯ tests/m5d-bpmn-pilot-health.test.ts (3 tests | 3 failed) 19460ms
     × summarizes pilot health, compatibility and fallback without exposing internal business data 6918ms
     × keeps pilot health read-only and role scoped for auditors while denying business roles 6338ms
     × surfaces rollback gate status while keeping R8 and Process as the execution path 6200ms
 ❯ tests/stage11-supply-mall.test.ts (7 tests | 1 failed) 54769ms
     × covers PDF 1:1 mall, questionnaire, scenario package, fund account and split-role paths 6820ms
 ❯ tests/p0-permissions.test.ts (17 tests | 2 failed) 106516ms
     × creates a new scoring version after reevaluation approval without replacing older versions 6286ms
     × exposes the exact P0 endpoint set required by the goal 5899ms
 ❯ tests/phase1-procurement.test.ts (20 tests | 2 failed) 113111ms
     × creates supplier admission, category authorization and restriction with audit logs 6161ms
     × covers PDF supplier registration boundary, split supplier roles and admission scoring rules 5735ms
 ❯ tests/phase10-permission-hardening.test.ts (34 tests | 1 failed) 166934ms
     × blocks buyer from same-org procurement request tied to an unmanaged project 3236ms

 Test Files  19 failed | 30 passed (49)
      Tests  32 failed | 271 passed (303)
   Start at  00:50:16
   Duration  171.63s (transform 32.70s, setup 0ms, import 90.54s, tests 1866.52s, environment 10ms)


```

- stderr tail:

```
ocurement master-source migration > writes procurement requests, sourcing projects, invitations and participations into R2/R4 formal tables
AssertionError: expected 400 to be 200 // Object.is equality

- Expected
+ Received

- 200
+ 400

 ❯ createLockedDocumentAndAnnouncement tests/r4-sourcing-procurement.test.ts:142:28
    140|     .set("x-mock-user-id", "u2")
    141|     .send({ supplierIds });
    142|   expect(published.status).toBe(200);
       |                            ^
    143|   return published.body.announcement as { id: string };
    144| }
 ❯ tests/r4-sourcing-procurement.test.ts:166:26

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/32]⎯

 FAIL  tests/r4-sourcing-procurement.test.ts > R4 sourcing procurement master-source migration > writes bids, bid lines, response files and clarifications into formal tables with confidentiality and file permissions
AssertionError: expected 403 to be 201 // Object.is equality

- Expected
+ Received

- 201
+ 403

 ❯ tests/r4-sourcing-procurement.test.ts:245:26
    243|         ]
    244|       });
    245|     expect(draft.status).toBe(201);
       |                          ^
    246|     const bidId = draft.body.bid.id as string;
    247|     expect(single<{ bid_status: string; amount: number }>(runtime, "se…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/32]⎯

 FAIL  tests/r4-sourcing-procurement.test.ts > R4 sourcing procurement master-source migration > retains R4 request, project, participation, bid, response file and clarification data across API restart
AssertionError: expected 403 to be 201 // Object.is equality

- Expected
+ Received

- 201
+ 403

 ❯ tests/r4-sourcing-procurement.test.ts:322:24
    320|         ]
    321|       });
    322|     expect(bid.status).toBe(201);
       |                        ^
    323|     await request(runtime1.app).post(`/api/bids/${bid.body.bid.id}/sub…
    324|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/32]⎯

 FAIL  tests/r5-review-award-pricing.test.ts > R5 review award pricing formal source > persists expert assignments, scoring, comparison, award and pricing reports into r2 tables and restores after restart
AssertionError: expected 400 to be 201 // Object.is equality

- Expected
+ Received

- 201
+ 400

 ❯ tests/r5-review-award-pricing.test.ts:89:30
     87|       .set("x-mock-user-id", "u2")
     88|       .send({ expertId: "exp-1", reason: "R5 formal table assignment" …
     89|     expect(appointed.status).toBe(201);
       |                              ^
     90|     const assignmentId = appointed.body.assignment.id as string;
     91|     expect(single(runtime1, "select id from r2_expert_assignments wher…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/32]⎯

 FAIL  tests/stage11-supply-mall.test.ts > Stage 11 supply chain mall expansion > covers PDF 1:1 mall, questionnaire, scenario package, fund account and split-role paths
AssertionError: expected '合同查看已完成本地摘要、下载审计入口和合同系统 adapter 边界；未声…' to contain '未声明真实合同系统联调完成'

Expected: "未声明真实合同系统联调完成"
Received: "合同查看已完成本地摘要、下载审计入口和合同系统 adapter 边界；未声明真实合同系统集成完成。"

 ❯ tests/stage11-supply-mall.test.ts:322:52
    320|     const contract = await request(runtime.app).get(`/api/mall/orders/…
    321|     expect(contract.status).toBe(200);
    322|     expect(contract.body.contract.adapterBoundary).toContain("未声明真实合同系…
       |                                                    ^
    323|
    324|     const copied = await request(runtime.app).post(`/api/mall/orders/$…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/32]⎯

 FAIL  tests/stage2-supplier-request-project.test.ts > Stage 2 supplier admission, procurement request and project initiation > persists supplier admission attachments, request attachments and created project across reboot
AssertionError: expected 400 to be 201 // Object.is equality

- Expected
+ Received

- 201
+ 400

 ❯ tests/stage2-supplier-request-project.test.ts:62:27
     60|       .set("x-mock-user-id", "u1")
     61|       .send({ reviewType: "admission_assessment", status: "passed", sc…
     62|     expect(review.status).toBe(201);
       |                           ^
     63|
     64|     const createdRequest = await request(runtime1.app)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[31/32]⎯

 FAIL  tests/stage7-business-tables.test.ts > Stage 7 formal business tables > syncs seed and API writes into formal business tables across reboot
AssertionError: expected 403 to be 201 // Object.is equality

- Expected
+ Received

- 201
+ 403

 ❯ tests/stage7-business-tables.test.ts:58:35
     56|         ]
     57|       });
     58|     expect(createdRequest.status).toBe(201);
       |                                   ^
     59|     expect(count(runtime1.ctx, "business_procurement_requests")).toBe(…
     60|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[32/32]⎯

npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path E:\Software Development\‌e-Procurement\apps\api
npm error workspace @eprocurement/api@0.1.0
npm error location E:\Software Development\‌e-Procurement\apps\api
npm error command failed
npm error command C:\Windows\system32\cmd.exe /d /s /c vitest run

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
  "report": "docs/sellable-readiness/01_UI_COPY_SCAN_REPORT.md"
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
s-form-section": 2,
        ".eds-submit-panel": 3
      },
      "passed": true
    },
    {
      "route": "/award-result",
      "sampledPath": "/award-result",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5173/award-result",
      "redirected": false,
      "bodyLength": 1962,
      "counts": {
        ".eds-page-header": 3,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/award-result/:projectId",
      "sampledPath": "/award-result/p-award",
      "kind": "DETAIL_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5173/award-result/p-award",
      "redirected": false,
      "bodyLength": 2899,
      "counts": {
        ".eds-page-header": 14,
        ".eds-summary-grid": 2,
        ".eds-tabs": 1
      },
      "passed": true
    },
    {
      "route": "/external-trade",
      "sampledPath": "/external-trade",
      "kind": "DETAIL_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5173/external-trade",
      "redirected": false,
      "bodyLength": 887,
      "counts": {
        ".eds-page-header": 7,
        ".eds-summary-grid": 1,
        ".eds-tabs": 1
      },
      "passed": true
    },
    {
      "route": "/integration-boundary",
      "sampledPath": "/integration-boundary",
      "kind": "LIST_PAGE",
      "userId": "u6",
      "finalUrl": "http://127.0.0.1:5173/integration-boundary",
      "redirected": false,
      "bodyLength": 4738,
      "counts": {
        ".eds-page-header": 4,
        ".eds-filter-bar": 1,
        ".eds-table": 2,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/file-center",
      "sampledPath": "/file-center",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5173/file-center",
      "redirected": false,
      "bodyLength": 7834,
      "counts": {
        ".eds-page-header": 4,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/supply-mall",
      "sampledPath": "/supply-mall",
      "kind": "LIST_PAGE",
      "userId": "u8",
      "finalUrl": "http://127.0.0.1:5173/supply-mall",
      "redirected": false,
      "bodyLength": 965,
      "counts": {
        ".eds-page-header": 3,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/supply-mall/:section",
      "sampledPath": "/supply-mall/orders",
      "kind": "DETAIL_PAGE",
      "userId": "u8",
      "finalUrl": "http://127.0.0.1:5173/supply-mall/orders",
      "redirected": false,
      "bodyLength": 566,
      "counts": {
        ".eds-page-header": 5,
        ".eds-summary-grid": 1,
        ".eds-tabs": 1
      },
      "passed": true
    },
    {
      "route": "/order-fulfillment",
      "sampledPath": "/order-fulfillment",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5173/order-fulfillment",
      "redirected": false,
      "bodyLength": 1356,
      "counts": {
        ".eds-page-header": 6,
        ".eds-filter-bar": 1,
        ".eds-table": 3,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/settlement-materials",
      "sampledPath": "/settlement-materials",
      "kind": "LIST_PAGE",
      "userId": "u13",
      "finalUrl": "http://127.0.0.1:5173/settlement-materials",
      "redirected": false,
      "bodyLength": 1813,
      "counts": {
        ".eds-page-header": 8,
        ".eds-filter-bar": 1,
        ".eds-table": 4,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/payment-status",
      "sampledPath": "/payment-status",
      "kind": "LIST_PAGE",
      "userId": "u13",
      "finalUrl": "http://127.0.0.1:5173/payment-status",
      "redirected": false,
      "bodyLength": 928,
      "counts": {
        ".eds-page-header": 7,
        ".eds-filter-bar": 1,
        ".eds-table": 3,
        ".eds-pagination": 1
      },
      "passed": true
    },
    {
      "route": "/archive-audit",
      "sampledPath": "/archive-audit",
      "kind": "LIST_PAGE",
      "userId": "u2",
      "finalUrl": "http://127.0.0.1:5173/archive-audit",
      "redirected": false,
      "bodyLength": 3153,
      "counts": {
        ".eds-page-header": 10,
        ".eds-filter-bar": 1,
        ".eds-table": 4,
        ".eds-pagination": 2
      },
      "passed": true
    },
    {
      "route": "/audit",
      "sampledPath": "/audit",
      "kind": "LIST_PAGE",
      "userId": "u5",
      "finalUrl": "http://127.0.0.1:5173/audit",
      "redirected": false,
      "bodyLength": 462,
      "counts": {
        ".eds-page-header": 2,
        ".eds-filter-bar": 1,
        ".eds-table": 1,
        ".eds-pagination": 1
      },
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

> e-procurement-mvp@0.1.0 ui:role-flow
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
      "navText": "工作台\n我的待办\n采购项目\n评审定标\n定标审批\n采购申请\n商品目录\n订单履约\n档案审计",
      "utilityText": "消息\n账号安全\n刘明 / 采购经办人\n退出",
      "directForbiddenPath": "/approval-rules",
      "directForbiddenRedirected": true,
      "passed": true
    },
    {
      "label": "平台运营",
      "userId": "u10",
      "navText": "工作台\n我的待办\n采购项目\n评审定标\n评分模板\n定标审批\n采购申请\n商品目录\n订单履约\n档案审计",
      "utilityText": "消息\n账号安全\n平台运营 / 运营维护\n退出",
      "directForbiddenPath": "/approval-rules",
      "directForbiddenRedirected": true,
      "passed": true
    },
    {
      "label": "集团采购管理",
      "userId": "u1",
      "navText": "工作台\n我的待办\n审批规则\n需求审批\n采购项目\n报价进度\n评审定标\n评分模板\n定标审批\n供应商\n商品目录\n档案审计",
      "utilityText": "消息\n账号安全\n陈静 / 集团采购管理人\n退出",
      "directForbiddenPath": "",
      "directForbiddenRedirected": true,
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
      "path": "/procurement-requests/req-28",
      "requiredText": "需求",
      "finalPath": "/procurement-requests/req-28",
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
      "path": "/project-workbench/p-new-20",
      "requiredText": "酒店食材供应补采项目-1783011227629",
      "finalPath": "/project-workbench/p-new-20",
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
      "path": "/project-workbench/p-new-20/sourcing",
      "requiredText": "招采",
      "finalPath": "/project-workbench/p-new-20/sourcing",
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
      "path": "/award-result/p-new-20",
      "requiredText": "定标",
      "finalPath": "/award-result/p-new-20",
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
      "path": "/award-result/p-new-20",
      "requiredText": "结果",
      "finalPath": "/award-result/p-new-20",
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
  "status": "NEEDS_REVIEW",
  "frontendOnlyRoles": 5,
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
  "directWrites": 327,
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

- Status: FAIL
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
  "generatedAt": "2026-07-02T16:54:06.316Z",
  "scope": "M6-B local/UAT backup restore drill",
  "source": {
    "dataRoot": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\stage5-uat-data\\files"
  },
  "backup": {
    "backupRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-02T16-54-06-314Z",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-02T16-54-06-314Z\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\backup-2026-07-02T16-54-06-314Z\\files",
    "copiedCompanionFiles": [
      "runtime.sqlite-wal",
      "runtime.sqlite-shm"
    ]
  },
  "restore": {
    "restoreRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-02T16-54-06-314Z",
    "sqliteFile": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-02T16-54-06-314Z\\runtime.sqlite",
    "filesRoot": "E:\\Software Development\\‌e-Procurement\\output\\r10-backup-restore\\restore-2026-07-02T16-54-06-314Z\\files"
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
(node:48296) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

```

### npm run m6c:browser-smoke

- Status: PASS
- stdout tail:

```

> e-procurement-mvp@0.1.0 m6c:browser-smoke
> node scripts/m6c-browser-role-smoke.mjs

[web] 
> @eprocurement/web@0.1.0 dev
> vite --host 127.0.0.1 --port 5276

[api] 
> @eprocurement/api@0.1.0 dev
> tsx watch src/server.ts

[web] 
  [32m[1mVITE[22m v6.4.3[39m  [2mready in [0m[1m947[22m[2m[0m ms[22m

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
[api] (node:49964) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

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
[32m✓[39m 636 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.48 kB[22m[1m[22m[2m │ gzip:   0.34 kB[22m
[2mdist/[22m[35massets/index-DWlBzMRN.css  [39m[1m[2m 13.04 kB[22m[1m[22m[2m │ gzip:   2.50 kB[22m
[2mdist/[22m[36massets/index-BWm51ojR.js   [39m[1m[33m800.87 kB[39m[22m[2m │ gzip: 218.54 kB[22m
[32m✓ built in 5.05s[39m

```

- stderr tail:

```
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m

```
