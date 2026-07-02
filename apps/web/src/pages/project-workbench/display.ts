import { formatDateTime, labelStatus } from "../../utils/status-labels";
import { EXTERNAL_STATUS_ORDER, INTERNAL_STATUS_ORDER, WORKBENCH_STATUS_TEXT } from "./constants";
import type { ProjectOption, WorkbenchResponse, WorkbenchStage } from "./types";

export function label(value: string | undefined | null) {
  return value ? WORKBENCH_STATUS_TEXT[value] ?? labelStatus(value) : "-";
}

export function currency(value: number | undefined) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

export function isGenericTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

export function projectTitle(workbench: WorkbenchResponse | null, selectedProjectOption: ProjectOption | null) {
  const project = workbench?.project;
  if (!project) return "采购项目";
  const request = workbench?.procurementRequest;
  const itemTitle = request?.lineItems?.[0]?.itemName ? `${request.lineItems[0].itemName}采购项目` : "";
  const requestTitle = isGenericTitle(request?.title) ? itemTitle : request?.title || selectedProjectOption?.sourceRequestTitle;
  if (project.name && !isGenericTitle(project.name)) return project.name;
  return requestTitle || project.name || project.code;
}

export function projectStatusText(workbench: WorkbenchResponse | null) {
  const project = workbench?.project;
  if (!project) return "-";
  return label(project.status) || label(project.displayStatus);
}

export function projectOptionLabel(project: ProjectOption) {
  const name = project.displayName || [project.code, !isGenericTitle(project.name) ? project.name : project.sourceRequestTitle].filter(Boolean).join(" / ");
  const status = project.status ? label(project.status) : label(project.displayStatus);
  const parts = [name || project.name || project.id, project.requestDepartment, project.budgetAmount === undefined ? "" : currency(project.budgetAmount), status].filter(Boolean);
  return parts.join(" / ");
}

export function projectSummaryItems(workbench: WorkbenchResponse | null, isExternalTradeProject: boolean) {
  return [
    { label: "当前阶段", value: projectStatusText(workbench) },
    { label: "采购方式", value: label(workbench?.project.type) },
    { label: "报价截止", value: formatDateTime(workbench?.project.quoteDeadlineAt) },
    { label: "项目类型", value: isExternalTradeProject ? "外部采购项目" : "内部采购项目" }
  ];
}

export function statusProgress(status: string | undefined, order: string[]) {
  const index = order.indexOf(status ?? "");
  return index < 0 ? 0 : index;
}

export function stageState(status: string | undefined, targetStatuses: string[], order = INTERNAL_STATUS_ORDER): WorkbenchStage {
  if (!status) return "upcoming";
  if (targetStatuses.includes(status)) return "current";
  const currentIndex = statusProgress(status, order);
  const targetIndex = Math.min(...targetStatuses.map((item) => statusProgress(item, order)).filter((item) => item >= 0));
  return currentIndex > targetIndex ? "done" : "upcoming";
}

export function operationStateLabel(state: WorkbenchStage) {
  if (state === "done") return "已完成";
  if (state === "current") return "当前阶段";
  return "未开始";
}

export function routeProjectId(paramsProjectId: unknown, queryProjectId: unknown) {
  const normalizedParam = Array.isArray(paramsProjectId) ? String(paramsProjectId[0] ?? "") : String(paramsProjectId ?? "");
  if (normalizedParam) return normalizedParam;
  return Array.isArray(queryProjectId) ? String(queryProjectId[0] ?? "") : String(queryProjectId ?? "");
}

export function pickProjectFromRouteOrFallback(input: {
  preferRoute: boolean;
  queryProjectId: string;
  selectedProjectId: string;
  projectOptions: ProjectOption[];
}) {
  if (input.preferRoute && input.queryProjectId && input.projectOptions.some((item) => item.id === input.queryProjectId)) {
    return input.queryProjectId;
  }
  if (!input.projectOptions.some((item) => item.id === input.selectedProjectId)) {
    return (input.queryProjectId && input.projectOptions.some((item) => item.id === input.queryProjectId) ? input.queryProjectId : input.projectOptions[0]?.id) ?? "";
  }
  return input.selectedProjectId;
}

export const internalStatusOrder = INTERNAL_STATUS_ORDER;
export const externalStatusOrder = EXTERNAL_STATUS_ORDER;
