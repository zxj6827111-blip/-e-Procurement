import { asRecord, asString, toMoney, toStatus, type ContractResult, type MoneyViewModel, type StatusViewModel } from "./base";

export interface FinanceSettlementViewModel {
  id: string;
  orderId: string;
  payableAmount: MoneyViewModel;
  paidAmount: MoneyViewModel;
  paymentStatus: StatusViewModel;
  settlementDifference: string;
  financeOpinion: string;
}

export const FinanceContract = {
  toSettlementViewModel(input: unknown): ContractResult<FinanceSettlementViewModel> {
    const record = asRecord(input);
    const viewModel: FinanceSettlementViewModel = {
      id: asString(record.id, asString(record.settlementId, "SET-UNKNOWN")),
      orderId: asString(record.orderId, "ORDER-UNKNOWN"),
      payableAmount: toMoney(record.payableAmount ?? record.amount),
      paidAmount: toMoney(record.paidAmount),
      paymentStatus: toStatus(record.paymentStatus, "待付款"),
      settlementDifference: asString(record.settlementDifference, "暂无差异"),
      financeOpinion: asString(record.financeOpinion, "暂无财务意见")
    };
    return { viewModel, issues: [] };
  }
};
