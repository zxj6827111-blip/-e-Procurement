import type { DataTableColumn } from "../../components/base";

export const REGISTRATION_ENTRY_HINT =
  "报名资料是供应商参与采购的第一步：先选择已发布公告并提交报名材料，资格通过后再到“报价响应”提交报价或响应文件。";

export const REVIEW_ENTRY_HINT =
  "这里是采购经办人的报名资格审核页。供应商提交报名材料后，经办人在此核验资料；只有资格通过的供应商才能进入报价响应。";

export const REGISTRATION_COLUMNS: DataTableColumn[] = [
  { key: "announcement", label: "公告" },
  { key: "project", label: "项目" },
  { key: "supplier", label: "供应商" },
  { key: "status", label: "报名状态" },
  { key: "materials", label: "资料" },
  { key: "submittedAt", label: "提交时间" }
];

export const REVIEW_REGISTRATION_COLUMNS: DataTableColumn[] = [...REGISTRATION_COLUMNS, { key: "review", label: "审核" }];

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  submitted: "已提交",
  qualified: "资格通过",
  rejected: "资格未通过"
};
