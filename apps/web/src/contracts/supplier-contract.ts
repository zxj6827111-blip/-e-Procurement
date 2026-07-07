import { asNumber, asRecord, asString, toStatus, type ContractResult, type StatusViewModel } from "./base";

export interface SupplierViewModel {
  id: string;
  name: string;
  riskLevel: string;
  admissionStatus: StatusViewModel;
  archiveStatus: StatusViewModel;
  score: number;
  serviceRegion: string;
}

export const SupplierContract = {
  toSupplierViewModel(input: unknown): ContractResult<SupplierViewModel> {
    const record = asRecord(input);
    const viewModel: SupplierViewModel = {
      id: asString(record.id, asString(record.supplierId, "SUP-UNKNOWN")),
      name: asString(record.name, "未命名供应商"),
      riskLevel: asString(record.riskLevel, asString(record.level, "未评级")),
      admissionStatus: toStatus(record.admissionStatus ?? record.status, "待准入"),
      archiveStatus: toStatus(record.archiveStatus, "待建档"),
      score: asNumber(record.score, 0),
      serviceRegion: asString(record.serviceRegion ?? record.region, "未维护服务区域")
    };
    return { viewModel, issues: [] };
  }
};
