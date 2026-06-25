# R4 采购寻源 / 询价 / 招标域主源迁移验收报告

生成时间：2026-06-25

## 1. 当前结论

R4 阶段已完成采购申请、采购申请明细、询价/招标项目、项目明细、供应商邀请、报名/参与、供应商报价、报价明细、响应文件、提问答疑的 R2/R4 正式表主源化闭环。

当前判断：
- 可继续用于客户 UAT 和小范围内网试运行。
- 仍不建议正式投产。
- 不建议正式投产的原因不是 R4 主链路未闭合，而是 R5-R10 的专家评审深化、定标定价报告、商城下单、订单履约、结算发票、审批流配置、外部系统联调仍未完成生产级闭环。

## 2. R4 现状盘点结论

已可用能力：
- 采购申请可新增、编辑草稿、删除草稿、提交、审批、方法决策、转项目。
- 项目可从采购申请创建，可发布采购文件、公告，可生成供应商邀请。
- 供应商可在可见公告下报名，受 R3 供应商准入、限制名单、品类授权约束。
- 供应商可创建报价草稿、提交、撤回、重提，响应文件走统一文件中心。
- 报价截止前采购方只能看到脱敏汇总，供应商只能看本企业报价。
- 项目已有种子答疑记录，R4 新增了答疑 API，支持供应商提问、采购方答复、公开或私有可见范围。

R4 前主要缺口：
- `apps/api/src/routes/project-routes.ts`、`procurement-participation-routes.ts`、`bid-routes.ts` 主要直接操作 `ctx.state`。
- `apps/api/src/runtime/business-table-store.ts` 已有 `r2_procurement_requests`、`r2_sourcing_projects`、`r2_supplier_invitations`、`r2_supplier_participations`、`r2_bids`、`r2_bid_line_items`、`r2_response_files`、`r2_clarifications`，但更偏同步基线，不是统一数据访问入口。
- 项目明细之前主要保存在项目对象的 `sourceLineItems` 兼容字段中，没有独立正式表。
- 答疑之前没有完整业务 API，只能通过项目种子字段和 R2 同步留存。

本阶段留给 R5-R10：
- 专家评审、评分汇总、定标审批、定价报告深化。
- 样品接收登记的完整业务页面和文件归档。
- 商城下单、订单履约、结算、发票、外部系统联调。
- 审批流模板配置器和跨业务审批实例编排。

## 3. 主源化实现

新增 `apps/api/src/repositories/r4-sourcing-repository.ts`：
- 统一封装 R4 寻源域正式表读写。
- 写入采购申请和明细：`r2_procurement_requests`、`r2_procurement_request_items`。
- 写入项目和项目明细：`r2_sourcing_projects`、新增 `r2_sourcing_project_items`。
- 写入邀请和报名：`r2_supplier_invitations`、`r2_supplier_participations`。
- 写入报价、报价明细和响应文件：`r2_bids`、`r2_bid_line_items`、`r2_response_files`。
- 写入答疑：`r2_clarifications`。
- 启动时从正式表回灌兼容对象，保持现有 API 和页面数据结构不变。

调整 `apps/api/src/runtime/business-table-store.ts`：
- 扩展 R4 相关正式表字段，补充预算标签、审批信息、附件 JSON、项目要求、参与供应商、报价税率、响应摘要、响应文件大小、答疑状态等字段。
- 新增 `r2_sourcing_project_items`，避免项目明细只放在 JSON/兼容对象里。
- 增加旧库缺列补列迁移和索引。
- 补充对象登记：`sourcing_project_item`。

调整 `apps/api/src/app-context.ts`：
- 注入 `R4SourcingRepository`。
- 应用启动时执行 R4 正式表到兼容状态回灌。

调整 `apps/api/src/routes/project-routes.ts`：
- 采购申请创建、编辑、删除、取消、提交、审批、方法决策均写入 R4 repository。
- 从申请创建项目时同步更新采购申请和项目正式表。
- 自动生成采购申请明细 ID 时加入申请 ID 前缀，避免不同申请的默认 `line-1` 在正式表主键冲突。

调整 `apps/api/src/routes/procurement-participation-routes.ts`：
- 采购文件/公告推动项目状态时同步项目正式表。
- 公告发布和追加邀请时同步 `r2_supplier_invitations`。
- 供应商报名和资格审核时同步 `r2_supplier_participations`，并更新项目参与供应商。
- 新增答疑接口：
  - `GET /api/projects/:projectId/clarifications`
  - `POST /api/projects/:projectId/clarifications`
  - `POST /api/projects/:projectId/clarifications/:clarificationId/answer`

调整 `apps/api/src/routes/bid-routes.ts`：
- 报价草稿、编辑、提交、撤回、重提、锁定均写入 R4 repository。
- 响应文件继续通过统一文件中心落盘，R4 只维护业务关联。

调整 `apps/api/src/types.ts`：
- `ProjectClarificationRecord` 增加 `status` 和 `askedAt`，兼容已有已答复记录。

## 4. 已推进为正式表主源的对象

已完成：
- 采购申请：`r2_procurement_requests`
- 采购申请明细：`r2_procurement_request_items`
- 询价/招标项目：`r2_sourcing_projects`
- 项目明细：`r2_sourcing_project_items`
- 供应商邀请：`r2_supplier_invitations`
- 报名/参与：`r2_supplier_participations`
- 报价主表：`r2_bids`
- 报价明细：`r2_bid_line_items`
- 响应文件业务关联：`r2_response_files`
- 提问答疑：`r2_clarifications`

仍保留兼容结构：
- `runtime_state.payload_json` 和 `ctx.state` 仍保留，用于现有 API 响应、前端页面和旧测试兼容。
- 采购文件、公告本身仍以现有运行态结构为主，R4 只把其对项目状态、邀请、报名和报价的影响写入正式表；完整采购文件模板、公告版本和附件要求深化可在后续阶段继续拆表。
- 报价版本仍保留在现有 `bidVersions` 结构中，R4 已把当前报价状态和响应文件主关联落入正式表；更细的版本表可随 R5 评审/定标报告一并深化。

## 5. 测试覆盖

新增 `apps/api/tests/r4-sourcing-procurement.test.ts`，覆盖：
- 采购申请创建、编辑、提交写入 `r2_procurement_requests`。
- 采购申请明细写入 `r2_procurement_request_items`。
- 从采购申请创建项目写入 `r2_sourcing_projects` 和 `r2_sourcing_project_items`。
- 发布项目后供应商邀请写入 `r2_supplier_invitations`。
- 供应商报名写入 `r2_supplier_participations`。
- 限制供应商不能参与。
- 报价草稿、提交、撤回、重提写入 `r2_bids`。
- 报价明细写入 `r2_bid_line_items`。
- 响应文件写入 `r2_response_files`，并继续受报价/文件权限控制。
- 提问答疑写入 `r2_clarifications`。
- 截止前报价保密。
- 供应商隔离、审计只读、系统管理员业务边界通过既有全量测试回归。
- API 重启后采购申请、项目、参与、报价、响应文件和答疑仍可读取。
- R1/R2/R3 既有测试全量回归通过。

## 6. 验证结果

已执行并通过：
- `npm.cmd run typecheck`
  - API TypeScript 通过
  - Web `vue-tsc` 通过
- `npm.cmd run test:api`
  - 25 个测试文件通过
  - 154 个测试通过
- `npm.cmd run build`
  - API 构建通过
  - Web 构建通过
  - Vite 生产构建通过

专项验证：
- `npm.cmd --workspace @eprocurement/api run test -- r4-sourcing-procurement.test.ts`
  - 1 个测试文件通过
  - 3 个 R4 专项测试通过

重启留存验证：
- R4 专项测试使用同一临时数据目录启动两次 API。
- 第二次启动后验证：
  - `r2_procurement_requests` 可读。
  - `r2_sourcing_projects` 可读。
  - `r2_supplier_participations` 可读。
  - `r2_bids` 可读。
  - `r2_clarifications` 可读。
  - 项目详情 API 可返回正式表回灌后的项目明细。
  - 供应商报价汇总 API 可看到本企业报价。
  - 响应文件仍可从文件中心下载。

## 7. 浏览器验证说明

本阶段未修改前端页面、导航或交互；API 响应结构保持现有页面兼容。因此未额外做浏览器角色流验证。

前端相关页面已纳入只读盘点：
- `apps/web/src/pages/ProcurementRequestsPage.vue`
- `apps/web/src/pages/ProjectInitiationPage.vue`
- `apps/web/src/pages/ProcurementDocumentsPage.vue`
- `apps/web/src/pages/AnnouncementsInvitationsPage.vue`
- `apps/web/src/pages/SupplierRegistrationPage.vue`
- `apps/web/src/pages/BiddingPage.vue`
- `apps/web/src/pages/BidControlPage.vue`
- `apps/web/src/pages/ProjectWorkbenchPage.vue`
- `apps/web/src/pages/FileCenterPage.vue`
- `apps/web/src/pages/AuditPage.vue`

如下一阶段改动前端可见流程，应再补浏览器验证：酒店采购创建申请、采购管理员发布项目、供应商报名报价上传文件、采购方截止后查看比价、审计只读、系统管理员业务隔离。

## 8. 对 R0/R1/R2/R3 的兼容影响

- R0/R1：采购申请、项目创建、删除草稿、取消、审批、方法决策旧 API 保持兼容。
- R2：正式表治理继续保留；R4 扩展字段使用缺列补列迁移，旧 SQLite 可启动。
- R3：供应商限制、准入和品类授权仍引用 `R3SupplierProductRepository` 主源，不回退到旧内存供应商状态。
- 文件中心：响应文件不新增孤立存储，仍使用 `stored_files` 和既有文件权限策略。
- 权限：全量权限与阶段测试通过，系统管理员业务隔离、审计只读、供应商隔离未回退。

## 9. 风险与限制

- R4 已完成采购寻源主链路正式表主源化，但采购文件模板、公告字段、报价版本历史仍保留部分兼容结构，后续可继续拆分正式表。
- 答疑 API 覆盖基础提问、答复、公开/私有范围；答疑附件、通知、修改留痕可在后续阶段深化。
- 样品接收登记属于 R4/R5 边界能力，本次未新增完整业务页面和样品正式表。
- 截止后比价、专家评审、定标和定价报告应进入 R5，而不是继续塞入 R4。

## 10. 下一阶段建议

建议 R5 优先做专家评审、评分汇总、定标和定价报告，而不是继续扩大 R4。

理由：
- R4 主链路已经能形成采购申请、寻源项目、供应商参与、报价、响应文件、答疑和保密控制的闭环。
- 当前最影响客户 UAT 深度的是“截止后如何评审、汇总、定标、出报告、留痕和审批”，这正是 R5 的业务主线。
- 若继续在 R4 增加边缘字段，收益低于补齐评审/定标链路。
