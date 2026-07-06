import type { DataTableColumn } from "../../components/base";

export const ANNOUNCEMENT_COLUMNS: DataTableColumn[] = [
  { key: "type", label: "编号 / 类型" },
  { key: "title", label: "公告标题" },
  { key: "project", label: "关联项目" },
  { key: "date", label: "日期" },
  { key: "methodScope", label: "类型 / 范围" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export const INVITATION_COLUMNS: DataTableColumn[] = [
  { key: "announcement", label: "公告" },
  { key: "announcementStatus", label: "公告状态" },
  { key: "supplier", label: "供应商" },
  { key: "status", label: "邀请状态" },
  { key: "notificationStatus", label: "通知状态" },
  { key: "notifiedAt", label: "发送时间" }
];
