import type { AuditService } from "../services/audit-service.js";
import type { AuthContext } from "../types.js";

export class AuditRequiredActionPolicy {
  constructor(private readonly audit: AuditService) {}

  recordSensitiveAction(context: AuthContext, action: string, objectType: string, objectId: string, projectId?: string, reason?: string) {
    return this.audit.record({
      context,
      action,
      objectType,
      objectId,
      projectId,
      result: "recorded",
      reason
    });
  }
}
