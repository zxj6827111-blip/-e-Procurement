# 后续 ERD 建模、接口评审与开发排期建议

## 1. ERD 建模建议

| 实体 | 关键关系 | 建议字段重点 |
|---|---|---|
| 用户 `users` | 关联角色、组织、供应商、专家 | `role_id`、`org_id`、`supplier_id`、`expert_id`、`status` |
| 组织 `organizations` | 上下级组织树 | `parent_id`、`level`、`data_scope` |
| 角色 `roles` | 关联菜单、按钮权限 | `role_code`、`permission_scope` |
| 供应商 `suppliers` | 关联准入、品类、评价、限制名单 | `status`、`category_auth`、`qualification_expire_at`、`risk_level` |
| 采购需求 `procurement_requests` | 关联项目、组织、发起人 | `budget_label`、`category_id`、`method_suggestion`、`external_required`、`approval_status` |
| 采购项目 `projects` | 关联需求、组织、供应商、专家、合同、档案 | `project_code`、`method_type`、`stage`、`external_trade_flag`、`org_id` |
| 报价 `bids` | 关联项目和供应商 | `amount`、`file_id`、`submit_status`、`submitted_at`、`locked_at`、`visible_after_deadline` |
| 异常查看审批 `bid_view_approvals` | 关联项目、申请人、审批人 | `reason`、`target_supplier_id`、`view_scope`、`valid_from`、`valid_until`、`status` |
| 专家 `experts` | 关联专业、状态、回避关系 | `category`、`status`、`conflict_rule` |
| 专家分配 `expert_assignments` | 关联项目和专家 | `method`、`assign_reason`、`replace_reason`、`status` |
| 评分表 `scoring_sheets` | 关联项目、专家、供应商 | `expert_id`、`supplier_id`、`technical_score`、`service_score`、`price_score`、`total_score`、`opinion`、`submit_status`、`version_id`、`version_no`、`submitted_at`、`locked_at` |
| 评分版本 `scoring_versions` | 关联评分表 | `version_no`、`re_evaluation_reason`、`approval_id`、`snapshot` |
| 评分汇总 `scoring_summaries` | 关联项目和推荐供应商 | `rank_snapshot`、`non_lowest_flag`、`non_lowest_reason`、`report_status` |
| 供应商评分汇总 `supplier_score_summaries` | 关联项目和供应商 | `expert_count`、`avg_technical`、`avg_service`、`avg_price`、`total_score`、`rank_no`、`lowest_price_flag`、`recommended_flag`、`anomaly_note`、`report_status` |
| 定标审批 `award_approvals` | 关联项目和中选供应商 | `winner_supplier_id`、`approval_status`、`approval_opinion`、`published_at` |
| 外部交易备案 `external_trade_records` | 关联项目 | `platform_name`、`external_project_code`、`approval_trace`、`announcement_file_id`、`result_file_id`、`external_result_record`、`contract_ledger_status`、`archive_status`、`record_status` |
| 合同台账 `contracts` | 关联项目和供应商 | `contract_code`、`amount`、`contract_system_url`、`status` |
| 履约节点 `performance_nodes` | 关联合同 | `node_name`、`due_date`、`acceptance_status`、`payment_status`、`exception_flag` |
| 供应商评价 `supplier_evaluations` | 关联供应商、项目、合同 | `score`、`dimensions`、`comment`、`risk_effect` |
| 档案 `archives` | 关联项目 | `directory_snapshot`、`completeness`、`missing_items`、`sealed_at` |
| 档案封存记录 `archive_seal_records` | 关联项目 | `completeness`、`sealed_flag`、`sealed_at`、`sealed_by`、`allow_supplement`、`supplement_requires_approval` |
| 档案补档申请 `archive_supplement_requests` | 关联项目和档案项 | `missing_item`、`applicant_id`、`reason`、`approver_id`、`approval_status`、`audit_log_id` |
| 审计日志 `audit_logs` | 关联用户、项目、业务对象 | `actor_id`、`role_id`、`action`、`object_type`、`object_id`、`result`、`ip`、`created_at` |

### 建模控制点

- 所有核心业务表建议保留 `org_id`、`created_by`、`created_at`、`updated_by`、`updated_at`。
- 报价相关表必须有截止时间、锁定时间、可见性控制和查看日志。
- 专家评分必须按“专家 × 供应商”建模并支持版本，不覆盖旧版本。
- 供应商视角必须通过 `supplier_id` 强过滤项目、公告邀请、报名、报价、结果、合同、履约和评价，禁止展示其他供应商名称和明细。
- 外部交易项目必须有 `external_trade_flag`，用于阻断内部公告、报名、报价、评审、定标；外部交易不应生成内部报价截止和内部报价锁定记录。
- 系统管理员权限模型必须和业务实质数据隔离，只能维护组织、账号、角色、菜单、字典、Mock 规则和权限配置。
- 档案表建议保存目录快照，避免后续目录变更影响历史项目完整性判断。

## 2. 接口评审建议

| 接口方向 | 一期建议分类 | 评审重点 |
|---|---|---|
| SSO | 一期建议联调 | 单点登录、账号身份、退出机制 |
| 用户同步 | 一期必须联调或初始化导入 | 用户范围、岗位、启停状态 |
| 组织同步 | 一期必须联调或初始化导入 | 集团、区域、酒店层级和数据范围 |
| OA 审批 | 一期建议联调 | 采购方式审批、异常查看审批、定标审批、补档审批 |
| OA 待办 | 一期建议联调 | 待办推送、回调、状态同步 |
| 主数据品类 | 一期建议联调 | 品类编码、名称、启停、授权范围 |
| 主数据物料 | 一期可人工替代 | MVP 可先用人工维护或导入 |
| ERP 供应商 | 一期建议联调 | 供应商编码、准入状态、基础信息 |
| 合同系统 | 一期建议联调 | 合同编号、合同状态、合同系统链接回写 |
| 财务预算与付款 | 一期可人工替代 | 预算占用、付款记录可先人工录入或批量导入 |
| 文件服务 | 一期必须联调 | 附件上传、下载、权限、归档 |
| 消息通知 | 一期建议联调 | 站内消息、短信 / 邮件可后续确认 |
| 审计日志输出 | 一期建议联调 | 日志留存、查询、导出、监管要求 |

## 3. 正式开发排期建议

| 阶段 | 目标 | 关键产出 | 建议前置条件 |
|---|---|---|---|
| 原型确认阶段 | 确认页面、流程、字段、权限 | 客户确认表、问题清单、调整后的样机 | 完成本 Demo 评审 |
| ERD 确认阶段 | 确认核心实体、状态、关系、版本和审计字段 | ERD、数据字典、状态机说明 | 原型字段冻结 |
| 接口确认阶段 | 确认 SSO、用户组织、OA、ERP、合同、文件服务边界 | 接口清单、责任矩阵、联调计划 | 客户提供接口资料 |
| 基础框架阶段 | 搭建正式工程、权限、日志、文件基础能力 | 工程骨架、权限模型、基础审计 | 技术路线确认 |
| MVP 核心开发阶段 | 实现内部采购闭环、专家评审、外部备案、合同履约、档案审计 | 可测试业务功能 | ERD 和接口边界确认 |
| 联调阶段 | 与必要外部系统完成联调或替代方案验证 | 联调报告、问题清单 | 测试环境和账号准备 |
| 测试阶段 | 功能、权限、流程、数据隔离、安全和回归测试 | 测试报告、缺陷闭环 | 核心功能开发完成 |
| 试点运行阶段 | 选取组织和项目试运行 | 试点问题清单、培训材料 | 客户确认试点范围 |
| 验收阶段 | 完成 MVP 验收和上线准备 | 验收报告、运维交接、上线清单 | 试点问题闭环 |

## 4. 下一步输入材料清单

- 客户采购制度和采购方式适用规则。
- 审批权责矩阵和组织授权范围。
- 外部交易判定规则。
- 专家库管理制度、评分模板和回避规则。
- 合同系统、OA、ERP、财务、主数据、文件服务接口资料。
- 档案目录、日志留存和监督查询要求。

## 5. 客户评审前修正版补充实体

| 实体 | 建议用途 | 关键字段 |
|---|---|---|
| 采购文件表 | 管理采购文件主记录 | `project_id`、`file_name`、`current_version`、`review_status`、`published_at`、`locked_at` |
| 采购文件版本表 | 保存文件版本和修改留痕 | `document_id`、`version_no`、`change_summary`、`file_id`、`created_by` |
| 公告 / 邀请表 | 管理公告和邀请供应商 | `project_id`、`publish_scope`、`register_deadline`、`quote_deadline` |
| 报名记录表 | 管理供应商报名和资格校验 | `project_id`、`supplier_id`、`admission_status`、`category_auth_status`、`restricted_check`、`registered_at` |
| 报价查看审批表 | 管理异常查看申请和审批 | `project_id`、`applicant_id`、`target_supplier_id`、`view_content`、`allow_download`、`valid_from`、`valid_until`、`status` |
| 报价查看日志表 | 保存查看、下载、拦截记录 | `approval_id`、`actor_id`、`supplier_id`、`content`、`download_flag`、`result`、`out_of_scope_reason` |
| 报价锁定记录表 | 保存截止锁定动作 | `project_id`、`deadline_at`、`locked_at`、`locked_by`、`lock_result` |
| 专家回避确认表 | 保存专家回避确认 | `assignment_id`、`confirmed_at`、`confirmed_result`、`audit_log_id` |
| 专家纪律确认表 | 保存纪律确认 | `assignment_id`、`confirmed_at`、`statement_version`、`audit_log_id` |
| 专家保密承诺表 | 保存保密承诺确认 | `assignment_id`、`confirmed_at`、`statement_version`、`audit_log_id` |
| 评审报告快照表 | 保存冻结报告快照 | `project_id`、`summary_id`、`snapshot_json`、`frozen_at` |
| 结果通知记录表 | 保存通知对象和结果 | `project_id`、`supplier_id`、`notice_type`、`sent_at`、`send_result` |
| 档案目录项表 | 定义项目档案目录 | `project_id`、`item_name`、`required_flag`、`source_type`、`owner_role` |
| 补档申请表 | 管理封存后补档 | `archive_item_id`、`reason`、`approval_status`、`approved_by` |
| 供应商资质附件表 | 管理资质文件和到期提醒 | `supplier_id`、`qualification_type`、`file_id`、`expire_at` |
| 供应商品类授权表 | 管理供应商品类授权 | `supplier_id`、`category_id`、`status`、`valid_from`、`valid_until` |
| 限制名单表 | 管理限制名单和拦截原因 | `supplier_id`、`reason`、`effective_from`、`effective_until`、`status` |

## 6. 第二轮客户评审前 ERD / 接口补充

| 主题 | 建议 |
|---|---|
| 供应商隔离 | 所有供应商端查询接口必须从登录身份解析 `supplier_id`，服务端强制过滤，不允许前端传入其他供应商 ID 后返回明细。公告 / 邀请和报名接口可返回总数，但不得返回其他供应商名称、状态、文件和报价。 |
| 专家评分 | `scoring_sheets` 以 `project_id + expert_id + supplier_id + version_no` 唯一识别；汇总表由系统计算，采购经办人只读，不提供修改专家评分和意见接口。 |
| 非盲评 / 盲评 | 当前 MVP Demo 为非盲评；如客户选择盲评，应增加供应商匿名编号映射表，并控制专家端只显示编号，管理 / 审计端按权限解码。 |
| 管理员边界 | 管理员接口仅开放组织、账号、角色、菜单、字典和权限配置；不得返回或允许修改供应商报价金额、响应文件、合同金额、专家评分、专家意见、定标结果、非最低价理由、履约实质、供应商评价实质、审计日志实质内容，也不得提供审计日志内容编辑能力。 |
| 外部交易 | 外部交易接口只维护外部编号、外部公告资料、外部中标结果、外部结果备案、合同台账关联、履约评价和档案；不得暴露内部报名、报价、专家评审和定标接口。 |
| 异常查看 | 异常查看接口必须校验审批单、供应商、内容、有效期和下载权限，并返回允许 / 拦截结果及日志号。 |
| 档案封存补档 | 档案封存后原文件和目录快照只读；补档通过申请、审批、补充文件和审计日志闭环，不直接覆盖历史归档记录。 |
