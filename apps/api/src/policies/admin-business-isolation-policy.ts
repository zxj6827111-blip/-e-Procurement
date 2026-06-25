import type { AuditService } from "../services/audit-service.js";
import type { AuthContext } from "../types.js";
import { deny } from "./policy-utils.js";

export class AdminBusinessIsolationPolicy {
  constructor(private readonly audit: AuditService) {}

  assertBusinessAccessAllowed(context: AuthContext, objectType: string, objectId: string, projectId?: string) {
    if (context.roleId !== "admin") return;
    deny(this.audit, context, {
      code: "ADMIN_BUSINESS_DATA_DENIED",
      message: "系统管理员只能维护基础配置，不能访问采购实质业务数据。",
      action: "admin.business.denied",
      objectType,
      objectId,
      projectId,
      reason: "admin role is isolated from business data"
    });
  }
}
