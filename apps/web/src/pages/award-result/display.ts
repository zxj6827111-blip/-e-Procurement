import type { R8ApprovalInstanceDto } from "../../api/workflow";
import type { SummaryCardItem } from "../../components/base";
import { APPROVAL_STATUS_LABELS, CONTRACT_STATUS_LABELS } from "./constants";
import type { AwardApproval, AwardProjectOption, AwardRecommendation, ContractLedger, MallProduct, PricingReport, ResultNotification } from "./types";

export const supplierResultRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
export const awardPreparationRoles = new Set(["buyer", "platform_operator"]);

export function supplierName(
  suppliers: Array<{ id: string; name: string }>,
  recommendation: AwardRecommendation,
  supplierId?: string
) {
  if (!supplierId) return "-";
  return suppliers.find((item) => item.id === supplierId)?.name ?? recommendation.recommendedSupplierName ?? "供应商";
}

export function approvalLabel(
  approval: AwardApproval,
  index: number,
  suppliers: Array<{ id: string; name: string }>,
  recommendation: AwardRecommendation
) {
  return `定标审批 ${index + 1} / ${supplierName(suppliers, recommendation, approval.selectedSupplierId)} / ${
    APPROVAL_STATUS_LABELS[approval.approvalStatus] ?? approval.approvalStatus
  }`;
}

export function notificationLabel(index: number) {
  return `结果通知 ${index + 1}`;
}

export function publicityLabel(index: number) {
  return `内部公示 ${index + 1}`;
}

export function createAwardApprovalDisabledText(projectHasApprovedAward: boolean, selectedSupplierId: string) {
  if (projectHasApprovedAward) return "当前项目已有通过的定标审批，不能重复创建定标审批。";
  if (!selectedSupplierId) return "请先选择拟定标供应商。";
  return "创建定标审批";
}

export function submitAwardApprovalDisabledText(projectHasApprovedAward: boolean, selectedApprovalId: string, selectedApprovalIsDraft: boolean) {
  if (projectHasApprovedAward) return "定标审批已通过，不能重复提交审批。";
  if (!selectedApprovalId) return "请先选择定标审批单。";
  if (!selectedApprovalIsDraft) return "只有草稿状态的定标审批单可以提交。";
  return "提交审批";
}

export function pricingReportButtonText(projectHasApprovedAward: boolean, existingPricingReport: PricingReport | null) {
  if (!projectHasApprovedAward) return "审批通过后生成报告";
  if (existingPricingReport) return "价格报告已生成";
  return "生成价格报告";
}

export function resultNotificationButtonText(projectHasApprovedAward: boolean, selectedNotificationScopeSent: boolean) {
  if (!projectHasApprovedAward) return "审批通过后发送通知";
  if (selectedNotificationScopeSent) return "结果通知已发送";
  return "发送结果通知";
}

export function internalPublicityButtonText(projectHasApprovedAward: boolean, hasPublishedPublicity: boolean) {
  if (!projectHasApprovedAward) return "审批通过后发布公示";
  if (hasPublishedPublicity) return "内部公示已发布";
  return "发布内部公示";
}

export function nextActionNotice(input: {
  projectHasApprovedAward: boolean;
  existingPricingReport: PricingReport | null;
  supplierSelfNotificationsSent: number;
  hasPublishedPublicity: boolean;
}) {
  if (!input.projectHasApprovedAward) return "请先创建并提交定标审批，集团审批通过后再发送结果通知、生成价格报告。";
  const items = [];
  items.push(input.existingPricingReport ? "价格报告已生成" : "可生成价格报告");
  items.push(input.supplierSelfNotificationsSent > 0 ? "供应商结果通知已发送" : "可发送供应商结果通知");
  items.push(input.hasPublishedPublicity ? "内部公示已发布" : "可发布内部公示");
  return `定标审批已通过。${items.join("；")}。`;
}

export function notificationSelected(result: ResultNotification, recommendation: AwardRecommendation) {
  return Boolean(result.selected ?? (result.supplierId && result.supplierId === recommendation.recommendedSupplierId));
}

export function projectDetailPath(projectId: string) {
  return `/award-result/${encodeURIComponent(projectId)}`;
}

export function pickAwardProjectId(input: {
  preferRoute: boolean;
  queryProjectId: string;
  pendingProjectId?: string;
  selectedProjectId: string;
  projects: AwardProjectOption[];
  selectableProjects: AwardProjectOption[];
}) {
  const candidates = [
    input.preferRoute ? input.queryProjectId : "",
    input.pendingProjectId ?? "",
    input.selectedProjectId,
    input.queryProjectId,
    input.projects[0]?.id ?? ""
  ];
  return candidates.find((id) => id && input.selectableProjects.some((project) => project.id === id)) ?? "";
}

export function pickAwardApprovalId(input: {
  queryBusinessId: string;
  pendingBusinessId?: string;
  selectedApprovalId: string;
  selectableApprovals: AwardApproval[];
}) {
  if (input.selectableApprovals.some((item) => item.id === input.selectedApprovalId)) return input.selectedApprovalId;
  const candidates = [
    input.queryBusinessId,
    input.pendingBusinessId ?? "",
    input.selectableApprovals.find((item) => item.approvalStatus === "submitted")?.id,
    input.selectableApprovals.at(-1)?.id ?? ""
  ];
  return candidates.find((id) => id && input.selectableApprovals.some((approval) => approval.id === id)) ?? "";
}

export function pendingGroupAwardInstances(instances: R8ApprovalInstanceDto[]) {
  return instances.filter(
    (item) => item.businessType === "award_approval" && item.approvalStatus === "submitted" && item.currentRoleId === "group_manager" && item.projectId
  );
}

export function awardSummaryItems(input: {
  selectedProjectLabel: string;
  selectedProjectId: string;
  approvals: AwardApproval[];
  projectHasApprovedAward: boolean;
  pricingReports: PricingReport[];
  existingPricingReport: PricingReport | null;
  notifications: ResultNotification[];
  awardProducts: MallProduct[];
  hasListedAwardProducts: boolean;
}): SummaryCardItem[] {
  return [
    { label: "当前项目", value: input.selectedProjectLabel, meta: input.selectedProjectId || "未选择" },
    { label: "定标审批", value: input.approvals.length, meta: input.projectHasApprovedAward ? "已有通过记录" : "待完成审批" },
    { label: "价格报告", value: input.pricingReports.length, meta: input.existingPricingReport ? "已生成" : "未生成" },
    { label: "结果通知", value: input.notifications.length, meta: "供应商/内部公示" },
    { label: "上架商品", value: input.awardProducts.length, meta: input.hasListedAwardProducts ? "已有商品上架" : "未上架" }
  ];
}

export function supplierSummaryItems(input: {
  projects: AwardProjectOption[];
  supplierResults: ResultNotification[];
  currentContract: ContractLedger | null;
  pricingReports: PricingReport[];
  notificationSelected: (result: ResultNotification) => boolean;
}): SummaryCardItem[] {
  return [
    { label: "关联项目", value: input.projects.length, meta: "已收到结果通知" },
    { label: "结果通知", value: input.supplierResults.length, meta: input.supplierResults.some(input.notificationSelected) ? "包含中选通知" : "暂无中选" },
    {
      label: "合同状态",
      value: input.currentContract ? CONTRACT_STATUS_LABELS[input.currentContract.status] ?? input.currentContract.status : "未发起",
      meta: "中选后确认"
    },
    { label: "价格报告", value: input.pricingReports.length, meta: "采购经办生成后可见" }
  ];
}
