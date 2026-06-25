# Phase 5 数据字典：定标审批与结果通知

## 边界

本阶段只覆盖内部采购 MVP 的定标审批、结果通知和内部公示骨架。

包含：
- 从已冻结评审报告生成推荐中标供应商。
- 维护定标审批草稿、提交审批、Mock 审批结果回写。
- 标记是否最低价；非最低价中标必须填写原因。
- 向供应商发送结果通知，默认供应商只可查看本公司结果。
- 维护内部公示记录、通知状态和审计日志。

不包含：
- 真实 OA 审批、真实短信/邮件/站内信投递。
- 合同、履约、付款、供应商后评价、归档封存。
- CA、电子签章、可信时间戳、防篡改存证。

## 核心对象

| 对象 | 说明 | 关键字段 |
|---|---|---|
| `award_approvals` | 定标审批记录 | `project_id`, `recommended_supplier_id`, `selected_supplier_id`, `is_lowest_price`, `non_lowest_price_reason`, `approval_status`, `adapter_call_id` |
| `result_notifications` | 供应商结果通知 | `project_id`, `supplier_id`, `scope`, `status`, `visibility_config`, `content_summary`, `adapter_call_id` |
| `internal_publicity_records` | 内部公示记录 | `project_id`, `award_approval_id`, `status`, `visibility_config`, `content_summary`, `published_at` |

## 状态与控制

| 控制点 | MVP 规则 |
|---|---|
| 冻结报告前置 | 创建定标审批前必须存在已冻结的评审报告。 |
| 推荐供应商 | 默认读取冻结评审报告中的推荐供应商；如缺失则读取排名第一供应商。 |
| 最低价判断 | 根据项目投标报价自动判断 `selected_supplier_id` 是否最低价。 |
| 非最低价说明 | 非最低价中标时 `non_lowest_price_reason` 必填。 |
| Mock OA | 提交与审批结果回写只调用 Mock OA Adapter，不连接真实 OA。 |
| 通知前置 | 发送结果通知和内部公示前必须已有已通过的定标审批。 |
| 供应商可见性 | 默认供应商只看到本公司通知结果；是否展示中标供应商名称由 `visibility_config` 控制。 |
| 外部交易 | 外部交易项目强阻断内部定标审批和结果通知动作。 |

## 审计

以下动作必须写审计日志：

| 动作 | 审计动作名 |
|---|---|
| 创建定标审批 | `award_approval.create` |
| 提交定标审批 | `award_approval.submit` |
| Mock 审批回写 | `award_approval.mock_approve` |
| 发送结果通知 | `result_notification.send` |
| 发布内部公示 | `internal_publicity.publish` |
| 拒绝越权读取供应商结果 | `result_notification.supplier_scope.denied` |
