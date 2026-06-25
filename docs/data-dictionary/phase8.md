# Phase 8 数据字典：项目档案、封存补档、审计监督

## 边界

本阶段只覆盖 MVP 档案归集和审计查询闭环。

包含：
- 档案目录模板。
- 项目档案目录快照。
- 档案完整性检查。
- 档案封存。
- 补档申请、补档审批、补档应用。
- 项目全过程审计、用户操作审计、敏感动作审计查询。

不包含：
- CA。
- 电子签章。
- 可信时间戳。
- 防篡改存证。
- 真实监管报送。

## 核心对象

| 对象 | 说明 | 关键字段 |
|---|---|---|
| `archive_templates` | 档案目录模板 | `template_code`, `template_name`, `version_no`, `items` |
| `archive_items` | 项目档案目录快照项 | `project_id`, `item_name`, `required_flag`, `collected_flag`, `sealed`, `status`, `snapshot_json` |
| `archive_supplement_requests` | 补档申请 | `project_id`, `archive_item_id`, `reason`, `approval_status`, `audit_log_id` |
| `audit_logs` | 审计日志 | `actor_id`, `role_id`, `project_id`, `action`, `object_type`, `object_id`, `result`, `reason` |

## 状态与控制

| 控制点 | MVP 规则 |
|---|---|
| 快照 | 项目档案目录从模板生成快照，后续模板变化不覆盖旧快照。 |
| 完整性检查 | 识别必需但未归集的档案项。 |
| 封存 | 封存后档案项只读，不能直接修改。 |
| 补档 | 补档必须先申请，再审批，最后应用补档元数据。 |
| 补档应用 | 不覆盖原快照字段，只追加补档元数据和应用时间。 |
| 审计角色 | 纪检/审计只读，不得修改业务或档案数据。 |
| 审计查询 | 支持按项目、用户、敏感动作查询。 |

## 审计

| 动作 | 审计动作名 |
|---|---|
| 生成档案快照 | `archive.snapshot` |
| 完整性检查 | `archive.check` |
| 档案封存 | `archive.seal` |
| 封存后直接修改拒绝 | `archive_item.update.denied` |
| 补档申请 | `archive_supplement_request.submit` |
| 补档审批 | `archive_supplement_request.approve` |
| 补档应用 | `archive_supplement.apply` |
