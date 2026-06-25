import type { AuditService } from "../services/audit-service.js";
import type { SeedState } from "../seed/data.js";
import type { AuthContext } from "../types.js";
import { deny } from "./policy-utils.js";

export class ExpertAssignmentPolicy {
  constructor(
    private readonly state: SeedState,
    private readonly audit: AuditService
  ) {}

  assertExpertProjectAccess(context: AuthContext, projectId: string, objectId = projectId) {
    if (context.roleId !== "expert") return;
    const assigned = this.state.expertAssignments.some(
      (assignment) => assignment.projectId === projectId && assignment.expertId === context.user.expertId
    );
    if (assigned) return;
    deny(this.audit, context, {
      code: "EXPERT_ASSIGNMENT_DENIED",
      message: "专家只能访问本人被分配的项目。",
      action: "expert.assignment.denied",
      objectType: "project",
      objectId,
      projectId,
      reason: `expert ${context.user.expertId ?? "unknown"} is not assigned to ${projectId}`
    });
  }

  assertOwnScoringSheet(context: AuthContext, sheetExpertId: string, sheetId: string, projectId?: string) {
    if (context.roleId !== "expert") return;
    if (context.user.expertId === sheetExpertId) return;
    deny(this.audit, context, {
      code: "EXPERT_SCORE_SCOPE_DENIED",
      message: "专家之间评分和意见互不可见。",
      action: "expert.score.scope.denied",
      objectType: "scoring_sheet",
      objectId: sheetId,
      projectId,
      reason: `expert ${context.user.expertId ?? "unknown"} tried to access score owned by ${sheetExpertId}`
    });
  }

  assertConfidentialityConfirmed(context: AuthContext, projectId: string) {
    if (context.roleId !== "expert") return;
    const assignment = this.state.expertAssignments.find(
      (item) => item.projectId === projectId && item.expertId === context.user.expertId
    );
    if (assignment?.confidentialityConfirmed) return;
    deny(this.audit, context, {
      code: "EXPERT_CONFIDENTIALITY_REQUIRED",
      message: "专家未完成保密承诺，不得查看响应材料。",
      action: "expert.material.denied",
      objectType: "project",
      objectId: projectId,
      projectId,
      reason: "confidentiality confirmation missing"
    });
  }
}
