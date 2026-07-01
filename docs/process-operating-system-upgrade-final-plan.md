# 酒店供应链采购系统流程型操作系统升级最终实施方案

版本：V1.0  
日期：2026-06-27  
适用范围：e-Procurement 当前 MVP / UAT 基线向正式流程型采购操作系统演进  
定位：新任务实施依据，不是一次性推倒重写指令

---

## 1. 结论

当前系统已经具备核心采购业务主链路和 8 角色流程基础，但仍偏“模块型系统”：用户通过采购、报价、评审、商城、结算等模块分别操作业务。

客户真正需要的是“流程型操作系统”：以流程实例为主线，以角色待办为入口，以业务事件为驱动，以审计留痕为证据，以配置化规则支撑不同组织、采购方式和审批制度。

推荐路线不是直接重写 BPMN 系统，而是：

```text
保留现有 R8 Workflow 稳定底座
  -> 新增 Process Layer 流程抽象层
  -> 引入内部业务事件
  -> 统一待办、状态入口和流程视图
  -> 逐步流程化供应商、采购、招采、履约、结算、档案
  -> 最后受控引入 BPMN 作为可配置流程扩展
```

核心原则：

- 不推翻现有已经跑通的采购主流程。
- 不一次性删除 R8 Workflow。
- 不直接让 BPMN 接管所有业务。
- 不把演示能力包装成正式生产能力。
- 任何阶段都必须保持 API 测试、类型检查、构建和 8 角色回归可通过。

---

## 2. 当前系统基础

当前代码已经具备以下基础能力：

- 采购需求、公告邀请、供应商报名报价、截标、专家评审、定标、履约、结算、酒店自采等核心模块。
- R8 Workflow 相关能力：审批规则、审批实例、任务、通知。
- 状态机基础：项目、报价、评分、档案等业务状态校验。
- 权限策略：供应商主体隔离、专家任务隔离、报价保密、系统管理员业务隔离、审计边界。
- 8 角色回归测试：覆盖采购需求禁止自审、酒店需求承接、截标评审定标、酒店自采履约、供应商隔离等。
- 生产边界基础：健康检查、mock auth 边界、本地存储 / SQLite No-Go 判断。

因此当前系统不是纯 CRUD 空壳，而是：

```text
业务模块驱动 + R8 轻量工作流 + 状态机 + 权限策略 + 审计留痕 + 本地持久化
```

目标系统应演进为：

```text
流程实例驱动 + 角色待办入口 + 事件推进 + 统一状态入口 + 完整审计追溯 + 可配置流程
```

---

## 3. 当前差距

### 3.1 流程没有成为系统主线

当前用户仍主要进入具体模块操作，例如采购需求页、招采页、报价页、商城页、结算页。流程节点之间虽然可以跑通，但系统主视角还不是“当前业务流转到哪一步、下一步由谁处理”。

目标：

- 每个采购对象、订单对象、结算对象都有流程实例。
- 每个流程实例有当前节点、当前处理角色、下一步动作、历史轨迹。
- 用户通过待办中心和角色工作台推动流程。

### 3.2 R8 Workflow 仍是局部工作流能力

当前 R8 已有审批规则、审批实例、任务和通知，但缺少更上层的流程抽象。

需要补齐：

- ProcessDefinition：流程定义。
- ProcessNode：流程节点。
- ProcessTransition：节点流转。
- ProcessInstance：流程实例。
- ProcessTaskInstance：流程任务。
- ProcessEvent：流程事件。
- BusinessProcessBinding：业务对象与流程实例绑定。

### 3.3 状态仍然分散

采购需求、采购项目、报价、评分、订单、付款、档案都有各自状态。这些状态不能直接删除，但需要统一入口和状态映射。

正确做法：

```text
业务实体保留业务状态
ProcessInstance 记录流程状态和当前节点
事件负责保持两者一致
```

不要做：

```text
把所有业务状态粗暴替换成 ProcessInstance.status
```

### 3.4 待办中心还不是唯一工作入口

目标是每个角色登录后优先看到：

- 我需要审批什么。
- 我需要报价什么。
- 我需要评审什么。
- 我需要确认或发货什么。
- 我需要收货什么。
- 我需要审核哪些结算 / 发票 / 付款。
- 我只能查看哪些审计材料。

### 3.5 事件驱动不完整

当前很多动作是接口直接修改业务状态。正式流程型系统需要标准业务事件。

例如：

- 采购需求提交。
- 采购审批通过。
- 采购方式决策完成。
- 公告发布。
- 供应商报名。
- 报价提交。
- 截标完成。
- 专家评分提交。
- 定标审批通过。
- 订单创建。
- 供应商确认订单。
- 供应商发货。
- 酒店收货。
- 结算提交。
- 发票提交。
- 付款完成。
- 档案封存。

### 3.6 异常流程不足

正式系统不仅要跑正常链路，还要支持：

- 撤回。
- 驳回。
- 退回修改。
- 作废。
- 需求变更。
- 废标。
- 流标。
- 重新招采。
- 退货。
- 换货。
- 验收异常。
- 发票异常。
- 付款失败。
- 补档。

### 3.7 配置化不足

当前部分审批规则已有基础，但正式系统还需要：

- 组织范围配置。
- 金额分级审批。
- 品类审批规则。
- 采购方式规则。
- 供应商准入规则。
- 评审模板配置。
- 流程节点角色配置。
- 超时提醒配置。
- 异常分支配置。

### 3.8 生产级底座不足

正式生产仍需补：

- 正式身份认证。
- 正式数据库。
- 正式文件存储。
- 外部系统集成。
- 日志监控。
- 告警。
- 备份恢复。
- 安全测试。
- 性能测试。

---

## 4. 目标架构

推荐目标架构：

```text
角色工作台 / 待办中心 / 业务页面
        ↓
API 层
        ↓
Workflow Orchestrator 流程编排层
        ↓
Process Layer 流程抽象层
        ↓
R8 Workflow Adapter + BPMN Adapter
        ↓
Domain Services 业务服务
        ↓
数据库 / 文件 / 审计 / 外部系统适配器
```

各层职责：

| 层级 | 职责 |
| --- | --- |
| 角色工作台 / 待办中心 | 给不同角色展示当前任务、消息、流程入口 |
| API 层 | 保持现有接口兼容，新增流程查询和流程动作接口 |
| Workflow Orchestrator | 负责启动流程、处理事件、推进节点、生成任务和通知 |
| Process Layer | 统一流程定义、流程实例、流程任务、流程事件 |
| R8 Workflow Adapter | 兼容现有 R8 审批、任务、通知能力 |
| BPMN Adapter | 后续解析 BPMN，映射到 ProcessDefinition，不直接替换旧流程 |
| Domain Services | 继续负责业务校验、业务落库和业务状态更新 |
| 数据库 / 文件 / 审计 / 适配器 | 提供正式数据、文件、审计和外部系统边界 |

---

## 5. 核心数据模型

### 5.1 流程定义表：process_definitions

用于定义流程模板。

字段建议：

- id
- process_code
- process_name
- process_type
- version_no
- status
- enabled_from
- enabled_to
- source_type
- source_json
- created_by
- created_at
- updated_at

流程类型建议：

- supplier_onboarding
- procurement_request
- rfq
- tender
- direct_purchase
- award_approval
- contract
- order_fulfillment
- settlement
- invoice
- payment
- archive

### 5.2 流程节点表：process_nodes

用于定义每个流程有哪些节点。

字段建议：

- id
- process_definition_id
- node_key
- node_name
- node_type
- assignee_role_id
- assignee_rule_json
- action_schema_json
- timeout_rule_json
- sort_order
- created_at
- updated_at

节点类型建议：

- start
- user_task
- system_task
- gateway
- event
- end

### 5.3 流程流转表：process_transitions

用于定义节点之间如何流转。

字段建议：

- id
- process_definition_id
- from_node_key
- to_node_key
- action_code
- condition_json
- priority
- created_at
- updated_at

### 5.4 流程实例表：process_instances

用于记录真实业务流程。

字段建议：

- id
- process_definition_id
- process_code
- business_type
- business_id
- business_title
- current_node_key
- status
- started_by
- started_at
- completed_by
- completed_at
- org_id
- supplier_id
- project_id
- source_engine
- source_instance_id
- source_json
- created_at
- updated_at

状态建议：

- draft
- running
- waiting
- completed
- rejected
- cancelled
- failed

### 5.5 流程任务表：process_task_instances

用于记录每个角色的待办。

字段建议：

- id
- process_instance_id
- node_key
- task_type
- business_type
- business_id
- title
- assignee_role_id
- assignee_user_id
- supplier_id
- org_id
- project_id
- status
- due_at
- completed_by
- completed_at
- source_engine
- source_task_id
- source_json
- created_at
- updated_at

状态建议：

- pending
- completed
- cancelled
- expired

### 5.6 流程事件表：process_events

用于记录流程中的所有关键事件。

字段建议：

- id
- process_instance_id
- event_code
- event_name
- business_type
- business_id
- actor_id
- actor_role_id
- from_node_key
- to_node_key
- from_status
- to_status
- payload_json
- created_at

### 5.7 业务绑定表：business_process_bindings

用于绑定业务对象和流程实例。

字段建议：

- id
- business_type
- business_id
- process_instance_id
- relation_type
- created_at

### 5.8 流程审计表：process_audit_logs

用于审计监督和合规追溯。

字段建议：

- id
- process_instance_id
- action_code
- object_type
- object_id
- actor_id
- actor_role_id
- before_json
- after_json
- ip_address
- user_agent
- created_at

---

## 6. 与现有 R8 Workflow 的兼容关系

当前 R8 表和 Process Layer 建议映射：

| 现有 R8 对象 | 新 Process 对象 | 说明 |
| --- | --- | --- |
| r2_approval_rules | process_definitions / process_nodes | 审批规则可转换为流程定义和节点配置 |
| r2_approval_instances | process_instances | 审批实例可镜像为流程实例 |
| r2_task_items | process_task_instances | R8 任务可镜像为流程任务 |
| r2_notifications | process_events / process_messages | 通知可关联流程事件 |
| approval action | process_events / process_audit_logs | 审批动作写入流程事件和审计 |

迁移原则：

- 第一阶段 R8 仍是主执行源。
- Process Layer 先做影子记录。
- 旧接口响应结构不变。
- 新流程 API 只读展示流程轨迹。
- 确认稳定后，再逐步让 Process Layer 成为任务和流程读取主源。

---

## 7. 分阶段实施方案

### M0：冻结当前可用基线

目标：保护现有能跑通的 8 角色采购流程。

任务：

- 固定当前 API 测试。
- 固定 8 角色回归测试。
- 固定采购需求禁止自审测试。
- 固定酒店需求承接测试。
- 固定截标、评审、定标测试。
- 固定酒店自采履约测试。
- 固定供应商隔离和系统管理员隔离测试。
- 固定 typecheck 和 build。

验收：

- API 测试通过。
- typecheck 通过。
- build 通过。
- 浏览器 8 角色核心页面可加载。
- 当前接口响应结构不破坏。

### M1：新增 Process Layer 影子层

目标：不改变业务行为，只记录统一流程主线。

首批接入：

- 采购需求审批。
- 定标审批。

任务：

- 新增流程表。
- 新增 ProcessRepository。
- 新增 ProcessService。
- 新增 R8ToProcessAdapter。
- 采购需求提交时创建流程实例。
- 采购需求审批任务生成时同步流程任务。
- 审批通过 / 驳回时写流程事件。
- 定标审批提交时创建流程实例。
- 定标审批通过 / 驳回时写流程事件。

验收：

- 原 R8 流程继续可跑。
- 原业务接口响应不变。
- 新 Process 表可查到实例、任务、事件。
- Process 写入失败不能影响原业务主流程。
- 新增测试覆盖 R8 与 Process 镜像一致。

### M2：统一待办中心和流程视图

目标：让用户开始按流程工作，而不是只按模块找功能。

任务：

- 我的待办优先读取 Process Task，R8 作为 fallback。
- 业务详情页增加流程进度条。
- 项目工作台显示当前节点、当前处理角色、下一步动作。
- 审计监督页面显示流程时间线。
- 系统管理员只能维护流程规则，不访问业务数据。

验收：

- 集团采购、采购经办、酒店采购、供应商、专家、财务、审计、管理员看到各自正确待办。
- 无权限按钮隐藏或禁用。
- 供应商主体隔离不回退。
- 系统管理员业务隔离不回退。
- 审计监督只读边界不回退。

### M3：引入内部事件驱动

目标：关键业务动作产生标准事件，由事件推动任务、通知、审计和流程节点。

首批事件：

- ProcurementRequestCreated
- ProcurementRequestSubmitted
- ProcurementRequestApproved
- ProcurementMethodDecided
- AnnouncementPublished
- SupplierRegistered
- QuoteSubmitted
- BidCutoffCompleted
- ComparisonReportGenerated
- ExpertScoreSubmitted
- AwardApproved
- PurchaseOrderCreated
- SupplierOrderConfirmed
- OrderShipped
- OrderReceived
- SettlementSubmitted
- InvoiceSubmitted
- PaymentCaptured
- ArchiveSealed

任务：

- 新增内部 EventBus。
- 新增 ProcessEventHandler。
- 新增事件重试或补偿机制。
- 关键业务动作后发事件。
- 事件写入 process_events。
- 事件触发待办、通知和审计。

验收：

- 每个关键业务动作有事件记录。
- 事件不能绕过权限校验。
- 事件失败有可追踪记录。
- 事件与业务状态一致。
- API 回归和 8 角色回归通过。

### M4：核心业务流程化

目标：把供应商、采购、招采、评审、履约、结算、档案逐步流程化。

#### 供应商准入流程

流程：

```text
供应商注册 -> 资料补全 -> 资质审核 -> 准入审批 -> 品类授权 -> 生效上线
```

补齐：

- 注册。
- 资料提交。
- 资质证照。
- 证照有效期。
- 准入审批。
- 品类范围。
- 服务区域。
- 冻结 / 恢复。
- 评级。
- 绩效评价。

#### 采购需求流程

流程：

```text
创建需求 -> 提交审批 -> 采购审批 -> 方式决策 -> 生成采购项目
```

补齐：

- 预算。
- 品类。
- 成本中心。
- 交付地点。
- 附件。
- 金额分级审批。
- 需求撤回。
- 需求变更。
- 作废。

#### RFQ / TENDER / DIRECT 招采流程

流程：

```text
RFQ：创建询价 -> 邀请供应商 -> 报价 -> 比价 -> 定标
TENDER：公告 -> 报名 -> 资格审查 -> 报价 -> 开标 -> 评审 -> 定标
DIRECT：需求确认 -> 供应商确认 -> 定价 -> 审批
```

补齐：

- 澄清答疑。
- 补遗。
- 保证金。
- 报名资格审核。
- 废标。
- 流标。
- 重新招采。

#### 评审定标流程

流程：

```text
报价锁定 -> 专家评审 -> 汇总评分 -> 比价报告 -> 定标审批 -> 结果发布
```

补齐：

- 专家库。
- 专家抽取。
- 专家回避。
- 评分模板。
- 技术评分。
- 商务评分。
- 价格评分。
- 定标报告。
- 中标通知。

#### 合同流程

流程：

```text
定标完成 -> 合同起草 -> 合同审批 -> 合同签署 -> 履约执行 -> 合同归档
```

补齐：

- 合同生成。
- 合同审批。
- 合同签署。
- 合同变更。
- 合同履约节点。
- 合同归档。

#### 订单履约流程

流程：

```text
生成订单 -> 供应商确认 -> 发货 -> 收货 -> 验收 -> 评价 -> 进入结算
```

补齐：

- 分批发货。
- 部分收货。
- 退货。
- 换货。
- 验收异常。
- 质检。
- 物流。
- 履约评价。

#### 结算付款流程

流程：

```text
收货完成 -> 生成结算 -> 对账 -> 发票 -> 财务审核 -> 付款 -> 结算完成
```

补齐：

- 对账单。
- 发票。
- 发票审核。
- 付款申请。
- 付款审批。
- 付款批次。
- 扣款。
- 税率。
- 财务系统回写。

#### 档案审计流程

流程：

```text
项目结束 -> 档案生成 -> 完整性检查 -> 补档 -> 封存 -> 审计查阅
```

补齐：

- 项目自动归档。
- 文件完整性检查。
- 审计查询。
- 补档申请。
- 补档审批。
- 封存。
- 审计报告导出。

### M5：BPMN 受控引入

目标：把 BPMN 作为流程配置扩展，而不是一开始替代系统。

任务：

- BPMN XML 上传 / 保存。
- BPMN 节点解析。
- BPMN 节点映射系统角色。
- BPMN 节点映射任务类型。
- BPMN 节点映射业务动作。
- 流程合法性校验。
- 流程模拟运行。
- 仅对指定组织、指定流程、指定环境启用。

首批试点建议：

- 采购需求审批。
- 或供应商准入审批。

不要首批选择：

- 完整招标。
- 财务付款。
- 合同履约全流程。

验收：

- BPMN 配置错误不能影响旧流程。
- BPMN 流程可回退到默认 Process / R8 流程。
- BPMN 启用范围可控。
- BPMN 模拟结果和实际执行一致。
- 所有旧回归测试继续通过。

### M6：生产级底座补齐

目标：达到正式客户生产运行要求。

任务：

- 正式 SSO / OAuth / LDAP / 客户门户接入。
- PostgreSQL 或 MySQL 正式数据库。
- 数据库迁移、索引、约束、备份恢复。
- 对象存储或客户文件服务。
- 文件权限、预览、防病毒、下载审计。
- OA、ERP、WMS、财务、合同、发票、支付、消息平台适配。
- 日志中心。
- 指标监控。
- 告警。
- 异常追踪。
- 定时任务监控。
- 安全测试。
- 性能测试。
- 备份恢复演练。
- 上线演练和回滚预案。

验收：

- 生产环境禁用 mock auth。
- 生产环境无演示账号和演示数据。
- 健康检查明确 productionReady。
- 备份恢复演练通过。
- 越权测试通过。
- 并发和大数据量测试通过。
- 外部系统 adapter 有真实联调证据。

---

## 8. 角色工作流最终形态

### 集团采购管理

- 查看集团范围采购需求。
- 审批采购事项。
- 监督采购方式决策。
- 审批定标。
- 查看关键流程风险。

### 采购经办

- 承接采购需求。
- 组织公告 / 邀请。
- 管理供应商报名。
- 推进报价、截标、比价。
- 组织评审和定标。

### 酒店采购

- 提交采购需求。
- 发起酒店自采。
- 下单。
- 收货。
- 处理收货异常。

### 供应商管理员

- 维护供应商资料。
- 维护商品。
- 确认订单。
- 发货。
- 处理退货。

### 供应商报价人员

- 查看邀请。
- 报名。
- 提交报价。
- 上传响应文件。
- 查看结果。

### 专家

- 查看评审任务。
- 确认回避、纪律、保密承诺。
- 查看评审资料。
- 打分。
- 提交评审意见。

### 酒店财务 / 财务审核

- 查看结算。
- 审核发票。
- 处理付款状态。
- 查看财务相关待办。

### 审计监督

- 查看流程轨迹。
- 查看项目档案。
- 查看审计日志。
- 发起或审批补档时必须受权限控制。
- 默认不处理实质采购业务。

### 系统管理员

- 配置组织。
- 配置用户。
- 配置角色。
- 配置流程规则。
- 配置系统参数。
- 不访问实质采购业务数据。

---

## 9. 设计边界

必须坚持：

- 业务实体状态不能被流程状态完全替代。
- R8 Workflow 不能一次性删除。
- BPMN 不能一开始强制接管全部业务。
- Service 不能全部改成空壳。
- 系统管理员不能访问实质采购业务数据。
- 供应商主体隔离不能回退。
- 采购发起人不能审批自己的需求。
- 审计监督默认只读。
- 演示能力不能包装成生产能力。
- 外部集成未真实接入前，只能称为 adapter / contract boundary。

---

## 10. 推荐排期

| 里程碑 | 时间 | 目标 |
| --- | --- | --- |
| M0 | 1 周 | 冻结当前可用基线和回归测试 |
| M1 | 3-4 周 | Process Layer 影子层 |
| M2 | 4-6 周 | 统一待办和流程视图 |
| M3 | 4-6 周 | 内部事件驱动 |
| M4 | 8-10 周 | 核心业务流程化 |
| M5 | 4-6 周 | BPMN 受控试点 |
| M6 | 6-10 周 | 生产级底座补齐 |

总周期建议：约 5-8 个月，具体取决于客户外部系统接入深度和字段复杂度。

---

## 11. 验收标准

### 系统级验收

- 每个关键业务对象都有流程实例。
- 每个关键动作都有流程事件。
- 每个待处理事项都有任务实例。
- 每个角色只看到自己的任务。
- 每个流程能看到当前节点、上一节点、下一节点。
- 每个状态变更都有审计日志。
- 正常流程和异常流程都能跑。
- 旧 R8 流程兼容，不破坏现有接口。
- Process Layer 和 R8 状态一致。
- BPMN 启用失败可以回退。

### 角色验收

- 集团采购管理能审批、监督和定标。
- 采购经办能承接需求、组织招采、推进评审定标。
- 酒店采购能提交需求、自采下单、收货。
- 供应商只能操作自己供应商主体的数据。
- 供应商报价人员能报名报价。
- 专家只能处理自己的评审任务。
- 财务能查看和处理结算付款。
- 审计监督只读查看流程、档案和日志。
- 系统管理员只能配置系统，不访问实质采购业务数据。

### 工程验收

- API 测试通过。
- typecheck 通过。
- build 通过。
- 8 角色浏览器回归通过。
- 权限越权测试通过。
- 供应商隔离测试通过。
- 系统管理员隔离测试通过。
- 采购发起人与审批人职责隔离测试通过。
- 生产环境禁用 mock auth。
- 生产环境不加载演示账号和演示数据。

### 生产验收

- 正式身份认证接入完成。
- 正式数据库接入完成。
- 正式文件存储接入完成。
- 备份恢复演练通过。
- 日志、监控、告警可用。
- 安全测试通过。
- 性能测试通过。
- 外部系统真实联调通过。
- 上线回滚预案验证通过。

---

## 12. 首个新任务建议

建议新任务不要直接做 BPMN，而是执行 M1：

> 在现有 R8 Workflow 基础上新增 Process Layer 影子层，首批接入采购需求审批和定标审批，保持所有旧接口和旧流程兼容，新增流程实例、流程任务、流程事件的只读记录和测试验证。

首个任务范围：

- 新增 Process 数据模型。
- 新增 ProcessRepository。
- 新增 ProcessService。
- 新增 R8ToProcessAdapter。
- 采购需求提交 / 审批同步 Process。
- 定标提交 / 审批同步 Process。
- 新增只读查询接口。
- 新增测试验证 R8 与 Process 一致。
- 跑 API、typecheck、build 和 8 角色关键回归。

首个任务不做：

- 不引入 BPMN 引擎。
- 不替换现有 R8。
- 不重写采购、商城、财务页面。
- 不改变旧接口响应结构。
- 不迁移历史数据。

---

## 13. Go / No-Go 判断

当前系统：

- 作为演示版：Go。
- 作为 UAT / 二开底座：Go。
- 作为流程型操作系统正式版：No-Go。
- 作为客户生产正式上线：No-Go。

完成 M1-M4 后：

- 可称为流程型采购平台雏形。
- 仍需生产底座和真实集成才能生产上线。

完成 M5-M6 并通过生产验收后：

- 才能进入正式生产上线评估。

---

## 14. 最终原则

本方案的核心不是“为了 BPMN 而 BPMN”，而是让系统真正从模块型操作变成流程型操作。

最终判断标准只有一个：

> 客户的每个采购、供应商、订单、结算、档案事项，都能沿着清晰流程推进；每个角色只处理自己的待办；每个状态变化都有事件和审计；每个异常分支都有处理路径；系统能在生产环境稳定、安全、可追溯地运行。

