import type { AuditService } from "../services/audit-service.js";
import type { AuthContext, ProcurementProject } from "../types.js";
import { deny } from "./policy-utils.js";

export type InternalTradeAction = "internal_announcement" | "internal_registration" | "internal_bid" | "internal_expert_review" | "internal_award";

const actionLabels: Record<InternalTradeAction, string> = {
  internal_announcement: "内部公告",
  internal_registration: "内部报名",
  internal_bid: "内部报价",
  internal_expert_review: "内部专家评审",
  internal_award: "内部定标审批"
};

export class ExternalTradeBlockingPolicy {
  constructor(private readonly audit: AuditService) {}

  assertInternalActionAllowed(context: AuthContext, project: ProcurementProject, action: InternalTradeAction) {
    if (!project.externalTradeFlag) return;
    deny(this.audit, context, {
      code: "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED",
      message: `外部交易备案项目不得发起${actionLabels[action]}。`,
      action: `external_trade.block.${action}`,
      objectType: "project",
      objectId: project.id,
      projectId: project.id,
      reason: "external_trade_flag=true"
    });
  }
}
