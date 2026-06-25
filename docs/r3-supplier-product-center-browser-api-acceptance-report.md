# R3 供应商 / 商品中心浏览器与 API 联合验收报告

生成时间：2026-06-25 13:11:44 +08:00

## 结论

本轮 R3 浏览器与 API 联合验收结论：Go。

供应商中心、商品中心、报价主源迁移在本轮专项范围内可进入受控 UAT 继续使用。采购经办人可查看供应商档案与商品中心，供应商端只展示本企业资料和本企业商品；受限供应商在 API 和页面上均不能继续报名；商品上架约束、图片可见性、报价主源字段和中文状态已完成闭环验证。

该结论仅覆盖“供应商中心 / 商品中心 / 报价主源迁移”的 R3 专项范围，不代表全系统生产上线结论。

## 验收前置

已先读取：

- `docs/r3-supplier-product-center-acceptance-report.md`
- `docs/r2-data-model-governance-acceptance-report.md`
- `apps/api/src/repositories/r3-supplier-product-repository.ts`
- `apps/api/src/routes/supplier-routes.ts`
- `apps/api/src/routes/mall-routes.ts`
- `apps/api/src/routes/procurement-participation-routes.ts`
- `apps/web/src/pages/SupplierManagementPage.vue`
- `apps/web/src/pages/SupplyMallPage.vue`
- `apps/web/src/pages/SupplierRegistrationPage.vue`

验收环境：

- API：`http://127.0.0.1:3103`
- Web：`http://127.0.0.1:5177`
- 数据目录：`output/r3-browser-acceptance-data`
- 模式：local，SQLite 可用，Mock 登录可用

## 问题清单与修复

| 编号 | 问题 | 影响 | 修复 |
|---|---|---|---|
| R3-Browser-01 | 商品中心页面只展示商品状态和图片，未展示报价主源字段。 | API 中 `activePrice` 已存在，但采购侧页面无法验收报价金额、审批状态、交付天数。 | `apps/web/src/pages/SupplyMallPage.vue` 增加“报价”列，展示销售价、采购价、交付天数、中文审批状态。 |
| R3-Browser-02 | 商品中心页面没有显式下架入口。 | API 支持 `delisted`，但浏览器无法证明上下架闭环。 | `apps/web/src/pages/SupplyMallPage.vue` 增加“下架”按钮，并在下架后显示“已下架”，禁用下单。 |
| R3-Browser-03 | 受限供应商报名页仍展示可报名公告，页面未提前提示受限状态。 | 只能在提交后依赖 API 拦截，UAT 用户容易误解为仍可继续参与。 | `apps/web/src/pages/SupplierRegistrationPage.vue` 加载本企业供应商状态，受限时显示中文拦截原因并禁用提交。 |
| R3-Browser-04 | 受限报名 API 错误文案为英文。 | API 验收与页面错误不符合中文业务状态要求。 | `apps/api/src/routes/procurement-participation-routes.ts` 将 `SUPPLIER_RESTRICTED` message 改为中文。 |

## 浏览器与 API 验证步骤

1. API 健康检查：`GET /health` 返回 `status=ok`、SQLite ready、fileStorage ready。
2. API 创建验收商品：上传 `r3-browser-product-zh.png`，创建 `R3浏览器验收商品-中文`，提交报价，审批为 `approved`，上架为 `listed`。
3. API 验证报价主源：`GET /api/mall/products` 返回商品 `activePrice`，包含 `salePrice=128`、`purchasePrice=95`、`deliveryDays=3`、`approvalStatus=approved`。
4. API 验证缺图片上架约束：缺图片商品上架返回 `400 MALL_PRODUCT_LISTING_BLOCKED`，中文 message 为“商品缺少图片，不能上架。”
5. API 限制供应商：将 `sup-1` 置为 restricted，供应商报名 `POST /api/announcements/ann-pre-1/registrations` 返回 `403 SUPPLIER_RESTRICTED`，中文 message 为“供应商已列入限制名单，不能继续参与内部采购项目报名。”
6. 浏览器采购经办人视角：登录 `u2/pass-u2`，进入“供应商档案”，可见 4 家供应商，`sup-1` 与 `sup-4` 显示“受限”，其余显示“已准入”。
7. 浏览器供应商视角：通过角色切换到 `u3`，进入“供应商档案”，仅可见 `上海棉织供应链有限公司 / sup-1`，选择框也只有本企业一项。
8. 浏览器受限报名视角：供应商进入“报名资料”，页面显示“当前供应商已列入限制名单，不能继续参与报名”，提交按钮禁用。
9. 浏览器商品中心：采购经办人进入“供应链商城”，可见商品图片缩略图、中文商品名、`已上架`、报价列“销售价 128 元 / 采购价 95 元 / 3 天交付 / 已批准”。
10. 浏览器下架闭环：点击中文验收商品行的“下架”，页面提示“商品已下架”，该行状态变为“已下架”，下单按钮禁用，操作切换为“定价上架”。

## 页面证据摘要

采购经办人供应商档案：

- `上海棉织供应链有限公司`：准入状态 `受限`
- `苏州洁雅清洁服务有限公司`：准入状态 `已准入`
- `杭州鲜达食材配送有限公司`：准入状态 `已准入`
- `浙江恒修工程服务有限公司`：准入状态 `受限`

供应商端供应商档案：

- 仅显示 `上海棉织供应链有限公司`
- 未显示 `苏州洁雅清洁服务有限公司`、`杭州鲜达食材配送有限公司`、`浙江恒修工程服务有限公司`

商品中心：

- `R3浏览器验收商品-中文`
- SKU：`SKU-R3-BROWSER-ZH-001`
- 图片：`r3-browser-product-zh.png`，浏览器 `<img>` 预览可见
- 报价：`销售价 128 元 / 采购价 95 元 / 3 天交付 / 已批准`
- 下架后状态：`已下架`

## 修复文件

- `apps/web/src/pages/SupplyMallPage.vue`
- `apps/web/src/pages/SupplierRegistrationPage.vue`
- `apps/api/src/routes/procurement-participation-routes.ts`

## 验证命令

已通过：

```text
npm.cmd run typecheck
npm.cmd --workspace @eprocurement/api run test -- r3-supplier-product-center.test.ts
npm.cmd run test:api
npm.cmd run build
```

结果：

- TypeScript / Vue 类型检查通过。
- R3 API 专项测试通过：1 个测试文件、4 个测试用例通过。
- API 全量回归通过：26 个测试文件、158 个测试用例通过。
- API 编译与 Web 生产构建通过。

## 风险与边界

- 本轮使用本地 SQLite 与本地文件存储，适合 R3 受控 UAT 验收，不代表生产级数据库、对象存储、SSO、备份和监控能力已完成。
- 本轮有一条早期验收准备数据因 Windows 控制台编码写入为问号，仅用于发现问题，不作为最终中文页面证据；最终中文页面证据使用 `R3浏览器验收商品-中文`。
- 商城订单、支付、结算、发票外部集成不在本轮 R3 专项范围内。

## 最终判断

Go。

R3 供应商中心 / 商品中心 / 报价主源迁移在浏览器和 API 联合验收下已满足本轮通过条件。后续最小高价值动作是进入 R4/R5 前，对采购寻源和报价响应主源迁移继续做同类“API + 浏览器 + 权限隔离 + 中文状态”联合验收。
