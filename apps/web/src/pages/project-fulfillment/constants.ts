import type { DataTableColumn } from "../../components/base";

export const PROCUREMENT_ROLES = ["buyer", "platform_operator"];
export const SUPPLIER_ADMIN_ROLES = ["supplier", "supplier_admin"];
export const FINANCE_REVIEW_ROLES = ["buyer", "group_manager", "finance_reviewer"];

export const STATUS_TEXT: Record<string, string> = {
  awarded_pending_order: "待生成订单",
  pending_confirmation: "待供应商确认",
  supplier_confirmed: "供应商已确认",
  performing: "履约中",
  partially_received: "部分收货",
  received: "已收货",
  exception: "异常处理中",
  closed: "已关闭",
  pending_verification: "待核验",
  verified: "已通过",
  rejected: "已驳回",
  complete: "完整",
  incomplete: "缺项",
  collecting: "归集中",
  sealed: "已封存",
  supplemented: "已补充",
  supplement_requested: "待补档审批",
  supplement_approved: "补档已批准",
  supplement_rejected: "补档已驳回",
  invoice: "发票",
  delivery_note: "送货单",
  acceptance_record: "验收单",
  other: "其他资料",
  partial: "部分收货",
  full: "全部收货",
  quantity_mismatch: "数量不符",
  quality_issue: "质量问题",
  delivery_delay: "延期交付",
  missing_documents: "资料缺失",
  pending_resolution: "待处理",
  supplement: "补充处理",
  none: "无",
  cooperation: "配合度",
  priceReasonableness: "价格合理性",
  quality: "质量",
  delivery: "交付",
  service: "服务"
};

export const ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "订单号" },
  { key: "supplier", label: "供应商" },
  { key: "lineItems", label: "收货进度" },
  { key: "status", label: "状态" },
  { key: "totalAmount", label: "金额" },
  { key: "expectedDeliveryAt", label: "计划到货" },
  { key: "receivingLocation", label: "收货地点" },
  { key: "actions", label: "操作" }
];

export const RECEIPT_COLUMNS: DataTableColumn[] = [
  { key: "order", label: "订单" },
  { key: "type", label: "类型" },
  { key: "items", label: "收货明细" },
  { key: "summary", label: "摘要" },
  { key: "status", label: "处理状态" },
  { key: "createdAt", label: "时间" }
];

export const SETTLEMENT_COLUMNS: DataTableColumn[] = [
  { key: "materialType", label: "资料类型" },
  { key: "status", label: "状态" },
  { key: "file", label: "文件" },
  { key: "opinion", label: "核验意见" },
  { key: "actions", label: "操作" }
];

export const EVALUATION_COLUMNS: DataTableColumn[] = [
  { key: "supplier", label: "供应商" },
  { key: "score", label: "评分" },
  { key: "description", label: "说明" },
  { key: "dimensions", label: "维度" }
];

export const ARCHIVE_COLUMNS: DataTableColumn[] = [
  { key: "itemName", label: "归档项" },
  { key: "requiredFlag", label: "要求" },
  { key: "status", label: "状态" },
  { key: "sealed", label: "封存" }
];

export const AUDIT_COLUMNS: DataTableColumn[] = [
  { key: "action", label: "动作" },
  { key: "actorId", label: "操作人" },
  { key: "result", label: "结果" },
  { key: "createdAt", label: "时间" }
];
