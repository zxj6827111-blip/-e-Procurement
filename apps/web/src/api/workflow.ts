import { apiGet, apiPatch, apiPost } from "./http";
import {
  filterR8BusinessType,
  toR8ApprovalRuleView,
  toR8WorkflowNotificationView,
  toR8WorkflowTaskView,
  type R8ApprovalBusinessType,
  type R8ApprovalInstanceDto,
  type R8ApprovalRuleDto,
  type R8ApprovalRuleView,
  type R8RoleId,
  type R8WorkflowNotificationDto,
  type R8WorkflowNotificationView,
  type R8WorkflowTaskDto,
  type R8WorkflowTaskView,
  type R8WorkflowUserContext
} from "../../../api/src/workflow-ui-contract";

export type {
  R8ApprovalBusinessType,
  R8ApprovalInstanceDto,
  R8ApprovalRuleDto,
  R8ApprovalRuleView,
  R8WorkflowNotificationView,
  R8WorkflowTaskView
};

export interface WorkflowSessionLike {
  user: {
    id: string;
    supplierId?: string;
    expertId?: string;
  } | null;
  roleId: string;
  orgScope: string[];
}

export function workflowUserContext(session: WorkflowSessionLike): R8WorkflowUserContext {
  return {
    userId: session.user?.id,
    roleId: (session.roleId || "") as R8RoleId | "",
    supplierId: session.user?.supplierId,
    expertId: session.user?.expertId,
    orgScope: session.orgScope
  };
}

export async function loadWorkflowTasks(session: WorkflowSessionLike, businessType: "all" | R8ApprovalBusinessType = "all") {
  const data = await apiGet<{ tasks: R8WorkflowTaskDto[] }>("/api/workflow/tasks");
  return filterR8BusinessType(data.tasks, businessType).map((task) => toR8WorkflowTaskView(task, workflowUserContext(session)));
}

export async function loadWorkflowNotifications(businessType: "all" | R8ApprovalBusinessType = "all") {
  const data = await apiGet<{ notifications: R8WorkflowNotificationDto[] }>("/api/workflow/notifications");
  return filterR8BusinessType(data.notifications, businessType).map(toR8WorkflowNotificationView);
}

export async function loadApprovalRules() {
  const data = await apiGet<{ approvalRules: R8ApprovalRuleDto[] }>("/api/workflow/approval-rules");
  return data.approvalRules.map(toR8ApprovalRuleView);
}

export async function createApprovalRule(payload: Partial<R8ApprovalRuleDto>) {
  const data = await apiPost<{ approvalRule: R8ApprovalRuleDto; auditLogId?: string }>("/api/workflow/approval-rules", payload);
  return {
    approvalRule: toR8ApprovalRuleView(data.approvalRule),
    auditLogId: data.auditLogId
  };
}

export async function updateApprovalRule(ruleId: string, patch: Partial<R8ApprovalRuleDto>) {
  const data = await apiPatch<{ approvalRule: R8ApprovalRuleDto; auditLogId?: string }>(`/api/workflow/approval-rules/${ruleId}`, patch);
  return {
    approvalRule: toR8ApprovalRuleView(data.approvalRule),
    auditLogId: data.auditLogId
  };
}

export async function completeWorkflowTask(taskId: string) {
  const data = await apiPost<{ task: R8WorkflowTaskDto; auditLogId?: string }>(`/api/workflow/tasks/${taskId}/complete`, {});
  return data;
}

export async function approveWorkflowInstance(instanceId: string, opinion: string) {
  return apiPost<{ approvalInstance: R8ApprovalInstanceDto; auditLogId?: string }>(`/api/workflow/approval-instances/${instanceId}/actions`, {
    action: "approve",
    opinion
  });
}

export async function rejectWorkflowInstance(instanceId: string, opinion: string) {
  return apiPost<{ approvalInstance: R8ApprovalInstanceDto; auditLogId?: string }>(`/api/workflow/approval-instances/${instanceId}/actions`, {
    action: "reject",
    opinion
  });
}

export async function markNotificationRead(messageId: string) {
  const data = await apiPost<{ notification: R8WorkflowNotificationDto }>(`/api/workflow/notifications/${messageId}/read`, {});
  return toR8WorkflowNotificationView(data.notification);
}

export function summarizeWorkflow(tasks: R8WorkflowTaskView[], messages: R8WorkflowNotificationView[]) {
  return {
    pendingTasks: tasks.filter((task) => task.status === "pending").length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    unreadMessages: messages.filter((message) => !message.read).length
  };
}
