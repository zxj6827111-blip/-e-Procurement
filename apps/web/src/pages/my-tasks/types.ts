import type { R8ApprovalBusinessType } from "../../api/workflow";

export type TaskStatusFilter = "all" | "pending" | "handled_by_me" | "completed" | "cancelled";
export type DateFilter = "all" | "today" | "7d" | "30d";
export type UnifiedTaskSource = "process" | "r8";
export type TaskAction = "approve" | "reject" | "complete";
export type StatusTone = "default" | "primary" | "success" | "warning" | "error";

export interface UnifiedTaskView {
  id: string;
  source: UnifiedTaskSource;
  sourceLabel: string;
  actionTaskId?: string;
  approvalInstanceId?: string;
  businessType: R8ApprovalBusinessType;
  businessId: string;
  projectId?: string;
  projectName: string;
  taskTypeLabel: string;
  title: string;
  businessTypeLabel: string;
  status: string;
  statusLabel: string;
  assigneeLabel: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  processStatusLabel?: string;
  nodeLabel?: string;
  targetPath: string;
  targetLabel: string;
  canComplete: boolean;
}

export interface TaskProjectView {
  id: string;
  code?: string;
  name?: string;
  sourceRequestTitle?: string;
  displayName?: string;
}

export interface BusinessTypeOption {
  value: R8ApprovalBusinessType;
  label: string;
}
