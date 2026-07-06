import type { DataTableColumn } from "../../components/base";

export const PROGRESS_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目编号" },
  { key: "supplier", label: "供应商 / 项目名称" },
  { key: "progress", label: "已报价/邀请数" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export const APPROVAL_COLUMNS: DataTableColumn[] = [
  { key: "approval", label: "审批编号" },
  { key: "supplier", label: "供应商" },
  { key: "viewContent", label: "查看内容" },
  { key: "download", label: "下载权限" },
  { key: "status", label: "审批状态" }
];

export const LOG_COLUMNS: DataTableColumn[] = [
  { key: "approval", label: "审批" },
  { key: "actor", label: "查看人" },
  { key: "supplier", label: "供应商" },
  { key: "content", label: "查看内容" },
  { key: "result", label: "结果" }
];

export const VIEW_CONTENT_LABELS: Record<string, string> = {
  response_file_metadata: "响应文件元数据",
  amount: "报价金额",
  response_file_download: "响应文件下载"
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  approved: "已审批",
  rejected: "已驳回",
  active: "生效中",
  expired: "已过期",
  revoked: "已撤销",
  archived: "已归档"
};

export const BID_RESULT_LABELS: Record<string, string> = {
  allowed: "允许查看",
  denied: "拒绝查看"
};
