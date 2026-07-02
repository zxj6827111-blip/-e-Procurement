import type { DataTableColumn } from "../../components/base";

export const ANNOUNCEMENT_COLUMNS: DataTableColumn[] = [
  { key: "title", label: "公告标题" },
  { key: "document", label: "采购文件" },
  { key: "methodScope", label: "方式 / 范围" },
  { key: "status", label: "状态" },
  { key: "registrationDeadline", label: "报名截止" },
  { key: "quoteDeadline", label: "报价截止" },
  { key: "published", label: "发布状态" }
];

export const INVITATION_COLUMNS: DataTableColumn[] = [
  { key: "announcement", label: "公告" },
  { key: "announcementStatus", label: "公告状态" },
  { key: "supplier", label: "供应商" },
  { key: "status", label: "邀请状态" },
  { key: "notificationStatus", label: "通知状态" },
  { key: "notifiedAt", label: "发送时间" }
];
