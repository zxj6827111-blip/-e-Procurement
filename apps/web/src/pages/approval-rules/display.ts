import type { DataTableColumn } from "../../components/base";
import type { R8ApprovalRuleView } from "../../api/workflow";
import type { StatusTone } from "./types";

export const RULE_COLUMNS: DataTableColumn[] = [
  { key: "rule", label: "规则编号 / 名称" },
  { key: "businessType", label: "业务类型" },
  { key: "amountRange", label: "金额范围" },
  { key: "nodeRoles", label: "审批环节" },
  { key: "actions", label: "动作" },
  { key: "strategy", label: "默认策略" },
  { key: "status", label: "启用状态" },
  { key: "version", label: "版本" },
  { key: "operations", label: "处理" }
];

export function ruleStatusTone(rule: R8ApprovalRuleView): StatusTone {
  return rule.status === "enabled" ? "success" : "warning";
}
