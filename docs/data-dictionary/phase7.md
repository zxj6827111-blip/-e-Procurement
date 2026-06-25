# Phase 7 数据字典：合同台账、履约节点、验收付款、供应商评价

## 边界

本阶段只覆盖采购后管理的 MVP 台账能力。

包含：
- 合同台账登记。
- 合同系统链接和附件元数据。
- 履约节点计划与状态更新。
- 验收记录、付款记录元数据。
- 履约异常说明。
- 供应商履约评价和评价历史。

不包含：
- 合同正文编辑。
- 合同审批。
- 合同签署。
- 电子签章。
- 替代合同系统、财务系统或 OA。

## 核心对象

| 对象 | 说明 | 关键字段 |
|---|---|---|
| `contract_ledgers` | 合同台账 | `project_id`, `supplier_id`, `contract_no`, `amount`, `status`, `contract_system_link`, `attachment_metadata_json` |
| `performance_nodes` | 履约节点 | `contract_id`, `node_name`, `plan_date`, `status`, `acceptance_record`, `payment_record`, `exception_note` |
| `acceptance_payment_records` | 验收/付款记录 | `contract_id`, `record_type`, `status`, `amount`, `summary`, `attachment_metadata_json` |
| `supplier_evaluations` | 供应商评价 | `supplier_id`, `project_id`, `contract_id`, `dimensions_json`, `score`, `description`, `improvement_suggestion` |

## 状态与控制

| 控制点 | MVP 规则 |
|---|---|
| 合同台账 | 只能登记台账、金额、供应商、链接和附件元数据。 |
| 合同系统边界 | 不存在合同正文编辑、合同审批、合同签署、电子签章接口。 |
| 供应商隔离 | 供应商只能查看本企业合同、履约、验收付款和评价。 |
| 履约节点 | 采购业务角色维护节点状态，审计/供应商只读。 |
| 供应商评价 | 评价结果写入供应商档案分数和评价历史。 |
| 外部交易 | 外部交易项目可进入合同台账和履约评价路径。 |

## 审计

| 动作 | 审计动作名 |
|---|---|
| 登记合同台账 | `contract_ledger.register` |
| 创建履约节点 | `performance_node.create` |
| 更新履约节点 | `performance_node.update` |
| 记录验收/付款 | `acceptance_payment.record` |
| 创建供应商评价 | `supplier_evaluation.create` |
