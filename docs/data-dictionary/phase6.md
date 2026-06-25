# Phase 6 数据字典：外部交易备案

## 边界

本阶段只覆盖外部交易项目在内部系统中的备案路径。

包含：
- 创建外部交易备案项目。
- 记录内部审批留痕。
- 登记外部平台名称和外部项目编号。
- 记录外部公告资料和外部中标结果资料的元数据。
- 完成外部结果备案。
- 继续强阻断内部公告、报名、报价、专家评审、内部定标。

不包含：
- 连接真实外部交易平台。
- 抓取外部公告或结果。
- 替代外部交易平台流程。
- 内部报价、内部专家评审、内部定标审批。

## 核心对象

| 对象 | 说明 | 关键字段 |
|---|---|---|
| `external_trade_records` | 外部交易备案记录 | `project_id`, `external_platform_name`, `external_project_code`, `internal_approval_status`, `announcement_material_metadata_json`, `result_material_metadata_json`, `result_record_status`, `status` |
| `procurement_projects` | 外部交易项目仍复用项目主表 | `external_trade_flag`, `status`, `display_status`, `quote_deadline_at` |
| `audit_logs` | 备案与阻断审计日志 | `action`, `project_id`, `result`, `reason` |

## 状态与控制

| 控制点 | MVP 规则 |
|---|---|
| 外部项目创建 | 外部交易项目不设置内部报价截止时间，`beforeDeadline=false`。 |
| 内部审批 | 只记录内部审批留痕，不连接真实 OA。 |
| 外部编号 | 登记外部平台名称和外部项目编号，二者必填。 |
| 外部资料 | 只保存资料元数据，不处理真实文件内容。 |
| 结果备案 | 必须先存在外部结果资料元数据。 |
| 强阻断 | 命中内部公告、报名、报价、专家评审、内部定标时统一返回 `EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED` 并写日志。 |

## 审计

| 动作 | 审计动作名 |
|---|---|
| 创建外部交易项目 | `external_trade.project.create` |
| 记录内部审批 | `external_trade.internal_approval.record` |
| 登记外部编号 | `external_trade.project_record` |
| 上传外部公告资料元数据 | `external_trade.announcement_material.upload` |
| 上传外部结果资料元数据 | `external_trade.result_material.upload` |
| 外部结果备案 | `external_trade.result_record` |
| 内部动作阻断 | `external_trade.block.*` |
