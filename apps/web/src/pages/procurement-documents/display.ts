import type { DataTableColumn } from "../../components/base";
import type { StatusTone } from "./types";

export const DOCUMENT_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "采购项目" },
  { key: "title", label: "文件名称" },
  { key: "version", label: "版本" },
  { key: "status", label: "文件状态" },
  { key: "reviewStatus", label: "审核状态" },
  { key: "nextStep", label: "下一步" },
  { key: "attachments", label: "附件" },
  { key: "lockedAt", label: "锁定时间" },
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
