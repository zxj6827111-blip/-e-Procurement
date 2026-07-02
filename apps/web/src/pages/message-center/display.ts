import type { DataTableColumn } from "../../components/base";
import type { ReadFilter, StatusTone } from "./types";

export const MESSAGE_COLUMNS: DataTableColumn[] = [
  { key: "message", label: "消息" },
  { key: "business", label: "业务对象" },
  { key: "status", label: "状态" },
  { key: "time", label: "时间" },
  { key: "entry", label: "入口" },
  { key: "actions", label: "操作" }
];

export const READ_FILTER_OPTIONS: Array<{ value: ReadFilter; label: string }> = [
  { value: "all", label: "全部消息" },
  { value: "unread", label: "未读" },
  { value: "read", label: "已读" }
];

export function readTone(read: boolean): StatusTone {
  return read ? "success" : "warning";
}
