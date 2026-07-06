import type { DataTableColumn } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { ProjectOption, ScoringCategory, StatusTone } from "./types";

export const reviewScopeOptions = ["技术评审", "商务评审", "财务评审", "供应链评审", "业务部门评审"];

export const expertColumns: DataTableColumn[] = [
  { key: "expert", label: "专家" },
  { key: "accounts", label: "用户账号" },
  { key: "reviewScopes", label: "评标范围" },
  { key: "assessmentScopes", label: "供应商考核范围" },
  { key: "sharedAccount", label: "共用账号" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" }
];

export const assignmentColumns: DataTableColumn[] = [
  { key: "expert", label: "专家" },
  { key: "method", label: "产生方式" },
  { key: "status", label: "状态" },
  { key: "avoidance", label: "回避确认" },
  { key: "discipline", label: "纪律确认" },
  { key: "confidentiality", label: "保密承诺" },
  { key: "actions", label: "操作" }
];

export const supplierScoreColumns: DataTableColumn[] = [
  { key: "rank", label: "排名" },
  { key: "supplier", label: "供应商" },
  { key: "technical", label: "技术分" },
  { key: "service", label: "商务分" },
  { key: "price", label: "价格分" },
  { key: "total", label: "总分" },
  { key: "submittedCount", label: "提交专家" }
];

export const reportColumns: DataTableColumn[] = [
  { key: "reportNo", label: "报告编号" },
  { key: "status", label: "状态" },
  { key: "generatedAt", label: "生成时间" },
  { key: "frozenAt", label: "冻结时间" },
  { key: "createdBy", label: "创建人" }
];

export const scoreDetailColumns: DataTableColumn[] = [
  { key: "category", label: "类别" },
  { key: "label", label: "评分项" },
  { key: "maxScore", label: "分值" },
  { key: "score", label: "得分" },
  { key: "comment", label: "专家意见" }
];

export const expertAssignmentStatuses = new Set(["bidding_locked", "expert_reviewing"]);
export const reviewReadableStatuses = new Set(["bidding_locked", "expert_reviewing", "review_report_frozen", "award_approving", "awarded_pending_order", "result_notified"]);

export const assignmentStatusLabels: Record<string, string> = {
  assigned: "待专家确认",
  confirmed: "专家已确认",
  submitted_locked: "评分已提交",
  replaced: "已替换"
};

export function projectLabel(project: ProjectOption) {
  return `${project.code} / ${project.name} / ${labelStatus(project.status)}`;
}

export function reviewStageHint(project: ProjectOption | null) {
  if (!project) return "请选择采购项目后查看专家评审状态。";
  if (expertAssignmentStatuses.has(project.status)) return "报价已锁定，可以抽取或指定专家，并进入评审确认与评分。";
  if (reviewReadableStatuses.has(project.status)) return "评审已进入后续环节，可以查看专家和评审进度，但不再替换专家。";
  if (project.status === "bidding_open") return "当前仍在报价控制阶段，请先完成报价截止和锁定报价，再组织专家评审。";
  return "当前项目尚未到专家评审阶段，请先完成采购文件、公告报名和报价控制。";
}

export function formatReviewDateTime(value?: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

export function categoryLabel(category: ScoringCategory) {
  return category === "technical" ? "技术分" : category === "service" ? "商务分" : "价格分";
}

export function statusTone(status: string): StatusTone {
  if (["可抽取", "confirmed", "submitted_locked", "generated", "frozen"].includes(status)) return "success";
  if (["assigned", "draft", "reviewing"].includes(status)) return "warning";
  if (["replaced", "停用", "回避"].includes(status)) return "error";
  return "default";
}

export function createExpertFormDefaults(orgId = "org-group") {
  return {
    ownerOrgId: orgId,
    branchOrgId: orgId,
    accountUserIds: "",
    name: "",
    category: "综合评审",
    status: "可抽取",
    reviewScopes: ["技术评审", "商务评审"],
    supplierAssessmentScopes: [...reviewScopeOptions],
    sharedAccount: false,
    active: true,
    maintenanceLog: ""
  };
}
