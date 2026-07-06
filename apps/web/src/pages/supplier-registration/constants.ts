import type { DataTableColumn } from "../../components/base";

export const REGISTRATION_ENTRY_HINT =
  "报名资料是供应商参与采购的第一步：先选择已发布公告并提交报名材料，资格通过后再到“报价响应”提交报价或响应文件。";

export const REVIEW_ENTRY_HINT =
  "这里是采购经办人的报名资格审核页。供应商提交报名材料后，经办人在此核验资料；只有资格通过的供应商才能进入报价响应。";

export const REGISTRATION_COLUMNS: DataTableColumn[] = [
  { key: "registration", label: "报名编号" },
  { key: "supplier", label: "供应商" },
  { key: "project", label: "关联项目" },
  { key: "submittedAt", label: "提交日期" },
  { key: "status", label: "审核状态" },
  { key: "review", label: "操作" }
];

export const REVIEW_REGISTRATION_COLUMNS: DataTableColumn[] = REGISTRATION_COLUMNS;

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  submitted: "已提交",
  qualified: "资格通过",
  rejected: "资格未通过"
};
