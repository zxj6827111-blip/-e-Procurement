import type { DataTableColumn } from "../../components/base";

export const DEMAND_ITEM_COLUMNS: DataTableColumn[] = [
  { key: "itemName", label: "物品" },
  { key: "specification", label: "规格" },
  { key: "quantity", label: "数量" },
  { key: "estimatedUnitPrice", label: "预估单价" }
];

export const SUPPLIER_COLUMNS: DataTableColumn[] = [
  { key: "supplier", label: "供应商" },
  { key: "invitation", label: "邀请" },
  { key: "registration", label: "报名" },
  { key: "bid", label: "报价" },
  { key: "amount", label: "报价金额" },
  { key: "score", label: "评审" }
];

export const QUOTE_COLUMNS: DataTableColumn[] = [
  { key: "supplier", label: "供应商" },
  { key: "item", label: "物品/服务" },
  { key: "quantity", label: "数量" },
  { key: "unitPrice", label: "单价" },
  { key: "totalPrice", label: "总价" },
  { key: "deliveryDays", label: "交期" }
];

export const SCORING_COLUMNS: DataTableColumn[] = [
  { key: "expert", label: "专家" },
  { key: "supplier", label: "供应商" },
  { key: "score", label: "评分" },
  { key: "status", label: "状态" },
  { key: "submittedAt", label: "提交时间" }
];

export const COMPARISON_COLUMNS: DataTableColumn[] = [
  { key: "rank", label: "排名" },
  { key: "supplierName", label: "供应商" },
  { key: "amount", label: "报价" },
  { key: "deliveryDays", label: "交期" },
  { key: "expertTotalScore", label: "专家总分" },
  { key: "finalScore", label: "最终评分" },
  { key: "remark", label: "说明" }
];

export const ATTACHMENT_COLUMNS: DataTableColumn[] = [
  { key: "supplier", label: "供应商" },
  { key: "status", label: "状态" },
  { key: "amount", label: "总价" },
  { key: "deliveryDays", label: "交期" },
  { key: "attachments", label: "响应文件" }
];

export const INTERNAL_STATUS_ORDER = [
  "project_created",
  "document_preparing",
  "document_published",
  "registration_open",
  "bidding_open",
  "bidding_locked",
  "expert_reviewing",
  "review_report_frozen",
  "award_approving",
  "awarded_pending_order",
  "result_notified",
  "contract_registered",
  "performing",
  "evaluated",
  "archived",
  "closed"
];
