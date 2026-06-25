# Phase 4 数据字典：专家评审、评分汇总、评审报告

## 边界

本阶段只覆盖内部专家评审 MVP 骨架：专家库、专家抽取/指定/替换、三项确认、专家独立评分、评分提交锁定、重评版本、评分汇总和评审报告冻结。

不包含定标审批、结果通知、合同、履约、档案封存，也不包含 CA、电子签章、开标解密、可信时间戳或防篡改存证。

## 核心对象

| 对象 | 说明 | 关键字段 |
|---|---|---|
| `expert_directory` | 专家库 | `id`, `name`, `category`, `status`, `avoidance_tags_json`, `maintained_at` |
| `expert_assignment_records` | 项目专家分配记录 | `project_id`, `expert_id`, `method`, `reason`, `status`, `notified_at` |
| `scoring_templates` | 评分模板配置 | `template_code`, `version_no`, `config_json`, `status` |
| `scoring_sheets` | 专家 x 供应商评分表 | `project_id`, `expert_id`, `supplier_id`, `technical`, `service`, `price`, `total`, `status`, `version_no` |
| `scoring_versions` | 评分版本留痕 | `sheet_id`, `version_no`, `reason`, `approval_status`, `snapshot_json` |
| `review_reports` | 评审报告快照 | `project_id`, `report_no`, `status`, `summary_json`, `snapshot_json`, `frozen_at` |

## 状态与控制

| 控制点 | MVP 规则 |
|---|---|
| 专家隔离 | 专家只能读取本人任务、本人评分表和本人评分版本 |
| 三项确认 | 回避确认、纪律确认、保密承诺必须分别留痕；缺任一项不得评分 |
| 材料查看 | 专家完成保密承诺后才可查看评审材料 |
| 提交锁定 | 评分提交后进入锁定状态，不可再次修改 |
| 重评 | 由采购业务角色发起申请并审批，生成新版本，不覆盖旧版本 |
| 汇总 | 只汇总已提交锁定的评分表，按供应商计算技术、服务、价格和综合分 |
| 报告冻结 | 评审报告冻结后，不允许修改评分、重评或专家分配等实质结论 |
| 外部交易 | 外部交易项目强阻断内部专家评审动作 |

## 审计

以下动作必须写审计日志：

| 动作 | 审计动作名 |
|---|---|
| 专家抽取 | `expert_assignment.draw` |
| 专家指定 | `expert_assignment.appoint` |
| 专家替换 | `expert_assignment.replace` |
| 回避/纪律/保密确认 | `expert_assignment.confirm.*` |
| 专家材料查看 | `expert.material.view` |
| 评分暂存 | `scoring_sheet.save` |
| 评分提交锁定 | `scoring_sheet.submit_lock` |
| 重评申请 | `scoring_sheet.reevaluation_request` |
| 重评审批 | `scoring_sheet.reevaluation_approve` |
| 评审报告生成 | `review_report.generate` |
| 评审报告冻结 | `review_report.freeze` |
