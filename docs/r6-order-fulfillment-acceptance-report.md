# R6 商城下单 / 订单履约 / 收货评价主源化验收报告

日期：2026-06-25

适用工程：`E:\Software Development\‌e-Procurement`

## 1. R6 现状盘点结论

R6 开始前，项目已有 `mall-routes.ts`、`SupplyMallPage.vue` 和 `business_mall_*` 兼容表，能够完成商品、报价、购物车、订单、发货、收货、退货、发票和场景模板的演示链路。

盘点结论如下：

| 对象 | R6 前状态 | R6 处理结论 |
|---|---|---|
| 商城商品 | 已由 R3 商品中心同步到 `r2_products` / `r2_skus` / `r2_product_images`，同时保留 `business_mall_products` | 继续复用 R3 主源，R6 不重复建商品主数据 |
| 商城价格 | 已有 `r2_supplier_quotations` 供应商报价基线；R5 已有 `r2_pricing_reports` / `r2_pricing_report_items` | R6 打通商城价格来源，优先 R5 定价报告明细，降级 R3 已审批有效报价 |
| 购物车 | 原来只在 `ctx.state.mallCartItems` | 新增 `r2_cart_items`，同时保留兼容状态 |
| 商城订单 | 原来主要写 `ctx.state.mallOrders` / `business_mall_orders` | 推进到 `r2_purchase_orders` 和 `r2_order_line_items` 主源 |
| 发货 | 原来写 `ctx.state.mallShipments`，并同步到 `r2_shipments` 基线 | 改为 R6 仓储直接写 `r2_shipments` |
| 收货 | 原商城只改订单状态，旧采购工作台有 `r2_receipts` 基线 | 改为 R6 仓储直接写 `r2_receipts` / `r2_receipt_line_items` |
| 退货 | 原来写 `ctx.state.mallReturnRequests`，并同步到 `r2_returns` 基线 | 改为 R6 仓储直接写 `r2_returns` |
| 供应商评价 | R3/R7 已有评价能力，商城页缺入口 | R6 新增商城订单评价接口，写 `r2_supplier_evaluations` 并更新供应商评分展示 |
| 发票、资金、结算 | 已有商城发票和结算材料过渡能力 | 按目标保留为 R7-R10，不作为 R6 主体完成口径 |

仍保留给 R7-R10：

- 真实支付、余额、授信和资金流水。
- 完整结算单、发票审核、对账和付款。
- 外部物流、ERP、财务、WMS、OA 正式联调。
- 审批流配置器和生产级对象存储。

## 2. 新增 / 调整的 Repository、Route、Table 同步逻辑

新增：

- `apps/api/src/repositories/r6-order-fulfillment-repository.ts`
  - 统一处理商城可售价格来源、购物车、下单、供应商确认、发货、收货、异常收货、退货、供应商评价。
  - 写操作直接落 `r2_*` 正式表，再同步 `ctx.state` 兼容层。
  - 启动时从 `r2_*` 正式表回灌兼容状态，支持 API 重启后读取。

调整：

- `apps/api/src/app-context.ts`
  - 注入 `R6OrderFulfillmentRepository`。
  - 启动后执行 R6 正式表到兼容状态回灌。
- `apps/api/src/routes/mall-routes.ts`
  - 商品列表返回 `priceSource`、`sourceTrace`、`saleable`、`blockReasons`。
  - 购物车新增、修改、删除、清空写 `r2_cart_items`。
  - 下单写 `r2_purchase_orders`、`r2_order_line_items`。
  - 供应商确认、发货、酒店收货、异常收货、退货和评价统一走 R6 仓储。
  - 保持原有 `/api/mall/*` 响应形态基本兼容。
- `apps/api/src/runtime/business-table-store.ts`
  - 新增 `r2_cart_items`。
  - 扩展 `r2_purchase_orders`：`payment_status`、`buyer_id`、`org_id`、`department_id`、`invoice_title`。
  - 扩展 `r2_order_line_items`：`product_id`、`sku_id`、`price_source_type`、`price_source_id`、`price_source_item_id`。
  - 扩展 `r2_shipments`：联系人、预计到货、发货数量。
  - 扩展 `r2_receipts` / `r2_receipt_line_items`：附件文件 ID、订单明细关联。
  - 扩展 `r2_returns`：订单明细关联和处理意见。
  - 扩展 `r2_supplier_evaluations`：评价描述和改进建议。
- `apps/api/src/routes/file-routes.ts`
  - `mall_order` 文件上传允许订单所属酒店采购上传验收附件，同时保留供应商本企业边界。
- `apps/api/src/services/audit-service.ts`
  - 增强审计日志 ID 生成，避免复用旧 SQLite 或多进程残留时出现 `audit_logs.id` 撞号导致 500。
- `apps/web/src/pages/SupplyMallPage.vue`
  - 展示价格来源。
  - 增加异常收货、验收附件、评价、供应商处理退货入口。

## 3. 定价报告 / 报价如何进入商城价格来源

商城价格来源按以下顺序解析：

1. 优先查 `r2_pricing_report_items`，关联 `r2_pricing_reports`，要求报告状态为 `generated` 或 `approved`，且明细未过期。
2. 若无 R5 定价报告明细，降级查 `r2_supplier_quotations` 和 `r2_supplier_quotation_items`，要求报价状态为 `approved` 且未过期。
3. 下单时把价格来源写入 `r2_order_line_items.price_source_type`、`price_source_id`、`price_source_item_id`，可追溯到定价报告或报价单。

拦截规则：

- 商品未上架不得加入购物车或下单。
- 缺少有效价格不得上架和下单。
- 供应商未准入或已受限不得上架和下单。
- 超出供货区域不得加入购物车或下单。
- 数量必须大于 0。

## 4. 已从 runtime JSON / ctx.state 推进为 r2_* 主源的对象

已推进：

- 购物车：`r2_cart_items`
- 订单：`r2_purchase_orders`
- 订单明细：`r2_order_line_items`
- 发货：`r2_shipments`
- 收货：`r2_receipts`
- 收货明细：`r2_receipt_line_items`
- 退货：`r2_returns`
- 供应商评价：`r2_supplier_evaluations`

继续复用既有主源：

- 商品：`r2_products`、`r2_skus`、`r2_product_images`
- R3 报价：`r2_supplier_quotations`、`r2_supplier_quotation_items`
- R5 定价报告：`r2_pricing_reports`、`r2_pricing_report_items`

## 5. 仍保留兼容结构及原因

保留：

- `runtime_state.payload_json`
- `ctx.state.mallProducts`
- `ctx.state.mallPrices`
- `ctx.state.mallCartItems`
- `ctx.state.mallOrders`
- `ctx.state.mallShipments`
- `ctx.state.mallReturnRequests`

原因：

- 现有前端和旧 API 测试仍消费兼容对象结构。
- R6 采用渐进式主源化，避免一次性重写前端和所有旧路由。
- 新增仓储层已保证读写优先从 `r2_*` 正式表回灌，兼容层不再作为 R6 主源。

## 6. 修改文件清单

- `apps/api/src/app-context.ts`
- `apps/api/src/repositories/r6-order-fulfillment-repository.ts`
- `apps/api/src/routes/mall-routes.ts`
- `apps/api/src/routes/file-routes.ts`
- `apps/api/src/runtime/business-table-store.ts`
- `apps/api/src/services/audit-service.ts`
- `apps/api/src/types.ts`
- `apps/api/tests/r6-order-fulfillment.test.ts`
- `apps/web/src/pages/SupplyMallPage.vue`
- `docs/r6-order-fulfillment-acceptance-report.md`

## 7. 新增 / 修改测试清单

新增：

- `apps/api/tests/r6-order-fulfillment.test.ts`

覆盖：

- R5 定价报告优先于 R3 报价进入商城价格来源。
- 无有效价格、报价过期、供应商受限、超出供货区域时阻止上架或下单。
- 购物车和下单写入正式表。
- 下单写 `r2_purchase_orders`、`r2_order_line_items`。
- API 重启后订单仍可读取。
- 供应商只能查看和确认本企业订单。
- 发货写 `r2_shipments`。
- 收货写 `r2_receipts`、`r2_receipt_line_items`。
- 收货数量不能超过订单数量。
- 异常收货和验收附件通过文件中心留痕。
- 退货写 `r2_returns`，退货数量不能超过已收货数量。
- 供应商评价写 `r2_supplier_evaluations`。
- 酒店隔离、供应商隔离、审计只读、系统管理员边界。

回归：

- `stage11-supply-mall.test.ts`
- `r5-review-award-pricing.test.ts`
- `r3-supplier-product-center.test.ts`
- 全量 `npm.cmd run test:api`

## 8. typecheck / test:api / build 结果

已执行并通过：

- `npm.cmd run typecheck`
  - API TypeScript 通过
  - Web `vue-tsc` 通过
- `npm.cmd run test:api`
  - 27 个测试文件通过
  - 162 条测试通过
- `npm.cmd run build`
  - API 构建通过
  - Web 构建通过
  - Vite 生产构建通过

## 9. 重启留存验证结果

R6 专项测试使用同一临时数据目录启动两次 API。

第一轮启动完成：

- 创建商品和有效价格。
- 创建订单。
- 写入 `r2_purchase_orders` 和 `r2_order_line_items`。
- 发货、收货、异常收货、退货、评价分别写入正式表。

第二轮启动后验证：

- `/api/mall/orders` 仍可读取重启前创建的订单。
- `r2_purchase_orders` 中仍存在对应订单。
- 订单明细、发货、收货、退货和评价均留存在 `r2_*` 正式表中。

## 10. 浏览器验证结果

已启动本地 API 和 Web：

- API：`http://127.0.0.1:3000/health`
- Web：`http://127.0.0.1:5173/supply-mall`

验证结果：

- 酒店采购人员 `u2`：
  - 商城页面可见商品、价格来源、图片和下单按钮。
  - 点击“加入购物车并下单”后生成订单 `MO-20260625-42279`。
  - 供应商发货后可点击“收货”，订单状态变为已收货。
  - 对订单 `MO-20260625-72320` 点击“异常收货”，页面提示“异常收货已登记”，接口状态进入 `return_requested` 异常/退货处理链路。
  - 可点击“评价”，页面提示“供应商履约评价已提交”。
- 供应商 `u3`：
  - 只能看到本企业 `sup-1` 商品和订单。
  - 可点击“确认发货”，订单状态变为已发货。
  - 页面提供退货处理入口。
- 审计人员 `u5`：
  - 商品和订单可只读查看。
  - 操作列显示“只读”，没有下单、发货、收货、退货、评价按钮。
- 系统管理员 `u6`：
  - 导航仅显示系统配置。
  - 访问商城时被路由带回首页，没有业务维护入口。

说明：

- 浏览器准备数据时曾发现旧本地数据目录可能触发 `audit_logs.id` 冲突，已通过 `AuditService.nextAuditId()` 修复。
- 浏览器验证中终端有中文显示乱码，是 Windows 控制台编码问题；浏览器页面业务控件、状态和接口行为已验证。

## 11. 对 R0/R1/R2/R3/R4/R5 的兼容性影响

- R0/R1：未改变登录、导航基础结构和通用接口形态。
- R2：新增/扩展正式表字段均为幂等迁移；`runtime_state` 兼容层继续保留。
- R3：商品、SKU、供应商、报价继续复用 R3 主源；供应商受限和供货区域规则被 R6 下单引用。
- R4：未改变采购申请、询价、报名、报价、答疑、响应文件主链。
- R5：定价报告和定价报告明细继续由 R5 仓储生成；R6 只读取并追溯，不改 R5 生成规则。
- 既有全量 API 回归通过，未发现 R0/R1/R2/R3/R4/R5 测试回退。

## 12. 当前判断

是否仍可客户 UAT：可以。R6 商城下单、履约、发货、收货、异常收货、退货、评价已经具备可演示闭环，且有 API 与浏览器证据。

是否更适合小范围内网试运行：是。当前 SQLite 和本地文件存储可支撑小范围 UAT / 内网试运行，但仍是过渡生产能力。

是否仍不可正式投产：是，不建议直接生产上线。正式投产仍缺正式数据库治理、对象存储、SSO、外部物流/ERP/财务/WMS/OA 联调、监控备份、安全测试和完整 R7 结算资金链。

## 13. 下一阶段建议

建议 R7 优先做结算、发票、对账和资金台账，而不是继续扩大 R6。

理由：

- R6 已把商城订单、发货、收货、退货和评价推进为 `r2_*` 正式主源。
- 订单已具备金额、收货、退货和评价数据，下一步自然进入结算单、发票、对账和资金占用。
- 若继续扩大 R6，容易把物流联调、财务审核和资金支付提前混入，偏离 R6/R7 边界。

R7 建议重点：

- 根据已收货订单、退货记录和服务费生成结算单。
- 供应商发票上传和酒店财务审核。
- 订单金额、退货金额、应结金额、发票金额的勾稽。
- 支付占位状态升级为资金台账或模拟支付流水。
