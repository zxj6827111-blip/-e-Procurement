import type { DataTableColumn } from "../../components/base";
import type { StatusTone } from "./types";

export const DOCUMENT_COLUMNS: DataTableColumn[] = [
  { key: "title", label: "文件编号 / 名称" },
  { key: "project", label: "关联项目" },
  { key: "lockedAt", label: "更新时间" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export function documentStatusTone(status: string): StatusTone {
  if (status === "locked") return "success";
  if (status === "voided") return "error";
  if (status === "reviewing" || status === "submitted") return "warning";
  return "default";
}

export function reviewStatusTone(status: string): StatusTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  if (status === "submitted" || status === "reviewing") return "warning";
  return "default";
}
