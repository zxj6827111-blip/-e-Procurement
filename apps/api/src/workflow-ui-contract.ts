export type R8RoleId = "group_manager" | "buyer" | "supplier" | "expert" | "auditor" | "admin" | "system";

export type R8ApprovalBusinessType =
  | "procurement_request"
  | "procurement_document"
  | "supplier_onboarding"
  | "sourcing"
  | "rfq"
  | "tender"
  | "direct_purchase"
  | "review_award"
  | "contract_preparation"
  | "order_fulfillment"
  | "settlement"
  | "payment"
  | "archive"
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
  procurement_document: "采购文件",
  procurement_request: "采购申请",
  supplier_onboarding: "供应商准入",
  sourcing: "招采主流程",
  rfq: "RFQ 询价",
  tender: "TENDER 招标",
  direct_purchase: "DIRECT 直接采购",
  review_award: "评审定标",
  contract_preparation: "合同准备",
  order_fulfillment: "订单履约",
  settlement: "结算流程",
  payment: "付款流程",
  archive: "档案归集",
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
  approval_procurement_document: "待审核采购文件",
  approval_procurement_request: "待审批采购申请",
  procurement_method_decision: "待判定采购方式",
  procurement_project_generation: "待生成采购项目",
  supplier_profile_completion: "待补全供应商资料",
  supplier_qualification_review: "待审核供应商资质",
  supplier_admission_approval: "待审批供应商准入",
  supplier_category_authorization: "待授权供应商品类",
  sourcing_prepare_announcement: "待准备招采公告",
  sourcing_invite_supplier: "待邀请供应商",
  sourcing_supplier_registration: "待供应商报名",
  sourcing_registration_qualification: "待确认报名资格",
  sourcing_supplier_quote: "待供应商报价",
  sourcing_bid_cutoff: "待截标",
  sourcing_bid_lock: "待锁标 / 开标",
  sourcing_comparison_preparation: "待生成比价报告",
  sourcing_award_preparation: "待进入定标准备",
  direct_supplier_confirmation: "待确认直接采购供应商",
  direct_pricing_confirmation: "待确认直接采购定价",
  review_award_expert_assignment: "待抽取 / 指定专家",
  review_award_expert_confirmation: "待专家确认",
  review_award_expert_scoring: "待专家评分",
  review_award_score_summary: "待评分汇总",
  review_award_comparison_report: "待生成比选报告",
  review_award_review_report: "待生成评审报告",
  review_award_review_report_freeze: "待冻结评审报告",
  review_award_approval_submit: "待提交定标审批",
  review_award_approval_followup: "待跟踪定标审批",
  review_award_result_preparation: "待发布定标结果",
  contract_preparation_result_publish: "待确认结果发布",
  contract_preparation_pricing_report: "待生成定价报告",
  contract_preparation_contract_entry: "待登记合同台账",
  order_supplier_confirm: "待供应商确认订单",
  order_supplier_ship: "待供应商发货",
  order_buyer_receive: "待收货验收",
  order_supplier_evaluation: "待供应商评价",
  settlement_submit: "待提交结算",
  settlement_review: "待审核结算",
  settlement_material_upload: "待补充结算材料",
  settlement_material_review: "待审核结算材料",
  settlement_invoice_submit: "待提交发票",
  invoice_review_process: "待审核发票",
  payment_review: "待复核付款",
  archive_check: "待检查档案完整性",
  archive_supplement_request: "待发起补档",
  archive_supplement_approval: "待审批补档",
  archive_supplement_apply: "待应用补档",
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
  if (type === "procurement_request") {
    const query = new URLSearchParams();
    if (projectId) query.set("projectId", projectId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return `/procurement-requests/${encodeURIComponent(businessId)}${suffix}`;
  }
  const query = new URLSearchParams({ businessType: type, businessId });
  if (projectId) query.set("projectId", projectId);
  const suffix = `?${query.toString()}`;
  const map: Record<R8ApprovalBusinessType, string> = {
    procurement_document: `/procurement-documents${suffix}`,
    procurement_request: `/procurement-requests${suffix}`,
    supplier_onboarding: `/suppliers${suffix}`,
    sourcing: `/project-workbench${suffix}`,
    rfq: `/announcements-invitations${suffix}`,
    tender: `/announcements-invitations${suffix}`,
    direct_purchase: `/project-workbench${suffix}`,
    review_award: `/expert-review${suffix}`,
    contract_preparation: `/award-result${suffix}`,
    order_fulfillment: `/order-fulfillment${suffix}`,
    settlement: `/settlement-materials${suffix}`,
    payment: `/payment-status${suffix}`,
    archive: `/archive-audit${suffix}`,
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
    procurement_document: "打开采购文件",
    procurement_request: "打开采购申请",
    supplier_onboarding: "打开供应商档案",
    sourcing: "打开项目执行",
    rfq: "打开询价流程",
    tender: "打开招标流程",
    direct_purchase: "打开直接采购流程",
    review_award: "打开评审定标流程",
    contract_preparation: "打开合同准备流程",
    order_fulfillment: "打开订单履约流程",
    settlement: "打开结算流程",
    payment: "打开付款流程",
    archive: "打开档案流程",
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
  const targetPath =
    user.roleId === "expert" && task.businessType === "review_award"
      ? r8BusinessTargetPath("expert_scoring", task.businessId, task.projectId)
      : r8BusinessTargetPath(task.businessType, task.businessId, task.projectId);
  return {
    ...task,
    businessTypeLabel: r8BusinessTypeLabels[task.businessType] ?? task.businessType,
    taskTypeLabel: r8TaskTypeLabels[task.taskType] ?? r8BusinessTypeLabels[task.businessType] ?? task.taskType,
    statusLabel: r8LabelStatus(task.status),
    assigneeLabel: task.assigneeUserId ? `指定用户 ${task.assigneeUserId}` : task.assigneeRoleId ? r8RoleLabels[task.assigneeRoleId] ?? task.assigneeRoleId : "未指定",
    targetPath,
    targetLabel: r8BusinessTargetLabel(task.businessType),
    canComplete: canCompleteR8Task(task, user)
  };
}

export function toR8WorkflowNotificationView(message: R8WorkflowNotificationDto): R8WorkflowNotificationView {
  const targetPath =
    message.recipientRoleId === "expert" && message.businessType === "review_award"
      ? r8BusinessTargetPath("expert_scoring", message.businessId, message.projectId)
      : r8BusinessTargetPath(message.businessType, message.businessId, message.projectId);
  return {
    ...message,
    businessTypeLabel: r8BusinessTypeLabels[message.businessType] ?? message.businessType,
    eventTypeLabel: r8LabelStatus(message.eventType.split(".").at(-1)),
    readLabel: message.read ? "已读" : "未读",
    targetPath,
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
