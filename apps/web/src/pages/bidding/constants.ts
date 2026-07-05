import type { DataTableColumn } from "../../components/base";

export const BID_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "amount", label: "报价金额" },
  { key: "taxRate", label: "税率" },
  { key: "delivery", label: "交付周期" },
  { key: "status", label: "状态 / 提交" }
];

export const BIDDING_ENTRY_HINT =
  "报价响应只开放给报名资格已通过的供应商。请先在“报名资料”提交材料，采购经办审核通过后，才可以在这里保存草稿并提交报价。";
