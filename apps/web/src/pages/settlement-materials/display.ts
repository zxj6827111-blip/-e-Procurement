import type { DataTableColumn, SummaryCardItem } from "../../components/base";
import { formalFileName } from "../../utils/business-display";
import { labelStatus } from "../../utils/status-labels";
import type { Invoice, Overview, SettlementBill, SettlementOperationForm } from "./types";

export const billColumns: DataTableColumn[] = [
  { key: "billNo", label: "结算单号" },
  { key: "supplier", label: "供应商" },
  { key: "period", label: "账期" },
  { key: "orderAmount", label: "订单金额" },
  { key: "deductions", label: "扣减/服务费" },
  { key: "settlementAmount", label: "应结金额" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export const materialColumns: DataTableColumn[] = [
  { key: "materialType", label: "资料类型" },
  { key: "fileName", label: "文件" },
  { key: "supplier", label: "供应商" },
  { key: "order", label: "订单" },
  { key: "status", label: "状态" },
  { key: "uploadedAt", label: "上传时间" },
  { key: "opinion", label: "核验意见" },
  { key: "actions", label: "操作" }
];

export const invoiceColumns: DataTableColumn[] = [
  { key: "invoice", label: "发票号/文件" },
  { key: "bill", label: "关联结算" },
  { key: "supplier", label: "供应商" },
  { key: "amount", label: "金额" },
  { key: "taxAmount", label: "税额" },
  { key: "status", label: "状态" },
  { key: "uploadedAt", label: "上传时间" },
  { key: "actions", label: "操作" }
];

export const reconciliationColumns: DataTableColumn[] = [
  { key: "supplier", label: "供应商" },
  { key: "expectedAmount", label: "应核金额" },
  { key: "actualAmount", label: "实核金额" },
  { key: "status", label: "状态" },
  { key: "reason", label: "原因/更新时间" }
];

export function createOverview(): Overview {
  return {
    settlementBills: [],
    settlementMaterials: [],
    invoices: [],
    reconciliationLines: [],
    fundLedgerEntries: []
  };
}

export function createSettlementOperationForm(): SettlementOperationForm {
  return {
    billApproveOpinion: "财务审核通过",
    billRejectOpinion: "金额或资料需更正",
    materialType: "delivery_note",
    materialFileName: "",
    materialApproveOpinion: "资料清晰完整",
    materialRejectOpinion: "资料缺少签收信息",
    invoiceApproveOpinion: "发票金额与结算单一致",
    invoiceRejectOpinion: "发票金额或税额需复核"
  };
}

export function canFinanceReview(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "finance_reviewer"].includes(roleId);
}

export function canSupplierUpload(roleId: string) {
  return ["supplier", "supplier_admin", "supplier_quotation"].includes(roleId);
}

export function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

export function settlementSummaryItems(overview: Overview): SummaryCardItem[] {
  const amount = overview.settlementBills.reduce((sum, item) => sum + Number(item.settlementAmount ?? 0), 0);
  return [
    { label: "结算单", value: overview.settlementBills.length, meta: "当前角色可见范围" },
    { label: "结算材料", value: overview.settlementMaterials.length, meta: "送货单、验收单、发票等" },
    { label: "待审发票", value: overview.invoices.filter((item) => item.status === "pending_verification").length, meta: "pending_verification" },
    { label: "应结金额", value: money(amount), meta: "已生成结算单合计" }
  ];
}

export function supplierName(supplierId: string | undefined, supplierNames: Map<string, string>) {
  if (!supplierId) return "-";
  return supplierNames.get(supplierId) ?? supplierId;
}

export function materialTypeLabel(value: string) {
  const labels: Record<string, string> = {
    invoice: "发票",
    delivery_note: "送货单",
    acceptance_record: "验收单",
    other: "其他资料"
  };
  return labels[value] ?? labelStatus(value);
}

export function orderLabel(orderId: string | undefined, settlementBills: SettlementBill[]) {
  if (!orderId) return "-";
  return settlementBills.find((item) => item.purchaseOrderId === orderId)?.purchaseOrderNo ?? "关联订单";
}

export function invoiceBillNo(invoice: Invoice, settlementBills: SettlementBill[]) {
  const bill = settlementBills.find((item) => item.id === invoice.settlementBillId);
  return bill?.billNo ?? orderLabel(invoice.orderId, settlementBills) ?? "-";
}

export function materialFileLabel(fileName?: string) {
  return formalFileName(fileName, "结算资料");
}

export function invoiceFileLabel(invoice: Invoice) {
  return invoice.invoiceNo || formalFileName(invoice.fileName, "发票");
}
