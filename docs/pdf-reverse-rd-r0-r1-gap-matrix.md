# PDF 逆向研发 R0 + R1 缺口对标矩阵

版本：V1.0

日期：2026-06-25

适用范围：最终版本升级改造第一阶段 R0 + R1

## 1. 矩阵口径

本文基于以下资料建立第一阶段对标矩阵：

- `docs/hotel-procurement-standardization-final-implementation-plan.md`
- `docs/pdf-reverse-rd-r0-r10-implementation-plan.md`
- 独立验收清单：`C:\Users\zxj68\Downloads\hotel_supply_chain_acceptance_checklist.md`

两份主方案关系如下：

- 酒店采购招采规范化小模块方案，是现有系统成果保留和招采闭环改造基础，强调复用已有供应商、采购申请、项目、报价、评审、定标、履约、文件、审计、权限和项目工作台能力。
- PDF 逆向研发 R0-R10 方案，是面向最终完整酒店供应链、商城、结算、审批、审计系统形态的升级路线。
- 第一阶段统一口径是：保留现有招采成果，先冻结最终 PDF 对标基线，再修复现有系统的中文显示、上传预览、入口、CRUD 和角色主路径可用性；不提前实施 R2-R10 的数据库治理、供应商/商品全生命周期、完整商城资金、问卷、样板间、审批流引擎、外部集成和生产化大功能。

## 2. 覆盖结论

`docs/pdf-reverse-rd-r0-r10-implementation-plan.md` 已列出 PDF 第 1-54 页目标功能清单，页码完整，无缺页。本文在其基础上补齐第一阶段验收所需字段：

- 当前系统覆盖情况。
- 页面入口。
- API 入口。
- 数据对象。
- 第一阶段缺口。
- 后续阶段归属。

覆盖状态定义：

| 状态 | 含义 |
|---|---|
| 已覆盖 | 当前系统已有可点击页面、API、数据对象和基本权限控制，R1 仅做体验修复 |
| 部分覆盖 | 当前系统已有骨架或局部能力，但字段、状态、页面动作或业务深度不足 |
| R1 修复 | 属于第一阶段必须修到可 UAT 点击的可用性问题 |
| 后续开发 | 不属于第一阶段实现范围，进入 R2-R10 |
| 不开发业务功能 | PDF 展示页或结束页，不作为系统业务功能 |

## 3. PDF 54 页逐页矩阵

| PDF 页码 | 目标功能 | 当前覆盖情况 | 页面入口 | API 入口 | 数据对象 | 缺口与第一阶段处理 | 后续阶段 |
|---|---|---|---|---|---|---|---|
| 1 | 平台总览、供应链协同、阳光采购、商城、结算、审批、审计整体入口 | 部分覆盖，Dashboard、模块总览、项目工作台、商城、文件中心已存在 | `/`、`/modules`、`/project-workbench`、`/supply-mall`、`/file-center` | `GET /health`、`GET /api/projects`、`GET /api/mall/products`、`GET /api/files` | `ProcurementProject`、`MallProduct`、`StoredFileRecord`、`AuditLog` | R1 保证导航不是空壳，中文入口清晰，角色菜单收敛 | R9、R10 补任务中心、流程、生产化 |
| 2 | 供应商账号注册、企业基础信息、联系人、协议确认 | 部分覆盖，有供应商档案维护和报名入口，正式注册流程不足 | `/suppliers`、`/supplier-registration` | `GET /api/suppliers`、`POST /api/suppliers/admissions`、`PATCH /api/suppliers/:id/profile` | `Supplier`、`SupplierRegistration` | R1 保证供应商资料和附件可维护；正式开户注册归 R3 | R3 |
| 3 | 注册资料补充、手机号、账号密码验证码、企业资料上传 | 部分覆盖，企业资料和资质附件可上传，短信/验证码未做 | `/suppliers` | `POST /api/files/upload-multipart`、`PATCH /api/suppliers/:id/profile` | `Supplier`、`StoredFileRecord` | R1 修复真实文件选择、预览下载；账号注册细节后续 | R3、R10 |
| 4 | 采购方手动登记潜在供应商 | 已覆盖基础能力 | `/suppliers` | `POST /api/suppliers/admissions` | `Supplier` | R1 保证新增、编辑、资质上传入口可点击 | R3 补供应商来源、性质、生命周期字段 |
| 5 | 供应商资质初审、通过/驳回/补资料、审核意见 | 部分覆盖 | `/suppliers` | `POST /api/suppliers/:id/reviews` | `SupplierAdmissionReview` | R1 保证评审结果中文显示；补资料深度归后续 | R3 |
| 6 | 资质材料查看、文件校验、状态流转、审计只读 | 部分覆盖，文件权限和下载审计已有 | `/suppliers`、`/file-center`、`/audit` | `GET /api/files`、`GET /api/files/:id/download`、`GET /api/audit-logs` | `StoredFileRecord`、`AuditLog` | R1 保证图片预览、下载、替换、作废与权限拒绝 | R3、R9 |
| 7 | 准入评估、评分、结论、转正 | 部分覆盖 | `/suppliers` | `POST /api/suppliers/:id/reviews`、`POST /api/suppliers/:id/status` | `SupplierAdmissionReview`、`Supplier` | R1 保证可录入评分和结论；评分表模板后续 | R3 |
| 8 | 供应商考核、评分、等级、风险、黑名单 | 部分覆盖，有评价、限制/解除状态雏形 | `/suppliers`、`/project-workbench` | `POST /api/suppliers/:id/restrictions`、`POST /api/project-workbench/purchase-orders/:id/evaluations` | `SupplierEvaluation`、`Supplier` | R1 保证限制、评价状态中文；完整等级模型后续 | R3、R6 |
| 9 | 封样登记、图片、说明、接收人、时间 | 部分覆盖 | `/suppliers` | `POST /api/suppliers/:id/seal-samples`、`POST /api/files/upload-multipart` | `SupplierSealSample`、`StoredFileRecord` | R1 保证封样图片真实上传和预览 | R3 |
| 10 | 商品新建、编码、规格、分类、税务、图片 | 部分覆盖，商城商品基础对象已有 | `/supply-mall` | `POST /api/mall/products`、`POST /api/files/upload-multipart` | `MallProduct`、`StoredFileRecord` | R1 保证商品不是空壳、图片可预览；完整商品主数据后续 | R3 |
| 11 | 采购申请创建、编辑、提交、审批、明细、附件 | 已覆盖主要能力 | `/procurement-requests` | `POST /api/procurement-requests`、`PATCH /api/procurement-requests/:id`、`POST /api/procurement-requests/:id/submit`、`POST /api/procurement-requests/:id/approve` | `ProcurementRequest`、`ProcurementRequestLineItem` | R1 保证附件真实上传、草稿删除、取消、中文状态 | R4 |
| 12 | 创建询价单、供应商范围、报价规则、截止、附件 | 部分覆盖，由项目公告/采购文件/邀请承载 | `/procurement-documents`、`/announcements-invitations` | `POST /api/projects/:id/procurement-documents`、`POST /api/projects/:id/announcements` | `ProcurementDocument`、`ProcurementAnnouncement` | R1 只保证入口和文件可用；询价单对象化后续 | R4 |
| 13 | 询价明细、邀请、多轮报价、截止控制 | 部分覆盖 | `/announcements-invitations`、`/bidding`、`/bid-control` | `POST /api/announcements/:id/invitations`、`POST /api/projects/:id/bids` | `SupplierInvitation`、`Bid` | R1 保证供应商报价保存/提交/撤回；多轮询价后续 | R4 |
| 14 | 供应商询价报价、含税价、税率、交期、质保、说明 | 部分覆盖 | `/bidding` | `POST /api/projects/:id/bids`、`PATCH /api/bids/:id`、`POST /api/bids/:id/submit` | `Bid`、`BidLineItem` | R1 保证响应文件真实上传、状态中文 | R4 |
| 15 | 截止后报价汇总和横向比价 | 已覆盖部分 | `/bid-control`、`/project-workbench` | `GET /api/projects/:id/bids/summary`、`GET /api/project-workbench/projects/:id` | `Bid`、`ComparisonReport` | R1 保证截止前保密、截止后按角色显示 | R4 |
| 16 | 发起招标、公告、须知、评标办法、文件要求 | 部分覆盖 | `/procurement-documents`、`/announcements-invitations` | `POST /api/projects/:id/procurement-documents`、`POST /api/projects/:id/announcements` | `ProcurementDocument`、`ProcurementAnnouncement` | R1 保证采购文件发布/修订/作废入口；完整招标文件要求后续 | R4 |
| 17 | 评审专家维护、范围、账号、启用 | 部分覆盖 | `/expert-review`、`/permissions` | `GET /api/experts`、`POST /api/projects/:id/expert-assignments` | `Expert`、`ExpertAssignment` | R1 只保证专家入口不空；专家库维护后续 | R5 |
| 18 | 供应商开始应标或放弃应标 | 部分覆盖，供应商报名和报价存在，开始/放弃应标动作不足 | `/supplier-registration`、`/bidding` | `POST /api/announcements/:id/registrations`、`POST /api/bids/:id/withdraw` | `SupplierRegistration`、`Bid` | R1 保证报名、报价、撤回主路径；开始/放弃应标后续 | R5 |
| 19 | 供应商查看公告、须知、文件要求、评标办法 | 部分覆盖 | `/supplier-registration`、`/procurement-documents` | `GET /api/announcements`、`GET /api/procurement-documents` | `ProcurementAnnouncement`、`ProcurementDocument` | R1 保证供应商只能看可见公告和锁定文件 | R5 |
| 20 | 应标报价、税率、品牌型号、交货期、质保 | 部分覆盖 | `/bidding` | `POST /api/projects/:id/bids`、`PATCH /api/bids/:id` | `Bid` | R1 保证报价草稿/提交/撤回/重提可点；完整商品维度后续 | R5 |
| 21 | 提问答疑、公开/私有答疑、附件 | 部分覆盖，项目工作台可展示答疑记录，交互不足 | `/project-workbench` | `GET /api/project-workbench/projects/:id` | `ClarificationRecord` | R1 只展示；新增提问答复后续 | R4 |
| 22 | 按文件要求上传资质、商务、技术、报价文件 | 部分覆盖 | `/supplier-registration`、`/bidding`、`/file-center` | `POST /api/files/upload-multipart` | `StoredFileRecord`、`SupplierRegistration`、`Bid` | R1 保证报名资料、响应文件真实上传和下载 | R5 |
| 23 | 提交应标，提交后锁定，撤回规则 | 部分覆盖 | `/bidding` | `POST /api/bids/:id/submit`、`POST /api/bids/:id/withdraw`、`POST /api/bids/:id/resubmit` | `Bid`、`BidVersion` | R1 保证按钮和中文状态；严格必传校验后续 | R5 |
| 24 | 截标、开评标、生成评审任务 | 部分覆盖 | `/bid-control`、`/expert-review` | `POST /api/projects/:id/bid-lock`、`POST /api/expert-assignments` | `BidViewApproval`、`ExpertAssignment` | R1 保证保密状态清晰；完整开评标流程后续 | R5 |
| 25 | 查看应标资料、响应文件、资质文件 | 部分覆盖 | `/project-workbench`、`/expert-scoring`、`/file-center` | `GET /api/project-workbench/projects/:id`、`GET /api/files/:id/download` | `Bid`、`StoredFileRecord` | R1 保证权限不足拒绝、文件下载留痕 | R5 |
| 26 | 报价情况、比价、价格评分依据 | 部分覆盖 | `/bid-control`、`/project-workbench` | `GET /api/projects/:id/bids/summary` | `ComparisonReport`、`Bid` | R1 保证英文枚举不外露；价格评分模型后续 | R5 |
| 27 | 样品接收登记、图片、状态 | 部分覆盖，供应商封样已有，招标样品接收不足 | `/suppliers`、`/project-workbench` | `POST /api/suppliers/:id/seal-samples` | `SupplierSealSample` | R1 保证样品图片上传预览；招标样品状态后续 | R4 |
| 28 | 专家评分模板、评分项、标准、分值、备注、附件 | 部分覆盖 | `/expert-scoring` | `GET /api/scoring-sheets/:id`、`POST /api/scoring-sheets/:id/scores` | `ScoringSheet`、`ScoringTemplate` | R1 保证专家入口可访问和状态中文；复杂模板后续 | R5 |
| 29 | 汇总专家评分、复评、复制上轮评分、锁定 | 部分覆盖 | `/expert-review`、`/expert-scoring` | `POST /api/scoring-sheets/:id/submit`、`POST /api/scoring-sheets/:id/resubmit` | `ScoringSheet`、`ReviewReport` | R1 保证锁定状态中文；复评深度后续 | R5 |
| 30 | 定标选择、审批、驳回、通过、总结 | 部分覆盖 | `/award-result`、`/project-workbench` | `POST /api/award-approvals`、`POST /api/award-approvals/:id/mock-approve` | `AwardApproval` | R1 保证定标结果可进入订单；完整审批流后续 | R5、R9 |
| 31 | 定标结果通知、公示、备案、审计追溯 | 部分覆盖 | `/award-result`、`/audit` | `POST /api/result-notifications`、`GET /api/audit-logs` | `ResultNotification`、`AuditLog` | R1 保证审计可读；公示/备案后续 | R5 |
| 32 | 生成定价报告、查看、下载、归档 | 部分覆盖，定标和价格数据存在，报告生成不足 | `/award-result`、`/supply-mall` | 暂无完整报告接口 | `ComparisonReport`、`MallPrice` | R1 不做报告生成，列缺口 | R5 |
| 33 | 销售定价、服务费率、毛利 | 部分覆盖，商城价格审批已有基础 | `/supply-mall` | `POST /api/mall/products/:id/prices`、`POST /api/mall/prices/:id/approve` | `MallPrice` | R1 保证定价上架按钮可点；毛利/服务费后续 | R5 |
| 34 | 商品上架、下架、隐藏、排序、可售范围 | 部分覆盖 | `/supply-mall` | `POST /api/mall/products/:id/status` | `MallProduct` | R1 保证商品可上架展示图片；完整上下架规则后续 | R3 |
| 35 | 商品详情图文、验收指引、用途、标签、安装要求 | 部分覆盖，规格/图片有，详情深度不足 | `/supply-mall` | `PATCH /api/mall/products/:id` | `MallProduct` | R1 保证图片预览；详情内容后续 | R3 |
| 36 | 生成供应商报价单、采购价、销售价、税率、周期 | 部分覆盖，报价和商城价格分散 | `/bidding`、`/supply-mall` | `POST /api/projects/:id/bids`、`POST /api/mall/products/:id/prices` | `Bid`、`MallPrice` | R1 不做报价单正式对象化 | R3 |
| 37 | 供应商供货区域、品牌、区域、酒店性质、商品范围 | 部分覆盖 | `/suppliers`、`/supply-mall` | `PATCH /api/suppliers/:id/profile`、`POST /api/mall/products` | `ServiceRegion`、`MallProduct.serviceRegions` | R1 保证服务区域可维护；复杂匹配后续 | R3 |
| 38 | 商城选品、筛选、图片、价格、详情 | R1 修复，基础商城不再空壳 | `/supply-mall` | `GET /api/mall/products` | `MallProduct`、`MallPrice`、`StoredFileRecord` | R1 保证商品图片真实预览、价格和下单入口 | R6 |
| 39 | 购物车、数量、地址、提交订单 | 部分覆盖 | `/supply-mall` | `POST /api/mall/cart/items`、`POST /api/mall/orders` | `MallCartItem`、`MallOrder` | R1 保证可点击演示；完整购物车页面后续 | R6 |
| 40 | 订单支付、余额、授信、支付状态、资金流水 | 后续开发 | 无正式入口 | 暂无正式资金接口 | 待建资金对象 | R1 不实施资金支付，只在缺口中标注 | R7 |
| 41 | 商城客户订单管理、订单详情、复制订单、合同查看 | 部分覆盖 | `/supply-mall` | `GET /api/mall/orders` | `MallOrder`、`MallShipment` | R1 保证订单状态动作可点击；订单详情后续 | R6 |
| 42 | 我的任务、各角色待办和跳转 | 部分覆盖，Dashboard 展示但任务中心未对象化 | `/` | `GET /api/projects`、`GET /api/audit-logs` | 待建 `Task` | R1 仅保证角色入口和主路径；任务中心后续 | R9 |
| 43 | 发货管理、物流、发货单附件 | 部分覆盖 | `/supply-mall` | `POST /api/mall/orders/:id/shipments` | `MallShipment` | R1 保证供应商发货按钮按角色显示；附件后续 | R6 |
| 44 | 订单收货、验收图片、异常收货、补录 | 已覆盖招采订单，商城部分覆盖 | `/project-workbench`、`/supply-mall` | `POST /api/project-workbench/purchase-orders/:id/receipts`、`POST /api/project-workbench/receipts/:id/handle`、`POST /api/mall/orders/:id/receive` | `ReceiptRecord`、`MallOrder` | R1 补全“全部收货/异常收货”可点击入口 | R6 |
| 45 | 订单评价、评分、备注、提交锁定 | 已覆盖招采订单评价 | `/project-workbench` | `POST /api/project-workbench/purchase-orders/:id/evaluations` | `SupplierEvaluation` | R1 补评价提交入口 | R6 |
| 46 | 订单退货、审核、确认、退款/结算影响 | 部分覆盖商城退货 | `/supply-mall` | `POST /api/mall/orders/:id/returns`、`POST /api/mall/returns/:id/review` | `MallReturnRequest` | R1 保证退货按钮按角色显示；结算影响后续 | R6、R7 |
| 47 | 供应商结算单、账期、订单金额、服务费、应结金额 | 部分覆盖，结算资料而非正式结算单 | `/project-workbench` | `POST /api/project-workbench/purchase-orders/:id/settlement-materials` | `SettlementMaterial` | R1 保证资料上传、核验、驳回重传入口；结算单后续 | R7 |
| 48 | 发票上传、财务审核、金额税额、附件 | 部分覆盖 | `/project-workbench`、`/supply-mall` | `POST /api/project-workbench/purchase-orders/:id/settlement-materials`、`POST /api/mall/orders/:id/invoices` | `SettlementMaterial`、`MallSettlementInvoice` | R1 保证发票文件上传预览下载；税额审核后续 | R7 |
| 49 | 酒店资金、余额、充值、授信、流水、支付占用 | 后续开发 | 无正式入口 | 暂无正式资金接口 | 待建 `FundAccount`、`CreditLimit`、`PaymentLedger` | R1 不实施资金模块 | R7 |
| 50 | 问卷调查、模板、填写、评分 | 部分覆盖 API 演示 | `/supply-mall` | `POST /api/mall/questionnaires` | `MallQuestionnaire` | R1 仅保留入口演示，不作为主链验收 | R8 |
| 51 | 样板间、场景商品包、一键选品/下单 | 部分覆盖 API 演示 | `/supply-mall` | `POST /api/mall/scenario-templates` | `MallScenarioTemplate` | R1 仅保留模板入口，不做完整场景下单 | R8 |
| 52 | 开业包、批量选品和采购 | 部分覆盖 API 演示 | `/supply-mall` | `POST /api/mall/scenario-templates` | `MallScenarioTemplate` | R1 仅保留模板入口，不做完整开业包 | R8 |
| 53 | 审批流程定义、节点、角色、条件、版本 | 部分覆盖基础权限配置，流程引擎不足 | `/permissions` | `GET /api/role-permissions`、`GET /api/approval-rules` | `RolePermission`、`ApprovalRule` | R1 保证配置页不误导为完整流程引擎 | R9 |
| 54 | 期待为您服务，演示结束页 | 不开发业务功能 | 无 | 无 | 无 | 不作为系统功能，只作为最终演示材料页 | R10 |

## 4. 模块差距矩阵

| 模块 | 第一阶段必须修复 | 后续阶段归属 |
|---|---|---|
| 供应商注册与准入 | 供应商资料、资质附件、封样图片真实上传和预览；状态中文；供应商只能看本企业资料 | R3 补正式注册、资质类型、准入评分表、等级和黑名单规则 |
| 潜在供应商管理 | 潜在供应商新增、编辑、初审/准入记录可点 | R3 补供应商来源、性质、生命周期 |
| 商品资料与图片 | 商品新建、定价上架、图片上传预览、商城展示不为空 | R3 补完整商品主数据、税务、图文详情、上下架审核 |
| 采购申请 | 新增、附件、提交、审批、删除草稿、取消中文化 | R4 补多组织正式审批和申请转询价/招标深度 |
| 询价 | 报价、截止保密、比价展示可用 | R4 补询价单对象化、多轮报价、规则配置 |
| 招标 | 采购文件创建、发布、修订、作废可用 | R4/R5 补招标公告、须知、评标办法、必传文件全模型 |
| 供应商应标 | 报名资料、响应文件、报价草稿/提交/撤回/重提可用 | R5 补开始应标、放弃应标、文件要求校验 |
| 专家评审 | 专家入口、评分状态、只看分配任务 | R5 补专家库、评分模板、复评流程 |
| 定标与定价 | 定标结果进入订单，定价上架可演示 | R5 补定价报告、销售定价、服务费和毛利 |
| 供应商报价单与供货区域 | 供货区域、品类授权可维护 | R3 补正式报价单、有效期和区域可售规则 |
| 商城选品与下单 | 商城商品、图片、价格、下单主路径可点 | R6 补完整购物车、订单详情、筛选、复制订单 |
| 订单履约与售后 | 采购订单确认、变更、关闭、收货、异常处理、评价可点 | R6 补发货附件、退货结算影响、完整售后 |
| 供应商结算与发票 | 结算资料/发票上传、核验、驳回重传可点 | R7 补结算单、账期、税额、服务费和付款 |
| 酒店资金、余额、授信 | 第一阶段不实施，标注缺口 | R7 |
| 问卷调查 | 保留演示入口，不做主链验收 | R8 |
| 样板间与开业包 | 保留模板入口，不做主链验收 | R8 |
| 审批流程定义 | 基础权限配置可见，避免误判为空 | R9 补流程引擎、任务中心、消息 |
| 我的任务、消息、审计 | Dashboard、审计只读、日志中文化 | R9 补任务对象、消息通知、流程版本 |

## 5. 角色流程矩阵

| 角色 | 第一阶段可访问页面 | 第一阶段可执行动作 | 禁止访问或敏感隐藏 | 后续阶段 |
|---|---|---|---|---|
| 酒管集团管理员 | Dashboard、采购申请、项目工作台、供应商、采购文件、审计、商城 | 审批、项目维护、订单/收货/结算资料核验、档案和审计 | 截止前报价金额仍隐藏；不能绕过流程 | R9 流程配置 |
| 酒管采购管理员 | Dashboard、采购申请、项目工作台、供应商、采购文件、公告、报价、定标 | 发起采购、上传文件、报名审核、定标、订单、收货、评价 | 不能查看无授权组织项目 | R4/R5 深化寻源 |
| 酒店/门店采购人员 | Dashboard、采购申请、商城、项目工作台授权数据 | 创建采购申请、商城选品下单、收货和评价演示 | 只能看本组织或授权范围 | R6 完整商城履约 |
| 酒店财务人员 | 第一阶段按采购/结算资料视角验证，正式财务页未独立 | 查看结算资料、发票上传/核验演示 | 不参与专家评分和定标实质修改 | R7 正式财务结算 |
| 供应商管理员 | 供应商档案、报名资料、报价响应、项目工作台、商城订单 | 维护本企业资料、上传资质/封样/报名/响应/结算/发票、确认订单 | 不能看其他供应商报价、文件、订单、评价 | R3/R5/R7 |
| 供应商报价人员 | 报名资料、报价响应、项目工作台 | 报价草稿、提交、撤回、重提、上传响应文件 | 不能看其他供应商数据 | R5 |
| 评审专家 | 专家评审、专家评分 | 查看分配任务并评分 | 不能进入履约工作台，不看未分配项目 | R5 |
| 纪检/审计人员 | Dashboard、项目工作台、文件中心、档案、审计日志 | 只读查看项目、文件、日志、档案 | 无新增、编辑、删除、审批、评分、定标按钮 | R9 |
| 平台运营人员 | 第一阶段暂由采购管理角色兼任商城运营 | 新建商品、定价上架、场景模板演示 | 不作为独立生产角色 | R3/R6/R8 |

## 6. 第一阶段边界

第一阶段完成标准：

- PDF 54 页全部纳入矩阵，且每页明确当前覆盖、入口、API、数据对象、缺口和阶段归属。
- R1 修复后，客户主路径不应看到明显乱码、英文业务枚举、纯 fileName 伪上传或空壳入口。
- 上传、预览、下载、替换、作废、权限拒绝和审计留痕可被浏览器验证。
- 采购管理员、供应商、酒店采购、专家、财务/结算、审计、系统管理员边界均可说明并验证。

第一阶段不等于最终投产。正式投产仍需 R2-R10 完成数据库模型治理、SSO、对象存储、外部系统联调、监控备份、安全测试和最终 UAT。
