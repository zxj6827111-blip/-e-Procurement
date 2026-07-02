import type { AwardOperationForm, AwardRecommendation } from "./types";

export const defaultSelectedSupplierId = "sup-1";
export const defaultNonLowestPriceReason = "服务方案与技术评分综合领先";
export const defaultApprovalOpinion = "同意按评审结果定标。";
export const defaultRejectionOpinion = "定标依据不充分，请补充后重新提交。";

export function createAwardRecommendation(): AwardRecommendation {
  return {};
}

export function createAwardOperationForm(): AwardOperationForm {
  return {
    notificationScope: "supplier_self",
    visibilityConfig: "supplier_self_only",
    publicitySummary: "内部公示记录"
  };
}
