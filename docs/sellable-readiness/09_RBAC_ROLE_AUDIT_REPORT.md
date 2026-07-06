# RBAC Role Audit Report

- Generated at: 2026-07-06T13:04:08.976Z
- Step: 5 / 9
- Result: PASS
- Scope: 12 角色默认着陆页、版式映射、消息铃铛显隐、侧栏菜单，以及未知角色 fail-closed 审计。

| Role | Status | Label | Home | Template | Bell | Sidebar | Mismatch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| group_manager | PASS | 集团采购管理人 | / | A | show | 我的待办<br>审批规则<br>需求审批<br>采购项目<br>报价进度<br>评审定标<br>评分模板<br>定标审批<br>供应商<br>商品目录<br>档案审计 | - |
| buyer | PASS | 采购经办人 | / | A | show | 我的待办<br>采购申请<br>采购项目<br>商品目录<br>评审定标<br>定标审批<br>订单履约<br>档案审计 | - |
| hotel_buyer | PASS | 酒店采购 | /procurement-requests | B | show | 工作台<br>我的待办<br>采购申请<br>商品目录<br>订单履约 | - |
| hotel_finance | PASS | 酒店财务 | / | B | show | 工作台<br>我的待办<br>结算付款<br>付款进度 | - |
| platform_operator | PASS | 平台运营 | / | A | show | 我的待办<br>采购申请<br>采购项目<br>商品目录<br>评审定标<br>评分模板<br>定标审批<br>订单履约<br>档案审计 | - |
| supplier | PASS | 供应商 | / | C | show | 我的待办<br>商品维护<br>供应商档案<br>报名资料<br>报价响应<br>中标结果<br>订单履约<br>结算材料 | - |
| supplier_admin | PASS | 供应商管理员 | / | C | show | 我的待办<br>商品维护<br>供应商档案<br>报名资料<br>报价响应<br>中标结果<br>订单履约<br>结算材料 | - |
| supplier_quotation | PASS | 供应商报价人员 | /bidding | C | show | 我的待办<br>商品维护<br>供应商档案<br>报名资料<br>报价响应<br>中标结果<br>订单履约<br>结算材料 | - |
| expert | PASS | 专家 | /expert-scoring | C | show | 工作台<br>我的待办 | - |
| finance_reviewer | PASS | 财务审核 | / | B | show | 工作台<br>我的待办<br>结算付款<br>付款进度 | - |
| auditor | PASS | 纪检审计 | / | D | show | 工作台<br>我的待办<br>审批规则<br>档案审计<br>采购监督<br>定标监督<br>供应商监督<br>操作日志<br>集成配置 | - |
| admin | PASS | 系统管理员 | /permissions | D | hide | 审批规则<br>系统管理<br>系统设置 | - |

## Unknown Role Hardening

| Check | Status | Evidence |
| --- | --- | --- |
| unknown-role-home | PASS | actual=/permission-denied |
| unknown-role-nav | PASS | count=0 |
| unknown-role-utility | PASS | count=0 |
| unknown-role-route-denied | PASS | allowed=false |
| unknown-role-bell-hidden | PASS | show=false |

## Boundary

This audit treats apps/web/src/permissions/role-model.ts as the single source of truth for role home, role template, sidebar labels and message-bell visibility. It does not replace backend authorization or data-scope enforcement.
