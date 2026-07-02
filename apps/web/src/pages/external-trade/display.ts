import type { DataTableColumn } from "../../components/base";
import type { BlockAction, ExternalTradeRecord, StatusTone } from "./types";

export const BLOCK_ACTIONS: BlockAction[] = [
  { value: "internal_announcement", label: "内部公告发布" },
  { value: "internal_registration", label: "内部报名" },
  { value: "internal_bid", label: "内部报价" },
  { value: "internal_expert_review", label: "内部评审" },
  { value: "internal_award", label: "内部定标" }
];

export const EXTERNAL_TRADE_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "platform", label: "外部平台" },
  { key: "externalCode", label: "外部编号" },
  { key: "internalApproval", label: "内部审批" },
  { key: "resultRecord", label: "结果备案" },
  { key: "status", label: "备案状态" }
];

export const PROJECT_DETAIL_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "internalApproval", label: "内部审批" },
  { key: "announcementMaterials", label: "公告材料数" },
  { key: "resultMaterials", label: "结果材料数" },
  { key: "resultRecord", label: "结果备案" }
];

export const BLOCK_CHECK_COLUMNS: DataTableColumn[] = [
  { key: "project", label: "项目" },
  { key: "externalFlag", label: "外部交易标记" },
  { key: "result", label: "校验结果" }
];

export function recordStatusTone(record?: ExternalTradeRecord | null): StatusTone {
  if (record?.resultRecordStatus === "recorded") return "success";
  if (record?.externalProjectCode || record?.announcementMaterialMetadata?.length || record?.resultMaterialMetadata?.length) return "primary";
  if (record?.internalApprovalStatus === "recorded") return "warning";
  return "default";
}

export function binaryStatusLabel(value?: string) {
  return value === "recorded" ? "已备案" : "未备案";
}

export function binaryStatusTone(value?: string): StatusTone {
  return value === "recorded" ? "success" : "warning";
}
