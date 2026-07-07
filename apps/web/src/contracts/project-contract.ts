import { asNumber, asRecord, asString, toMoney, toStatus, type ContractResult, type MoneyViewModel, type StatusViewModel } from "./base";

export interface ProjectWorkbenchViewModel {
  id: string;
  code: string;
  name: string;
  procurementMethod: string;
  budgetAmount: MoneyViewModel;
  currentStage: StatusViewModel;
  supplierRiskLevel: string;
  quotationVersion: string;
  archiveStatus: StatusViewModel;
  archiveCompleteness: number;
  organization: string;
  agent: string;
}

export const ProjectContract = {
  toWorkbenchViewModel(input: unknown): ContractResult<ProjectWorkbenchViewModel> {
    const record = asRecord(input);
    const archiveCompleteness = asNumber(record.archiveCompleteness, 0);
    const viewModel: ProjectWorkbenchViewModel = {
      id: asString(record.id, "PROJ-UNKNOWN"),
      code: asString(record.code, "PROJ-UNKNOWN"),
      name: asString(record.name, "未命名采购项目"),
      procurementMethod: asString(record.procurementMethod ?? record.method, "未确定"),
      budgetAmount: toMoney(record.budgetAmount ?? record.budget),
      currentStage: toStatus(record.stageLabel ?? record.stage, "待推进"),
      supplierRiskLevel: asString(record.supplierRiskLevel ?? record.riskLevel, "未评级"),
      quotationVersion: asString(record.quotationVersion, "V1"),
      archiveStatus: toStatus(record.archiveStatus, archiveCompleteness >= 100 ? "已归档" : "归档中"),
      archiveCompleteness,
      organization: asString(record.organization ?? record.orgName, "集团采购中心"),
      agent: asString(record.agent ?? record.buyer, "采购经办")
    };
    return { viewModel, issues: [] };
  }
};
