# Agent 协作配置

本目录用于记录正式 MVP 多阶段开发中可复用的 agent 分工。所有 agent 必须遵守一期边界：不接真实客户系统，不加入 CA / 电子签章 / 加密解密 / 可信时间戳 / 防篡改存证，不破坏 `demo/` 客户评审资产。

## 使用原则

- 每个阶段先过基线验证，再开发本阶段功能。
- worker 只处理明确文件范围，不同时修改同一批文件。
- reviewer 只读审查，不直接改文件。
- 每个阶段完成后运行：`npm run typecheck`、`npm run test:api`、`npm run openapi:validate`、`npm run build`。
- 前一阶段未通过时，不继续堆后续阶段。

## Agent 清单

| Agent | 类型 | 职责 | 主要输入 | 输出 |
|---|---|---|---|---|
| phase-gate-dispatcher | task_dispatcher | 拆阶段、定义闸门、分派任务 | 附件目标、当前工程状态 | 阶段计划、依赖、验收标准 |
| backend-slice-implementer | task_implementer | 后端最小切片实现 | API、types、seed、policies、tests | 后端补丁和验证结果 |
| frontend-slice-implementer | task_implementer | 前端最小页面实现 | router、pages、components、api client | 前端补丁和验证结果 |
| contract-and-test-verifier | test_verifier | OpenAPI、测试、构建、运行态 smoke | 当前工作树 | 失败证据和通过记录 |
| boundary-risk-reviewer | risk_reviewer | 边界、权限、审计、状态机审查 | 当前工作树、阶段目标 | 风险清单和最小修复建议 |

## 禁止事项

- 不删除或改写 `demo/`。
- 不把前端隐藏当作权限控制。
- 不绕过 P0 的供应商隔离、专家隔离、报价保密、外部交易阻断、管理员业务隔离和审计日志。
- 不写死客户未确认的金额阈值、采购方式规则、审批链、评分模板和档案目录。
- 不伪造测试通过结果。
