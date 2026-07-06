import type { DataTableColumn } from "../../components/base";
import type { ArchiveItem, StatusTone } from "./types";

export const ARCHIVE_ITEM_COLUMNS: DataTableColumn[] = [
  { key: "itemName", label: "材料名称" },
  { key: "required", label: "必需" },
  { key: "collected", label: "已收集" },
  { key: "sealed", label: "封存" },
  { key: "status", label: "状态" }
];

export const SUPPLEMENT_COLUMNS: DataTableColumn[] = [
  { key: "request", label: "申请编号" },
  { key: "archiveItem", label: "档案材料" },
  { key: "reason", label: "补档原因" },
  { key: "approvalStatus", label: "审批状态" }
];

export const AUDIT_COLUMNS: DataTableColumn[] = [
  { key: "action", label: "审计动作" },
  { key: "objectType", label: "业务对象" },
  { key: "result", label: "处理结果" },
  { key: "createdAt", label: "时间" }
];

export function archiveItemStatusTone(item: ArchiveItem): StatusTone {
  if (item.sealed || item.status === "sealed") return "success";
  if (item.requiredFlag && !item.collectedFlag) return "warning";
  if (item.status.includes("rejected") || item.status.includes("incomplete")) return "error";
  return item.collectedFlag ? "success" : "default";
}

export function approvalTone(status: string): StatusTone {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  if (status === "submitted") return "warning";
  return "default";
}

export function auditResultTone(result: string): StatusTone {
  if (result === "allowed" || result === "recorded") return "success";
  if (result === "denied") return "error";
  return "default";
}

export function yesNo(value: boolean) {
  return value ? "是" : "否";
}
