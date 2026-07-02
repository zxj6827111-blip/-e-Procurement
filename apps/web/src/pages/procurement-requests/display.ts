import type { DataTableColumn, SummaryCardItem } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { MethodRule, ProcurementRequest, ProjectRow, RequestActionContext } from "./types";

export const requestColumns: DataTableColumn[] = [
  { key: "code", label: "编号" },
  { key: "title", label: "标题" },
  { key: "department", label: "部门 / 申请人" },
  { key: "status", label: "状态" },
  { key: "approval", label: "审批" },
  { key: "method", label: "方式" },
  { key: "budget", label: "预算" },
  { key: "attachments", label: "附件" },
  { key: "project", label: "项目" },
  { key: "actions", label: "操作" }
];

export const lineItemColumns: DataTableColumn[] = [
  { key: "itemName", label: "明细名称" },
  { key: "category", label: "品类" },
  { key: "specification", label: "规格" },
  { key: "quantity", label: "数量" },
  { key: "unit", label: "单位" },
  { key: "estimatedUnitPrice", label: "预估单价" },
  { key: "budgetAmount", label: "行预算" },
  { key: "requiredByDate", label: "需求日期" },
  { key: "remark", label: "备注" }
];

export function isTestRecord(values: Array<string | undefined | null>) {
  return values.some((value) => /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? "")));
}

export function canCreateRequest(roleId: string) {
  return roleId === "hotel_buyer";
}

export function canApproveRequest(roleId: string) {
  return roleId === "group_manager";
}

export function canDecideMethod(roleId: string) {
  return ["buyer", "platform_operator"].includes(roleId);
}

export function visibleProcurementRequests(requests: ProcurementRequest[]) {
  return requests.filter((item) => item.status !== "cancelled" && !isTestRecord([item.title, item.requestDepartment, item.requesterName]));
}

export function procurementRequestSummaryItems(requests: ProcurementRequest[]): SummaryCardItem[] {
  return [
    { label: "可见申请", value: requests.length },
    { label: "待审批", value: requests.filter((item) => item.approvalStatus === "submitted").length },
    { label: "待转项目", value: requests.filter((item) => item.status === "method_decided" && !item.projectId).length },
    { label: "已发起项目", value: requests.filter((item) => Boolean(item.projectId)).length }
  ];
}

export function pageTitle(roleId: string) {
  if (roleId === "group_manager") return "需求审批";
  if (canDecideMethod(roleId)) return "需求转项目";
  if (roleId === "auditor") return "需求监督";
  return "采购申请";
}

export function flowDescription(roleId: string) {
  if (canCreateRequest(roleId)) return "当前账号负责提交酒店采购申请；提交后由集团审批，审批通过后交由采购经办承接。";
  if (roleId === "group_manager") return "当前账号只处理酒店提交后的需求审批，不发起采购申请。";
  if (canDecideMethod(roleId)) return "当前账号处理已审批需求，在同一页面完成采购方式判定并发起采购项目。";
  return "当前账号仅查看授权范围内的采购申请和需求流转。";
}

export function pendingApprovalTaskFor(request: ProcurementRequest, context: RequestActionContext) {
  return context.workflowTasks.find(
    (task) => task.businessType === "procurement_request" && task.businessId === request.id && task.status === "pending" && task.canComplete
  );
}

export function canSubmitRequestRow(request: ProcurementRequest, context: RequestActionContext) {
  return Boolean(canCreateRequest(context.roleId) && request.status === "draft" && request.createdBy === context.userId);
}

export function canApproveRequestRow(request: ProcurementRequest, context: RequestActionContext) {
  return Boolean(
    canApproveRequest(context.roleId) &&
      request.approvalStatus === "submitted" &&
      request.createdBy !== context.userId &&
      pendingApprovalTaskFor(request, context)
  );
}

export function canDecideMethodRow(request: ProcurementRequest, context: RequestActionContext) {
  return Boolean(canDecideMethod(context.roleId) && request.status === "submitted" && request.approvalStatus === "approved");
}

export function canCreateProjectRow(request: ProcurementRequest, context: RequestActionContext) {
  return Boolean(canDecideMethod(context.roleId) && request.status === "method_decided" && request.approvalStatus === "approved" && !request.projectId);
}

export function canDeleteRequestRow(request: ProcurementRequest, context: RequestActionContext) {
  return Boolean(request.status === "draft" && canCreateRequest(context.roleId) && request.createdBy === context.userId);
}

export function canCancelRequestRow(request: ProcurementRequest, context: RequestActionContext) {
  return Boolean(request.status !== "project_created" && request.status !== "cancelled" && canCreateRequest(context.roleId) && request.createdBy === context.userId);
}

export function hasRowActions(request: ProcurementRequest, context: RequestActionContext) {
  return (
    canSubmitRequestRow(request, context) ||
    canApproveRequestRow(request, context) ||
    canDecideMethodRow(request, context) ||
    canCreateProjectRow(request, context) ||
    canDeleteRequestRow(request, context) ||
    canCancelRequestRow(request, context)
  );
}

export function rowReadonlyLabel(request: ProcurementRequest, context: RequestActionContext) {
  if (request.status === "project_created") return "已锁定";
  if (request.status === "cancelled") return "已取消";
  if (request.approvalStatus === "submitted") return "待对应审批人处理";
  if (canDecideMethod(context.roleId) && request.approvalStatus !== "approved") return "待审批通过后承接";
  return "只读";
}

export function isGenericRequestTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

export function defaultProjectName(request: ProcurementRequest) {
  const title = request.title.trim();
  const firstItemName = request.lineItems?.[0]?.itemName?.trim();
  if (isGenericRequestTitle(title)) {
    return firstItemName ? `${firstItemName}采购项目` : "";
  }
  if (title.endsWith("采购项目")) return title;
  if (title.endsWith("采购申请")) return title.replace(/采购申请$/, "采购项目");
  return `${title}项目`;
}

export function methodRuleIdFor(requestId: string, selections: Record<string, string>, selectedRuleId: string, rules: MethodRule[]) {
  return selections[requestId] || selectedRuleId || rules[0]?.id || "";
}

export function methodRuleFor(requestId: string, selections: Record<string, string>, selectedRuleId: string, rules: MethodRule[]) {
  const ruleId = methodRuleIdFor(requestId, selections, selectedRuleId, rules);
  return rules.find((rule) => rule.id === ruleId);
}

export function isExternalRule(rule: MethodRule | undefined) {
  return Boolean(rule && (rule.ruleCode?.includes("external") || rule.resultMethod.includes("外部") || rule.resultMethod === "external_trade"));
}

export function methodRuleSummary(rule: MethodRule | undefined) {
  const method = rule?.resultMethod ?? "";
  const code = rule?.ruleCode ?? "";
  if (method.includes("外部") || code.includes("external")) {
    return "适用于依法必须进外部交易平台、或集团制度要求外部备案的采购；判定后进入外部采购备案链路。";
  }
  if (method.includes("询价") || method.includes("比选") || code.includes("comparison")) {
    return "适用于金额较小、品类清晰、制度允许通过多家询价或比选确定供应商的内部采购。";
  }
  return "适用于需要在内部平台公开发布公告、接受供应商报名或邀请、再进入报价和评审的采购。";
}

export function ruleResultLabel(rule: MethodRule | undefined) {
  return rule ? labelStatus(rule.resultMethod) : "-";
}

export function methodDecisionPayload(requestId: string, selections: Record<string, string>, selectedRuleId: string, rules: MethodRule[]) {
  const rule = methodRuleFor(requestId, selections, selectedRuleId, rules);
  return {
    ruleId: methodRuleIdFor(requestId, selections, selectedRuleId, rules),
    externalTradeFlag: isExternalRule(rule)
  };
}

export function projectName(projectId: string | null, projects: ProjectRow[]) {
  if (!projectId) return "待发起";
  const project = projects.find((item) => item.id === projectId);
  return project ? project.name || project.code || "已发起项目" : "已发起项目";
}

export function projectExecutionLink(projectId: string | null) {
  return projectId ? `/project-workbench/${projectId}` : "/project-workbench";
}

export function projectDisplayName(project: ProjectRow | null) {
  if (!project) return "采购项目";
  return project.displayName || [project.code, project.name].filter(Boolean).join(" / ") || project.id;
}

export function money(value: number | undefined) {
  return value === undefined ? "-" : `¥${Number(value).toLocaleString("zh-CN")}`;
}

export function statusLabel(value?: string) {
  return labelStatus(value || "draft");
}

export function formatDate(value?: string) {
  if (!value) return "-";
  return value.slice(0, 10);
}
