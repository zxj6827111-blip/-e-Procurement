import { asRecord, asString, toMoney, toStatus, type ContractResult, type MoneyViewModel, type StatusViewModel } from "./base";

export interface ProcurementRequestViewModel {
  id: string;
  title: string;
  procurementMethod: string;
  budgetAmount: MoneyViewModel;
  approvalOpinion: string;
  supplierRiskLevel: string;
  quotationVersion: string;
  archiveStatus: StatusViewModel;
  requestStatus: StatusViewModel;
}

export const ProcurementContract = {
  toRequestViewModel(input: unknown): ContractResult<ProcurementRequestViewModel> {
    const record = asRecord(input);
    const viewModel: ProcurementRequestViewModel = {
      id: asString(record.id, asString(record.requestId, "REQ-UNKNOWN")),
      title: asString(record.title, asString(record.name, "未命名采购申请")),
      procurementMethod: asString(record.procurementMethod, "未确定"),
      budgetAmount: toMoney(record.budgetAmount ?? record.budget),
      approvalOpinion: asString(record.approvalOpinion, "暂无审批意见"),
      supplierRiskLevel: asString(record.supplierRiskLevel, "未评级"),
      quotationVersion: asString(record.quotationVersion, "未生成报价版本"),
      archiveStatus: toStatus(record.archiveStatus, "待归档"),
      requestStatus: toStatus(record.status, "待处理")
    };
    return {
      viewModel,
      issues: Object.entries(viewModel)
        .filter(([, value]) => value === "")
        .map(([field]) => ({ field, message: "empty_contract_field" }))
    };
  }
};
