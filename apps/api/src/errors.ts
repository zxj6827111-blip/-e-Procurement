import type { AuditLog } from "./types.js";

export class PolicyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly auditLog: AuditLog,
    public readonly status = 403
  ) {
    super(message);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function errorBody(error: PolicyError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      auditLogId: error.auditLog.id
    }
  };
}
