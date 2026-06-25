# R7 结算 / 发票 / 对账 / 资金台账主源化验收报告

日期：2026-06-25

适用工程：`E:\Software Development\‌e-Procurement`

## 1. R7 现状盘点结论

R7 对齐 PDF 第 47-49 页：供应商结算、结算发票上传、酒店资金余额与授信。R7 开始前，系统已有商城订单、收货、退货、结算资料和商城发票的演示入口，但结算单、发票审核、金额勾稽和资金台账没有形成统一主源。

盘点结论如下：

| 对象 | R7 前状态 | R7 处理结论 |
|---|---|---|
| 结算资料 | 已有 `SettlementMaterial` 和 `r2_settlement_materials` 基线 | 保留兼容对象，写入改由 R7 仓储统一落表 |
| 结算单 | 旧同步会按订单派生 `settlement:${orderId}` 影子行 | 停止旧派生，正式结算单由 R7 接口显式生成 |
| 结算明细 | 无独立明细表 | 新增 `r2_settlement_bill_items`，从订单明细、收货、退货生成 |
| 发票 | 旧 `mallSettlementInvoices` / `r2_invoices` 混合来源 | R7 发票以 `r2_invoices.settlement_bill_id` 为主源，旧商城入口降级为兼容入口 |
| 对账 | 旧同步会按订单总额派生 `order-total:${orderId}` | 停止旧派生，R7 按结算单生成 `settlement:${billId}` 对账行 |
| 资金台账 | 无正式对象 | 新增 `r2_fund_ledger_entries`，支持模拟付款台账留痕 |

仍保留给后续阶段：

- 真实资金余额、充值、授信额度占用和真实支付清算。
- 外部财务、银行、ERP、WMS 和 OA 联调。
- 生产级支付安全、对账批处理、异常冲正和审计报表。

## 2. Subagent 分工与风险处理

本任务按用户要求使用 subagent 模式。

- 主代理负责：读取本地材料、设计主源化方案、实现 R7 仓储/路由/表结构/测试、运行验证、撰写验收报告。
- `code_mapper` 只读代理负责：定位 R7 相关入口、旧主源分裂点、应修改文件和风险区域。
- `risk_reviewer` 只读代理负责：二次审查实现后的权限、数据主源、金额正确性和测试缺口。

`risk_reviewer` 指出的阻塞项已处理：

- 停止 `runtime JSON` 按订单派生影子结算单、影子发票和影子对账行。
- 修复跨酒店买方审核结算资料和商城发票的越权风险。
- 限制 `serviceFeeRate` 范围为 0 到 1，阻止负服务费抬高应结金额。
- 结算单审核要求先提交后审核，阻止 `draft -> approved` 直接跳转。
- 补充非法资料类型、非法资金台账状态、跨酒店审核、读接口不写库和影子记录缺失的测试。

## 3. 新增 / 调整的 Repository、Route、Table 同步逻辑

新增：

- `apps/api/src/repositories/r7-settlement-finance-repository.ts`
  - 统一处理结算单生成、供应商提交、酒店审核、结算资料、发票、对账和资金台账。
  - 写入 `r2_settlement_bills`、`r2_settlement_bill_items`、`r2_settlement_materials`、`r2_invoices`、`r2_amount_reconciliation_lines`、`r2_fund_ledger_entries`。
  - 启动和写入后回灌 `ctx.state.settlementMaterials`、`ctx.state.mallSettlementInvoices`，仅用于旧页面/旧接口兼容。

- `apps/api/src/routes/settlement-finance-routes.ts`
  - 新增 `/api/settlement-finance/overview`。
  - 新增结算单生成、提交、审核、资料上传/审核、发票上传/审核、资金台账创建接口。
  - 按角色限制：供应商只能操作本企业，酒店采购/集团采购按 `orgScope`，审计只读，管理员隔离。

调整：

- `apps/api/src/app-context.ts`
  - 注入 `R7SettlementFinanceRepository`。
  - 应用启动后执行 R7 正式表到兼容状态回灌。
- `apps/api/src/app.ts`
  - 注册 `settlementFinanceRoutes(ctx)`。
- `apps/api/src/runtime/business-table-store.ts`
  - 新增对象登记：`settlement_bill_item`、`fund_ledger_entry`。
  - 新增 `r2_settlement_bill_items`、`r2_fund_ledger_entries`。
  - 扩展结算单、结算资料、发票、对账表字段。
  - 停止由 `runtime_state.payload_json` 派生 R7 正式结算单、发票和对账行。
- `apps/api/src/routes/mall-routes.ts`
  - 旧商城发票上传入口改为复用 R7 结算单和发票主源。
  - 旧商城发票审核入口增加所属结算单/酒店范围校验。
- `apps/api/src/routes/project-workbench-routes.ts`
  - 旧结算资料上传和核验入口复用 R7 仓储。
- `apps/api/src/routes/file-routes.ts`
  - 补齐 `mall_order` 文件读写边界，支持 R7 资料/发票附件按订单归属校验。

## 4. 订单、收货、退货如何生成结算单

R7 结算单生成规则：

1. 采购订单必须已收货，或至少存在正式收货记录。
2. 结算单从 `r2_purchase_orders`、`r2_order_line_items`、`r2_receipts`、`r2_returns` 读取事实数据。
3. 订单金额来自订单明细。
4. 收货金额来自已收货数量乘以单价。
5. 退货金额来自退货数量乘以单价。
6. 服务费按 `receivedAmount - returnAmount` 乘以服务费率计算。
7. 应结金额为 `receivedAmount - returnAmount - serviceFee`。
8. 同一订单同一账期禁止重复有效结算单。

## 5. 发票、对账和资金台账主源

发票规则：

- 供应商或允许的采购侧角色可上传发票。
- 发票必须绑定结算单。
- 发票金额必须大于 0。
- 税额不得小于 0，且不得超过发票金额。
- 待审核和已审核发票累计金额不得超过结算金额。
- 发票审核按结算单所属酒店范围校验。

对账规则：

- R7 每次生成结算单、提交、审核、上传/审核发票时更新对账行。
- 对账行 ID 为 `settlement:${settlementBillId}`。
- `expected_amount` 为结算金额，`actual_amount` 为发票累计金额。
- 当前规则下超额发票在上传时被阻止，因此对账状态主要用于留痕和后续异常扩展。

资金台账规则：

- 资金台账写入 `r2_fund_ledger_entries`。
- 未审核通过结算单不能创建付款台账。
- 已审核通过发票金额不足时不能全额模拟付款。
- 台账备注明确“R7 模拟付款台账，仅作本系统台账留痕，不代表真实资金清算”。

## 6. 数据主源迁移说明

已推进到 `r2_*` 主源的对象：

- 结算单：`r2_settlement_bills`
- 结算明细：`r2_settlement_bill_items`
- 结算资料：`r2_settlement_materials`
- 发票：`r2_invoices`
- 对账行：`r2_amount_reconciliation_lines`
- 资金台账：`r2_fund_ledger_entries`

仍保留的兼容结构：

- `ctx.state.settlementMaterials`
- `ctx.state.mallSettlementInvoices`
- `business_settlement_materials`
- `business_mall_invoices`

保留原因：

- 旧项目工作台和商城接口仍依赖这些响应结构。
- R7 不改前端页面、导航和交互，避免扩大本阶段范围。
- 兼容层只从 R7 正式表回灌，不再反向伪造 R7 正式结算单、发票和对账行。

## 7. 权限边界

已验证的边界：

- 供应商只能查看/上传/提交本企业结算单、资料和发票。
- 其他供应商看不到本企业之外的 R7 数据。
- 采购/集团采购只能按 `orgScope` 查看和审核。
- 其他酒店采购不能审核本酒店之外的结算资料或商城发票。
- 审计人员只读，不能创建结算单。
- 管理员不能进入业务结算读写面。

## 8. 修改文件清单

主要修改：

- `apps/api/src/repositories/r7-settlement-finance-repository.ts`
- `apps/api/src/routes/settlement-finance-routes.ts`
- `apps/api/src/routes/mall-routes.ts`
- `apps/api/src/routes/project-workbench-routes.ts`
- `apps/api/src/routes/file-routes.ts`
- `apps/api/src/app-context.ts`
- `apps/api/src/app.ts`
- `apps/api/src/runtime/business-table-store.ts`
- `apps/api/tests/r7-settlement-finance.test.ts`
- `docs/r7-settlement-finance-acceptance-report.md`

辅助验证脚本：

- `output/r7-browser-api-smoke.mjs`

该脚本用于尝试本地 API/页面烟测，不作为最终验收必需项。

## 9. 测试覆盖

新增 R7 测试文件：

- `apps/api/tests/r7-settlement-finance.test.ts`

覆盖内容：

- 已收货订单生成结算单。
- 写入结算单明细、结算单和对账行。
- 同订单同账期重复生成阻止。
- 未收货订单阻止生成结算单。
- 负服务费率阻止。
- 退货扣减应结金额。
- 供应商提交结算申请。
- 资料上传、非法资料类型阻止、资料审核。
- 超额发票阻止。
- 发票写入 `r2_invoices`。
- 未审核结算不能付款。
- 草稿结算单不能直接审核。
- 发票审核后对账。
- 资金台账写入 `r2_fund_ledger_entries`。
- 非法资金台账状态阻止。
- API 重启后结算单、发票和资金台账可读取。
- 供应商隔离、酒店隔离、审计只读、管理员隔离。
- 跨酒店资料审核和商城发票审核返回 403。
- `GET /settlement-finance/overview` 不再隐式创建结算单。
- 非 GET 保存后不再出现 `settlement:${orderId}` 影子结算单和 `order-total:${orderId}` 影子对账行。

## 10. 验证命令和结果

已执行：

- `npm.cmd --workspace @eprocurement/api run test -- r7-settlement-finance.test.ts`
  - 结果：1 个测试文件通过，5 个测试通过。
- `npm.cmd --workspace @eprocurement/api run test -- stage11-supply-mall.test.ts`
  - 结果：1 个测试文件通过，3 个测试通过。
- `npm.cmd run test:api`
  - 结果：28 个测试文件通过，167 个测试通过。
- `npm.cmd run typecheck`
  - 结果：API 和 Web 类型检查通过。
- `npm.cmd run build`
  - 结果：API 构建通过，Web 生产构建通过。

## 11. 前端兼容与浏览器验证说明

本阶段未修改前端页面、导航或交互文件。R7 主要变更位于 API、仓储、SQLite 表结构和旧接口兼容层。

因此本阶段没有把浏览器页面操作作为必需验收项，改用以下证据证明兼容性：

- Stage 11 商城端到端 API 回归通过，覆盖商品、报价、购物车、下单、发货、收货、退货、发票和场景模板旧流程。
- 全量 API 回归通过。
- Web 类型检查通过。
- Web 生产构建通过。

曾尝试 `output/r7-browser-api-smoke.mjs` 做本地烟测，但中途受本机既有开发服务端口占用影响，未作为最终验收证据。该脚本后续可在干净端口环境下继续复用。

## 12. R0-R6 兼容性

R7 没有改动前端体验面，也没有改变 R3-R6 的核心入口 URL。旧商城发票上传/审核入口仍保留，并复用 R7 正式发票主源。

兼容性验证：

- R7 定向测试通过。
- Stage 11 旧商城流程通过。
- 全量 API 回归通过。
- 类型检查和构建通过。

已知兼容策略：

- 旧商城发票入口如果传入退货前订单总额，会按当前 R7 可结算金额收敛，避免超额发票污染正式表。
- 旧结算资料入口继续返回 `settlementMaterial`，但写入由 R7 仓储完成。

## 13. 当前可用性判断

当前判断：

- 可继续用于客户 UAT：是。
- 更适合小范围内网试运行：是。
- 不建议直接正式投产：是。

不建议投产的原因：

- 资金台账仍是模拟付款，不是真实资金清算。
- 酒店余额、充值、授信额度和支付占用尚未形成完整账户体系。
- 缺外部财务、银行、ERP、WMS、OA 的正式联调。
- 缺生产级监控、备份恢复、安全压测和审计报表。
- 仍保留 `runtime_state.payload_json` 兼容层，后续阶段应继续降级其业务主源地位。

## 14. 下一阶段建议

R8 建议优先做审批流、任务中心和消息通知，而不是继续扩大 R7。

建议顺序：

1. 结算单、发票、付款申请进入统一审批流。
2. 建立待办任务中心，按角色展示待提交、待审核、待付款、待补正事项。
3. 建立消息通知和操作提醒。
4. 再扩展真实资金账户、授信额度、充值和支付占用。
5. 最后接外部财务和银行接口。

如果下一阶段直接做真实资金账户，应先明确资金账户模型、授权边界、冲正规则和外部系统责任边界，否则容易把模拟台账误升级为真实支付系统。
