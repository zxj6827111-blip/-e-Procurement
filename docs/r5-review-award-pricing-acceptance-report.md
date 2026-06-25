# R5 专家评审 / 定标 / 定价报告主源迁移验收报告

生成时间：2026-06-25

## 1. 当前结论

R5 阶段已完成“报价截止后”的专家评审、评分汇总、比价/评审汇总、定标审批和定价报告主源化闭环。

当前判断：
- 可继续用于客户 UAT 和小范围内网试运行。
- 仍不建议正式投产。
- 不建议正式投产的原因不是 R5 主链路未闭合，而是 R6-R10 的商城下单、订单履约、结算发票深化、审批引擎、生产数据库、对象存储、SSO、备份监控和外部系统联调仍未完成生产级闭环。

## 2. R5 现状盘点结论

R5 前已可用能力：
- 专家目录、专家抽取/指定/替换、回避/纪律/保密确认。
- 专家本人任务和评分单查看。
- 评分保存、提交锁定、重评申请和重评审批。
- 评分汇总、评审报告生成/冻结。
- 报价截止后比价报告生成/冻结。
- 定标推荐、定标审批、结果通知和内部公示。
- 通用审计日志、评分版本日志和敏感动作留痕。

R5 前主要缺口：
- `expert-review-routes.ts` 直接读写 `ctx.state.expertAssignments`、`ctx.state.scoringSheets`、`ctx.state.scoringVersions`、`ctx.state.reviewReports`。
- `bid-routes.ts` 直接生成和冻结 `ctx.state.comparisonReports`。
- `award-routes.ts` 直接维护 `ctx.state.awardApprovals`，没有独立定价报告业务对象。
- `business-table-store.ts` 已有 `r2_experts`、`r2_scoring_templates`、`r2_expert_scores`、`r2_comparison_reports`、`r2_award_decisions`、`r2_pricing_reports`，但更偏同步基线，不是统一数据访问入口。
- 专家分配没有正式表；定价报告只有从比价报告派生的 JSON 基线，没有正式明细表。

本阶段继续留给 R6-R10：
- 完整商城下单、购物车、订单履约、支付、结算、发票、资金余额、外部系统正式联调。
- 采购订单、收货、结算、发票对象进一步主源化。
- 生产级审批流配置器、对象存储、SSO、监控告警和备份恢复。

## 3. 主源化实现

新增 `apps/api/src/repositories/r5-review-award-repository.ts`：
- 启动时从 R5 正式表回灌兼容状态。
- 统一读写专家、专家分配、评分模板、评分单、比价报告、定标记录、定价报告和定价报告明细。
- 保持现有 API 响应结构不变，现有前端页面无需同步改动。

调整 `apps/api/src/runtime/business-table-store.ts`：
- 新增正式表 `r2_expert_assignments`。
- 新增正式表 `r2_pricing_report_items`。
- 扩展 `r2_experts.account_user_ids_json`，承载专家账号绑定。
- 扩展 `r2_expert_scores.opinion`、`r2_expert_scores.details_json`，承载评分意见和明细。
- 扩展 `r2_award_decisions.approval_opinion`、`r2_award_decisions.adapter_call_id`。
- 扩展 `r2_pricing_reports.award_approval_id`、`report_no`、`created_by`、`approved_at`。
- 新增 R5 对象登记和相关索引。

调整 `apps/api/src/app-context.ts`：
- 注入 `R5ReviewAwardRepository`。
- 应用启动后执行 R5 正式表到兼容状态回灌。
- 对旧 runtime state 补齐 `pricingReports` 空数组兼容。

调整 `apps/api/src/types.ts` 和 `apps/api/src/seed/data.ts`：
- 新增 `PricingReport`、`PricingReportItem` 类型。
- `ComparisonReportRow` 增加技术分、服务分、价格分、专家总分、最终分和评分提交数。
- seed 兼容状态增加 `pricingReports`。

调整 `apps/api/src/runtime/r2-state-rules.ts`：
- 新增 `expert_assignment`、`expert_score`、`comparison_report`、`award_decision`、`pricing_report` 状态流转规则。
- 状态规则继续写入 `r2_state_transition_rules`。

调整 `apps/api/src/routes/expert-review-routes.ts`：
- 专家分配、替换、确认后写入 `r2_expert_assignments`。
- 评分保存、提交锁定、重评状态变化后写入 `r2_expert_scores`。
- 报价截止前禁止评分、评分汇总和评审报告生成。
- 项目进入评审态时同步 R4 项目正式表。

调整 `apps/api/src/routes/bid-routes.ts`：
- 比价报告生成/冻结写入 `r2_comparison_reports`。
- 比价行保留原有价格排序兼容语义，同时补充专家评分均分字段。
- 报价截止前继续禁止生成正式比价报告。

调整 `apps/api/src/routes/award-routes.ts`：
- 定标创建、提交、审批状态变化写入 `r2_award_decisions`。
- 定标前校验报价已截止、供应商在候选范围内、存在已提交或锁定报价、供应商未受限。
- 新增 `POST /api/projects/:projectId/pricing-reports` 生成定价报告。
- 新增 `GET /api/projects/:projectId/pricing-reports` 查询定价报告。
- 定价报告写入 `r2_pricing_reports`，明细写入 `r2_pricing_report_items`。

调整 `apps/api/src/routes/project-workbench-routes.ts`：
- 工作台聚合返回 `pricingReports`。
- 供应商角色继续隐藏定标审批和定价报告。

## 4. 已推进为正式表主源的对象

已完成：
- 专家主数据：`r2_experts`
- 专家分配：`r2_expert_assignments`
- 评分模板：`r2_scoring_templates`
- 专家评分：`r2_expert_scores`
- 比价/评审汇总：`r2_comparison_reports`
- 定标记录：`r2_award_decisions`
- 定价报告：`r2_pricing_reports`
- 定价报告明细：`r2_pricing_report_items`

仍保留兼容结构：
- `runtime_state.payload_json` 和 `ctx.state` 仍保留，用于现有 API 响应、前端页面和旧测试兼容。
- `reviewReports` 仍作为现有评审报告兼容结构保留；本阶段正式定标主链可依赖冻结评审报告或冻结比价报告。
- `scoringVersions` 仍保留在兼容状态和审计日志视图中；评分单主体已写入 `r2_expert_scores`。
- 结果通知、内部公示仍保持 R5 现有兼容状态，未单独拆正式表；它们属于定标后通知/公示能力，后续可随 R9 审批审计深化。

## 5. 测试覆盖

新增 `apps/api/tests/r5-review-award-pricing.test.ts`，覆盖：
- 专家分配写入 `r2_expert_assignments`，确认状态写入正式表。
- 专家评分写入 `r2_expert_scores`，提交后锁定并保留评分意见。
- 比价报告写入 `r2_comparison_reports`，报告行包含专家评分均分。
- 定标审批写入 `r2_award_decisions`。
- 定价报告写入 `r2_pricing_reports`，定价明细写入 `r2_pricing_report_items`。
- API 重启后专家任务和定价报告仍可读取。
- 专家只能查看和评分自己的任务。
- 供应商不能读取评分汇总、定标审批和定价报告。
- 审计只读边界和系统管理员业务边界不回退。
- 报价截止前不能评分、汇总、生成比价报告或定标。
- 不能定标未提交/未锁定报价供应商。
- 不能定标受限供应商。

既有全量回归覆盖：
- R1/R2/R3/R4 既有 API 测试未回退。
- 报价保密、供应商隔离、审计只读、系统管理员业务隔离继续通过。

## 6. 验证结果

已执行并通过：
- `npm.cmd --workspace @eprocurement/api run test -- r5-review-award-pricing.test.ts`
  - 1 个测试文件通过
  - 4 个 R5 专项测试通过
- `npm.cmd --workspace @eprocurement/api run test -- r2-data-model-governance.test.ts`
  - 1 个测试文件通过
  - 5 个 R2 数据治理测试通过
- `npm.cmd run typecheck`
  - API TypeScript 通过
  - Web `vue-tsc` 通过
- `npm.cmd run test:api`
  - 26 个测试文件通过
  - 158 个测试通过
- `npm.cmd run build`
  - API 构建通过
  - Web 构建通过
  - Vite 生产构建通过

重启留存验证：
- R5 专项测试使用同一临时数据目录启动两次 API。
- 第二次启动后验证：
  - `r2_expert_assignments` 中新增专家任务回灌到 `/api/projects/:projectId/expert-assignments`。
  - `r2_pricing_reports` 与 `r2_pricing_report_items` 中新增定价报告回灌到 `/api/projects/:projectId/pricing-reports`。
  - 评分、比价、定标和定价报告均可在正式表中查询到对应记录。

## 7. 浏览器验证说明

本阶段未修改前端页面、导航或交互；后端保持现有专家评审、比价、定标和工作台接口响应字段兼容。

已安排只读前端兼容性盘点，结论为：
- `ExpertReviewPage.vue`、`AwardResultPage.vue`、`BidControlPage.vue`、`ProjectWorkbenchPage.vue`、`SupplyMallPage.vue`、`AuditPage.vue` 直接消费现有 API 字段。
- 本阶段新增 repository 不改变现有字段名和结构，前端无需同步改动。
- 新增定价报告接口当前没有强制页面依赖；工作台已兼容返回 `pricingReports`，供应商端隐藏。

因此本阶段未单独执行浏览器角色流验证。若下一阶段把定价报告做成可见页面或调整导航，应补浏览器验证：采购管理员生成定价报告、专家评分锁定、供应商不可见评分/定价报告、审计只读、系统管理员业务隔离。

## 8. 对 R0/R1/R2/R3/R4 的兼容影响

- R0/R1：保持 API 路径和前端响应结构兼容。
- R2：R2 正式表治理继续保留；本阶段新增表和补列均为幂等迁移，旧 SQLite 可启动。
- R3：供应商限制状态继续引用 R3 供应商主源；受限供应商不得定标。
- R4：报价、响应文件和比价上游继续引用 R4 正式表与兼容对象；比价报告生成仍要求报价已截止和报价已锁定。
- 权限：供应商隔离、专家任务隔离、审计只读、系统管理员业务隔离未回退。

## 9. 风险与限制

- 评分版本 `scoringVersions` 和评审报告 `reviewReports` 仍保留在兼容结构中；R5 已完成评分主体、汇总、定标和定价报告主源化，后续可再拆评分版本和评审报告正式表。
- 定价报告明细已正式拆表，但价格算法按 R5 阶段最小闭环采用中选报价加默认服务费率生成，后续若客户确认更细的销售定价规则，需要把服务费、毛利、税率、有效期审批做成配置。
- 结果通知和内部公示未单独拆正式表；当前继续作为定标后兼容能力保留。
- 未新增前端可视化定价报告页面；目前主要通过 API 和工作台聚合字段支撑。

## 10. 下一阶段建议

建议 R6 优先做商城下单与订单履约主源化，而不是继续扩大 R5。

理由：
- R5 后，截止后评审、比价、定标和定价报告已经形成可持久化闭环。
- 当前客户 UAT 下一步最自然会追问“定价报告如何进入商城价格、如何下单、如何履约收货”。
- 若继续打磨 R5 边缘字段，收益低于把定标/定价结果向 R6 商城订单和履约链路打通。

R6 建议重点：
- 定价报告到商城价格来源的衔接。
- 商城商品可见价格来源校验。
- 商城订单、订单明细、供应商确认、发货、收货、异常履约正式表主源。
- 供应商和酒店角色在订单履约中的数据隔离。
- 订单金额、收货数量、评价、结算资料的后续勾稽入口。
