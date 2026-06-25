# R10 PDF 54 页 1:1 功能等价验收矩阵

版本：PDF 1:1 Remediation  
日期：2026-06-25  
证据基线：`npm.cmd run typecheck`、`npm.cmd run test:api`、`npm.cmd run build`、`npm.cmd run r9:readiness`、`node scripts/r10-backup-restore-drill.mjs`、`output/pdf-1to1-browser-evidence/`

## 状态口径

| 状态 | 含义 |
|---|---|
| 已覆盖 | 本地页面、API、数据对象、权限边界、审计追溯和验收路径已可验证。 |
| 部分覆盖 | 本地闭环、adapter/mock/test/契约/配置已完成，但真实外部系统联调依赖客户资料。 |
| 不适用 | PDF 展示页、结束页或不构成系统业务功能的内容。 |

本轮矩阵仅保留“已覆盖 / 部分覆盖 / 不适用”三类状态。所有仍为“部分覆盖”的项均为真实 SSO/OA/ERP/WMS/财务/合同/消息/实名/短信/CA/发票验真/对象存储/病毒扫描等客户资料依赖，不代表真实联调完成。

## PDF 逐页矩阵

| PDF页 | 目标功能 | 最新状态 | 覆盖说明 | 主要入口/API | 剩余客户依赖 |
|---|---|---|---|---|---|
| 1 | 平台总览、采购协同、商城、结算、审批、审计总入口 | 已覆盖 | 首页、模块入口、任务和审计入口按角色可见，浏览器验收通过。 | `/`、`/modules`、`GET /health`、`GET /api/me` | 无 |
| 2 | 供应商账号注册、企业信息、联系人、协议确认 | 部分覆盖 | 已补本地注册、验证码校验、协议确认、管理员/报价人员拆分、实名边界。 | `/supplier-registration`、`POST /api/suppliers/register` | 真实短信、企业实名/工商校验接口资料 |
| 3 | 注册资料补充、手机号/账号/密码/验证码、资料上传 | 部分覆盖 | 本地验证码、账号生成、资料上传和注册追溯已完成。 | `/supplier-registration`、`POST /api/files/upload-multipart` | 真实短信、统一身份、病毒扫描和对象存储 |
| 4 | 采购方登记潜在供应商 | 已覆盖 | 采购/平台运营可登记供应商档案、服务区域、资质、联系人。 | `/suppliers`、`POST /api/suppliers/admissions` | 无 |
| 5 | 供应商资质初审、通过/驳回/补资料 | 已覆盖 | 准入评审、评分项、意见、审计留痕已覆盖。 | `/suppliers`、`POST /api/suppliers/:supplierId/reviews` | 无 |
| 6 | 资质材料查看、文件校验、状态流转、审计只读 | 部分覆盖 | 文件中心、版本、作废、下载审计和权限隔离已完成。 | `/file-center`、`GET /api/files` | 正式对象存储、预览水印、病毒扫描服务 |
| 7 | 准入评估、评分、结论、转正 | 已覆盖 | 评分模板快照、转正规则、转正评审和准入结论已补齐。 | `/suppliers`、`POST /api/suppliers/:supplierId/reviews` | 无 |
| 8 | 周期考核、等级、风险、黑名单 | 已覆盖 | 周期考核、等级、黑名单/限制、评价结果回写已补齐。 | `/suppliers`、`POST /api/suppliers/:supplierId/restrictions` | 无 |
| 9 | 封样登记、图片、说明、接收人、时间 | 已覆盖 | 封样、附件、供应商和采购侧查看已覆盖。 | `/suppliers`、`POST /api/suppliers/:supplierId/seal-samples` | 无 |
| 10 | 商品新建、编码、规格、分类、税务、图片 | 已覆盖 | 商品图文、标签、验收指引、供货区域、报价版本已补齐。 | `/supply-mall`、`POST /api/mall/products` | 无 |
| 11 | 采购申请创建、编辑、提交、审批、明细、附件 | 已覆盖 | 采购申请、明细、附件、审批触发和审计留痕已覆盖。 | `/procurement-requests`、`POST /api/procurement-requests` | 无 |
| 12 | 创建询价单、供应商范围、报价规则、截止、附件 | 已覆盖 | 独立询价单、多轮报价、报价规则配置和询价定价已补齐。 | `/procurement-documents`、`POST /api/projects/:projectId/inquiry-sheets` | 无 |
| 13 | 询价明细、邀请、多轮报价、截止控制 | 已覆盖 | 询价轮次、发布、供应商范围、报价截止和定价动作已覆盖。 | `/announcements-invitations`、`POST /api/inquiry-sheets/:inquiryId/rounds` | 无 |
| 14 | 供应商询价报价、含税价、税率、交期、质保、说明 | 已覆盖 | 供应商报价人员独立报价、提交、版本和附件已覆盖。 | `/bidding`、`POST /api/projects/:projectId/bids` | 无 |
| 15 | 截止后报价汇总和横向比价 | 已覆盖 | 截标后报价汇总、保密查看、审计留痕已覆盖。 | `/bid-control`、`GET /api/projects/:projectId/bids/summary` | 无 |
| 16 | 发起招标、公告、须知、评标办法、文件要求 | 已覆盖 | 公告模板、供应商须知、评标办法、必传文件、样品规则已补齐。 | `/announcements-invitations`、`POST /api/projects/:projectId/announcements` | 无 |
| 17 | 评审专家维护、范围、账号、启用 | 已覆盖 | 专家库、专家任务、专家评分入口和权限隔离已覆盖。 | `/expert-review`、`GET /api/experts` | 无 |
| 18 | 供应商应标或放弃应标 | 已覆盖 | 报名、应标、放弃应标原因、附件和通知留痕已补齐。 | `/supplier-registration`、`POST /api/projects/:projectId/bids/abandon` | 无 |
| 19 | 供应商查看公告、须知、文件要求、评标办法 | 已覆盖 | 供应商管理员/报价人员可按范围查看公告、文件要求和报名资料。 | `/supplier-registration`、`GET /api/announcements` | 无 |
| 20 | 应标报价、税率、品牌型号、交货期、质保 | 已覆盖 | 报价响应、附件、版本和提交锁定已覆盖。 | `/bidding`、`PATCH /api/bids/:bidId` | 无 |
| 21 | 提问答疑、公开/私有答疑、附件 | 已覆盖 | 供应商提问、采购答复、公开/私有、附件、通知和留痕已补齐。 | `/project-workbench`、`POST /api/projects/:projectId/clarifications` | 无 |
| 22 | 上传资质、商务、技术、报价文件 | 部分覆盖 | 文件上传、版本、作废、下载审计、权限隔离已覆盖。 | `/file-center`、`POST /api/files/upload-multipart` | 正式对象存储、病毒扫描、预览水印 |
| 23 | 提交应标、提交后锁定、撤回规则 | 已覆盖 | 提交、撤回、重提、放弃应标和版本审计已覆盖。 | `/bidding`、`POST /api/bids/:bidId/submit` | 无 |
| 24 | 截标、开评标、生成评审任务 | 部分覆盖 | 截标、开标室统计、专家任务和本地安全边界已覆盖。 | `/bid-control`、`GET /api/projects/:projectId/opening-room` | 真实 CA、加解密、电子签章资料 |
| 25 | 查看应标资料、响应文件、资质文件 | 已覆盖 | 专家、采购、审计按权限查看文件和报价资料。 | `/expert-scoring`、`GET /api/files/:fileId/download` | 无 |
| 26 | 报价情况、比价、价格评分依据 | 已覆盖 | 报价汇总、比价、评分依据和报价保密边界已覆盖。 | `/bid-control`、`GET /api/projects/:projectId/bids/summary` | 无 |
| 27 | 样品接收登记、图片、状态 | 已覆盖 | 项目样品接收、退回、封样和附件已补齐。 | `/suppliers`、`POST /api/projects/:projectId/samples` | 无 |
| 28 | 专家评分模板、评分项、标准、分值、备注、附件 | 已覆盖 | 复杂评分模板、附件评分、保存和提交锁定已覆盖。 | `/expert-scoring`、`GET /api/scoring-sheets/:sheetId` | 无 |
| 29 | 汇总专家评分、复评、评分锁定 | 已覆盖 | 专家汇总、复评申请/审批、版本和汇总规则已覆盖。 | `/expert-review`、`POST /api/scoring-sheets/:sheetId/reevaluation-request` | 无 |
| 30 | 定标选择、审批、驳回、通过、总结 | 已覆盖 | 定标审批、结果、报告归档和审计追溯已覆盖。 | `/award-result`、`POST /api/award-approvals/:approvalId/mock-approve` | 无 |
| 31 | 定标结果通知、公示、备案、审计追溯 | 部分覆盖 | 本地通知、审计、归档和结果追溯已覆盖。 | `/award-result`、`GET /api/result-notification-logs` | 真实消息、公示/外部备案接口资料 |
| 32 | 生成定价报告、查看、下载、归档 | 已覆盖 | 正式定价报告模板、下载、归档和有效期审批已覆盖。 | `/award-result`、`GET /api/projects/:projectId/pricing-reports` | 无 |
| 33 | 销售定价、服务费率、毛利 | 已覆盖 | 服务费、毛利、有效期、审批和商城价格版本已覆盖。 | `/supply-mall`、`POST /api/mall/products/:productId/prices` | 无 |
| 34 | 商品上架、下架、隐藏、排序、可售范围 | 已覆盖 | 批量上下架、单品状态、供货区域和报价导出已覆盖。 | `/supply-mall`、`POST /api/mall/products/bulk-status` | 无 |
| 35 | 商品详情图文、验收指引、用途、标签、安装要求 | 已覆盖 | 图文详情、标签、验收指引和适用范围已覆盖。 | `/supply-mall`、`PATCH /api/mall/products/:productId` | 无 |
| 36 | 生成供应商报价单、采购价、销售价、税率、周期 | 已覆盖 | 报价单版本、价格来源、报价导出和审批已覆盖。 | `/bidding`、`GET /api/mall/prices/:priceId/export` | 无 |
| 37 | 供应商供货区域、品牌、区域、酒店性质、商品范围 | 已覆盖 | 服务区域、门店/品牌范围、品类授权和商品可售范围已覆盖。 | `/suppliers`、`/supply-mall` | 无 |
| 38 | 商城选品、筛选、图片、价格、详情 | 已覆盖 | 商品列表、详情、图片、价格、标签和验收说明已覆盖。 | `/supply-mall`、`GET /api/mall/products` | 无 |
| 39 | 购物车、数量、地址、提交订单 | 已覆盖 | 购物车、地址主数据、提交订单和支付占用已覆盖。 | `/supply-mall`、`POST /api/mall/orders` | 无 |
| 40 | 订单支付、余额、授信、支付状态、资金流水 | 部分覆盖 | 余额、充值、授信、占用、资金流水模拟台账和 adapter 边界已完成。 | `/supply-mall`、`GET /api/mall/fund-accounts` | 真实支付、授信、财务资金接口资料 |
| 41 | 订单详情、复制订单、合同查看 | 部分覆盖 | 订单详情、复制订单、合同查看本地闭环已完成。 | `/supply-mall`、`GET /api/mall/orders/:orderId` | 真实合同系统接口资料 |
| 42 | 我的任务、各角色待办和跳转 | 已覆盖 | 任务、消息、角色隔离、审批规则和流程日志已覆盖。 | `/my-tasks`、`GET /api/workflow/tasks` | 无 |
| 43 | 发货管理、物流、发货单附件 | 部分覆盖 | 发货、收货、发货附件和本地履约留痕已覆盖。 | `/supply-mall`、`POST /api/mall/orders/:orderId/shipments` | 真实 WMS/物流接口资料 |
| 44 | 订单收货、验收图片、异常收货、补录 | 已覆盖 | 收货、异常处理、验收附件和项目工作台联动已覆盖。 | `/project-workbench`、`POST /api/project-workbench/purchase-orders/:orderId/receipts` | 无 |
| 45 | 订单评价、评分、备注、提交锁定 | 已覆盖 | 酒店采购评价、评分维度、提交锁定和供应商分数回写已覆盖。 | `/project-workbench`、`POST /api/project-workbench/purchase-orders/:orderId/evaluations` | 无 |
| 46 | 订单退货、审核、确认、退款/结算影响 | 已覆盖 | 退货、审核、退款/冲正台账、结算影响和异常留痕已覆盖。 | `/supply-mall`、`POST /api/mall/returns/:returnId/review` | 无 |
| 47 | 供应商结算单、账期、服务费、应结金额 | 部分覆盖 | 结算单、账期规则、对账异常、服务费和本地台账已覆盖。 | `/supply-mall`、`/api/settlement-finance/overview` | 真实 ERP/财务付款接口资料 |
| 48 | 发票上传、验真、税额、驳回重传、电子发票边界 | 部分覆盖 | 发票上传、税额规则、驳回重传、电子发票边界和 adapter 已完成。 | `/supply-mall`、`POST /api/mall/invoices/:invoiceId/verify` | 真实发票验真/税控接口资料 |
| 49 | 酒店资金、余额、充值、授信、流水、支付占用 | 部分覆盖 | 模拟资金账户、充值、授信、流水、支付占用和 adapter 边界已完成。 | `/supply-mall`、`GET /api/mall/fund-accounts` | 真实支付、授信、财务资金接口资料 |
| 50 | 问卷调查、模板、发放、填写、评分、归档 | 已覆盖 | 问卷模板、发放、填写、评分和归档已补齐。 | `/supply-mall`、`POST /api/mall/questionnaires` | 无 |
| 51 | 样板间、商品包、适用酒店/品牌、批量选品 | 已覆盖 | 场景模板、商品包、酒店/品牌适用范围、批量加入购物车已补齐。 | `/supply-mall`、`POST /api/mall/scenario-templates/:templateId/cart` | 无 |
| 52 | 开业包、批量采购包、一键下单、模板维护 | 已覆盖 | 开业包模板、批量采购包、一键下单和模板维护已补齐。 | `/supply-mall`、`POST /api/mall/scenario-templates/:templateId/orders` | 无 |
| 53 | 审批流程定义、节点、角色、条件、版本、日志 | 已覆盖 | 流程模板、节点、条件、版本发布、流程日志和管理员边界已覆盖。 | `/approval-rules`、`GET /api/workflow/approval-rules` | 无 |
| 54 | 演示结束页 | 不适用 | 非业务功能页。 | 无 | 无 |

## 总体判断

1. PDF 54 页仅保留“已覆盖 / 部分覆盖 / 不适用”三类状态。
2. 本地可实现功能均已覆盖；仍为“部分覆盖”的页面只剩真实外部系统或客户基础设施资料依赖。
3. 十类角色浏览器验收通过，截图证据位于 `output/pdf-1to1-browser-evidence/`。
4. 当前可进入客户 UAT；正式生产仍为 No-Go，除非客户完成真实接口、基础设施和生产运维资料提供及联调验收。
