# Phase 1 Agent 配置：供应商管理与采购需求 / 项目立项

## 阶段目标

实现供应商管理、采购需求创建 / 判断 / 提交、从需求生成项目、项目状态流转的最小正式切片。完成后必须保持 P0 测试通过。

## 主代理职责

- 维护阶段边界和最终集成。
- 更新 OpenAPI、类型、Seed、测试和报告。
- 只在 Phase 1 范围内推进，不进入采购文件、报名、报价、专家评审等后续阶段。

## backend-slice-implementer

负责文件：

- `apps/api/src/types.ts`
- `apps/api/src/seed/data.ts`
- `apps/api/src/routes/supplier-routes.ts`
- `apps/api/src/routes/project-routes.ts`
- `apps/api/tests/*.test.ts`

交付：

- 供应商准入、品类授权、资质元数据、限制名单、状态变更的 P1 最小 API。
- 采购需求创建、编辑、提交、方法判断、从需求生成项目的 P1 最小 API。
- 所有敏感动作写审计日志。
- 系统管理员不能处理采购实质业务。

## frontend-slice-implementer

负责文件：

- `apps/web/src/router/index.ts`
- `apps/web/src/App.vue`
- `apps/web/src/api/http.ts`
- `apps/web/src/pages/*`
- `apps/web/src/components/*`

交付：

- 供应商列表 / 详情 / 准入页面。
- 采购需求列表 / 新建 / 详情 / 方式判断页面。
- 项目列表 / 详情页面。
- 权限拒绝展示错误码、可读消息和审计日志号。

## boundary-risk-reviewer

只读检查：

- 是否破坏 P0 策略。
- 是否误接真实外部系统。
- 是否写死未确认规则。
- 是否破坏 `demo/`。
- 是否缺少审计日志或状态机校验。

## Phase 1 闸门

必须通过：

- `npm run typecheck`
- `npm run test:api`
- `npm run openapi:validate`
- `npm run build`
- 前端页面可访问
- API health 可访问
- Phase 1 smoke test 可跑通
