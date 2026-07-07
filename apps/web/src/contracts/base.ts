export interface ApiContractIssue {
  field: string;
  message: string;
}

export interface ContractResult<TViewModel> {
  viewModel: TViewModel;
  issues: ApiContractIssue[];
}

export interface MoneyViewModel {
  amount: number;
  currency: string;
  display: string;
}

export interface StatusViewModel {
  value: string;
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export type RawRecord = Record<string, unknown>;

export function asRecord(input: unknown): RawRecord {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as RawRecord) : {};
}

export function asString(input: unknown, fallback = "") {
  return typeof input === "string" && input.trim().length > 0 ? input : fallback;
}

export function asNumber(input: unknown, fallback = 0) {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim() !== "" && Number.isFinite(Number(input))) return Number(input);
  return fallback;
}

export function toMoney(input: unknown, currency = "CNY"): MoneyViewModel {
  const amount = asNumber(input, 0);
  return {
    amount,
    currency,
    display: `${currency} ${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
}

export function toStatus(value: unknown, labelFallback = "待确认"): StatusViewModel {
  const normalized = asString(value, "unknown");
  const label = normalized === "unknown" ? labelFallback : normalized;
  const dangerWords = ["拒绝", "失败", "异常", "冻结", "驳回"];
  const warningWords = ["待", "处理中", "考察", "审核"];
  const successWords = ["通过", "完成", "正常", "启用"];
  const tone = dangerWords.some((word) => label.includes(word))
    ? "danger"
    : warningWords.some((word) => label.includes(word))
      ? "warning"
      : successWords.some((word) => label.includes(word))
        ? "success"
        : "neutral";
  return { value: normalized, label, tone };
}
