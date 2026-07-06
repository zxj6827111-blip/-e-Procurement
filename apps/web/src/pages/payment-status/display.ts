import type { DataTableColumn } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";

export const ACCOUNT_COLUMNS: DataTableColumn[] = [
  { key: "account", label: "账户名称" },
  { key: "status", label: "账户状态" },
  { key: "balance", label: "可用余额" },
  { key: "credit", label: "授信额度" },
  { key: "occupied", label: "占用金额" },
  { key: "updatedAt", label: "更新时间" },
  { key: "actions", label: "处理" }
];

export const PAYABLE_ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "付款编号 / 订单编号" },
  { key: "organization", label: "供应商 / 组织" },
  { key: "amount", label: "金额" },
  { key: "paymentStatus", label: "状态" },
  { key: "actions", label: "操作" }
];

export const LEDGER_COLUMNS: DataTableColumn[] = [
  { key: "createdAt", label: "时间" },
  { key: "account", label: "账户名称" },
  { key: "direction", label: "收支方向" },
  { key: "entryType", label: "流水类型" },
  { key: "status", label: "入账状态" },
  { key: "order", label: "关联订单" },
  { key: "amount", label: "金额" },
  { key: "note", label: "备注" }
];

export function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

export function directionLabel(value: string) {
  const labels: Record<string, string> = {
    inbound: "入账",
    outbound: "出账",
    occupy: "占用",
    release: "释放",
    reverse: "冲正"
  };
  return labels[value] ?? labelStatus(value);
}

export function entryTypeLabel(value: string) {
  const labels: Record<string, string> = {
    opening_balance: "期初余额",
    recharge: "充值入账",
    credit_grant: "授信调整",
    payment_reserve: "付款占用",
    payment_capture: "付款确认",
    return_refund: "退货退款",
    settlement_adjustment: "结算调整"
  };
  return labels[value] ?? labelStatus(value);
}
