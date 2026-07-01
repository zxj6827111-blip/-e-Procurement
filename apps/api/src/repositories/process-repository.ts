import type { RuntimeDb } from "../runtime/index.js";
import type { ApprovalBusinessType, RoleId, User } from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export type ProcessStatus = "draft" | "running" | "waiting" | "completed" | "rejected" | "cancelled" | "failed";
export type ProcessTaskStatus = "pending" | "completed" | "cancelled" | "expired";
export type SourcingBusinessType = "sourcing" | "rfq" | "tender" | "direct_purchase";
export type ReviewAwardBusinessType = "review_award" | "contract_preparation";
export type FulfillmentBusinessType = "order_fulfillment" | "settlement" | "invoice" | "payment" | "archive";
export type ProcessBusinessType = ApprovalBusinessType | "supplier_onboarding" | SourcingBusinessType | ReviewAwardBusinessType | FulfillmentBusinessType;
export type ProcessSourceEngine = "r8_workflow" | "process_layer";

export interface ProcessDefinition {
  id: string;
  processCode: ProcessBusinessType;
  processName: string;
  processType: ProcessBusinessType;
  versionNo: number;
  status: "enabled" | "disabled";
  enabledFrom?: string;
  enabledTo?: string;
  sourceType: "r8_shadow" | "process_layer";
  sourceJson: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessInstance {
  id: string;
  processDefinitionId: string;
  processCode: ProcessBusinessType;
  businessType: ProcessBusinessType;
  businessId: string;
  businessTitle: string;
  currentNodeKey: string;
  status: ProcessStatus;
  startedBy?: string;
  startedAt?: string;
  completedBy?: string;
  completedAt?: string;
  orgId?: string;
  supplierId?: string;
  projectId?: string;
  sourceEngine: ProcessSourceEngine;
  sourceInstanceId: string;
  sourceJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessTaskInstance {
  id: string;
  processInstanceId: string;
  nodeKey: string;
  taskType: string;
  businessType: ProcessBusinessType;
  businessId: string;
  title: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  supplierId?: string;
  orgId?: string;
  projectId?: string;
  status: ProcessTaskStatus;
  dueAt?: string;
  completedBy?: string;
  completedAt?: string;
  sourceEngine: ProcessSourceEngine;
  sourceTaskId: string;
  sourceJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessEvent {
  id: string;
  processInstanceId: string;
  eventCode: string;
  eventName: string;
  businessType: ProcessBusinessType;
  businessId: string;
  actorId?: string;
  actorRoleId?: RoleId;
  fromNodeKey?: string;
  toNodeKey?: string;
  fromStatus?: string;
  toStatus?: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface UpsertProcessInstanceArgs {
  id?: string;
  processDefinitionId: string;
  processCode: ProcessBusinessType;
  businessType: ProcessBusinessType;
  businessId: string;
  businessTitle: string;
  currentNodeKey: string;
  status: ProcessStatus;
  startedBy?: string;
  startedAt?: string;
  completedBy?: string;
  completedAt?: string;
  orgId?: string;
  supplierId?: string;
  projectId?: string;
  sourceEngine: ProcessSourceEngine;
  sourceInstanceId: string;
  sourceJson?: Record<string, unknown>;
}

export interface UpsertProcessTaskArgs {
  processInstanceId: string;
  nodeKey: string;
  taskType: string;
  businessType: ProcessBusinessType;
  businessId: string;
  title: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  supplierId?: string;
  orgId?: string;
  projectId?: string;
  status: ProcessTaskStatus;
  dueAt?: string;
  completedBy?: string;
  completedAt?: string;
  sourceEngine: ProcessSourceEngine;
  sourceTaskId: string;
  sourceJson?: Record<string, unknown>;
  createdAt?: string;
}

export interface InsertProcessEventArgs {
  processInstanceId: string;
  eventCode: string;
  eventName: string;
  businessType: ProcessBusinessType;
  businessId: string;
  actorId?: string;
  actorRoleId?: RoleId;
  fromNodeKey?: string;
  toNodeKey?: string;
  fromStatus?: string;
  toStatus?: string;
  payloadJson?: Record<string, unknown>;
}

export interface ProcessReadableScope {
  user: User;
  roleId: RoleId;
}

const r8MirrorBusinessTypes = new Set<ApprovalBusinessType>(["procurement_request", "procurement_document", "award_approval"]);
const processBusinessTypes = new Set<ProcessBusinessType>([
  "procurement_request",
  "procurement_document",
  "award_approval",
  "supplier_onboarding",
  "sourcing",
  "rfq",
  "tender",
  "direct_purchase",
  "review_award",
  "contract_preparation",
  "order_fulfillment",
  "settlement",
  "invoice",
  "payment",
  "archive"
]);

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

export function isM1ProcessBusinessType(value: string): value is ApprovalBusinessType {
  return r8MirrorBusinessTypes.has(value as ApprovalBusinessType);
}

export function isProcessBusinessType(value: string): value is ProcessBusinessType {
  return processBusinessTypes.has(value as ProcessBusinessType);
}

export class ProcessRepository {
  private available = false;
  private initializationError?: string;

  constructor(private readonly runtimeDb: RuntimeDb) {
    try {
      this.migrate();
      this.ensureM1Definitions();
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

  getDefinition(processCode: ProcessBusinessType) {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from process_definitions where process_code = ? and status = 'enabled' order by version_no desc limit 1").get(processCode) as Row | undefined;
    return row ? this.definitionFromRow(row) : undefined;
  }

  upsertProcessInstance(args: UpsertProcessInstanceArgs): ProcessInstance {
    this.assertAvailable();
    const timestamp = now();
    const existing = this.getProcessInstanceBySource(args.sourceEngine, args.sourceInstanceId) ?? (args.id ? this.getProcessInstance(args.id) : undefined);
    const instance: ProcessInstance = {
      id: existing?.id ?? args.id ?? `pi:${args.sourceEngine}:${args.sourceInstanceId}`,
      processDefinitionId: args.processDefinitionId,
      processCode: args.processCode,
      businessType: args.businessType,
      businessId: args.businessId,
      businessTitle: args.businessTitle,
      currentNodeKey: args.currentNodeKey,
      status: args.status,
      startedBy: args.startedBy,
      startedAt: args.startedAt,
      completedBy: args.completedBy,
      completedAt: args.completedAt,
      orgId: args.orgId,
      supplierId: args.supplierId,
      projectId: args.projectId,
      sourceEngine: args.sourceEngine,
      sourceInstanceId: args.sourceInstanceId,
      sourceJson: args.sourceJson ?? {},
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into process_instances (
          id, process_definition_id, process_code, business_type, business_id, business_title,
          current_node_key, process_status, started_by, started_at, completed_by, completed_at,
          org_id, supplier_id, project_id, source_engine, source_instance_id, source_json,
          created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          process_definition_id = excluded.process_definition_id,
          process_code = excluded.process_code,
          business_type = excluded.business_type,
          business_id = excluded.business_id,
          business_title = excluded.business_title,
          current_node_key = excluded.current_node_key,
          process_status = excluded.process_status,
          started_by = excluded.started_by,
          started_at = excluded.started_at,
          completed_by = excluded.completed_by,
          completed_at = excluded.completed_at,
          org_id = excluded.org_id,
          supplier_id = excluded.supplier_id,
          project_id = excluded.project_id,
          source_engine = excluded.source_engine,
          source_instance_id = excluded.source_instance_id,
          source_json = excluded.source_json,
          updated_at = excluded.updated_at`
      ),
      [
        instance.id,
        instance.processDefinitionId,
        instance.processCode,
        instance.businessType,
        instance.businessId,
        instance.businessTitle,
        instance.currentNodeKey,
        instance.status,
        instance.startedBy ?? null,
        instance.startedAt ?? null,
        instance.completedBy ?? null,
        instance.completedAt ?? null,
        instance.orgId ?? null,
        instance.supplierId ?? null,
        instance.projectId ?? null,
        instance.sourceEngine,
        instance.sourceInstanceId,
        JSON.stringify(instance.sourceJson),
        instance.createdAt,
        instance.updatedAt
      ]
    );
    this.bindBusinessProcess(instance.businessType, instance.businessId, instance.id, "primary");
    return this.getProcessInstance(instance.id)!;
  }

  upsertProcessTask(args: UpsertProcessTaskArgs): ProcessTaskInstance {
    this.assertAvailable();
    const timestamp = now();
    const existing = this.getProcessTaskBySource(args.sourceEngine, args.sourceTaskId);
    const task: ProcessTaskInstance = {
      id: existing?.id ?? `pt:${args.sourceEngine}:${args.sourceTaskId}`,
      processInstanceId: args.processInstanceId,
      nodeKey: args.nodeKey,
      taskType: args.taskType,
      businessType: args.businessType,
      businessId: args.businessId,
      title: args.title,
      assigneeRoleId: args.assigneeRoleId,
      assigneeUserId: args.assigneeUserId,
      supplierId: args.supplierId,
      orgId: args.orgId,
      projectId: args.projectId,
      status: args.status,
      dueAt: args.dueAt,
      completedBy: args.completedBy,
      completedAt: args.completedAt,
      sourceEngine: args.sourceEngine,
      sourceTaskId: args.sourceTaskId,
      sourceJson: args.sourceJson ?? {},
      createdAt: existing?.createdAt ?? args.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into process_task_instances (
          id, process_instance_id, node_key, task_type, business_type, business_id,
          title, assignee_role_id, assignee_user_id, supplier_id, org_id, project_id,
          task_status, due_at, completed_by, completed_at, source_engine, source_task_id,
          source_json, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          process_instance_id = excluded.process_instance_id,
          node_key = excluded.node_key,
          task_type = excluded.task_type,
          business_type = excluded.business_type,
          business_id = excluded.business_id,
          title = excluded.title,
          assignee_role_id = excluded.assignee_role_id,
          assignee_user_id = excluded.assignee_user_id,
          supplier_id = excluded.supplier_id,
          org_id = excluded.org_id,
          project_id = excluded.project_id,
          task_status = excluded.task_status,
          due_at = excluded.due_at,
          completed_by = excluded.completed_by,
          completed_at = excluded.completed_at,
          source_engine = excluded.source_engine,
          source_task_id = excluded.source_task_id,
          source_json = excluded.source_json,
          updated_at = excluded.updated_at`
      ),
      [
        task.id,
        task.processInstanceId,
        task.nodeKey,
        task.taskType,
        task.businessType,
        task.businessId,
        task.title,
        task.assigneeRoleId ?? null,
        task.assigneeUserId ?? null,
        task.supplierId ?? null,
        task.orgId ?? null,
        task.projectId ?? null,
        task.status,
        task.dueAt ?? null,
        task.completedBy ?? null,
        task.completedAt ?? null,
        task.sourceEngine,
        task.sourceTaskId,
        JSON.stringify(task.sourceJson),
        task.createdAt,
        task.updatedAt
      ]
    );
    return this.getProcessTask(task.id)!;
  }

  completeProcessTask(sourceEngine: ProcessSourceEngine, sourceTaskId: string, actorId: string, status: ProcessTaskStatus = "completed") {
    this.assertAvailable();
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        "update process_task_instances set task_status = ?, completed_by = ?, completed_at = coalesce(completed_at, ?), updated_at = ? where source_engine = ? and source_task_id = ? and task_status = 'pending'"
      ),
      [status, actorId, timestamp, timestamp, sourceEngine, sourceTaskId]
    );
    return this.getProcessTaskBySource(sourceEngine, sourceTaskId);
  }

  insertProcessEvent(args: InsertProcessEventArgs): ProcessEvent {
    this.assertAvailable();
    const event: ProcessEvent = {
      id: `pe:${args.processInstanceId}:${args.eventCode}:${randomSuffix()}`,
      processInstanceId: args.processInstanceId,
      eventCode: args.eventCode,
      eventName: args.eventName,
      businessType: args.businessType,
      businessId: args.businessId,
      actorId: args.actorId,
      actorRoleId: args.actorRoleId,
      fromNodeKey: args.fromNodeKey,
      toNodeKey: args.toNodeKey,
      fromStatus: args.fromStatus,
      toStatus: args.toStatus,
      payloadJson: args.payloadJson ?? {},
      createdAt: now()
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into process_events (
          id, process_instance_id, event_code, event_name, business_type, business_id,
          actor_id, actor_role_id, from_node_key, to_node_key, from_status, to_status,
          payload_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        event.id,
        event.processInstanceId,
        event.eventCode,
        event.eventName,
        event.businessType,
        event.businessId,
        event.actorId ?? null,
        event.actorRoleId ?? null,
        event.fromNodeKey ?? null,
        event.toNodeKey ?? null,
        event.fromStatus ?? null,
        event.toStatus ?? null,
        JSON.stringify(event.payloadJson),
        event.createdAt
      ]
    );
    return event;
  }

  getProcessInstance(instanceId: string): ProcessInstance | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from process_instances where id = ?").get(instanceId) as Row | undefined;
    return row ? this.instanceFromRow(row) : undefined;
  }

  getProcessInstanceBySource(sourceEngine: ProcessSourceEngine, sourceInstanceId: string): ProcessInstance | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from process_instances where source_engine = ? and source_instance_id = ?").get(sourceEngine, sourceInstanceId) as Row | undefined;
    return row ? this.instanceFromRow(row) : undefined;
  }

  listProcessInstances(): ProcessInstance[] {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from process_instances order by updated_at desc").all() as Row[];
    return rows.map((row) => this.instanceFromRow(row));
  }

  listProcessInstancesByBusiness(businessType: ProcessBusinessType, businessId: string): ProcessInstance[] {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from process_instances where business_type = ? and business_id = ? order by updated_at desc").all(businessType, businessId) as Row[];
    return rows.map((row) => this.instanceFromRow(row));
  }

  getProcessTask(taskId: string): ProcessTaskInstance | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from process_task_instances where id = ?").get(taskId) as Row | undefined;
    return row ? this.taskFromRow(row) : undefined;
  }

  getProcessTaskBySource(sourceEngine: ProcessSourceEngine, sourceTaskId: string): ProcessTaskInstance | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db.prepare("select * from process_task_instances where source_engine = ? and source_task_id = ?").get(sourceEngine, sourceTaskId) as Row | undefined;
    return row ? this.taskFromRow(row) : undefined;
  }

  listProcessTasksByInstance(processInstanceId: string): ProcessTaskInstance[] {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from process_task_instances where process_instance_id = ? order by created_at desc, updated_at desc").all(processInstanceId) as Row[];
    return rows.map((row) => this.taskFromRow(row));
  }

  listProcessEventsByInstance(processInstanceId: string): ProcessEvent[] {
    if (!this.available) return [];
    const rows = this.runtimeDb.db.prepare("select * from process_events where process_instance_id = ? order by created_at asc").all(processInstanceId) as Row[];
    return rows.map((row) => this.eventFromRow(row));
  }

  getProcessEventByBusinessCode(businessType: ProcessBusinessType, businessId: string, eventCode: string): ProcessEvent | undefined {
    if (!this.available) return undefined;
    const row = this.runtimeDb.db
      .prepare("select * from process_events where business_type = ? and business_id = ? and event_code = ? order by created_at asc limit 1")
      .get(businessType, businessId, eventCode) as Row | undefined;
    return row ? this.eventFromRow(row) : undefined;
  }

  private assertAvailable() {
    if (!this.available) {
      throw new Error(`Process Layer is unavailable: ${this.initializationError ?? "initialization failed"}`);
    }
  }

  private bindBusinessProcess(businessType: ProcessBusinessType, businessId: string, processInstanceId: string, relationType: string) {
    run(
      this.runtimeDb.db.prepare(
        `insert into business_process_bindings (id, business_type, business_id, process_instance_id, relation_type, created_at)
         values (?, ?, ?, ?, ?, ?)
         on conflict(business_type, business_id, process_instance_id, relation_type) do nothing`
      ),
      [`bpb:${businessType}:${businessId}:${processInstanceId}:${relationType}`, businessType, businessId, processInstanceId, relationType, now()]
    );
  }

  private migrate() {
    this.runtimeDb.db.exec(`
      create table if not exists process_definitions (
        id text primary key,
        process_code text not null,
        process_name text not null,
        process_type text not null,
        version_no integer not null,
        status text not null,
        enabled_from text null,
        enabled_to text null,
        source_type text not null,
        source_json text not null default '{}',
        created_by text null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists process_nodes (
        id text primary key,
        process_definition_id text not null,
        node_key text not null,
        node_name text not null,
        node_type text not null,
        assignee_role_id text null,
        assignee_rule_json text not null default '{}',
        action_schema_json text not null default '{}',
        timeout_rule_json text not null default '{}',
        sort_order integer not null,
        created_at text not null,
        updated_at text not null,
        unique(process_definition_id, node_key)
      );

      create table if not exists process_transitions (
        id text primary key,
        process_definition_id text not null,
        from_node_key text not null,
        to_node_key text not null,
        action_code text not null,
        condition_json text not null default '{}',
        priority integer not null default 0,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists process_instances (
        id text primary key,
        process_definition_id text not null,
        process_code text not null,
        business_type text not null,
        business_id text not null,
        business_title text not null,
        current_node_key text not null,
        process_status text not null,
        started_by text null,
        started_at text null,
        completed_by text null,
        completed_at text null,
        org_id text null,
        supplier_id text null,
        project_id text null,
        source_engine text not null,
        source_instance_id text not null,
        source_json text not null default '{}',
        created_at text not null,
        updated_at text not null,
        unique(source_engine, source_instance_id)
      );

      create table if not exists process_task_instances (
        id text primary key,
        process_instance_id text not null,
        node_key text not null,
        task_type text not null,
        business_type text not null,
        business_id text not null,
        title text not null,
        assignee_role_id text null,
        assignee_user_id text null,
        supplier_id text null,
        org_id text null,
        project_id text null,
        task_status text not null,
        due_at text null,
        completed_by text null,
        completed_at text null,
        source_engine text not null,
        source_task_id text not null,
        source_json text not null default '{}',
        created_at text not null,
        updated_at text not null,
        unique(source_engine, source_task_id)
      );

      create table if not exists process_events (
        id text primary key,
        process_instance_id text not null,
        event_code text not null,
        event_name text not null,
        business_type text not null,
        business_id text not null,
        actor_id text null,
        actor_role_id text null,
        from_node_key text null,
        to_node_key text null,
        from_status text null,
        to_status text null,
        payload_json text not null default '{}',
        created_at text not null
      );

      create table if not exists business_process_bindings (
        id text primary key,
        business_type text not null,
        business_id text not null,
        process_instance_id text not null,
        relation_type text not null,
        created_at text not null,
        unique(business_type, business_id, process_instance_id, relation_type)
      );

      create table if not exists process_audit_logs (
        id text primary key,
        process_instance_id text not null,
        action_code text not null,
        object_type text not null,
        object_id text not null,
        actor_id text null,
        actor_role_id text null,
        before_json text null,
        after_json text null,
        ip_address text null,
        user_agent text null,
        created_at text not null
      );

      create index if not exists idx_process_instances_business on process_instances(business_type, business_id);
      create index if not exists idx_process_instances_source on process_instances(source_engine, source_instance_id);
      create index if not exists idx_process_instances_scope on process_instances(org_id, supplier_id, project_id);
      create index if not exists idx_process_tasks_instance on process_task_instances(process_instance_id, task_status);
      create index if not exists idx_process_tasks_source on process_task_instances(source_engine, source_task_id);
      create index if not exists idx_process_events_instance on process_events(process_instance_id, created_at);
      create index if not exists idx_process_events_business_code on process_events(business_type, business_id, event_code);
      create index if not exists idx_business_process_bindings_business on business_process_bindings(business_type, business_id);
    `);
  }

  private ensureM1Definitions() {
    this.ensureDefinition({
      id: "pd:procurement_request:r8-shadow:v1",
      processCode: "procurement_request",
      processName: "采购需求流程",
      processType: "procurement_request",
      sourceType: "r8_shadow",
      sourceJson: { sourceEngine: "r8_workflow", phase: "M4-A", mode: "r8_shadow_with_process_events" },
      nodes: [
        ["request_created", "创建需求", "start", null, 0],
        ["approval_pending", "提交审批 / 集团审批", "user_task", "group_manager", 10],
        ["request_rejected", "审批驳回", "end", null, 20],
        ["method_decision", "方式决策", "user_task", "buyer", 30],
        ["project_created", "生成采购项目", "end", null, 40],
        ["cancelled_end", "已取消", "end", null, 50]
      ],
      transitions: [
        ["request_created", "approval_pending", "submit", 1],
        ["approval_pending", "request_rejected", "reject", 1],
        ["approval_pending", "method_decision", "approve", 1],
        ["method_decision", "project_created", "create_project", 1],
        ["request_created", "cancelled_end", "cancel", 1],
        ["approval_pending", "cancelled_end", "cancel", 1],
        ["method_decision", "cancelled_end", "cancel", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:procurement_document:r8-shadow:v1",
      processCode: "procurement_document",
      processName: "采购文件审核影子流程",
      processType: "procurement_document",
      sourceType: "r8_shadow",
      sourceJson: { sourceEngine: "r8_workflow", phase: "M4-A", mode: "shadow" },
      nodes: [
        ["start", "创建采购文件", "start", null, 0],
        ["approval_pending", "提交审核 / 采购文件审核", "user_task", "group_manager", 10],
        ["approved_end", "审核通过", "end", null, 20],
        ["rejected_end", "审核驳回", "end", null, 30],
        ["cancelled_end", "已取消", "end", null, 40]
      ],
      transitions: [
        ["start", "approval_pending", "submit", 1],
        ["approval_pending", "approved_end", "approve", 1],
        ["approval_pending", "rejected_end", "reject", 1],
        ["start", "cancelled_end", "cancel", 1],
        ["approval_pending", "cancelled_end", "cancel", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:award_approval:r8-shadow:v1",
      processCode: "award_approval",
      processName: "定标审批影子流程",
      processType: "award_approval",
      sourceType: "r8_shadow",
      sourceJson: { sourceEngine: "r8_workflow", phase: "M4-A", mode: "shadow" }
    });
    this.ensureDefinition({
      id: "pd:supplier_onboarding:process-layer:v1",
      processCode: "supplier_onboarding",
      processName: "供应商准入流程",
      processType: "supplier_onboarding",
      sourceType: "process_layer",
      sourceJson: {
        sourceEngine: "process_layer",
        phase: "M4-A",
        reservedFields: ["legalRepresentative", "socialCreditCode", "contact", "licenseValidUntil", "categoryScope", "serviceRegions"]
      },
      nodes: [
        ["registered", "供应商注册", "start", "supplier", 0],
        ["profile_completion", "资料补全", "user_task", "supplier", 10],
        ["qualification_review", "资质审核", "user_task", "buyer", 20],
        ["admission_approval", "准入审批", "user_task", "buyer", 30],
        ["category_authorization", "品类授权", "user_task", "buyer", 40],
        ["active_online", "生效上线", "end", null, 50],
        ["rejected_end", "准入驳回", "end", null, 60],
        ["restricted_end", "限制准入", "end", null, 70]
      ],
      transitions: [
        ["registered", "profile_completion", "register", 1],
        ["profile_completion", "qualification_review", "submit_profile", 1],
        ["qualification_review", "admission_approval", "qualification_pass", 1],
        ["qualification_review", "rejected_end", "qualification_reject", 1],
        ["admission_approval", "category_authorization", "admission_pass", 1],
        ["admission_approval", "rejected_end", "admission_reject", 1],
        ["category_authorization", "active_online", "authorize_category", 1],
        ["active_online", "restricted_end", "restrict", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:sourcing:process-layer:v1",
      processCode: "sourcing",
      processName: "招采主流程",
      processType: "sourcing",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-B", mode: "sourcing_umbrella" },
      nodes: [
        ["project_created", "采购项目已生成", "start", "buyer", 0],
        ["method_routed", "采购方式已路由", "system_task", null, 10],
        ["sourcing_completed", "招采阶段完成", "end", null, 20]
      ],
      transitions: [
        ["project_created", "method_routed", "route_method", 1],
        ["method_routed", "sourcing_completed", "complete", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:rfq:process-layer:v1",
      processCode: "rfq",
      processName: "RFQ 询价流程",
      processType: "rfq",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-B", mode: "rfq_sourcing" },
      nodes: [
        ["inquiry_created", "创建询价", "start", "buyer", 0],
        ["supplier_invitation", "邀请供应商", "user_task", "buyer", 10],
        ["supplier_quotation", "供应商报价", "user_task", "supplier_quotation", 20],
        ["bid_cutoff", "截标", "user_task", "buyer", 30],
        ["comparison_preparation", "比价准备", "user_task", "buyer", 40],
        ["award_preparation", "定标前准备", "end", null, 50]
      ],
      transitions: [
        ["inquiry_created", "supplier_invitation", "invite_suppliers", 1],
        ["supplier_invitation", "supplier_quotation", "supplier_invited", 1],
        ["supplier_quotation", "bid_cutoff", "quote_submitted", 1],
        ["bid_cutoff", "comparison_preparation", "cutoff", 1],
        ["comparison_preparation", "award_preparation", "comparison_generated", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:tender:process-layer:v1",
      processCode: "tender",
      processName: "TENDER 招标流程",
      processType: "tender",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-B", mode: "tender_sourcing" },
      nodes: [
        ["announcement_preparation", "公告准备", "start", "buyer", 0],
        ["announcement_published", "公告发布", "event", null, 10],
        ["supplier_registration", "供应商报名", "user_task", "supplier_quotation", 20],
        ["qualification_confirmation", "资格审查 / 报名确认", "user_task", "buyer", 30],
        ["bid_response", "报价 / 响应文件提交", "user_task", "supplier_quotation", 40],
        ["bid_cutoff", "截标", "user_task", "buyer", 50],
        ["bid_opening_locked", "开标 / 锁标", "user_task", "buyer", 60],
        ["review_preparation", "进入评审准备", "end", null, 70]
      ],
      transitions: [
        ["announcement_preparation", "announcement_published", "publish", 1],
        ["announcement_published", "supplier_registration", "supplier_invited", 1],
        ["supplier_registration", "qualification_confirmation", "register", 1],
        ["qualification_confirmation", "bid_response", "qualify", 1],
        ["bid_response", "bid_cutoff", "submit_bid", 1],
        ["bid_cutoff", "bid_opening_locked", "cutoff", 1],
        ["bid_opening_locked", "review_preparation", "lock_or_compare", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:direct_purchase:process-layer:v1",
      processCode: "direct_purchase",
      processName: "DIRECT 直接采购流程",
      processType: "direct_purchase",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-B", mode: "direct_purchase_sourcing" },
      nodes: [
        ["demand_confirmed", "需求确认", "start", "buyer", 0],
        ["supplier_confirmation", "供应商确认", "user_task", "buyer", 10],
        ["pricing_confirmation", "定价确认", "user_task", "buyer", 20],
        ["approval_or_archive", "审批或归档", "end", null, 30]
      ],
      transitions: [
        ["demand_confirmed", "supplier_confirmation", "confirm_supplier", 1],
        ["supplier_confirmation", "pricing_confirmation", "confirm_pricing", 1],
        ["pricing_confirmation", "approval_or_archive", "archive_or_approve", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:review_award:process-layer:v1",
      processCode: "review_award",
      processName: "评审定标流程",
      processType: "review_award",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-C", mode: "review_award_tracking" },
      nodes: [
        ["quote_locked", "报价锁定 / 开标完成", "start", "buyer", 0],
        ["expert_assignment", "专家抽取 / 指定", "user_task", "buyer", 10],
        ["expert_confirmation", "专家确认", "user_task", "expert", 20],
        ["expert_scoring", "专家评分", "user_task", "expert", 30],
        ["score_summary", "评分汇总", "user_task", "buyer", 40],
        ["comparison_report", "比选报告", "user_task", "buyer", 50],
        ["review_report", "评审报告", "user_task", "buyer", 60],
        ["award_approval", "定标审批", "user_task", "group_manager", 70],
        ["result_preparation", "结果通知 / 公示准备", "user_task", "buyer", 80],
        ["completed", "进入合同准备", "end", null, 90],
        ["rejected_end", "定标驳回", "end", null, 100]
      ],
      transitions: [
        ["quote_locked", "expert_assignment", "assign_expert", 1],
        ["expert_assignment", "expert_confirmation", "notify_expert", 1],
        ["expert_confirmation", "expert_scoring", "confirm", 1],
        ["expert_scoring", "score_summary", "submit_score", 1],
        ["score_summary", "comparison_report", "generate_comparison", 1],
        ["comparison_report", "review_report", "generate_review_report", 1],
        ["review_report", "award_approval", "freeze_review_report", 1],
        ["award_approval", "result_preparation", "approve_award", 1],
        ["award_approval", "rejected_end", "reject_award", 1],
        ["result_preparation", "completed", "prepare_contract", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:contract_preparation:process-layer:v1",
      processCode: "contract_preparation",
      processName: "合同准备流程",
      processType: "contract_preparation",
      sourceType: "process_layer",
      sourceJson: {
        sourceEngine: "process_layer",
        phase: "M4-C",
        mode: "contract_entry_tracking",
        boundary: "合同台账占位和前置准备，不替代合同系统"
      },
      nodes: [
        ["award_approved", "定标审批通过", "start", "buyer", 0],
        ["result_published", "结果通知 / 公示", "user_task", "buyer", 10],
        ["pricing_report", "定价报告", "user_task", "buyer", 20],
        ["contract_entry", "合同台账登记", "user_task", "buyer", 30],
        ["contract_ready", "合同准备完成", "end", null, 40]
      ],
      transitions: [
        ["award_approved", "result_published", "publish_result", 1],
        ["result_published", "pricing_report", "generate_pricing_report", 1],
        ["pricing_report", "contract_entry", "register_contract", 1],
        ["contract_entry", "contract_ready", "complete_preparation", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:order_fulfillment:process-layer:v1",
      processCode: "order_fulfillment",
      processName: "订单履约流程",
      processType: "order_fulfillment",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-D", mode: "mall_order_fulfillment_tracking" },
      nodes: [
        ["order_created", "订单创建", "start", "buyer", 0],
        ["supplier_confirmation", "供应商确认", "user_task", "supplier", 10],
        ["shipment", "供应商发货", "user_task", "supplier", 20],
        ["receiving", "收货确认", "user_task", "buyer", 30],
        ["acceptance", "履约验收", "user_task", "buyer", 40],
        ["evaluation", "供应商评价", "user_task", "buyer", 50],
        ["settlement_entry", "进入结算", "end", null, 60]
      ],
      transitions: [
        ["order_created", "supplier_confirmation", "confirm_order", 1],
        ["supplier_confirmation", "shipment", "ship", 1],
        ["shipment", "receiving", "receive", 1],
        ["receiving", "acceptance", "accept", 1],
        ["acceptance", "evaluation", "evaluate", 1],
        ["evaluation", "settlement_entry", "settle", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:settlement:process-layer:v1",
      processCode: "settlement",
      processName: "结算流程",
      processType: "settlement",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-D", mode: "settlement_finance_tracking" },
      nodes: [
        ["settlement_generated", "生成结算单", "start", "buyer", 0],
        ["settlement_submit", "提交结算", "user_task", "supplier", 10],
        ["settlement_review", "结算审核", "user_task", "finance_reviewer", 20],
        ["materials_review", "结算材料审核", "user_task", "finance_reviewer", 30],
        ["invoice_entry", "进入发票", "user_task", "supplier", 40],
        ["payment_entry", "进入付款申请", "end", null, 50],
        ["rejected_end", "结算驳回", "end", null, 60]
      ],
      transitions: [
        ["settlement_generated", "settlement_submit", "submit", 1],
        ["settlement_submit", "settlement_review", "review", 1],
        ["settlement_review", "materials_review", "approve", 1],
        ["settlement_review", "rejected_end", "reject", 1],
        ["materials_review", "invoice_entry", "material_approved", 1],
        ["invoice_entry", "payment_entry", "payment_request", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:invoice:process-layer:v1",
      processCode: "invoice",
      processName: "发票流程",
      processType: "invoice",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-D", mode: "invoice_tracking_with_r8_shadow" },
      nodes: [
        ["invoice_submitted", "发票提交", "start", "supplier", 0],
        ["invoice_review", "发票审核", "user_task", "finance_reviewer", 10],
        ["invoice_approved", "发票通过", "end", null, 20],
        ["invoice_rejected", "发票驳回", "end", null, 30]
      ],
      transitions: [
        ["invoice_submitted", "invoice_review", "review", 1],
        ["invoice_review", "invoice_approved", "approve", 1],
        ["invoice_review", "invoice_rejected", "reject", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:payment:process-layer:v1",
      processCode: "payment",
      processName: "付款流程",
      processType: "payment",
      sourceType: "process_layer",
      sourceJson: {
        sourceEngine: "process_layer",
        phase: "M4-D",
        mode: "payment_tracking",
        boundary: "本地付款申请和确认留痕，不接真实支付系统"
      },
      nodes: [
        ["payment_requested", "付款申请", "start", "finance_reviewer", 0],
        ["payment_review", "付款复核", "user_task", "finance_reviewer", 10],
        ["payment_confirmed", "付款确认", "user_task", "finance_reviewer", 20],
        ["payment_completed", "付款完成", "end", null, 30]
      ],
      transitions: [
        ["payment_requested", "payment_review", "review", 1],
        ["payment_review", "payment_confirmed", "confirm", 1],
        ["payment_confirmed", "payment_completed", "complete", 1]
      ]
    });
    this.ensureDefinition({
      id: "pd:archive:process-layer:v1",
      processCode: "archive",
      processName: "档案归集流程",
      processType: "archive",
      sourceType: "process_layer",
      sourceJson: { sourceEngine: "process_layer", phase: "M4-D", mode: "archive_tracking" },
      nodes: [
        ["archive_generated", "档案快照", "start", "buyer", 0],
        ["completeness_check", "完整性检查", "user_task", "buyer", 10],
        ["supplement_request", "补档申请", "user_task", "buyer", 20],
        ["supplement_approval", "补档审批", "user_task", "buyer", 30],
        ["supplemented", "补档完成", "user_task", "buyer", 40],
        ["sealed", "档案封存", "end", null, 50],
        ["audit_read", "审计查阅", "event", "auditor", 60]
      ],
      transitions: [
        ["archive_generated", "completeness_check", "check", 1],
        ["completeness_check", "supplement_request", "request_supplement", 1],
        ["supplement_request", "supplement_approval", "approve_supplement", 1],
        ["supplement_approval", "supplemented", "apply_supplement", 1],
        ["supplemented", "sealed", "seal", 1],
        ["completeness_check", "sealed", "seal_when_complete", 1],
        ["sealed", "audit_read", "audit_read", 1]
      ]
    });
  }

  private ensureDefinition(input: {
    id: string;
    processCode: ProcessBusinessType;
    processName: string;
    processType: ProcessBusinessType;
    sourceType?: ProcessDefinition["sourceType"];
    sourceJson?: Record<string, unknown>;
    nodes?: ReadonlyArray<readonly [string, string, string, RoleId | null, number]>;
    transitions?: ReadonlyArray<readonly [string, string, string, number]>;
  }) {
    const timestamp = now();
    const sourceType = input.sourceType ?? "r8_shadow";
    const sourceJson = input.sourceJson ?? { sourceEngine: "r8_workflow", phase: "M1", mode: "shadow" };
    run(
      this.runtimeDb.db.prepare(
        `insert into process_definitions (
          id, process_code, process_name, process_type, version_no, status,
          enabled_from, enabled_to, source_type, source_json, created_by, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          process_name = excluded.process_name,
          status = excluded.status,
          source_json = excluded.source_json,
          updated_at = excluded.updated_at`
      ),
      [
        input.id,
        input.processCode,
        input.processName,
        input.processType,
        1,
        "enabled",
        timestamp,
        null,
        sourceType,
        JSON.stringify(sourceJson),
        "system",
        timestamp,
        timestamp
      ]
    );
    const nodes =
      input.nodes ??
      ([
        ["start", "开始", "start", null, 0],
        ["approval_pending", "待审批", "user_task", "group_manager", 10],
        ["approved_end", "审批通过", "end", null, 20],
        ["rejected_end", "审批驳回", "end", null, 30],
        ["cancelled_end", "已取消", "end", null, 40]
      ] as const);
    for (const [nodeKey, nodeName, nodeType, assigneeRoleId, sortOrder] of nodes) {
      run(
        this.runtimeDb.db.prepare(
          `insert into process_nodes (
            id, process_definition_id, node_key, node_name, node_type, assignee_role_id,
            assignee_rule_json, action_schema_json, timeout_rule_json, sort_order, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict(process_definition_id, node_key) do update set
            node_name = excluded.node_name,
            node_type = excluded.node_type,
            assignee_role_id = excluded.assignee_role_id,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at`
        ),
        [
          `pn:${input.id}:${nodeKey}`,
          input.id,
          nodeKey,
          nodeName,
          nodeType,
          assigneeRoleId,
          "{}",
          "{}",
          "{}",
          sortOrder,
          timestamp,
          timestamp
        ]
      );
    }
    const transitions =
      input.transitions ??
      ([
        ["start", "approval_pending", "submit", 1],
        ["approval_pending", "approved_end", "approve", 1],
        ["approval_pending", "rejected_end", "reject", 1],
        ["approval_pending", "cancelled_end", "cancel", 1]
      ] as const);
    for (const [fromNodeKey, toNodeKey, actionCode, priority] of transitions) {
      run(
        this.runtimeDb.db.prepare(
          `insert into process_transitions (
            id, process_definition_id, from_node_key, to_node_key, action_code,
            condition_json, priority, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict(id) do update set
            to_node_key = excluded.to_node_key,
            action_code = excluded.action_code,
            condition_json = excluded.condition_json,
            priority = excluded.priority,
            updated_at = excluded.updated_at`
        ),
        [`ptr:${input.id}:${fromNodeKey}:${actionCode}:${toNodeKey}`, input.id, fromNodeKey, toNodeKey, actionCode, "{}", priority, timestamp, timestamp]
      );
    }
  }

  private definitionFromRow(row: Row): ProcessDefinition {
    return {
      id: String(row.id),
      processCode: String(row.process_code) as ProcessBusinessType,
      processName: String(row.process_name),
      processType: String(row.process_type) as ProcessBusinessType,
      versionNo: Number(row.version_no),
      status: String(row.status) as ProcessDefinition["status"],
      enabledFrom: optionalString(row.enabled_from),
      enabledTo: optionalString(row.enabled_to),
      sourceType: String(row.source_type) as ProcessDefinition["sourceType"],
      sourceJson: json<Record<string, unknown>>(row.source_json, {}),
      createdBy: optionalString(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private instanceFromRow(row: Row): ProcessInstance {
    return {
      id: String(row.id),
      processDefinitionId: String(row.process_definition_id),
      processCode: String(row.process_code) as ProcessBusinessType,
      businessType: String(row.business_type) as ProcessBusinessType,
      businessId: String(row.business_id),
      businessTitle: String(row.business_title),
      currentNodeKey: String(row.current_node_key),
      status: String(row.process_status) as ProcessStatus,
      startedBy: optionalString(row.started_by),
      startedAt: optionalString(row.started_at),
      completedBy: optionalString(row.completed_by),
      completedAt: optionalString(row.completed_at),
      orgId: optionalString(row.org_id),
      supplierId: optionalString(row.supplier_id),
      projectId: optionalString(row.project_id),
      sourceEngine: String(row.source_engine) as ProcessSourceEngine,
      sourceInstanceId: String(row.source_instance_id),
      sourceJson: json<Record<string, unknown>>(row.source_json, {}),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private taskFromRow(row: Row): ProcessTaskInstance {
    return {
      id: String(row.id),
      processInstanceId: String(row.process_instance_id),
      nodeKey: String(row.node_key),
      taskType: String(row.task_type),
      businessType: String(row.business_type) as ProcessBusinessType,
      businessId: String(row.business_id),
      title: String(row.title),
      assigneeRoleId: optionalString(row.assignee_role_id) as RoleId | undefined,
      assigneeUserId: optionalString(row.assignee_user_id),
      supplierId: optionalString(row.supplier_id),
      orgId: optionalString(row.org_id),
      projectId: optionalString(row.project_id),
      status: String(row.task_status) as ProcessTaskStatus,
      dueAt: optionalString(row.due_at),
      completedBy: optionalString(row.completed_by),
      completedAt: optionalString(row.completed_at),
      sourceEngine: String(row.source_engine) as ProcessSourceEngine,
      sourceTaskId: String(row.source_task_id),
      sourceJson: json<Record<string, unknown>>(row.source_json, {}),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private eventFromRow(row: Row): ProcessEvent {
    return {
      id: String(row.id),
      processInstanceId: String(row.process_instance_id),
      eventCode: String(row.event_code),
      eventName: String(row.event_name),
      businessType: String(row.business_type) as ProcessBusinessType,
      businessId: String(row.business_id),
      actorId: optionalString(row.actor_id),
      actorRoleId: optionalString(row.actor_role_id) as RoleId | undefined,
      fromNodeKey: optionalString(row.from_node_key),
      toNodeKey: optionalString(row.to_node_key),
      fromStatus: optionalString(row.from_status),
      toStatus: optionalString(row.to_status),
      payloadJson: json<Record<string, unknown>>(row.payload_json, {}),
      createdAt: String(row.created_at)
    };
  }
}
