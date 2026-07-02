import type { DataTableColumn } from "../../components/base";

export const BID_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "supplier", label: "供应商" },
  { key: "amount", label: "金额" },
  { key: "taxRate", label: "税率" },
  { key: "delivery", label: "交付" },
  { key: "status", label: "状态" },
  { key: "version", label: "版本" },
  { key: "submittedAt", label: "提交时间" },
  { key: "lockedAt", label: "锁定时间" }
];

export const BIDDING_ENTRY_HINT = "报价响应只开放给报名资格已通过的供应商。请先在“报名资料”提交材料，采购经办审核通过后，才可以在这里保存草稿并提交报价。";
