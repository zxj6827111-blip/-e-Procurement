import type { DataTableColumn } from "../../components/base";
import type { StatusTone } from "./types";

export const SUPPLIER_RESULT_COLUMNS: DataTableColumn[] = [
  { key: "notification", label: "通知编号" },
  { key: "result", label: "结果" },
  { key: "summary", label: "内容摘要" },
  { key: "sentAt", label: "发送时间" }
];

export const CONTRACT_COLUMNS: DataTableColumn[] = [
  { key: "contractNo", label: "合同编号" },
  { key: "amount", label: "合同金额" },
  { key: "status", label: "状态" },
  { key: "updatedAt", label: "更新时间" }
];

export const RECOMMENDATION_COLUMNS: DataTableColumn[] = [
  { key: "recommended", label: "推荐供应商" },
  { key: "selected", label: "定标供应商" },
  { key: "lowest", label: "是否最低价" },
  { key: "source", label: "来源评审报告" },
  { key: "candidates", label: "候选供应商" }
];

export const APPROVAL_COLUMNS: DataTableColumn[] = [
  { key: "approval", label: "审批" },
  { key: "supplier", label: "定标供应商" },
  { key: "lowest", label: "最低价" },
  { key: "status", label: "状态" },
  { key: "reason", label: "非最低价理由" }
];

export const PRICING_REPORT_COLUMNS: DataTableColumn[] = [
  { key: "reportNo", label: "报告编号" },
  { key: "supplier", label: "中选供应商" },
  { key: "status", label: "状态" },
  { key: "items", label: "项目数" },
  { key: "createdAt", label: "生成时间" }
];

export const PRICING_ITEM_COLUMNS: DataTableColumn[] = [
  { key: "itemName", label: "物品/服务" },
  { key: "specification", label: "规格" },
  { key: "purchasePrice", label: "采购价" },
  { key: "salePrice", label: "建议销售价" },
  { key: "effective", label: "有效期" }
];

export const PRODUCT_COLUMNS: DataTableColumn[] = [
  { key: "name", label: "商品" },
  { key: "supplier", label: "供应商" },
  { key: "status", label: "状态" },
  { key: "price", label: "销售价" }
];

export const NOTIFICATION_COLUMNS: DataTableColumn[] = [
  { key: "notification", label: "通知编号" },
  { key: "supplier", label: "供应商" },
  { key: "status", label: "状态" },
  { key: "visibility", label: "可见范围" },
  { key: "sentAt", label: "发送时间" }
];

export const PUBLICITY_COLUMNS: DataTableColumn[] = [
  { key: "publicity", label: "公示编号" },
  { key: "status", label: "状态" },
  { key: "summary", label: "内容摘要" },
  { key: "publishedAt", label: "发布时间" }
];

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  submitted: "审批中",
  approved: "已通过",
  rejected: "已驳回"
};

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  sent: "已发送"
};

export const VISIBILITY_LABELS: Record<string, string> = {
  supplier_self_only: "仅供应商本人可见",
  show_winner_name: "展示中标供应商名称",
  internal_only: "内部可见"
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  pending_supplier_confirmation: "待供应商确认",
  registered: "合同已确认",
  performing: "履约中",
  completed: "已完成",
  cancelled: "已取消"
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  listed: "已上架",
  delisted: "已下架"
};

export function statusTone(status: string): StatusTone {
  if (["approved", "sent", "published", "registered", "performing", "completed", "listed"].includes(status)) return "success";
  if (["submitted", "pending_supplier_confirmation", "draft"].includes(status)) return "warning";
  if (["rejected", "cancelled", "voided", "delisted"].includes(status)) return "error";
  return "default";
}

export function formatDateTime(value?: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

export function currency(value: number | undefined) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}
