import { apiGet } from "./http";
import {
  r8BusinessTargetLabel,
  r8BusinessTargetPath,
  r8BusinessTypeLabels,
  r8RoleLabels,
  r8TaskTypeLabels,
  type R8ApprovalBusinessType
} from "../../../api/src/workflow-ui-contract";

export type ProcessBusinessType = Extract<
  R8ApprovalBusinessType,
  | "procurement_request"
  | "procurement_document"
  | "award_approval"
  | "supplier_onboarding"
  | "sourcing"
  | "rfq"
  | "tender"
  | "direct_purchase"
  | "review_award"
  | "contract_preparation"
  | "order_fulfillment"
  | "settlement"
  | "invoice"
  | "payment"
  | "archive"
>;
export type ProcessStatus = "draft" | "running" | "waiting" | "completed" | "rejected" | "cancelled" | "failed";
export type ProcessTaskStatus = "pending" | "completed" | "cancelled" | "expired";

export interface ProcessInstanceView {
  id: string;
  processDefinitionId: string;
  processCode: ProcessBusinessType;
  businessType: ProcessBusinessType;
  businessId: string;
  businessTitle: string;
  currentNodeKey: string;
  status: ProcessStatus;
  startedAt?: string;
  completedAt?: string;
  orgId?: string;
  supplierId?: string;
  projectId?: string;
  sourceEngine: "r8_workflow" | "process_layer";
  createdAt: string;
  updatedAt: string;
}

export interface ProcessTaskDto {
  id: string;
  processInstanceId: string;
  processStatus?: ProcessStatus;
  processCurrentNodeKey?: string;
  processStartedAt?: string;
  processCompletedAt?: string;
  businessTitle?: string;
  nodeKey: string;
  taskType: string;
  businessType: ProcessBusinessType;
  businessId: string;
  title: string;
  assigneeRoleId?: string;
  supplierId?: string;
  orgId?: string;
  projectId?: string;
  status: ProcessTaskStatus;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessTaskView extends ProcessTaskDto {
  source: "process";
  sourceLabel: string;
  businessTypeLabel: string;
  taskTypeLabel: string;
  statusLabel: string;
  assigneeLabel: string;
  nodeLabel: string;
  processStatusLabel: string;
  targetPath: string;
  targetLabel: string;
  canComplete: false;
}

export interface ProcessEventView {
  id: string;
  processInstanceId: string;
  eventCode: string;
  eventName: string;
  businessType: ProcessBusinessType;
  businessId: string;
  fromNodeKey?: string;
  toNodeKey?: string;
  fromStatus?: string;
  toStatus?: string;
  createdAt: string;
}

export interface ProcessBusinessResponse {
  processInstances: ProcessInstanceView[];
  tasks: ProcessTaskDto[];
  events: ProcessEventView[];
}

const processStatusLabels: Record<string, string> = {
  draft: "草稿",
  running: "进行中",
  waiting: "等待中",
  completed: "已完成",
  rejected: "已驳回",
  cancelled: "已取消",
  failed: "异常",
  method_decided: "采购方式已判定"
};

const processTaskStatusLabels: Record<string, string> = {
  pending: "待处理",
  completed: "已完成",
  cancelled: "已取消",
  expired: "已超期"
};

const processNodeLabels: Record<string, string> = {
  start: "开始",
  request_created: "创建需求",
  approval_pending: "待审批",
  request_rejected: "审批驳回",
  method_decision: "方式决策",
  project_created: "生成采购项目",
  registered: "供应商注册",
  profile_completion: "资料补全",
  qualification_review: "资质审核",
  admission_approval: "准入审批",
  category_authorization: "品类授权",
  active_online: "生效上线",
  restricted_end: "限制准入",
  inquiry_created: "创建询价",
  supplier_invitation: "邀请供应商",
  supplier_quotation: "供应商报价",
  announcement_preparation: "公告准备",
  announcement_published: "公告发布",
  announcement_closed: "公告关闭",
  supplier_registration: "供应商报名",
  qualification_confirmation: "资格审查",
  bid_response: "报价 / 响应文件提交",
  bid_cutoff: "截标",
  bid_opening_locked: "开标 / 锁标",
  comparison_preparation: "比价准备",
  award_preparation: "定标前准备",
  review_preparation: "评审准备",
  demand_confirmed: "需求确认",
  supplier_confirmation: "供应商确认",
  pricing_confirmation: "定价确认",
  approval_or_archive: "审批或归档",
  quote_locked: "报价锁定",
  expert_assignment: "专家抽取 / 指定",
  expert_confirmation: "专家确认",
  expert_scoring: "专家评分",
  score_summary: "评分汇总",
  comparison_report: "比选报告",
  review_report: "评审报告",
  award_approval: "定标审批",
  result_preparation: "结果通知 / 公示准备",
  completed: "已完成",
  award_approved: "定标通过",
  result_published: "结果发布",
  pricing_report: "定价报告",
  contract_entry: "合同台账",
  contract_ready: "合同准备完成",
  order_created: "订单创建",
  shipment: "供应商发货",
  receiving: "收货确认",
  acceptance: "履约验收",
  evaluation: "供应商评价",
  settlement_entry: "进入结算",
  settlement_generated: "生成结算单",
  settlement_submit: "提交结算",
  settlement_review: "结算审核",
  materials_review: "结算材料审核",
  invoice_entry: "进入发票",
  payment_entry: "进入付款申请",
  invoice_submitted: "发票提交",
  invoice_review: "发票审核",
  invoice_approved: "发票通过",
  invoice_rejected: "发票驳回",
  payment_requested: "付款申请",
  payment_review: "付款复核",
  payment_confirmed: "付款确认",
  payment_completed: "付款完成",
  archive_generated: "档案快照",
  completeness_check: "完整性检查",
  supplement_request: "补档申请",
  supplement_approval: "补档审批",
  supplemented: "补档完成",
  sealed: "档案封存",
  audit_read: "审计查阅",
  approved_end: "审批通过",
  rejected_end: "审批驳回",
  cancelled_end: "已取消"
};

const processRoleLabels: Record<string, string> = {
  ...r8RoleLabels,
  hotel_buyer: "酒店采购",
  platform_operator: "平台运营",
  supplier_admin: "供应商管理员",
  supplier_quotation: "供应商报价人员",
  hotel_finance: "酒店财务",
  finance_reviewer: "财务复核"
};

export function processStatusLabel(value?: string | null) {
  if (!value) return "-";
  return processStatusLabels[value] ?? processTaskStatusLabels[value] ?? value;
}

export function processNodeLabel(value?: string | null) {
  if (!value) return "-";
  return processNodeLabels[value] ?? value;
}

export function processRoleLabel(value?: string | null) {
  if (!value) return "未指定";
  return processRoleLabels[value] ?? value;
}

export function processBusinessLabel(type: ProcessBusinessType) {
  return r8BusinessTypeLabels[type] ?? type;
}

export function toProcessTaskView(task: ProcessTaskDto): ProcessTaskView {
  return {
    ...task,
    source: "process",
    sourceLabel: "Process",
    businessTypeLabel: processBusinessLabel(task.businessType),
    taskTypeLabel: r8TaskTypeLabels[task.taskType] ?? processBusinessLabel(task.businessType),
    statusLabel: processStatusLabel(task.status),
    assigneeLabel: processRoleLabel(task.assigneeRoleId),
    nodeLabel: processNodeLabel(task.nodeKey),
    processStatusLabel: processStatusLabel(task.processStatus),
    targetPath: r8BusinessTargetPath(task.businessType, task.businessId, task.projectId),
    targetLabel: r8BusinessTargetLabel(task.businessType),
    canComplete: false
  };
}

export async function loadProcessTasks(userId?: string) {
  const data = await apiGet<{ processTasks: ProcessTaskDto[] }>("/api/process/tasks", userId);
  return data.processTasks.map(toProcessTaskView);
}

export function loadBusinessProcess(businessType: ProcessBusinessType, businessId: string) {
  return apiGet<ProcessBusinessResponse>(`/api/process/business/${businessType}/${encodeURIComponent(businessId)}`);
}
