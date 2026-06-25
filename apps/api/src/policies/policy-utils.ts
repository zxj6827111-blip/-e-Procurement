import { PolicyError } from "../errors.js";
import type { AuditService } from "../services/audit-service.js";
import type { AuthContext } from "../types.js";

export function deny(
  audit: AuditService,
  context: AuthContext,
  input: {
    code: string;
    message: string;
    action: string;
    objectType: string;
    objectId: string;
    projectId?: string;
    reason: string;
  }
): never {
  const auditLog = audit.record({
    context,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    projectId: input.projectId,
    result: "denied",
    reason: input.reason
  });
  throw new PolicyError(input.code, input.message, auditLog);
}
