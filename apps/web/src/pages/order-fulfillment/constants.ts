import type { DataTableColumn } from "../../components/base";

export const PROCUREMENT_ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "订单编号" },
  { key: "supplier", label: "供应商名称" },
  { key: "projectName", label: "项目" },
  { key: "amount", label: "订单金额" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export const MALL_ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "订单编号" },
  { key: "supplier", label: "供应商名称" },
  { key: "line", label: "商品明细" },
  { key: "amount", label: "订单金额" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export const RECEIPT_SUMMARY_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "关联项目" },
  { key: "count", label: "验收记录" },
  { key: "recent", label: "最近记录" }
];
