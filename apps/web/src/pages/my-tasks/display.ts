import type { DataTableColumn } from "../../components/base";
import type { DateFilter, StatusTone, TaskStatusFilter } from "./types";

export const TASK_COLUMNS: DataTableColumn[] = [
  { key: "task", label: "任务" },
  { key: "business", label: "项目名称" },
  { key: "status", label: "状态" },
  { key: "assignee", label: "分派" },
  { key: "time", label: "时间" },
  { key: "entry", label: "入口" },
  { key: "actions", label: "处理" }
];

export const STATUS_FILTER_OPTIONS: Array<{ value: TaskStatusFilter; label: string }> = [
  { value: "all", label: "全部任务" },
  { value: "pending", label: "待办" },
  { value: "handled_by_me", label: "已办" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" }
];

export const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" }
];

export function taskStatusTone(status: string): StatusTone {
  if (status === "pending") return "warning";
  if (status === "completed") return "success";
  if (status === "cancelled" || status === "expired") return "error";
  return "default";
}
