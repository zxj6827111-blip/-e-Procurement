import type { RuntimeDb } from "../runtime/index.js";
import type { RoleId } from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export type InternalEventStatus = "recorded" | "handled" | "failed";
export type InternalEventHandlerStatus = "succeeded" | "failed" | "skipped";

export interface InternalBusinessEvent {
  id: string;
  eventCode: string;
  businessType: string;
  businessId: string;
  businessTitle?: string;
  processInstanceId?: string;
  actorId?: string;
  actorRoleId?: RoleId;
  orgId?: string;
  supplierId?: string;
  projectId?: string;
  eventTime: string;
  payloadJson: Record<string, unknown>;
  idempotencyKey: string;
  status: InternalEventStatus;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InternalEventHandlerLog {
  id: string;
  eventId: string;
  handlerName: string;
  attemptNo: number;
  status: InternalEventHandlerStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface RecordInternalBusinessEventArgs {
  eventCode: string;
  businessType: string;
  businessId: string;
  businessTitle?: string;
  processInstanceId?: string;
  actorId?: string;
  actorRoleId?: RoleId;
  orgId?: string;
  supplierId?: string;
  projectId?: string;
  eventTime?: string;
  payloadJson?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface RecordHandlerLogArgs {
  eventId: string;
  handlerName: string;
  status: InternalEventHandlerStatus;
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

export class InternalBusinessEventRepository {
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

  recordEvent(args: RecordInternalBusinessEventArgs): { event: InternalBusinessEvent; inserted: boolean } {
    this.assertAvailable();
    const existing = this.getEventByIdempotencyKey(args.idempotencyKey);
    if (existing) return { event: existing, inserted: false };
    const timestamp = now();
    const event: InternalBusinessEvent = {
      id: `ibe:${args.eventCode}:${randomSuffix()}`,
      eventCode: args.eventCode,
      businessType: args.businessType,
      businessId: args.businessId,
      businessTitle: args.businessTitle,
      processInstanceId: args.processInstanceId,
      actorId: args.actorId,
      actorRoleId: args.actorRoleId,
      orgId: args.orgId,
      supplierId: args.supplierId,
      projectId: args.projectId,
      eventTime: args.eventTime ?? timestamp,
      payloadJson: args.payloadJson ?? {},
      idempotencyKey: args.idempotencyKey,
      status: "recorded",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into internal_business_events (
          id, event_code, business_type, business_id, business_title, process_instance_id,
          actor_id, actor_role_id, org_id, supplier_id, project_id, event_time,
          payload_json, idempotency_key, event_status, last_error_message, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        event.id,
        event.eventCode,
        event.businessType,
        event.businessId,
        event.businessTitle ?? null,
        event.processInstanceId ?? null,
        event.actorId ?? null,
        event.actorRoleId ?? null,
        event.orgId ?? null,
        event.supplierId ?? null,
        event.projectId ?? null,
        event.eventTime,
        JSON.stringify(event.payloadJson),
        event.idempotencyKey,
        event.status,
        null,
        event.createdAt,
        event.updatedAt
      ]
    );
    return { event: this.getEvent(event.id)!, inserted: true };
  }

  markEventStatus(eventId: string, status: InternalEventStatus, lastErrorMessage?: string) {
    this.assertAvailable();
    run(
      this.runtimeDb.db.prepare("update internal_business_events set event_status = ?, last_error_message = ?, updated_at = ? where id = ?"),
      [status, lastErrorMessage ?? null, now(), eventId]
    );
    return this.getEvent(eventId);
  }

  recordHandlerLog(args: RecordHandlerLogArgs): InternalEventHandlerLog {
    this.assertAvailable();
    const timestamp = now();
    const attemptNo = this.nextAttemptNo(args.eventId, args.handlerName);
    const log: InternalEventHandlerLog = {
      id: `ibehl:${args.eventId}:${args.handlerName}:${attemptNo}:${randomSuffix()}`,
      eventId: args.eventId,
      handlerName: args.handlerName,
      attemptNo,
      status: args.status,
      errorMessage: args.errorMessage,
      createdAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into internal_event_handler_logs (
          id, event_id, handler_name, attempt_no, handler_status, error_message, created_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      ),
      [log.id, log.eventId, log.handlerName, log.attemptNo, log.status, log.errorMessage ?? null, log.createdAt]
    );
    return log;
  }

  getEvent(eventId: string): InternalBusinessEvent | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from internal_business_events where id = ?").get(eventId) as Row | undefined;
    return row ? this.eventFromRow(row) : undefined;
  }

  getEventByIdempotencyKey(idempotencyKey: string): InternalBusinessEvent | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from internal_business_events where idempotency_key = ?").get(idempotencyKey) as Row | undefined;
    return row ? this.eventFromRow(row) : undefined;
  }

  listEvents(filter: { eventCode?: string; businessType?: string; businessId?: string; status?: InternalEventStatus } = {}) {
    if (!this.available) return [];
    const rows = this.runtimeDb.db
      .prepare(
        `select * from internal_business_events
         where (? is null or event_code = ?)
           and (? is null or business_type = ?)
           and (? is null or business_id = ?)
           and (? is null or event_status = ?)
         order by event_time asc, created_at asc`
      )
      .all(
        filter.eventCode ?? null,
        filter.eventCode ?? null,
        filter.businessType ?? null,
        filter.businessType ?? null,
        filter.businessId ?? null,
        filter.businessId ?? null,
        filter.status ?? null,
        filter.status ?? null
      ) as Row[];
    return rows.map((row) => this.eventFromRow(row));
  }

  listHandlerLogs(filter: { eventId?: string; handlerName?: string; status?: InternalEventHandlerStatus } = {}) {
    if (!this.available) return [];
    const rows = this.runtimeDb.db
      .prepare(
        `select * from internal_event_handler_logs
         where (? is null or event_id = ?)
           and (? is null or handler_name = ?)
           and (? is null or handler_status = ?)
         order by created_at asc, attempt_no asc`
      )
      .all(
        filter.eventId ?? null,
        filter.eventId ?? null,
        filter.handlerName ?? null,
        filter.handlerName ?? null,
        filter.status ?? null,
        filter.status ?? null
      ) as Row[];
    return rows.map((row) => this.handlerLogFromRow(row));
  }

  hasSuccessfulHandlerLog(eventId: string, handlerName: string) {
    if (!this.available) return false;
    const row = this.runtimeDb.db
      .prepare("select id from internal_event_handler_logs where event_id = ? and handler_name = ? and handler_status = 'succeeded' limit 1")
      .get(eventId, handlerName) as Row | undefined;
    return Boolean(row);
  }

  private nextAttemptNo(eventId: string, handlerName: string) {
    const row = this.runtimeDb.db
      .prepare("select coalesce(max(attempt_no), 0) as attempt_no from internal_event_handler_logs where event_id = ? and handler_name = ?")
      .get(eventId, handlerName) as Row | undefined;
    return Number(row?.attempt_no ?? 0) + 1;
  }

  private assertAvailable() {
    if (!this.available) {
      throw new Error(`Internal event repository is unavailable: ${this.initializationError ?? "initialization failed"}`);
    }
  }

  private migrate() {
    this.runtimeDb.db.exec(`
      create table if not exists internal_business_events (
        id text primary key,
        event_code text not null,
        business_type text not null,
        business_id text not null,
        business_title text null,
        process_instance_id text null,
        actor_id text null,
        actor_role_id text null,
        org_id text null,
        supplier_id text null,
        project_id text null,
        event_time text not null,
        payload_json text not null default '{}',
        idempotency_key text not null unique,
        event_status text not null,
        last_error_message text null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists internal_event_handler_logs (
        id text primary key,
        event_id text not null,
        handler_name text not null,
        attempt_no integer not null,
        handler_status text not null,
        error_message text null,
        created_at text not null
      );

      create index if not exists idx_internal_business_events_business on internal_business_events(business_type, business_id);
      create index if not exists idx_internal_business_events_status on internal_business_events(event_status, event_time);
      create index if not exists idx_internal_business_events_process on internal_business_events(process_instance_id);
      create index if not exists idx_internal_event_handler_logs_event on internal_event_handler_logs(event_id, handler_name, handler_status);
    `);
  }

  private eventFromRow(row: Row): InternalBusinessEvent {
    return {
      id: String(row.id),
      eventCode: String(row.event_code),
      businessType: String(row.business_type),
      businessId: String(row.business_id),
      businessTitle: optionalString(row.business_title),
      processInstanceId: optionalString(row.process_instance_id),
      actorId: optionalString(row.actor_id),
      actorRoleId: optionalString(row.actor_role_id) as RoleId | undefined,
      orgId: optionalString(row.org_id),
      supplierId: optionalString(row.supplier_id),
      projectId: optionalString(row.project_id),
      eventTime: String(row.event_time),
      payloadJson: json<Record<string, unknown>>(row.payload_json, {}),
      idempotencyKey: String(row.idempotency_key),
      status: String(row.event_status) as InternalEventStatus,
      lastErrorMessage: optionalString(row.last_error_message),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private handlerLogFromRow(row: Row): InternalEventHandlerLog {
    return {
      id: String(row.id),
      eventId: String(row.event_id),
      handlerName: String(row.handler_name),
      attemptNo: Number(row.attempt_no),
      status: String(row.handler_status) as InternalEventHandlerStatus,
      errorMessage: optionalString(row.error_message),
      createdAt: String(row.created_at)
    };
  }
}
