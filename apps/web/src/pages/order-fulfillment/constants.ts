import type { DataTableColumn } from "../../components/base";

export const PROCUREMENT_ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "订单号" },
  { key: "projectName", label: "项目" },
  { key: "supplier", label: "供应商" },
  { key: "line", label: "主要物资" },
  { key: "status", label: "状态" },
  { key: "delivery", label: "交付/收货" },
  { key: "amount", label: "金额" },
  { key: "actions", label: "操作" }
];

export const MALL_ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "订单号" },
  { key: "supplier", label: "供应商" },
  { key: "line", label: "商品" },
  { key: "status", label: "订单状态" },
  { key: "payment", label: "付款" },
  { key: "address", label: "收货地点" },
  { key: "amount", label: "金额" },
  { key: "actions", label: "操作" }
];

export const RECEIPT_SUMMARY_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "count", label: "验收记录" },
  { key: "recent", label: "最近记录" }
];
