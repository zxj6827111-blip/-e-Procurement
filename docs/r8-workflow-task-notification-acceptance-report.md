# R8 审批流 / 任务中心 / 消息通知主源化验收报告

日期：2026-06-25

适用工程：`E:\Software Development\‌e-Procurement`

## 1. 阶段口径与现状盘点结论

本轮按附件任务执行，将当前阶段冻结为“R8 审批流、任务中心和消息通知主源化”。需要说明的是，`docs/pdf-reverse-rd-r0-r10-implementation-plan.md` 中原路线仍写为 `R8=问卷/样板间/开业包`、`R9=审批流/任务/消息/审计`。本报告不修改原路线命名，只记录本轮实际执行口径：以附件定义的 R8 为准，问卷、样板间、开业包不在本轮范围内。

R8 开始前的盘点结论：

| 对象 | R8 前状态 | R8 处理结论 |
|---|---|---|
| 审批规则 | 已有 `approvalRules` 和 `r2_approval_rules`，但旧接口主要读写 `ctx.state` | 改为由 R8 仓储写入和读取 `r2_approval_rules`，旧审批规则接口保持兼容 |
| 审批实例 | 旧同步可按业务状态反推 `r2_approval_instances`，但不是统一主写入口 | 新增统一启动审批入口，写入 `r2_approval_instances` |
| 审批动作 | 旧同步有 `r2_approval_actions`，但动作语义分散 | 新增提交、同意、驳回、退回、撤回、取消动作留痕 |
| 任务中心 | 无正式任务主表 | 新增 `r2_task_items`，审批和业务待办统一写入 |
| 站内消息 | 只有定标结果通知等局部对象 | 新增 `r2_notifications`，站内消息生成、读取、已读状态主源化 |
| 外部通知 | 仅有 mock adapter 和局部结果通知 | 保留适配边界，不接真实短信、邮件、企微、OA |
| 审计 | 已有审计服务和敏感操作日志 | 审批动作继续写 R8 动作表；旧审计日志语义保持 |

仍保留到 R9/R10 的内容：

- 低代码流程设计器、复杂条件分支、多节点会签。
- 真实 OA、企业微信、短信、邮件联调。
- 正式 SSO、生产监控、正式支付、正式财务联调。
- 问卷、样板间、开业包等原路线 R8 能力。

## 2. Subagent 分工

本任务按用户要求使用 subagent 模式：

- 主代理负责：阶段口径判断、主源化设计、核心实现、业务接入、验证和验收报告。
- `code_mapper` 只读代理负责：定位现有审批、任务、消息、审计入口和主源分裂点。
- `task_dispatcher` 只读代理负责：拆分执行顺序、依赖、验收标准和适合委派的任务。
- `risk_reviewer` 只读代理负责：实现完成后的权限、兼容性、回归和测试缺口审查。

主代理保留了阶段边界、仓储边界和 R4/R5/R7 业务挂接这些关键路径，避免把跨阶段状态联动完全外包。

## 3. 新增 / 调整的 Repository、Route、Table 同步逻辑

新增：

- `apps/api/src/repositories/r8-workflow-task-repository.ts`
  - 统一处理审批规则、审批实例、审批动作、任务、站内消息。
  - 写入 `r2_approval_rules`、`r2_approval_instances`、`r2_approval_actions`、`r2_task_items`、`r2_notifications`。
  - 提供业务提交审批、处理审批动作、取消业务流程、任务完成、消息已读等能力。
  - 对采购方式做业务同义匹配，兼容“内部公开采购”和“内部公开招采”等历史命名差异。

- `apps/api/src/routes/workflow-task-routes.ts`
  - 新增统一 R8 API：审批规则、审批实例、审批动作、任务、通知。
  - 审批通过、驳回、取消后同步采购申请和定标审批业务状态。
  - 管理员不越权处理业务任务，审计只读。

调整：

- `apps/api/src/runtime/business-table-store.ts`
  - 扩展 `r2_approval_rules`、`r2_approval_instances`、`r2_approval_actions` 字段。
  - 新增 `r2_task_items`、`r2_notifications` 正式表。
  - 新增对象登记：`workflow_task`、`workflow_notification`。
  - 保持 `runtime_state` 兼容层，但 R8 写路径优先进入正式表。

- `apps/api/src/app-context.ts`
  - 注入 `R8WorkflowTaskRepository`。
  - 启动时同步已有审批规则，并派生已有专家评分和供应商退货处理任务。

- `apps/api/src/app.ts`
  - 注册统一 workflow/task/notification 路由。

- `apps/api/src/routes/organization-routes.ts`
  - 旧 `/approval-rules` API 改为经 R8 仓储写入正式规则表。
  - 扩展业务类型、组织范围、酒店范围、审批顺序、默认策略字段。

- `apps/api/src/routes/project-routes.ts`
  - 采购申请提交接入统一审批实例、任务和消息。
  - 旧审批接口保持兼容，严格角色审批放在 R8 workflow API。

- `apps/api/src/routes/award-routes.ts`
  - 定标提交接入统一审批实例、任务和消息。
  - 旧 mock approve 继续兼容 R5 测试和演示链路。

- `apps/api/src/routes/settlement-finance-routes.ts`
  - 结算单提交、发票上传、模拟付款台账接入统一审批。
  - 结算/发票审核时尽量同步 R8 审批动作，旧接口不因 workflow 状态差异回归。

- `apps/api/src/routes/mall-routes.ts`
  - 供应商退货处理任务写入 R8 任务中心。
  - 商城发票上传和审核接入发票审批任务。

## 4. 审批规则、实例和动作如何主源化

审批规则以 `r2_approval_rules` 为主源，覆盖：

- 规则编号、规则名称、业务类型。
- 适用组织/酒店范围。
- 金额阈值。
- 采购方式。
- 审批角色和审批顺序。
- 启用/停用、版本号、默认策略。

已覆盖的业务类型：

- `procurement_request`
- `award_approval`
- `settlement_bill`
- `invoice`
- `payment_request`
- 兼容预留：`archive_supplement`、`price_approval`、`mall_order`、`return_request`、`expert_scoring`

关键约束：

- 停用规则不能发起新审批。
- 金额阈值和采购方式必须稳定命中。
- 没有匹配规则时返回明确错误，默认策略为人工复核要求，不静默通过。
- 审批实例以 `r2_approval_instances` 为主源。
- 审批动作以 `r2_approval_actions` 为主源，记录提交、同意、驳回、退回、撤回、取消。
- 非当前处理角色/用户不能审批。
- 已完成实例不能重复审批。
- 驳回后同步业务对象状态。
- 重启后审批规则、实例和动作仍从正式表读取。

## 5. 任务中心如何生成、分派和完成

任务中心以 `r2_task_items` 为主源。任务对象包含：

- 任务编号、任务类型。
- 业务类型、业务 ID。
- 标题。
- 分配角色、分配用户。
- 来源审批实例。
- 状态、到期时间、创建时间、完成时间。

已覆盖任务类型：

- 待审批采购申请。
- 待审批定标。
- 待审核结算。
- 待审核发票。
- 待处理付款申请或模拟付款。
- 待供应商处理退货。
- 待专家评分。

角色视图：

- 采购/集团角色可看到采购申请、定标等授权任务。
- 财务和集团角色可处理结算、发票、付款相关任务。
- 供应商只能看到本企业补正、发票驳回、退货处理类任务。
- 专家只能看到分配给自己的评分任务。
- 审计人员只读查看轨迹，不能处理任务。
- 系统管理员不进入业务处理面。

## 6. 消息通知如何生成和已读

站内消息以 `r2_notifications` 为主源。消息对象包含：

- 消息编号、事件类型。
- 接收人或接收角色。
- 业务类型、业务 ID。
- 标题、内容摘要。
- 已读/未读、创建时间、读取时间。
- 预留 delivery channels 和外部事件状态。

已覆盖触发场景：

- 采购申请提交、通过、驳回。
- 定标提交、通过、驳回。
- 结算单提交、通过、驳回。
- 发票提交、通过、驳回。
- 付款申请或模拟付款提交。
- 供应商退货处理任务生成和完成。
- 专家评分任务生成。

本阶段不接真实短信、邮件、企业微信或 OA，只保留清晰的站内消息表和外部通知适配边界。

## 7. 已推进到 r2_* 主源的对象

R8 已推进到正式主源：

- 审批规则：`r2_approval_rules`
- 审批实例：`r2_approval_instances`
- 审批动作：`r2_approval_actions`
- 任务中心：`r2_task_items`
- 站内消息：`r2_notifications`

仍保留兼容结构：

- `runtime_state.payload_json`
- `ctx.state.approvalRules`
- `ctx.state.procurementRequests`
- `ctx.state.awardApprovals`
- R4/R5/R6/R7 旧接口响应对象

保留原因：

- 当前前端页面和旧 API 仍依赖这些响应结构。
- 本阶段目标是审批/任务/消息主源化，不做前端大规模重写。
- 兼容层用于旧入口和演示链路，不再作为 R8 新增对象的唯一主源。

## 8. API 入口

新增 R8 API：

- `GET /api/workflow/approval-rules`
- `POST /api/workflow/approval-rules`
- `PATCH /api/workflow/approval-rules/:ruleId`
- `GET /api/workflow/approval-instances`
- `POST /api/workflow/approval-instances`
- `POST /api/workflow/approval-instances/:instanceId/actions`
- `GET /api/workflow/tasks`
- `POST /api/workflow/tasks/:taskId/complete`
- `GET /api/workflow/notifications`
- `POST /api/workflow/notifications/:messageId/read`

保持兼容的旧入口：

- `/api/approval-rules`
- 采购申请提交/审批相关 API。
- 定标审批和 mock approve API。
- 结算、发票、模拟付款相关 API。
- 商城退货和商城发票相关 API。

## 9. 修改文件清单

主要修改：

- `apps/api/src/repositories/r8-workflow-task-repository.ts`
- `apps/api/src/routes/workflow-task-routes.ts`
- `apps/api/src/runtime/business-table-store.ts`
- `apps/api/src/app-context.ts`
- `apps/api/src/app.ts`
- `apps/api/src/types.ts`
- `apps/api/src/seed/data.ts`
- `apps/api/src/routes/organization-routes.ts`
- `apps/api/src/routes/project-routes.ts`
- `apps/api/src/routes/award-routes.ts`
- `apps/api/src/routes/settlement-finance-routes.ts`
- `apps/api/src/routes/mall-routes.ts`
- `apps/api/tests/r8-workflow-task-notification.test.ts`
- `docs/r8-workflow-task-notification-acceptance-report.md`

## 10. 新增 / 修改测试清单

新增测试：

- `apps/api/tests/r8-workflow-task-notification.test.ts`

覆盖内容：

- 审批规则查询、旧规则接口同步、启用/停用约束、无匹配规则阻止。
- 采购申请提交后生成审批实例、任务和消息。
- 非当前角色不能审批，供应商不能审批采购申请。
- 管理员不越权处理业务任务。
- 采购审批通过后任务完成、重复审批阻止。
- 通用 workflow 直启越权阻止，业务不存在和组织/供应商范围不一致阻止。
- 旧采购审批 API 回写后，正式 `wf:*` 审批实例和任务状态同步收敛。
- 驳回后业务状态同步，消息可读和已读状态更新。
- 定标、结算、发票、付款申请生成审批实例和任务。
- 结算审核、发票审核后，对应 R8 任务完成。
- 供应商退货任务生成并可由供应商完成。
- 专家评分任务只对对应专家可见。
- 审计不能审批。
- 审批规则过滤审计/管理员/系统角色，规则动作边界生效。
- API 重启后审批实例、任务和消息仍可读取。

回归测试重点：

- R4 采购申请提交审批链路。
- R5 定标审批、结果通知、定价链路。
- R6 商城退货和发票兼容链路。
- R7 结算、发票、模拟付款链路。
- P0 权限隔离链路。

## 11. 验证命令和结果

已执行：

- `npm.cmd --workspace @eprocurement/api run test -- r8-workflow-task-notification.test.ts`
  - 结果：1 个测试文件通过，5 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- r4-sourcing-procurement.test.ts`
  - 结果：1 个测试文件通过，3 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- r5-review-award-pricing.test.ts`
  - 结果：1 个测试文件通过，4 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- r7-settlement-finance.test.ts`
  - 结果：1 个测试文件通过，5 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- p0-permissions.test.ts`
  - 结果：1 个测试文件通过，17 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- phase5-award-result.test.ts`
  - 结果：1 个测试文件通过，7 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- phase9-full-flow.test.ts`
  - 结果：1 个测试文件通过，3 个测试通过。
- `npm.cmd run test:api`
  - 结果：29 个测试文件通过，172 个测试通过。
- `npm.cmd run typecheck`
  - 结果：API 和 Web 类型检查通过。
- `npm.cmd run build`
  - 结果：API 构建通过，Web 生产构建通过。

## 12. 重启留存验证结果

新增 R8 测试使用同一数据目录重新启动应用上下文后验证：

- `r2_approval_instances` 中的审批实例仍可读取。
- `r2_task_items` 中的任务仍可读取。
- `r2_notifications` 中的消息仍可读取。

因此本阶段的审批实例、任务和消息已经具备 API 重启后的正式表留存验证。

## 13. 浏览器验证说明

本阶段未修改前端页面、导航、样式或交互文件。变更集中在 API、仓储、SQLite 正式表、旧接口兼容层和 API 测试。

因此本阶段未做浏览器操作验收，原因是：

- 没有新增或改动可见页面。
- 旧前端依赖的 API 响应保持兼容。
- 已通过 API 全量回归、类型检查和 Web 生产构建验证兼容性。

如果下一阶段补“我的任务”统一页面或 Dashboard 待办入口，应补做浏览器验收，覆盖采购、财务、供应商、专家、审计和管理员边界。

## 14. 对 R0/R1/R2/R3/R4/R5/R6/R7 的兼容性影响

已验证：

- R4 采购申请和寻源采购测试通过。
- R5 评审、定标、定价和结果通知测试通过。
- R6 商城退货和发票挂接保持兼容。
- R7 结算、发票和模拟付款测试通过。
- P0 权限测试通过。
- 全量 API 回归通过。
- Web 类型检查和生产构建通过。

已处理的回归点：

- 定标审批提交曾因采购方式字面不一致被 R8 规则阻止；已改为业务同义匹配，兼容“内部公开采购”和“内部公开招采”。
- 新增测试曾因数据库查询泛型缺失导致类型检查失败；已修正。
- `risk_reviewer` 指出的通用 workflow 直启越权已关闭：普通业务账号不能直接创建审批实例，管理员人工发起也必须校验真实业务对象、组织和供应商范围。
- `risk_reviewer` 指出的旧阴影审批实例分叉已关闭：按业务回写审批动作时优先使用正式 `wf:*` 实例，旧采购审批 API 回写后正式任务会完成。
- 任务和消息读取边界已收紧：不再允许同组织泛读任务/消息，指定用户、指定角色、供应商、专家边界按接收对象过滤。
- 审批规则动作和处理角色已收紧：规则动作会在审批处理时生效，审计/管理员/系统角色不会被配置为业务审批处理人。

## 15. 当前判断与下一阶段建议

当前判断：

- 是否仍可客户 UAT：可以。R8 已完成后端主源化、业务约束、权限边界、重启留存和全量 API 回归，适合继续客户 UAT。
- 是否更适合小范围内网试运行：是。当前仍使用本地运行态和 mock 外部适配，适合受控内网试运行和业务人员验证，不建议直接扩大到生产。
- 是否可正式投产：不建议。正式投产仍缺正式数据库迁移评审、生产身份体系、OA/企微/短信/邮件/财务系统联调、监控、备份、安全测试和运维预案。

下一阶段建议：

1. 如果继续沿附件口径推进，优先补 R8 UI：统一“我的任务”和“消息中心”页面、Dashboard 待办入口、角色按钮隐藏和中文状态展示。
2. 如果回到原总路线，先处理阶段命名冲突：将本轮成果在路线图中标注为审批/任务/消息阶段，避免后续 R8/R9 文档错位。
3. R9/R10 应优先做外部系统适配、生产运维、对象存储、正式数据库迁移和安全验收，因为当前核心业务主源已经推进到可 UAT，但生产级外部依赖仍未闭合。
