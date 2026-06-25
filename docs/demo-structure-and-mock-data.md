# Demo 页面结构与 Mock 数据结构

## 1. 文件结构

| 文件 | 用途 |
|---|---|
| `demo/index.html` | 静态样机入口，包含侧边栏、角色切换、顶部操作区、内容区和弹窗 |
| `demo/styles.css` | 企业级页面样式、表格、流程节点、状态标签、弹窗、响应式布局 |
| `demo/mock-data.js` | 本地 Mock 数据，不连接后端、不写正式数据库 |
| `demo/app.js` | 页面渲染、角色菜单差异、项目切换、流程演示和弹窗交互 |

## 2. 页面路径

当前 Demo 为静态单页应用，页面通过前端状态切换：

| 页面标识 | 页面名称 |
|---|---|
| `dashboard` | 集团采购驾驶舱 |
| `myTasks` | 我的待办 |
| `projects` | 采购项目与流程 |
| `suppliers` | 供应商管理 |
| `bidSecrecy` | 报价保密与异常查看 |
| `expertReview` | 专家评审 |
| `award` | 定标审批与结果通知 |
| `externalTrade` | 外部交易备案 |
| `contracts` | 合同台账与履约 |
| `archives` | 项目档案与审计日志 |
| `admin` | 基础配置 |

## 3. 角色切换方式

页面左侧“当前评审视角”下拉框用于切换角色。切换后会刷新：

- 可见菜单。
- 当前角色说明。
- 待办事项。
- 按钮可用 / 禁用状态。
- 供应商、专家、审计等不同数据范围。

## 4. Mock 数据字段

| 数据集 | 核心字段 | 说明 |
|---|---|---|
| `users` | `id`、`name`、`roleId`、`orgId`、`supplierId`、`expertId` | 6 类角色账号 |
| `organizations` | `id`、`name`、`level`、`parentId` | 集团总部、区域公司、单体酒店 |
| `roles` | `id`、`name`、`hint` | 角色名称和评审提示 |
| `suppliers` | `id`、`name`、`status`、`categoryAuth`、`qualification`、`risk`、`evaluationScore` | 5 家供应商，含限制名单和资质到期 |
| `projects` | `id`、`code`、`name`、`type`、`status`、`stage`、`externalTrade`、`flow` | 4 个项目，含截止前、截止后、简化比选和外部交易备案 |
| `procurementRequests` | `id`、`projectId`、`title`、`budgetLabel`、`category`、`methodSuggestion`、`externalRequired`、`approvalStatus` | 采购需求和方式判断 |
| `bids` | `id`、`projectId`、`supplierId`、`amount`、`status`、`submittedAt`、`file` | 报价提交和截止锁定演示 |
| `bidViewApprovals` | `id`、`projectId`、`applicant`、`reason`、`scope`、`validUntil`、`status`、`approver` | 异常查看审批 |
| `experts` | `id`、`name`、`category`、`status`、`conflict` | 专家库和回避关系 |
| `expertAssignments` | `id`、`projectId`、`expertId`、`method`、`reason`、`status` | 专家抽取、指定、替换 |
| `scoringSheets` | `id`、`projectId`、`expertId`、`supplierId`、`technical`、`service`、`price`、`total`、`opinion`、`status`、`versionId`、`versionNo`、`submittedAt`、`lockedAt` | 专家 × 供应商评分表；`p-award` 为 2 × 2 共 4 条 |
| `scoringVersions` | `id`、`projectId`、`expertId`、`version`、`status`、`reason` | 重评版本留痕 |
| `scoringSummaries` | `id`、`projectId`、`recommendedSupplier`、`lowestSupplier`、`nonLowestReason`、`reportStatus` | 评分汇总和评审报告 |
| `supplierScoreSummaries` | `projectId`、`supplierId`、`expertCount`、`avgTechnical`、`avgService`、`avgPrice`、`total`、`rank`、`lowestPrice`、`recommended`、`anomaly` | 按供应商汇总评分、排名、异常和推荐情况 |
| `awardApprovals` | `id`、`projectId`、`supplier`、`nonLowest`、`reason`、`status`、`approver` | 定标审批 |
| `externalTradeRecords` | `id`、`projectId`、`platformName`、`externalCode`、`announcementFile`、`resultFile`、`recordStatus`、`internalInitiation`、`approvalTrace`、`externalResultRecord`、`archiveStatus` | 外部交易备案，不含内部报价截止和内部报价锁定 |
| `contracts` | `id`、`projectId`、`code`、`supplier`、`amount`、`status`、`contractSystemUrl` | 合同台账 |
| `performanceNodes` | `id`、`contractId`、`node`、`dueDate`、`status`、`payment` | 履约节点和付款状态 |
| `supplierEvaluations` | `id`、`supplierId`、`projectId`、`score`、`dimensions`、`note` | 供应商评价 |
| `archives` | `id`、`projectId`、`completeness`、`missing`、`sealed` | 档案完整性 |
| `archiveSealRecords` | `projectId`、`completeness`、`sealed`、`sealedAt`、`sealedBy`、`allowSupplement`、`supplementRequiresApproval`、`note` | 档案封存记录 |
| `archiveSupplementRequests` | `id`、`projectId`、`missingItem`、`applicant`、`reason`、`approver`、`status`、`logRecorded`、`createdAt` | 补档申请；当前演示 `p-ext` 缺外部中标结果盖章件 |
| `auditLogs` | `time`、`actor`、`role`、`action`、`object`、`result` | 审计日志 |

## 5. 客户评审前修正版新增数据集

| 数据集 | 核心字段 | 说明 |
|---|---|---|
| `procurementDocuments` | `projectId`、`fileName`、`version`、`editor`、`reviewStatus`、`publishedAt`、`locked`、`changeLogs`、`attachments` | 采购文件和发布后锁定 |
| `announcements` | `projectId`、`publishScope`、`invitedSupplierIds`、`publishedAt`、`registerDeadline`、`quoteDeadline`、`notices` | 公告 / 邀请字段 |
| `registrations` | `projectId`、`supplierId`、`admissionStatus`、`categoryAuthStatus`、`restrictedCheck`、`qualificationFile`、`registeredAt`、`status` | 报名记录和资格校验 |
| `abnormalViewLogs` | `actor`、`time`、`projectId`、`supplierId`、`content`、`download`、`approvalId`、`terminal`、`result`、`outOfScope` | 异常查看审计日志 |
| `resultNotices` | `projectId`、`supplierId`、`noticeType`、`sentAt`、`status` | 结果通知记录 |
| `archiveTemplate` | 目录项名称 | 必备档案目录模板 |
| `archiveItems` | `projectId`、`item`、`required`、`collected`、`source`、`collectedAt`、`ownerRole`、`missingReason`、`supplementStatus` | 档案完整性检查 |

## 6. 数据权限实现说明

- `currentUser.supplierId`：供应商视角过滤项目、供应商、报价、合同、履约和评价。
- `currentUser.expertId`：专家视角过滤被分配项目、本人评分和本人重评版本。
- `currentUser.managedProjectIds`：采购经办人视角过滤本人经办项目。
- `currentUser.orgScope`：集团采购管理人员、纪检 / 审计人员视角过滤授权组织范围。
- 报价截止前项目通过 `beforeDeadline: true` 控制报价金额、响应文件和汇总默认不可见。
- 项目详情在供应商视角只能返回本企业是否参与、当前项目节点和本企业可见字段，不返回其他供应商名称、报名状态、报价、文件、合同、评价和专家意见。
- `resultNotices` 在供应商视角必须按 `currentUser.supplierId` 过滤，只返回本企业结果通知；结果公开范围待客户制度确认。

## 7. 第二轮客户评审前 Mock 数据修正

- 供应商视角使用 `currentUser.supplierId` 强过滤：项目详情、公告 / 邀请、报名、报价、结果通知、合同、履约、评价只显示本企业；其他供应商名称和明细隐藏。
- `scoringSheets` 改为专家 × 供应商结构：`exp-1` 和 `exp-3` 分别对 `sup-1`、`sup-2` 评分，共 4 条记录，每条含版本、提交时间和锁定时间。
- 新增 `supplierScoreSummaries`：用于管理 / 审计视角展示专家数、均分、总分、排名、最低价、是否推荐、异常和报告状态。
- 异常查看弹窗使用 `bidViewApprovals` 和 `abnormalViewLogs` 说明授权对象、授权内容、有效期、文件元数据、不可见内容和日志号。
- `externalTradeRecords` 只描述外部交易备案链路，不包含内部报价截止、内部报价锁定、内部公告、内部报名、内部报价、内部专家评审和内部定标。
- 新增 `archiveSealRecords` 和 `archiveSupplementRequests`：用于展示封存记录、补档审批要求和 `p-ext` 外部中标结果盖章件补档申请。
- 管理员只读取组织、账号、角色、菜单、Mock 规则、数据字典和权限边界，不读取业务实质数据。
