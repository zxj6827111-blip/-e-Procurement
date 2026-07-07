import { asRecord, asString, toStatus, type ContractResult, type StatusViewModel } from "./base";

export interface AuditArchiveViewModel {
  id: string;
  businessCode: string;
  archiveStatus: StatusViewModel;
  auditConclusion: string;
  lastAction: string;
  lockedByPolicy: boolean;
}

export const AuditContract = {
  toArchiveViewModel(input: unknown): ContractResult<AuditArchiveViewModel> {
    const record = asRecord(input);
    const viewModel: AuditArchiveViewModel = {
      id: asString(record.id, asString(record.archiveId, "ARCHIVE-UNKNOWN")),
      businessCode: asString(record.businessCode, "未关联业务编号"),
      archiveStatus: toStatus(record.archiveStatus, "待归档"),
      auditConclusion: asString(record.auditConclusion, "暂无审计结论"),
      lastAction: asString(record.lastAction, "暂无操作记录"),
      lockedByPolicy: record.lockedByPolicy === true
    };
    return { viewModel, issues: [] };
  }
};
