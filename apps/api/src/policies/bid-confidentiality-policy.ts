import type { AuditService } from "../services/audit-service.js";
import type { SeedState } from "../seed/data.js";
import type { AuthContext, Bid, BidViewContent } from "../types.js";
import { isSupplierRole, supplierIdMatches } from "../role-groups.js";
import { deny } from "./policy-utils.js";

export class BidConfidentialityPolicy {
  constructor(
    private readonly state: SeedState,
    private readonly audit: AuditService
  ) {}

  private isBeforeDeadline(bid: Bid) {
    const project = this.state.projects.find((item) => item.id === bid.projectId);
    const deadline = project?.quoteDeadlineAt ?? bid.quoteDeadlineAt;
    return deadline ? new Date(deadline).getTime() > Date.now() : false;
  }

  assertBidAccess(context: AuthContext, bid: Bid, content: BidViewContent, options: { download?: boolean; approvalId?: string } = {}) {
    const project = this.state.projects.find((item) => item.id === bid.projectId);
    if (!project) {
      deny(this.audit, context, {
        code: "PROJECT_NOT_FOUND",
        message: "项目不存在。",
        action: "bid.project.missing",
        objectType: "project",
        objectId: bid.projectId,
        reason: "project missing"
      });
    }

    if (isSupplierRole(context.roleId)) {
      if (supplierIdMatches(context.user, bid.supplierId)) return;
      deny(this.audit, context, {
        code: "SUPPLIER_BID_SCOPE_DENIED",
        message: "供应商只能查看本企业报价。",
        action: "bid.supplier.scope.denied",
        objectType: "bid",
        objectId: bid.id,
        projectId: bid.projectId,
        reason: `supplier ${context.user.supplierId ?? "unknown"} tried to access bid ${bid.id}`
      });
    }

    if (context.roleId === "expert") {
      deny(this.audit, context, {
        code: "EXPERT_BID_DENIED",
        message: "专家不可见报价和响应文件。",
        action: "bid.expert.denied",
        objectType: "bid",
        objectId: bid.id,
        projectId: bid.projectId,
        reason: "expert role cannot access bid data"
      });
    }

    if (context.roleId === "admin") {
      deny(this.audit, context, {
        code: "ADMIN_BUSINESS_DATA_DENIED",
        message: "系统管理员不能访问采购实质业务数据。",
        action: "admin.business.denied",
        objectType: "bid",
        objectId: bid.id,
        projectId: bid.projectId,
        reason: "admin role cannot access bid details"
      });
    }

    if (!this.isBeforeDeadline(bid)) return;

    if (["buyer", "group_manager", "auditor"].includes(context.roleId)) {
      const approval = options.approvalId
        ? this.state.bidViewApprovals.find((item) => item.id === options.approvalId)
        : undefined;
      const now = Date.now();
      const approvalValid =
        approval &&
        approval.approvalStatus === "active" &&
        approval.applicantId === context.user.id &&
        approval.projectId === bid.projectId &&
        approval.targetSupplierId === bid.supplierId &&
        approval.viewContent === content &&
        new Date(approval.validFrom).getTime() <= now &&
        new Date(approval.validUntil).getTime() >= now &&
        (!options.download || approval.allowDownload);

      if (approvalValid) return;

      const reason = approval ? "approval out of scope or expired" : "missing abnormal view approval";
      this.state.bidViewLogs.push({
        id: `bvl-${String(this.state.bidViewLogs.length + 1).padStart(6, "0")}`,
        approvalId: approval?.id,
        actorId: context.user.id,
        projectId: bid.projectId,
        supplierId: bid.supplierId,
        content,
        downloadFlag: Boolean(options.download),
        result: "denied",
        outOfScopeReason: reason,
        createdAt: new Date().toISOString()
      });
      deny(this.audit, context, {
        code: "BID_CONFIDENTIALITY_DENIED",
        message: "报价截止前查看报价金额或响应文件必须具备有效异常查看授权。",
        action: "bid.confidentiality.denied",
        objectType: "bid",
        objectId: bid.id,
        projectId: bid.projectId,
        reason
      });
    }

    deny(this.audit, context, {
      code: "BID_CONFIDENTIALITY_DENIED",
      message: "当前角色没有报价截止前查看报价金额或响应文件的默认权限。",
      action: "bid.confidentiality.denied",
      objectType: "bid",
      objectId: bid.id,
      projectId: bid.projectId,
      reason: `role ${context.roleId} is not allowed before deadline`
    });

  }
}
