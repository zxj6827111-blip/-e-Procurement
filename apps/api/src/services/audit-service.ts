import type { SeedState } from "../seed/data.js";
import type { AuditLog, AuthContext, RoleId } from "../types.js";
import type { RuntimeDb } from "../runtime/runtime-db.js";

export interface AuditInput {
  context?: AuthContext;
  actorId?: string;
  roleId?: RoleId;
  orgId?: string;
  projectId?: string;
  action: string;
  objectType: string;
  objectId: string;
  result: AuditLog["result"];
  reason?: string;
  ip?: string;
  userAgent?: string;
}

export class AuditService {
  private sequence = 1;
  private defaultAuditMeta: Pick<AuditInput, "ip" | "userAgent"> = {};

  constructor(
    private readonly state: SeedState,
    private readonly runtimeDb?: RuntimeDb
  ) {
    const maxStateId = Math.max(
      0,
      ...state.auditLogs.map((item) => Number(item.id.replace("audit-", ""))).filter((item) => Number.isFinite(item))
    );
    const maxDbId = this.runtimeDb
      ? Number(
          (
            this.runtimeDb.db
              .prepare("select max(cast(substr(id, 7) as integer)) as max_id from audit_logs where id like 'audit-%'")
              .get() as { max_id?: number | null }
          ).max_id ?? 0
        )
      : 0;
    this.sequence = Math.max(this.sequence, maxStateId + 1, maxDbId + 1);
  }

  useRequestMeta(meta: Pick<AuditInput, "ip" | "userAgent">) {
    this.defaultAuditMeta = meta;
  }

  record(input: AuditInput): AuditLog {
    const user = input.context?.user;
    const id = this.nextAuditId();
    const log: AuditLog = {
      id,
      actorId: input.actorId ?? user?.id ?? "anonymous",
      roleId: input.roleId ?? input.context?.roleId ?? "system",
      orgId: input.orgId ?? user?.orgId ?? "unknown",
      projectId: input.projectId,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      result: input.result,
      reason: input.reason,
      ip: input.ip ?? this.defaultAuditMeta.ip,
      userAgent: input.userAgent ?? this.defaultAuditMeta.userAgent,
      createdAt: new Date().toISOString()
    };
    this.state.auditLogs.push(log);
    this.runtimeDb?.db
      .prepare(
        `insert into audit_logs
         (id, actor_id, role_id, org_id, project_id, action, object_type, object_id, result, reason, ip, user_agent, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        log.id,
        log.actorId,
        log.roleId,
        log.orgId,
        log.projectId ?? null,
        log.action,
        log.objectType,
        log.objectId,
        log.result,
        log.reason ?? null,
        log.ip ?? null,
        log.userAgent ?? null,
        log.createdAt
      );
    return log;
  }

  private nextAuditId() {
    while (true) {
      const id = `audit-${String(this.sequence++).padStart(6, "0")}`;
      if (this.state.auditLogs.some((item) => item.id === id)) continue;
      if (this.runtimeDb) {
        const existing = this.runtimeDb.db.prepare("select id from audit_logs where id = ?").get(id);
        if (existing) continue;
      }
      return id;
    }
  }
}
