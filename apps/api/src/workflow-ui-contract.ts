export type R8RoleId = "group_manager" | "buyer" | "supplier" | "expert" | "auditor" | "admin" | "system";

export type R8ApprovalBusinessType =
  | "procurement_request"
  | "award_approval"
  | "archive_supplement"
  | "price_approval"
  | "mall_order"
  | "settlement_bill"
  | "invoice"
  | "payment_request"
  | "return_request"
  | "expert_scoring";

export type R8WorkflowTaskStatus = "pending" | "completed" | "cancelled";

export interface R8WorkflowUserContext {
  userId?: string;
  roleId: R8RoleId | "";
  supplierId?: string;
  expertId?: string;
  orgScope?: string[];
}

export interface R8WorkflowTaskDto {
  id: string;
  taskCode: string;
  taskType: string;
  businessType: R8ApprovalBusinessType;
  businessId: string;
  projectId?: string;
  title: string;
  assigneeRoleId?: R8RoleId;
  assigneeUserId?: string;
  supplierId?: string;
  orgId?: string;
  approvalInstanceId?: string;
  status: R8WorkflowTaskStatus;
  dueAt?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  sourceJson?: Record<string, unknown>;
  updatedAt: string;
}

export interface R8WorkflowNotificationDto {
  id: string;
  messageCode: string;
  eventType: string;
  businessType: R8ApprovalBusinessType;
  businessId: string;
  projectId?: string;
  recipientUserId?: string;
  recipientRoleId?: R8RoleId;
  supplierId?: string;
  orgId?: string;
  title: string;
  contentSummary: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  deliveryChannels: string[];
  externalEventStatus: "not_dispatched" | "queued" | "dispatched" | "failed";
  sourceJson?: Record<string, unknown>;
  updatedAt: string;
}

export interface R8ApprovalRuleDto {
  id: string;
  ruleCode: string;
  ruleName: string;
  businessType: R8ApprovalBusinessType;
  amountMin?: number;
  amountMax?: number;
  methodTypes: string[];
  nodeRoleIds: R8RoleId[];
  actions: string[];
  orgScope?: string[];
  hotelScope?: string[];
  approvalOrder?: R8RoleId[];
  defaultStrategy?: "manual_review_required" | "reject_without_rule";
  status: "enabled" | "disabled";
  versionNo: number;
  updatedAt: string;
}

export interface R8ApprovalInstanceDto {
  id: string;
  businessType: R8ApprovalBusinessType;
  businessId: string;
  businessTitle: string;
  projectId?: string;
  orgId?: string;
  supplierId?: string;
  ruleId?: string;
  ruleCode?: string;
  currentNodeIndex: number;
  currentRoleId?: R8RoleId;
  currentUserId?: string;
  approvalStatus: string;
  startedBy?: string;
  startedAt?: string;
  completedBy?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface R8WorkflowTaskView extends R8WorkflowTaskDto {
  businessTypeLabel: string;
  taskTypeLabel: string;
  statusLabel: string;
  assigneeLabel: string;
  targetPath: string;
  targetLabel: string;
  canComplete: boolean;
}

export interface R8WorkflowNotificationView extends R8WorkflowNotificationDto {
  businessTypeLabel: string;
  eventTypeLabel: string;
  readLabel: string;
  targetPath: string;
  targetLabel: string;
}

export interface R8ApprovalRuleView extends R8ApprovalRuleDto {
  businessTypeLabel: string;
  statusLabel: string;
  nodeRoleLabels: string;
  actionLabels: string;
  strategyLabel: string;
  amountRangeLabel: string;
}

export const r8BusinessTypeLabels: Record<R8ApprovalBusinessType, string> = {
  procurement_request: "采购申请",
  award_approval: "定标审批",
  archive_supplement: "档案补档",
  price_approval: "价格审批",
  mall_order: "商城订单",
  settlement_bill: "结算单",
  invoice: "发票",
  payment_request: "付款申请",
  return_request: "退货处理",
  expert_scoring: "专家评分"
};

export const r8TaskTypeLabels: Record<string, string> = {
  approval_procurement_request: "待审批采购申请",
  approval_award: "待审批定标",
  archive_supplement: "待审批补档",
  price_approval: "待审批价格",
  mall_order: "待处理商城订单",
  approval_settlement_bill: "待审核结算",
  approval_invoice: "待审核发票",
  approval_payment_request: "待处理付款",
  supplier_return_review: "待供应商处理退货",
  expert_scoring: "待专家评分"
};

export const r8WorkflowStatusLabels: Record<string, string> = {
  pending: "待处理",
  completed: "已完成",
  cancelled: "已取消",
  submitted: "已提交",
  in_review: "审批中",
  approved: "已通过",
  rejected: "已驳回",
  returned: "已退回",
  revoked: "已撤回",
  manual_review_required: "需人工复核",
  enabled: "启用",
  disabled: "停用",
  not_dispatched: "站内消息",
  queued: "待发送",
  dispatched: "已发送",
  failed: "发送失败"
};

export const r8RoleLabels: Record<R8RoleId, string> = {
  group_manager: "集团采购管理人",
  buyer: "采购经办人",
  supplier: "供应商",
  expert: "专家",
  auditor: "纪检 / 审计",
  admin: "系统管理员",
  system: "系统"
};

export const r8ActionLabels: Record<string, string> = {
  submit: "提交",
  approve: "同意",
  reject: "驳回",
  return: "退回",
  cancel: "取消",
  revoke: "撤回",
  audit_read: "审计查阅"
};

export function r8LabelStatus(value?: string | null) {
  if (!value) return "-";
  return r8WorkflowStatusLabels[value] ?? value;
}

export function formatR8DateTime(value?: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

export function r8BusinessTargetPath(type: R8ApprovalBusinessType, businessId: string, projectId?: string) {
  const query = new URLSearchParams({ businessType: type, businessId });
  if (projectId) query.set("projectId", projectId);
  const suffix = `?${query.toString()}`;
  const map: Record<R8ApprovalBusinessType, string> = {
    procurement_request: `/procurement-requests${suffix}`,
    award_approval: `/award-result${suffix}`,
    archive_supplement: `/archive-audit${suffix}`,
    price_approval: `/award-result${suffix}`,
    mall_order: `/supply-mall${suffix}`,
    settlement_bill: `/supply-mall${suffix}`,
    invoice: `/supply-mall${suffix}`,
    payment_request: `/supply-mall${suffix}`,
    return_request: `/supply-mall${suffix}`,
    expert_scoring: `/expert-scoring${suffix}`
  };
  return map[type];
}

export function r8BusinessTargetLabel(type: R8ApprovalBusinessType) {
  const map: Record<R8ApprovalBusinessType, string> = {
    procurement_request: "打开采购申请",
    award_approval: "打开定标审批",
    archive_supplement: "打开档案补档",
    price_approval: "打开价格审批",
    mall_order: "打开商城订单",
    settlement_bill: "打开结算单",
    invoice: "打开发票",
    payment_request: "打开付款申请",
    return_request: "打开退货处理",
    expert_scoring: "打开专家评分"
  };
  return map[type];
}

export function canCompleteR8Task(task: R8WorkflowTaskDto, user: R8WorkflowUserContext) {
  if (task.status !== "pending") return false;
  if (!user.roleId || ["admin", "auditor", "system"].includes(user.roleId)) return false;
  if (task.assigneeUserId && task.assigneeUserId !== user.userId) return false;
  if (user.roleId === "supplier") return task.assigneeRoleId === "supplier" && Boolean(task.supplierId && task.supplierId === user.supplierId);
  if (user.roleId === "expert") {
    return task.assigneeRoleId === "expert" && (!task.sourceJson?.expertId || task.sourceJson.expertId === user.expertId);
  }
  if (task.assigneeRoleId && task.assigneeRoleId !== user.roleId) return false;
  if (task.orgId && !(user.orgScope ?? []).includes(task.orgId)) return false;
  return true;
}

export function toR8WorkflowTaskView(task: R8WorkflowTaskDto, user: R8WorkflowUserContext): R8WorkflowTaskView {
  return {
    ...task,
    businessTypeLabel: r8BusinessTypeLabels[task.businessType] ?? task.businessType,
    taskTypeLabel: r8TaskTypeLabels[task.taskType] ?? r8BusinessTypeLabels[task.businessType] ?? task.taskType,
    statusLabel: r8LabelStatus(task.status),
    assigneeLabel: task.assigneeUserId ? `指定用户 ${task.assigneeUserId}` : task.assigneeRoleId ? r8RoleLabels[task.assigneeRoleId] ?? task.assigneeRoleId : "未指定",
    targetPath: r8BusinessTargetPath(task.businessType, task.businessId, task.projectId),
    targetLabel: r8BusinessTargetLabel(task.businessType),
    canComplete: canCompleteR8Task(task, user)
  };
}

export function toR8WorkflowNotificationView(message: R8WorkflowNotificationDto): R8WorkflowNotificationView {
  return {
    ...message,
    businessTypeLabel: r8BusinessTypeLabels[message.businessType] ?? message.businessType,
    eventTypeLabel: r8LabelStatus(message.eventType.split(".").at(-1)),
    readLabel: message.read ? "已读" : "未读",
    targetPath: r8BusinessTargetPath(message.businessType, message.businessId, message.projectId),
    targetLabel: r8BusinessTargetLabel(message.businessType)
  };
}

export function toR8ApprovalRuleView(rule: R8ApprovalRuleDto): R8ApprovalRuleView {
  const amountMin = rule.amountMin === undefined ? "不限" : `${rule.amountMin}`;
  const amountMax = rule.amountMax === undefined ? "不限" : `${rule.amountMax}`;
  return {
    ...rule,
    businessTypeLabel: r8BusinessTypeLabels[rule.businessType] ?? rule.businessType,
    statusLabel: r8LabelStatus(rule.status),
    nodeRoleLabels: (rule.approvalOrder?.length ? rule.approvalOrder : rule.nodeRoleIds).map((role) => r8RoleLabels[role] ?? role).join(" / ") || "-",
    actionLabels: rule.actions.map((action) => r8ActionLabels[action] ?? action).join(" / ") || "-",
    strategyLabel: rule.defaultStrategy === "reject_without_rule" ? "无规则时拒绝" : "无规则时人工复核",
    amountRangeLabel: `${amountMin} - ${amountMax}`
  };
}

export function filterR8BusinessType<T extends { businessType: R8ApprovalBusinessType }>(items: T[], type: "all" | R8ApprovalBusinessType) {
  return type === "all" ? items : items.filter((item) => item.businessType === type);
}
