import crypto from "node:crypto";
import type { RuntimeDb } from "../runtime/index.js";
import type { ProcessBusinessType } from "./process-repository.js";
import type { RoleId } from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export type BpmnPilotStatus = "draft" | "enabled" | "disabled";
export type BpmnPilotMode = "shadow";
export type BpmnPilotRunStatus = "compatible" | "fallback" | "skipped" | "failed";

export interface BpmnPilotScope {
  orgIds: string[];
  businessIds: string[];
  environments: string[];
}

export interface BpmnPilotRecord {
  id: string;
  definitionId: string;
  pilotName: string;
  businessType: ProcessBusinessType;
  status: BpmnPilotStatus;
  mode: BpmnPilotMode;
  scope: BpmnPilotScope;
  fallbackTo: "r8_process_layer";
  previousDefinitionId?: string;
  lastRollbackReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  enabledAt?: string;
  disabledAt?: string;
}

export interface BpmnPilotRunRecord {
  id: string;
  pilotId: string;
  definitionId: string;
  internalEventId?: string;
  eventCode: string;
  businessType: ProcessBusinessType;
  businessId: string;
  businessRef: string;
  orgId?: string;
  status: BpmnPilotRunStatus;
  stoppedReason: string;
  predictedNodeKey?: string;
  consumedEvents: number;
  pathJson: Array<{ nodeKey: string; nodeName: string; nodeType: string }>;
  fallbackTo: "r8_process_layer";
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface CreateBpmnPilotArgs {
  definitionId: string;
  pilotName: string;
  businessType: ProcessBusinessType;
  status?: BpmnPilotStatus;
  mode?: BpmnPilotMode;
  scope: BpmnPilotScope;
  fallbackTo?: "r8_process_layer";
  createdBy: string;
  actorRoleId?: RoleId;
}

export interface SetBpmnPilotStatusArgs {
  pilotId: string;
  status: BpmnPilotStatus;
  actorId: string;
  actorRoleId?: RoleId;
}

export interface UpdateBpmnPilotScopeArgs {
  pilotId: string;
  scope: BpmnPilotScope;
  actorId: string;
  actorRoleId?: RoleId;
}

export interface SwitchBpmnPilotDefinitionArgs {
  pilotId: string;
  definitionId: string;
  actorId: string;
  actorRoleId?: RoleId;
  reason?: string;
}

export interface RollbackBpmnPilotArgs {
  pilotId: string;
  targetDefinitionId?: string;
  reason?: string;
  actorId: string;
  actorRoleId?: RoleId;
}

export interface RecordBpmnPilotRunArgs {
  pilotId: string;
  definitionId: string;
  internalEventId?: string;
  eventCode: string;
  businessType: ProcessBusinessType;
  businessId: string;
  orgId?: string;
  status: BpmnPilotRunStatus;
  stoppedReason: string;
  predictedNodeKey?: string;
  consumedEvents: number;
  pathJson: Array<{ nodeKey: string; nodeName: string; nodeType: string }>;
  fallbackTo?: "r8_process_layer";
  errorCode?: string;
  errorMessage?: string;
}

function now() {
  return new Date().toISOString();
}

function run(statement: RunnableStatement, values: SqlValue[]) {
  statement.run(...values);
}

function optionalString(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : String(value);
}

function json<T>(value: SqlValue | undefined, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function bpmnPilotBusinessRef(businessType: string, businessId: string) {
  return crypto.createHash("sha256").update(`${businessType}:${businessId}`).digest("hex").slice(0, 16);
}

export class BpmnPilotRepository {
  private available = false;
  private initializationError?: string;

  constructor(private readonly runtimeDb: RuntimeDb) {
    try {
      this.migrate();
      this.available = true;
    } catch (error) {
      this.available = false;
      this.initializationError = error instanceof Error ? error.message : String(error);
    }
  }

  isAvailable() {
    return this.available;
  }

  getInitializationError() {
    return this.initializationError;
  }

  createPilot(args: CreateBpmnPilotArgs) {
    this.assertAvailable();
    const timestamp = now();
    const pilot: BpmnPilotRecord = {
      id: `bpmn-pilot:${args.businessType}:${randomSuffix()}`,
      definitionId: args.definitionId,
      pilotName: args.pilotName,
      businessType: args.businessType,
      status: args.status ?? "draft",
      mode: args.mode ?? "shadow",
      scope: normalizeScope(args.scope),
      fallbackTo: args.fallbackTo ?? "r8_process_layer",
      previousDefinitionId: undefined,
      lastRollbackReason: undefined,
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      enabledAt: args.status === "enabled" ? timestamp : undefined
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into bpmn_pilots (
          id, definition_id, pilot_name, business_type, pilot_status, pilot_mode,
          scope_json, fallback_to, previous_definition_id, last_rollback_reason,
          created_by, created_at, updated_at, enabled_at, disabled_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        pilot.id,
        pilot.definitionId,
        pilot.pilotName,
        pilot.businessType,
        pilot.status,
        pilot.mode,
        JSON.stringify(pilot.scope),
        pilot.fallbackTo,
        pilot.previousDefinitionId ?? null,
        pilot.lastRollbackReason ?? null,
        pilot.createdBy,
        pilot.createdAt,
        pilot.updatedAt,
        pilot.enabledAt ?? null,
        null
      ]
    );
    this.insertPilotChangeLog({
      pilotId: pilot.id,
      actionCode: "bpmn_pilot.created",
      actorId: args.createdBy,
      actorRoleId: args.actorRoleId,
      beforeJson: {},
      afterJson: this.summaryForLog(pilot)
    });
    return pilot;
  }

  setPilotStatus(args: SetBpmnPilotStatusArgs) {
    this.assertAvailable();
    const existing = this.getPilot(args.pilotId);
    if (!existing) return undefined;
    const timestamp = now();
    const enabledAt = args.status === "enabled" ? timestamp : existing.enabledAt;
    const disabledAt = args.status === "disabled" ? timestamp : existing.disabledAt;
    run(
      this.runtimeDb.db.prepare(
        `update bpmn_pilots
         set pilot_status = ?, enabled_at = ?, disabled_at = ?, updated_at = ?
         where id = ?`
      ),
      [args.status, enabledAt ?? null, disabledAt ?? null, timestamp, args.pilotId]
    );
    const updated = this.getPilot(args.pilotId);
    if (updated) {
      this.insertPilotChangeLog({
        pilotId: args.pilotId,
        actionCode: `bpmn_pilot.${args.status}`,
        actorId: args.actorId,
        actorRoleId: args.actorRoleId,
        beforeJson: this.summaryForLog(existing),
        afterJson: this.summaryForLog(updated)
      });
    }
    return updated;
  }

  updatePilotScope(args: UpdateBpmnPilotScopeArgs) {
    this.assertAvailable();
    const existing = this.getPilot(args.pilotId);
    if (!existing) return undefined;
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `update bpmn_pilots
         set scope_json = ?, updated_at = ?
         where id = ?`
      ),
      [JSON.stringify(normalizeScope(args.scope)), timestamp, args.pilotId]
    );
    const updated = this.getPilot(args.pilotId);
    if (updated) {
      this.insertPilotChangeLog({
        pilotId: args.pilotId,
        actionCode: "bpmn_pilot.scope_updated",
        actorId: args.actorId,
        actorRoleId: args.actorRoleId,
        beforeJson: this.summaryForLog(existing),
        afterJson: this.summaryForLog(updated)
      });
    }
    return updated;
  }

  switchPilotDefinition(args: SwitchBpmnPilotDefinitionArgs) {
    this.assertAvailable();
    const existing = this.getPilot(args.pilotId);
    if (!existing) return undefined;
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `update bpmn_pilots
         set definition_id = ?, previous_definition_id = ?, last_rollback_reason = null, updated_at = ?
         where id = ?`
      ),
      [args.definitionId, existing.definitionId, timestamp, args.pilotId]
    );
    const updated = this.getPilot(args.pilotId);
    if (updated) {
      this.insertPilotChangeLog({
        pilotId: args.pilotId,
        actionCode: "bpmn_pilot.definition_switched",
        actorId: args.actorId,
        actorRoleId: args.actorRoleId,
        beforeJson: this.summaryForLog(existing),
        afterJson: { ...this.summaryForLog(updated), reason: sanitizeReason(args.reason) }
      });
    }
    return updated;
  }

  rollbackPilot(args: RollbackBpmnPilotArgs) {
    this.assertAvailable();
    const existing = this.getPilot(args.pilotId);
    if (!existing) return undefined;
    const timestamp = now();
    const targetDefinitionId = args.targetDefinitionId ?? existing.previousDefinitionId;
    const nextStatus: BpmnPilotStatus = targetDefinitionId ? "enabled" : "disabled";
    run(
      this.runtimeDb.db.prepare(
        `update bpmn_pilots
         set definition_id = ?, previous_definition_id = ?, pilot_status = ?, enabled_at = ?, disabled_at = ?,
             last_rollback_reason = ?, updated_at = ?
         where id = ?`
      ),
      [
        targetDefinitionId ?? existing.definitionId,
        targetDefinitionId ? existing.definitionId : existing.previousDefinitionId ?? null,
        nextStatus,
        nextStatus === "enabled" ? timestamp : existing.enabledAt ?? null,
        nextStatus === "disabled" ? timestamp : existing.disabledAt ?? null,
        sanitizeReason(args.reason) ?? null,
        timestamp,
        args.pilotId
      ]
    );
    const updated = this.getPilot(args.pilotId);
    if (updated) {
      this.insertPilotChangeLog({
        pilotId: args.pilotId,
        actionCode: targetDefinitionId ? "bpmn_pilot.rollback" : "bpmn_pilot.rollback_to_r8_process_layer",
        actorId: args.actorId,
        actorRoleId: args.actorRoleId,
        beforeJson: this.summaryForLog(existing),
        afterJson: this.summaryForLog(updated)
      });
    }
    return updated;
  }

  recordPilotRun(args: RecordBpmnPilotRunArgs) {
    this.assertAvailable();
    const createdAt = now();
    const runRecord: BpmnPilotRunRecord = {
      id: `bpmn-pilot-run:${args.pilotId}:${args.eventCode}:${randomSuffix()}`,
      pilotId: args.pilotId,
      definitionId: args.definitionId,
      internalEventId: args.internalEventId,
      eventCode: args.eventCode,
      businessType: args.businessType,
      businessId: args.businessId,
      businessRef: bpmnPilotBusinessRef(args.businessType, args.businessId),
      orgId: args.orgId,
      status: args.status,
      stoppedReason: args.stoppedReason,
      predictedNodeKey: args.predictedNodeKey,
      consumedEvents: args.consumedEvents,
      pathJson: args.pathJson,
      fallbackTo: args.fallbackTo ?? "r8_process_layer",
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      createdAt
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into bpmn_pilot_runs (
          id, pilot_id, definition_id, internal_event_id, event_code, business_type,
          business_id, business_ref, org_id, run_status, stopped_reason, predicted_node_key,
          consumed_events, path_json, fallback_to, error_code, error_message, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        runRecord.id,
        runRecord.pilotId,
        runRecord.definitionId,
        runRecord.internalEventId ?? null,
        runRecord.eventCode,
        runRecord.businessType,
        runRecord.businessId,
        runRecord.businessRef,
        runRecord.orgId ?? null,
        runRecord.status,
        runRecord.stoppedReason,
        runRecord.predictedNodeKey ?? null,
        runRecord.consumedEvents,
        JSON.stringify(runRecord.pathJson),
        runRecord.fallbackTo,
        runRecord.errorCode ?? null,
        runRecord.errorMessage ?? null,
        runRecord.createdAt
      ]
    );
    return runRecord;
  }

  getPilot(pilotId: string) {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from bpmn_pilots where id = ?").get(pilotId) as Row | undefined;
    return row ? this.pilotFromRow(row) : undefined;
  }

  listPilots() {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from bpmn_pilots order by updated_at desc").all() as Row[];
    return rows.map((row) => this.pilotFromRow(row));
  }

  listEnabledPilots() {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from bpmn_pilots where pilot_status = 'enabled' order by updated_at desc").all() as Row[];
    return rows.map((row) => this.pilotFromRow(row));
  }

  listRuns(filter: { pilotId?: string; businessType?: ProcessBusinessType; businessId?: string } = {}) {
    if (!this.available) return [];
    const rows = this.runtimeDb.db
      .prepare(
        `select * from bpmn_pilot_runs
         where (? is null or pilot_id = ?)
           and (? is null or business_type = ?)
           and (? is null or business_id = ?)
         order by created_at asc`
      )
      .all(
        filter.pilotId ?? null,
        filter.pilotId ?? null,
        filter.businessType ?? null,
        filter.businessType ?? null,
        filter.businessId ?? null,
        filter.businessId ?? null
      ) as Row[];
    return rows.map((row) => this.runFromRow(row));
  }

  listChangeLogs(pilotId?: string) {
    if (!this.available) return [];
    const rows =
      pilotId === undefined
        ? (this.runtimeDb.db.prepare("select * from bpmn_pilot_change_logs order by created_at desc").all() as Row[])
        : (this.runtimeDb.db.prepare("select * from bpmn_pilot_change_logs where pilot_id = ? order by created_at desc").all(pilotId) as Row[]);
    return rows.map((row) => ({
      id: String(row.id),
      pilotId: String(row.pilot_id),
      actionCode: String(row.action_code),
      actorRoleId: optionalString(row.actor_role_id) as RoleId | undefined,
      beforeJson: json<Record<string, unknown>>(row.before_json, {}),
      afterJson: json<Record<string, unknown>>(row.after_json, {}),
      createdAt: String(row.created_at)
    }));
  }

  private insertPilotChangeLog(args: { pilotId: string; actionCode: string; actorId?: string; actorRoleId?: RoleId; beforeJson: Record<string, unknown>; afterJson: Record<string, unknown> }) {
    run(
      this.runtimeDb.db.prepare(
        `insert into bpmn_pilot_change_logs (
          id, pilot_id, action_code, actor_id, actor_role_id, before_json, after_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        `bpmn-pilot-log:${args.pilotId}:${args.actionCode}:${randomSuffix()}`,
        args.pilotId,
        args.actionCode,
        args.actorId ?? null,
        args.actorRoleId ?? null,
        JSON.stringify(args.beforeJson),
        JSON.stringify(args.afterJson),
        now()
      ]
    );
  }

  private summaryForLog(pilot: BpmnPilotRecord) {
    return {
      id: pilot.id,
      definitionId: pilot.definitionId,
      pilotName: pilot.pilotName,
      businessType: pilot.businessType,
      status: pilot.status,
      mode: pilot.mode,
      scopeOrgIds: pilot.scope.orgIds,
      scopeBusinessIdCount: pilot.scope.businessIds.length,
      scopeEnvironments: pilot.scope.environments,
      fallbackTo: pilot.fallbackTo,
      previousDefinitionId: pilot.previousDefinitionId,
      lastRollbackReason: pilot.lastRollbackReason
    };
  }

  private assertAvailable() {
    if (!this.available) {
      throw new Error(`BPMN pilot repository is unavailable: ${this.initializationError ?? "initialization failed"}`);
    }
  }

  private migrate() {
    this.runtimeDb.db.exec(`
      create table if not exists bpmn_pilots (
        id text primary key,
        definition_id text not null,
        pilot_name text not null,
        business_type text not null,
        pilot_status text not null,
        pilot_mode text not null,
        scope_json text not null default '{"orgIds":[],"businessIds":[]}',
        fallback_to text not null,
        previous_definition_id text null,
        last_rollback_reason text null,
        created_by text not null,
        created_at text not null,
        updated_at text not null,
        enabled_at text null,
        disabled_at text null
      );

      create table if not exists bpmn_pilot_runs (
        id text primary key,
        pilot_id text not null,
        definition_id text not null,
        internal_event_id text null,
        event_code text not null,
        business_type text not null,
        business_id text not null,
        business_ref text not null,
        org_id text null,
        run_status text not null,
        stopped_reason text not null,
        predicted_node_key text null,
        consumed_events integer not null,
        path_json text not null default '[]',
        fallback_to text not null,
        error_code text null,
        error_message text null,
        created_at text not null
      );

      create table if not exists bpmn_pilot_change_logs (
        id text primary key,
        pilot_id text not null,
        action_code text not null,
        actor_id text null,
        actor_role_id text null,
        before_json text not null default '{}',
        after_json text not null default '{}',
        created_at text not null
      );

      create index if not exists idx_bpmn_pilots_definition on bpmn_pilots(definition_id, pilot_status);
      create index if not exists idx_bpmn_pilots_business on bpmn_pilots(business_type, pilot_status);
      create index if not exists idx_bpmn_pilot_runs_pilot on bpmn_pilot_runs(pilot_id, created_at);
      create index if not exists idx_bpmn_pilot_runs_business on bpmn_pilot_runs(business_type, business_id, created_at);
      create index if not exists idx_bpmn_pilot_change_logs_pilot on bpmn_pilot_change_logs(pilot_id, created_at);
    `);
    this.addColumnIfMissing("bpmn_pilots", "previous_definition_id", "text null");
    this.addColumnIfMissing("bpmn_pilots", "last_rollback_reason", "text null");
  }

  private addColumnIfMissing(tableName: string, columnName: string, definition: string) {
    const columns = this.runtimeDb.db.prepare(`pragma table_info(${tableName})`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === columnName)) {
      this.runtimeDb.db.exec(`alter table ${tableName} add column ${columnName} ${definition};`);
    }
  }

  private pilotFromRow(row: Row): BpmnPilotRecord {
    return {
      id: String(row.id),
      definitionId: String(row.definition_id),
      pilotName: String(row.pilot_name),
      businessType: String(row.business_type) as ProcessBusinessType,
      status: String(row.pilot_status) as BpmnPilotStatus,
      mode: String(row.pilot_mode) as BpmnPilotMode,
      scope: normalizeScope(json<BpmnPilotScope>(row.scope_json, { orgIds: [], businessIds: [], environments: [] })),
      fallbackTo: "r8_process_layer",
      previousDefinitionId: optionalString(row.previous_definition_id),
      lastRollbackReason: optionalString(row.last_rollback_reason),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      enabledAt: optionalString(row.enabled_at),
      disabledAt: optionalString(row.disabled_at)
    };
  }

  private runFromRow(row: Row): BpmnPilotRunRecord {
    return {
      id: String(row.id),
      pilotId: String(row.pilot_id),
      definitionId: String(row.definition_id),
      internalEventId: optionalString(row.internal_event_id),
      eventCode: String(row.event_code),
      businessType: String(row.business_type) as ProcessBusinessType,
      businessId: String(row.business_id),
      businessRef: String(row.business_ref),
      orgId: optionalString(row.org_id),
      status: String(row.run_status) as BpmnPilotRunStatus,
      stoppedReason: String(row.stopped_reason),
      predictedNodeKey: optionalString(row.predicted_node_key),
      consumedEvents: Number(row.consumed_events),
      pathJson: json<Array<{ nodeKey: string; nodeName: string; nodeType: string }>>(row.path_json, []),
      fallbackTo: "r8_process_layer",
      errorCode: optionalString(row.error_code),
      errorMessage: optionalString(row.error_message),
      createdAt: String(row.created_at)
    };
  }
}

function normalizeScope(scope: BpmnPilotScope): BpmnPilotScope {
  return {
    orgIds: uniqueStrings(scope.orgIds),
    businessIds: uniqueStrings(scope.businessIds),
    environments: uniqueStrings(scope.environments)
  };
}

function uniqueStrings(values: unknown) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
}

function sanitizeReason(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 200) : undefined;
}
