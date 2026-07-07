import { asNumber, asRecord, asString, toMoney, toStatus, type ContractResult, type MoneyViewModel, type StatusViewModel } from "./base";

export interface OrderFulfillmentViewModel {
  id: string;
  projectId: string;
  supplierName: string;
  fulfillmentStatus: StatusViewModel;
  receiptProgress: number;
  settlementAmount: MoneyViewModel;
  exceptionSummary: string;
}

export const OrderContract = {
  toFulfillmentViewModel(input: unknown): ContractResult<OrderFulfillmentViewModel> {
    const record = asRecord(input);
    const viewModel: OrderFulfillmentViewModel = {
      id: asString(record.id, asString(record.orderId, "ORDER-UNKNOWN")),
      projectId: asString(record.projectId, "PROJ-UNKNOWN"),
      supplierName: asString(record.supplierName, "未命名供应商"),
      fulfillmentStatus: toStatus(record.fulfillmentStatus ?? record.status, "待履约"),
      receiptProgress: asNumber(record.receiptProgress, 0),
      settlementAmount: toMoney(record.settlementAmount ?? record.amount),
      exceptionSummary: asString(record.exceptionSummary, "暂无异常")
    };
    return { viewModel, issues: [] };
  }
};
