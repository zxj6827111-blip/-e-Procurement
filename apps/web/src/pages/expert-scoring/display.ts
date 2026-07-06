import type { DataTableColumn } from "../../components/base";
import type { StatusTone } from "./types";

export const ASSIGNMENT_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "status", label: "状态" },
  { key: "avoidance", label: "回避确认" },
  { key: "discipline", label: "纪律确认" },
  { key: "confidentiality", label: "保密承诺" }
];

export const SCORE_ITEM_COLUMNS: DataTableColumn[] = [
  { key: "item", label: "评分维度" },
  { key: "reference", label: "打分项及标准" },
  { key: "maxScore", label: "满分" },
  { key: "score", label: "评分" },
  { key: "comment", label: "专家意见" }
];

export const SHEET_STATUS_LABELS: Record<string, string> = {
  assigned: "已分配",
  avoidance_pending: "待确认回避",
  discipline_pending: "待确认评审纪律",
  confidentiality_pending: "待确认保密承诺",
  scoring: "评分中",
  saved: "已暂存",
  submitted_locked: "已提交并锁定",
  reevaluation_requested: "复评申请中",
  reevaluation_approved: "复评已批准",
  resubmitted_locked: "复评已提交并锁定",
  replaced: "已替换",
  archived: "已归档"
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  assigned: "待确认",
  confirmed: "已确认",
  submitted_locked: "已提交并锁定",
  replaced: "已替换"
};

export function sheetStatusLabel(status: string) {
  return SHEET_STATUS_LABELS[status] ?? status;
}

export function assignmentStatusLabel(status: string) {
  return ASSIGNMENT_STATUS_LABELS[status] ?? status;
}

export function sheetStatusTone(status: string): StatusTone {
  if (["submitted_locked", "resubmitted_locked", "confirmed"].includes(status)) return "success";
  if (["scoring", "saved", "assigned"].includes(status)) return "warning";
  if (["replaced", "archived"].includes(status)) return "error";
  if (["reevaluation_approved"].includes(status)) return "primary";
  return "default";
}
