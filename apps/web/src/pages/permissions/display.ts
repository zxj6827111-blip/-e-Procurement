import { labelStatus } from "../../utils/status-labels";
import type { BpmnPilotChangeLogRow, BpmnPilotHealthRow, BpmnPilotScope } from "./types";

export const menuLabels: Record<string, string> = {
  admin: "系统管理",
  config: "基础配置",
  dashboard: "集团采购驾驶舱",
  myTasks: "待办任务",
  procurement: "采购业务",
  supplier: "供应商管理"
};

export const actionLabels: Record<string, string> = {
  "audit:read": "查看审计日志",
  "bid:read": "查看报价",
  "bpmn:manage": "BPMN 流程配置",
  "config:manage": "维护基础配置",
  "file:download": "下载文件",
  "file:upload": "上传文件",
  "project:maintain": "维护采购项目",
  "request:accept": "承接已审批需求",
  "request:maintain": "维护采购申请",
  "request:method-decision": "判定采购方式",
  "supplier:maintain": "维护供应商资料",
  apply: "提交申请",
  approve: "审批通过",
  audit_read: "审计查阅",
  reject: "驳回",
  request: "发起申请",
  return: "退回修改",
  submit: "提交"
};

export const roleLabels: Record<string, string> = {
  admin: "系统管理员",
  auditor: "纪检 / 审计",
  buyer: "采购经办",
  expert: "专家",
  finance_reviewer: "财务审核",
  group_manager: "集团采购管理",
  hotel_buyer: "酒店采购",
  hotel_finance: "酒店财务",
  platform_operator: "平台运营",
  supplier: "供应商",
  supplier_admin: "供应商管理员",
  supplier_quotation: "供应商报价员",
  system: "系统账号"
};

export const businessTypeLabels: Record<string, string> = {
  archive: "档案审计",
  archive_supplement: "档案补档审批",
  award_approval: "定标审批",
  contract_preparation: "合同入口",
  direct_purchase: "直采流程",
  invoice: "发票流程",
  mall_order: "商城订单审批",
  order_fulfillment: "履约订单",
  payment: "付款流程",
  price_approval: "价格审批",
  procurement_request: "采购需求审批",
  review_award: "评审定标",
  rfq: "询价流程",
  settlement: "结算流程",
  supplier_onboarding: "供应商准入",
  tender: "招标流程"
};

export const approvalRuleColumns = [
  { key: "ruleName", label: "规则" },
  { key: "businessType", label: "业务类型" },
  { key: "nodeRoleIds", label: "节点角色" },
  { key: "actions", label: "动作" },
  { key: "status", label: "状态" },
  { key: "versionNo", label: "版本" }
];

export const bpmnDefinitionColumns = [
  { key: "process", label: "流程" },
  { key: "businessType", label: "业务类型" },
  { key: "versionNo", label: "版本" },
  { key: "status", label: "状态" },
  { key: "validationStatus", label: "校验" },
  { key: "xmlSha256", label: "XML 摘要" }
];

export const bpmnPilotColumns = [
  { key: "pilotName", label: "试点" },
  { key: "businessType", label: "业务类型" },
  { key: "mode", label: "模式" },
  { key: "status", label: "状态" },
  { key: "scope", label: "范围" },
  { key: "definition", label: "版本治理" },
  { key: "fallbackTo", label: "回退" }
];

export const bpmnHealthColumns = [
  { key: "pilot", label: "试点" },
  { key: "scope", label: "范围" },
  { key: "compatibilityRate", label: "兼容率" },
  { key: "stats", label: "运行统计" },
  { key: "latestRun", label: "最近运行" },
  { key: "fallback", label: "回退状态" },
  { key: "health", label: "处理状态" }
];

export const bpmnChangeLogColumns = [
  { key: "actionCode", label: "动作" },
  { key: "pilotId", label: "试点" },
  { key: "actorRoleId", label: "执行角色" },
  { key: "summary", label: "摘要" },
  { key: "createdAt", label: "时间" }
];

export const bpmnRunColumns = [
  { key: "eventCode", label: "事件" },
  { key: "business", label: "业务" },
  { key: "status", label: "状态" },
  { key: "predictedNodeKey", label: "预测节点" },
  { key: "stoppedReason", label: "停止原因" },
  { key: "fallbackTo", label: "回退" }
];

export const userColumns = [
  { key: "name", label: "人员" },
  { key: "roleId", label: "角色" },
  { key: "orgId", label: "组织" },
  { key: "departmentId", label: "部门" },
  { key: "position", label: "岗位" },
  { key: "status", label: "状态" }
];

export function menuText(menu: string) {
  return menuLabels[menu] ?? labelStatus(menu);
}

export function actionText(action: string) {
  return actionLabels[action] ?? action;
}

export function roleText(role: string) {
  return roleLabels[role] ?? labelStatus(role);
}

export function businessTypeText(type: string) {
  return businessTypeLabels[type] ?? labelStatus(type);
}

export function pilotScopeText(scope: BpmnPilotScope) {
  const orgScope = scope.orgIds.length > 0 ? scope.orgIds.join(" / ") : "未限定组织";
  const envScope = scope.environments.length > 0 ? scope.environments.join(" / ") : "全环境";
  return `${orgScope} / ${envScope} / ${scope.businessIdCount} 个测试对象`;
}

export function percent(value: number | null) {
  return value === null ? "-" : `${Math.round(value * 100)}%`;
}

export function healthState(row: BpmnPilotHealthRow) {
  if (row.needsAttention) return "需关注";
  if (row.runCount === 0) return "待观察";
  return "健康";
}

export function shortId(value?: string) {
  return value ? value.slice(0, 18) : "-";
}

export function logSummary(log: BpmnPilotChangeLogRow) {
  const after = log.after ?? {};
  const count = typeof after.scopeBusinessIdCount === "number" ? after.scopeBusinessIdCount : "-";
  const env = Array.isArray(after.scopeEnvironments) ? after.scopeEnvironments.join(" / ") || "全环境" : "-";
  const reason =
    typeof after.reason === "string" && after.reason
      ? after.reason
      : typeof after.lastRollbackReason === "string" && after.lastRollbackReason
        ? after.lastRollbackReason
        : "-";
  return `${labelStatus(log.actionCode)} / ${env} / ${count} 个对象 / ${reason}`;
}
