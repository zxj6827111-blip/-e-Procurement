# R2 数据模型治理与正式持久化基线验收报告

生成日期：2026-06-25

## 1. R2 数据现状盘点结论

R0/R1 后系统已经达到受控客户 UAT 的可演示状态，但核心业务数据仍以 `runtime_state.payload_json` 的整包 JSON 快照为运行主源。R2 本次没有推翻现有路由和前端，而是在现有 SQLite/UAT 技术栈内建立正式表基线、幂等同步、迁移入口和回归测试，为 R3-R10 分域改造成正式 repository/service 主源预留空间。

### 已有正式表

- 运行基础：`runtime_state`、`auth_accounts`、`auth_sessions`、`stored_files`、`audit_logs`、`integration_jobs`。
- R1 业务同步表：`business_suppliers`、`business_organizations`、`business_users`、`business_approval_rules`、`business_procurement_requests`、`business_projects`、`business_bids`、`business_purchase_orders`、`business_settlement_materials`、`business_mall_products`、`business_mall_orders` 等。
- R2 新增正式基线表：`r2_*` 业务对象表，覆盖组织身份、供应商、商品报价、采购寻源、评审定标、订单履约、结算发票、审批审计。

### 同步表或派生表

- `business_*` 表仍是从 `SeedState`/runtime JSON 同步出来的查询型业务表，采用 delete/insert 刷新，不能作为长期生产主源。
- `r2_*` 表本阶段采用 upsert 同步，具备幂等和不删除未映射用户数据的保护，定位是正式持久化基线和后续主源迁移目标。
- `audit_logs` 已作为审计正式表写入，同时 R2 增加 `r2_file_access_logs` 等细分表用于文件访问审计建模。

### 仍主要依赖 JSON 快照

- 绝大多数 API 路由仍直接读写 `ctx.state`，包括供应商、采购申请、项目/询价、报名、报价、评审、定标、订单、收货、结算、商城、审批、审计等。
- `RuntimeStateStore.saveState()` 仍保存整包 `runtime_state.payload_json`，并在写请求结束时同步 `business_*` 和 `r2_*` 表。
- 本阶段保持兼容，不一次性改为按表加载业务状态，避免破坏 R0/R1 已修复的 UAT 流程。

### 只存在于 seed 或内存态的对象

- 商城商品、商城报价、商城订单、发货、退货、商城发票等运行时对象在空库初始 seed 中为空，API 写入后原先主要存在于内存/runtime JSON；R2 已同步到商品、SKU、报价、订单、发货、退货、发票等 `r2_*` 表。
- 某些流程型对象仍缺少完整业务主源服务，例如采购文件版本细化、定价报告正式业务流、金额勾稽明细、审批动作明细和外部系统对账，只在 R2 中建立了基线表和同步模型。

### R2 必须治理与后续阶段归属

- R2 已治理：核心对象表结构、迁移/初始化入口、seed/runtime 同步、重启留存、状态规则登记、黑名单/保密/封存/权限回归测试。
- R3 优先深化：供应商中心与商品/SKU/报价中心，将 `r2_suppliers`、`r2_products`、`r2_skus`、`r2_supplier_quotations` 逐步提升为 repository 主源。
- R4-R5 深化：采购申请、寻源项目、供应商邀请/报名、报价、响应文件、专家评分、定标报告。
- R6-R7 深化：订单、发货、收货、退货、结算、发票、金额勾稽。
- R8-R10 深化：报表、审批引擎、审计追溯、文件中心、外部集成、生产级数据库和对象存储。

## 2. 新增或调整的数据表、字段与迁移脚本

### 调整表字段

- `stored_files` 补齐 `deleted_at` 迁移字段，保持与文件软删除实现一致。

### R2 基线表

- 组织与账号：`r2_organizations`、`r2_departments_hotels`、`r2_roles`、`r2_users`、`r2_supplier_accounts`。
- 供应商域：`r2_suppliers`、`r2_supplier_qualifications`、`r2_supplier_admission_reviews`、`r2_supplier_service_regions`、`r2_supplier_category_authorizations`、`r2_supplier_restrictions`、`r2_supplier_evaluations`。
- 商品与报价域：`r2_products`、`r2_skus`、`r2_product_images`、`r2_supplier_quotations`、`r2_supplier_quotation_items`。
- 采购寻源域：`r2_procurement_requests`、`r2_procurement_request_items`、`r2_sourcing_projects`、`r2_supplier_invitations`、`r2_supplier_participations`、`r2_bids`、`r2_bid_line_items`、`r2_response_files`、`r2_clarifications`。
- 评审定标域：`r2_experts`、`r2_scoring_templates`、`r2_expert_scores`、`r2_comparison_reports`、`r2_award_decisions`、`r2_pricing_reports`。
- 订单履约域：`r2_purchase_orders`、`r2_order_line_items`、`r2_shipments`、`r2_receipts`、`r2_receipt_line_items`、`r2_returns`。
- 结算发票域：`r2_settlement_bills`、`r2_settlement_materials`、`r2_invoices`、`r2_amount_reconciliation_lines`。
- 审批与审计域：`r2_approval_rules`、`r2_approval_instances`、`r2_approval_actions`、`r2_file_access_logs`。
- 元数据与状态：`r2_migration_runs`、`r2_business_object_registry`、`r2_state_transition_rules`。

### 迁移与初始化

- `BusinessTableStore.migrate()` 在应用启动时幂等创建 R2 表和索引，支持空库初始化。
- `RuntimeStateStore.loadState()` 在加载 seed 或已有 `runtime_state` 后触发 `BusinessTableStore.syncState()`，支持 seed/runtime 数据迁移。
- `BusinessTableStore.syncR2BaselineState()` 使用 upsert 写入 R2 表，不删除 `r2_*` 中未映射的已有数据。
- 新增脚本 `npm.cmd run r2:migrate`，基于构建后的 API 代码执行同一套 SQLite 初始化与 R2 基线同步。脚本使用 `APP_DATA_DIR` 指定 UAT 数据目录。

回滚/备份建议：执行 R2 迁移前备份 `.data` 目录或目标 `runtime.sqlite` 文件。R2 新表为新增表，正常回滚可停用新代码并保留旧 runtime JSON；如需清理 R2 表，应先导出 `r2_*` 和 `audit_logs` 再按 DBA 流程处理，不建议直接删除用户数据。

## 3. 已明确数据主源的对象

R2 后，以下对象具备正式表承载和后续 repository 主源迁移目标：

- 用户、角色、组织、部门/酒店、供应商账号。
- 供应商基础资料、资质、准入审核、状态、黑名单/限制、供应商评价。
- 商品、SKU、商品图片、供应商报价、价格有效期、上下架状态。
- 采购申请、申请明细、项目/询价/招标、邀请、报名/参与、报价、响应文件、提问答疑。
- 专家、评分模板、专家评分、汇总/比较报告、定标记录、定价报告。
- 采购订单/商城订单、订单明细、发货、收货、异常收货、退货、供应商评价。
- 结算资料、结算单、发票、审核记录、金额勾稽。
- 审批规则、审批实例、审批动作、审计日志、文件访问日志。

注意：本阶段的“明确主源”是数据模型和持久化目标明确，运行读写主源仍保留 `ctx.state`/runtime JSON 作为兼容层。

## 4. 保留过渡结构与阶段归属

- `runtime_state.payload_json`：保留到 R3-R7 分域 repository 改造完成后逐步降级为兼容/快照/备份用途。
- `business_*` 表：保留为 R1/R2 兼容查询表，R3 起按域替换为 `r2_*` 正式表读写。
- 路由直接读写 `ctx.state`：R2 暂不大改路由，避免一次性破坏现有 API 和前端；R3/R4 开始按域抽 repository/service。
- 文件二进制仍为本地文件系统 + `stored_files`：R10 再接正式对象存储、病毒扫描、生命周期和外链策略。
- 审批仍偏配置和动作记录：R9 再补完整工作流引擎、节点实例和会签/退回规则。
- 外部交易和集成仍以适配器/操作记录为主：R10 再接真实接口、重试队列和对账。

## 5. 修改文件清单

- `apps/api/src/runtime/runtime-db.ts`
- `apps/api/src/runtime/business-table-store.ts`
- `apps/api/src/runtime/r2-state-rules.ts`
- `apps/api/src/runtime/index.ts`
- `apps/api/tests/r2-data-model-governance.test.ts`
- `scripts/r2-sqlite-baseline.mjs`
- `package.json`
- `docs/r2-data-model-governance-acceptance-report.md`

## 6. 新增/修改测试清单

新增 `apps/api/tests/r2-data-model-governance.test.ts`，覆盖：

- 空 SQLite 数据库初始化 R2 表、对象登记、状态规则和 seed/runtime 数据迁移。
- R2 upsert 幂等保护，不删除 `r2_*` 中非 runtime 映射的已有数据。
- 采购申请 API 写入 R2 正式表，并在同一数据目录重启后仍可查询。
- 商品、SKU、图片、供应商报价、结算资料、供应商限制状态同步到 R2 表。
- 采购申请、订单、供应商等状态流转规则校验。
- 项目非顺序状态流转不可绕过。
- 黑名单/限制供应商不得参与新报名。
- 档案封存后禁止直接上传结算资料。
- 报价截止前采购侧只看统计，不泄露报价明细。
- 供应商隔离、审计只读、文件下载权限保持不回退。

## 7. 验证命令结果

已通过：

- `npm.cmd run typecheck`：通过。API `tsc --noEmit` 与 Web `vue-tsc --noEmit` 均通过。
- `npm.cmd run test:api`：通过。23 个测试文件、147 个测试用例全部通过。
- `npm.cmd run build`：通过。API TypeScript 构建与 Web `vite build` 均通过。
- `npm.cmd run r2:migrate`：通过。临时 SQLite 数据目录生成 `r2-baseline-v1` 迁移记录，`r2_business_object_registry` 46 条，`r2_procurement_requests` 4 条，`r2_suppliers` 4 条，`r2_purchase_orders` 2 条，`r2_settlement_materials` 5 条。

## 8. 重启留存验证结果

R2 专项测试与迁移脚本已验证同一 `APP_DATA_DIR` 下：

- 第一次启动创建空库和 R2 表。
- 通过 API 新增采购申请并同步到 `r2_procurement_requests`、`r2_procurement_request_items`。
- 重新 `createAppContext()` 后，新增数据仍可从 SQLite 中查询。

- `npm.cmd run test:api` 的全量回归覆盖了重启留存、商城/订单/结算、权限隔离、文件权限和审计只读。
- `npm.cmd run r2:migrate` 验证了构建产物可在临时空数据目录完成 SQLite 初始化、seed/runtime 加载和 R2 基线同步。

## 9. 对 R0/R1 的兼容性影响

- 保持现有 API 路径、响应结构和前端兼容。
- 保持 `runtime_state` 兼容，不删除用户已有数据。
- 写请求仍通过原有 `stateStore.saveState()` 出口保存，R2 表同步为附加持久化能力。
- R0/R1 的权限隔离、报价保密、文件权限、审计只读、商城/订单/结算测试需通过全量 `test:api` 验证。

## 10. 当前投产判断

- 是否仍可客户 UAT：是。R2 后比 R0/R1 更适合受控客户 UAT，因为核心对象已有正式表基线和重启留存测试。
- 是否更适合小范围内网试运行：可以进入更严格的小范围内网试运行准备，但应限定为 UAT/试运行，不承诺生产 SLA。
- 是否仍不可正式投产：仍不可正式投产。原因包括：运行主源仍是 runtime JSON 兼容层；尚未接生产级数据库、对象存储、SSO、备份恢复、监控告警、真实外部接口和完整审批/对账能力。

## 11. R3 下一阶段建议

建议 R3 优先做供应商与商品中心，而不是直接推进采购寻源/询价招标域。

理由：

- 供应商、商品、SKU、报价是采购寻源、商城、订单和结算共同依赖的底座，主数据不稳会放大到后续所有交易流程。
- R2 已经为供应商和商品报价建立较完整表结构，R3 可用较小范围把 `r2_suppliers`、`r2_products`、`r2_skus`、`r2_supplier_quotations` 从同步表提升为 repository 主源。
- 供应商状态、黑名单、资质有效期、报价有效期和上下架状态是客户 UAT 中最容易被追问的规则，先治理能提高后续 R4/R5 采购寻源的可信度。
- 采购寻源/询价招标域对象更多、状态更复杂，适合在 R3 主数据稳定后进入 R4，减少跨域返工。
