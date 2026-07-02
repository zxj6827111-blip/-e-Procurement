import type { R8ApprovalBusinessType } from "../../api/workflow";

export type ReadFilter = "all" | "unread" | "read";
export type StatusTone = "default" | "primary" | "success" | "warning" | "error";

export interface BusinessTypeOption {
  value: R8ApprovalBusinessType;
  label: string;
}
