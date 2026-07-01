import crypto from "node:crypto";
import type { RuntimeDb } from "../runtime/index.js";
import type { ProcessBusinessType } from "./process-repository.js";
import type { RoleId } from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export type BpmnDefinitionStatus = "draft" | "enabled" | "disabled";
export type BpmnValidationStatus = "pending" | "valid" | "invalid";

export interface BpmnDefinitionRecord {
  id: string;
  processCode: string;
  processName: string;
  versionNo: number;
  status: BpmnDefinitionStatus;
  businessType: ProcessBusinessType;
  bpmnXml: string;
  validationStatus: BpmnValidationStatus;
  validationErrors: BpmnValidationIssue[];
  processPreview: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  enabledAt?: string;
  disabledAt?: string;
}

export interface BpmnValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  flowId?: string;
}

export interface BpmnDefinitionChangeLog {
  id: string;
  definitionId: string;
  actionCode: string;
  actorId?: string;
  actorRoleId?: RoleId;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
  createdAt: string;
}

export interface CreateBpmnDefinitionArgs {
  processCode: string;
  processName: string;
  versionNo?: number;
  status?: BpmnDefinitionStatus;
  businessType: ProcessBusinessType;
  bpmnXml: string;
  createdBy: string;
  actorRoleId?: RoleId;
}

export interface UpdateBpmnValidationArgs {
  definitionId: string;
  validationStatus: BpmnValidationStatus;
  validationErrors: BpmnValidationIssue[];
  processPreview: Record<string, unknown>;
  actorId: string;
  actorRoleId?: RoleId;
}

export interface SetBpmnDefinitionStatusArgs {
  definitionId: string;
  status: BpmnDefinitionStatus;
  actorId: string;
  actorRoleId?: RoleId;
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

export function bpmnXmlDigest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export class BpmnDefinitionRepository {
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

  createDefinition(args: CreateBpmnDefinitionArgs): BpmnDefinitionRecord {
    this.assertAvailable();
    const timestamp = now();
    const versionNo = args.versionNo ?? this.nextVersion(args.processCode);
    const definition: BpmnDefinitionRecord = {
      id: `bpmn:${args.processCode}:v${versionNo}:${randomSuffix()}`,
      processCode: args.processCode,
      processName: args.processName,
      versionNo,
      status: args.status ?? "draft",
      businessType: args.businessType,
      bpmnXml: args.bpmnXml,
      validationStatus: "pending",
      validationErrors: [],
      processPreview: {},
      createdBy: args.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into bpmn_definitions (
          id, process_code, process_name, version_no, status, business_type, bpmn_xml,
          validation_status, validation_errors_json, process_preview_json, created_by,
          created_at, updated_at, validated_at, enabled_at, disabled_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        definition.id,
        definition.processCode,
        definition.processName,
        definition.versionNo,
        definition.status,
        definition.businessType,
        definition.bpmnXml,
        definition.validationStatus,
        JSON.stringify(definition.validationErrors),
        JSON.stringify(definition.processPreview),
        definition.createdBy,
        definition.createdAt,
        definition.updatedAt,
        null,
        null,
        null
      ]
    );
    this.insertChangeLog({
      definitionId: definition.id,
      actionCode: "bpmn_definition.created",
      actorId: args.createdBy,
      actorRoleId: args.actorRoleId,
      beforeJson: {},
      afterJson: this.summaryForLog(definition)
    });
    return definition;
  }

  updateValidation(args: UpdateBpmnValidationArgs) {
    this.assertAvailable();
    const existing = this.getDefinition(args.definitionId);
    if (!existing) return undefined;
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `update bpmn_definitions
         set validation_status = ?, validation_errors_json = ?, process_preview_json = ?, validated_at = ?, updated_at = ?
         where id = ?`
      ),
      [args.validationStatus, JSON.stringify(args.validationErrors), JSON.stringify(args.processPreview), timestamp, timestamp, args.definitionId]
    );
    const updated = this.getDefinition(args.definitionId);
    if (updated) {
      this.insertChangeLog({
        definitionId: args.definitionId,
        actionCode: args.validationStatus === "valid" ? "bpmn_definition.validated" : "bpmn_definition.validation_failed",
        actorId: args.actorId,
        actorRoleId: args.actorRoleId,
        beforeJson: this.summaryForLog(existing),
        afterJson: this.summaryForLog(updated)
      });
    }
    return updated;
  }

  setStatus(args: SetBpmnDefinitionStatusArgs) {
    this.assertAvailable();
    const existing = this.getDefinition(args.definitionId);
    if (!existing) return undefined;
    const timestamp = now();
    const enabledAt = args.status === "enabled" ? timestamp : existing.enabledAt;
    const disabledAt = args.status === "disabled" ? timestamp : existing.disabledAt;
    run(
      this.runtimeDb.db.prepare(
        `update bpmn_definitions
         set status = ?, enabled_at = ?, disabled_at = ?, updated_at = ?
         where id = ?`
      ),
      [args.status, enabledAt ?? null, disabledAt ?? null, timestamp, args.definitionId]
    );
    const updated = this.getDefinition(args.definitionId);
    if (updated) {
      this.insertChangeLog({
        definitionId: args.definitionId,
        actionCode: `bpmn_definition.${args.status}`,
        actorId: args.actorId,
        actorRoleId: args.actorRoleId,
        beforeJson: this.summaryForLog(existing),
        afterJson: this.summaryForLog(updated)
      });
    }
    return updated;
  }

  getDefinition(definitionId: string) {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from bpmn_definitions where id = ?").get(definitionId) as Row | undefined;
    return row ? this.definitionFromRow(row) : undefined;
  }

  listDefinitions() {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from bpmn_definitions order by updated_at desc").all() as Row[];
    return rows.map((row) => this.definitionFromRow(row));
  }

  listEnabledDefinitions() {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from bpmn_definitions where status = 'enabled' order by updated_at desc").all() as Row[];
    return rows.map((row) => this.definitionFromRow(row));
  }

  listChangeLogs(definitionId?: string) {
    if (!this.available) return [];
    const rows =
      definitionId === undefined
        ? (this.runtimeDb.db.prepare("select * from bpmn_definition_change_logs order by created_at desc").all() as Row[])
        : (this.runtimeDb.db.prepare("select * from bpmn_definition_change_logs where definition_id = ? order by created_at desc").all(definitionId) as Row[]);
    return rows.map((row) => this.changeLogFromRow(row));
  }

  private insertChangeLog(args: Omit<BpmnDefinitionChangeLog, "id" | "createdAt">) {
    const createdAt = now();
    run(
      this.runtimeDb.db.prepare(
        `insert into bpmn_definition_change_logs (
          id, definition_id, action_code, actor_id, actor_role_id, before_json, after_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        `bpmn-log:${args.definitionId}:${args.actionCode}:${randomSuffix()}`,
        args.definitionId,
        args.actionCode,
        args.actorId ?? null,
        args.actorRoleId ?? null,
        JSON.stringify(args.beforeJson),
        JSON.stringify(args.afterJson),
        createdAt
      ]
    );
  }

  private nextVersion(processCode: string) {
    const row = this.runtimeDb.db.prepare("select max(version_no) as max_version from bpmn_definitions where process_code = ?").get(processCode) as { max_version?: number | null } | undefined;
    return Number(row?.max_version ?? 0) + 1;
  }

  private summaryForLog(definition: BpmnDefinitionRecord) {
    return {
      id: definition.id,
      processCode: definition.processCode,
      processName: definition.processName,
      versionNo: definition.versionNo,
      status: definition.status,
      businessType: definition.businessType,
      validationStatus: definition.validationStatus,
      validationErrorCount: definition.validationErrors.length,
      xmlSha256: bpmnXmlDigest(definition.bpmnXml)
    };
  }

  private assertAvailable() {
    if (!this.available) {
      throw new Error(`BPMN definition repository is unavailable: ${this.initializationError ?? "initialization failed"}`);
    }
  }

  private migrate() {
    this.runtimeDb.db.exec(`
      create table if not exists bpmn_definitions (
        id text primary key,
        process_code text not null,
        process_name text not null,
        version_no integer not null,
        status text not null,
        business_type text not null,
        bpmn_xml text not null,
        validation_status text not null,
        validation_errors_json text not null default '[]',
        process_preview_json text not null default '{}',
        created_by text not null,
        created_at text not null,
        updated_at text not null,
        validated_at text null,
        enabled_at text null,
        disabled_at text null,
        unique(process_code, version_no)
      );

      create table if not exists bpmn_definition_change_logs (
        id text primary key,
        definition_id text not null,
        action_code text not null,
        actor_id text null,
        actor_role_id text null,
        before_json text not null default '{}',
        after_json text not null default '{}',
        created_at text not null
      );

      create index if not exists idx_bpmn_definitions_business on bpmn_definitions(business_type, status);
      create index if not exists idx_bpmn_change_logs_definition on bpmn_definition_change_logs(definition_id, created_at);
    `);
  }

  private definitionFromRow(row: Row): BpmnDefinitionRecord {
    return {
      id: String(row.id),
      processCode: String(row.process_code),
      processName: String(row.process_name),
      versionNo: Number(row.version_no),
      status: String(row.status) as BpmnDefinitionStatus,
      businessType: String(row.business_type) as ProcessBusinessType,
      bpmnXml: String(row.bpmn_xml),
      validationStatus: String(row.validation_status) as BpmnValidationStatus,
      validationErrors: json<BpmnValidationIssue[]>(row.validation_errors_json, []),
      processPreview: json<Record<string, unknown>>(row.process_preview_json, {}),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      validatedAt: optionalString(row.validated_at),
      enabledAt: optionalString(row.enabled_at),
      disabledAt: optionalString(row.disabled_at)
    };
  }

  private changeLogFromRow(row: Row): BpmnDefinitionChangeLog {
    return {
      id: String(row.id),
      definitionId: String(row.definition_id),
      actionCode: String(row.action_code),
      actorId: optionalString(row.actor_id),
      actorRoleId: optionalString(row.actor_role_id) as RoleId | undefined,
      beforeJson: json<Record<string, unknown>>(row.before_json, {}),
      afterJson: json<Record<string, unknown>>(row.after_json, {}),
      createdAt: String(row.created_at)
    };
  }
}
