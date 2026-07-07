import { asNumber, asRecord, type ContractResult } from "./base";

export interface DashboardViewModel {
  todoCount: number;
  quoteDeadlineCount: number;
  reviewCount: number;
  exceptionCount: number;
  updatedAtLabel: string;
}

export const DashboardContract = {
  toDashboardViewModel(input: unknown): ContractResult<DashboardViewModel> {
    const record = asRecord(input);
    return {
      viewModel: {
        todoCount: asNumber(record.todoCount, 0),
        quoteDeadlineCount: asNumber(record.quoteDeadlineCount, 0),
        reviewCount: asNumber(record.reviewCount, 0),
        exceptionCount: asNumber(record.exceptionCount, 0),
        updatedAtLabel: typeof record.updatedAtLabel === "string" ? record.updatedAtLabel : "当前数据"
      },
      issues: []
    };
  }
};
