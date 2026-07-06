import type { DataTableColumn } from "../../components/base";
import type { ScoringCategory, StatusTone, TemplateStatus } from "./types";

export const TEMPLATE_COLUMNS: DataTableColumn[] = [
  { key: "template", label: "模板名称" },
  { key: "category", label: "适用采购分类" },
  { key: "totalScore", label: "总分" },
  { key: "itemCount", label: "评分项数量" },
  { key: "ratio", label: "技术/商务比重" },
  { key: "status", label: "启用状态" },
  { key: "actions", label: "操作" }
];

export const SCORE_ITEM_COLUMNS: DataTableColumn[] = [
  { key: "id", label: "项目 ID" },
  { key: "category", label: "分类" },
  { key: "maxScore", label: "分值" },
  { key: "label", label: "评分项名称" },
  { key: "reference", label: "参考标准" },
  { key: "evidence", label: "需查看材料" },
  { key: "actions", label: "操作" }
];

export const CATEGORY_OPTIONS: Array<{ value: ScoringCategory; label: string }> = [
  { value: "technical", label: "技术分" },
  { value: "service", label: "商务分" },
  { value: "price", label: "价格分" }
];

export const STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: "草稿",
  enabled: "启用中",
  disabled: "停用"
};

export function statusLabel(status: TemplateStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function categoryLabel(category: ScoringCategory) {
  return CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? category;
}

export function statusTone(status: TemplateStatus): StatusTone {
  if (status === "enabled") return "success";
  if (status === "draft") return "warning";
  if (status === "disabled") return "error";
  return "default";
}
