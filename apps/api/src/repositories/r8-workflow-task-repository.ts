import type { RuntimeDb } from "../runtime/index.js";
import type { SeedState } from "../seed/data.js";
import type {
  ApprovalBusinessType,
  ApprovalInstance,
  ApprovalInstanceStatus,
  ApprovalRule,
  RoleId,
  User,
  WorkflowNotification,
  WorkflowTask,
  WorkflowTaskStatus
} from "../types.js";
import { isOrgReaderRole, isProcurementBuyerRole, isSupplierRole, roleMatchesAssignee, supplierIdMatches, userOrgScope } from "../role-groups.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

export class WorkflowRuleError extends Error {
  constructor(
    message: string,
    readonly code = "WORKFLOW_RULE_BLOCKED",
    readonly status = 400
  ) {
    super(message);
  }
}

export interface StartApprovalArgs {
  businessType: ApprovalBusinessType;
  businessId: string;
  title: string;
  initiator: User;
  amount?: number;
  methodType?: string;
  projectId?: string;
  orgId?: string;
  supplierId?: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  sourceJson?: Record<string, unknown>;
}

export interface ApprovalActionArgs {
  instanceId?: string;
  businessType?: ApprovalBusinessType;
  businessId?: string;
  actor: User;
  action: "approve" | "reject" | "return" | "cancel" | "revoke";
  opinion?: string;
  sourceJson?: Record<string, unknown>;
}

export interface CreateTaskArgs {
  id?: string;
  taskCode?: string;
  taskType: string;
  businessType: ApprovalBusinessType;
  businessId: string;
  title: string;
  status?: WorkflowTaskStatus;
  projectId?: string;
  orgId?: string;
  supplierId?: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  approvalInstanceId?: string;
  dueAt?: string;
  sourceJson?: Record<string, unknown>;
}

export interface NotifyArgs {
  messageCode?: string;
  eventType: string;
  businessType: ApprovalBusinessType;
  businessId: string;
  title: string;
  contentSummary: string;
  projectId?: string;
  orgId?: string;
  supplierId?: string;
  recipientRoleId?: RoleId;
  recipientUserId?: string;
  deliveryChannels?: string[];
  externalEventStatus?: WorkflowNotification["externalEventStatus"];
  sourceJson?: Record<string, unknown>;
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

function optionalNumber(value: SqlValue | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function json<T>(value: SqlValue | undefined, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function boolFromSql(value: SqlValue | undefined) {
  return Number(value ?? 0) === 1;
}

function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function isTerminalStatus(status: string) {
  return ["approved", "rejected", "returned", "revoked", "cancelled"].includes(status);
}

function isBusinessProcessorRole(roleId: RoleId) {
  return !["admin", "auditor", "system"].includes(roleId);
}

function taskTypeForBusiness(type: ApprovalBusinessType) {
  const labels: Record<ApprovalBusinessType, string> = {
    procurement_request: "approval_procurement_request",
    award_approval: "approval_award",
    archive_supplement: "archive_supplement",
    price_approval: "price_approval",
    mall_order: "mall_order",
    settlement_bill: "approval_settlement_bill",
    invoice: "approval_invoice",
    payment_request: "approval_payment_request",
    return_request: "supplier_return_review",
    expert_scoring: "expert_scoring"
  };
  return labels[type];
}

function normalizeMethodType(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function methodTypeMatches(ruleMethodType: string, actualMethodType?: string) {
  const rule = normalizeMethodType(ruleMethodType);
  const actual = normalizeMethodType(actualMethodType);
  if (!rule || rule === "all" || rule === "全部采购方式") return true;
  if (!actual || actual === "pending") return true;
  if (rule === actual) return true;

  // 旧阶段里同一采购方式存在“采购”和“招采”等展示名差异，规则匹配按业务类别归一。
  if (rule.includes("内部") && rule.includes("公开") && actual.includes("内部") && actual.includes("公开")) return true;
  if ((rule.includes("询价") || rule.includes("比选") || rule.includes("comparison")) && (actual.includes("询价") || actual.includes("比选") || actual.includes("comparison"))) return true;
  if ((rule.includes("外部") || rule.includes("交易") || rule.includes("external")) && (actual.includes("外部") || actual.includes("交易") || actual.includes("external"))) return true;
  return false;
}

export class R8WorkflowTaskRepository {
  constructor(private readonly runtimeDb: RuntimeDb) {}

  syncWorkflowState(state: SeedState) {
    for (const rule of state.approvalRules ?? []) this.upsertApprovalRule(rule);
    this.ensureExpertScoringTasks(state);
    this.ensureReturnTasks(state);
  }

  listApprovalRules(): ApprovalRule[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_approval_rules order by business_type, version_no desc, rule_code").all() as Row[];
    return rows.map((row) => this.ruleFromRow(row));
  }

  getApprovalRule(ruleId: string): ApprovalRule | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_approval_rules where id = ?").get(ruleId) as Row | undefined;
    return row ? this.ruleFromRow(row) : undefined;
  }

  upsertApprovalRule(rule: ApprovalRule) {
    const approvalOrder = rule.approvalOrder ?? rule.nodeRoleIds;
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_approval_rules (
          id, rule_code, rule_name, business_type, amount_min, amount_max,
          method_types_json, node_role_ids_json, actions_json, org_scope_json,
          hotel_scope_json, approval_order_json, default_strategy, rule_status,
          version_no, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          rule_code = excluded.rule_code,
          rule_name = excluded.rule_name,
          business_type = excluded.business_type,
          amount_min = excluded.amount_min,
          amount_max = excluded.amount_max,
          method_types_json = excluded.method_types_json,
          node_role_ids_json = excluded.node_role_ids_json,
          actions_json = excluded.actions_json,
          org_scope_json = excluded.org_scope_json,
          hotel_scope_json = excluded.hotel_scope_json,
          approval_order_json = excluded.approval_order_json,
          default_strategy = excluded.default_strategy,
          rule_status = excluded.rule_status,
          version_no = excluded.version_no,
          updated_at = excluded.updated_at`
      ),
      [
        rule.id,
        rule.ruleCode,
        rule.ruleName,
        rule.businessType,
        rule.amountMin ?? null,
        rule.amountMax ?? null,
        JSON.stringify(rule.methodTypes ?? []),
        JSON.stringify(rule.nodeRoleIds ?? []),
        JSON.stringify(rule.actions ?? []),
        JSON.stringify(rule.orgScope ?? []),
        JSON.stringify(rule.hotelScope ?? []),
        JSON.stringify(approvalOrder ?? []),
        rule.defaultStrategy ?? "manual_review_required",
        rule.status,
        rule.versionNo,
        rule.updatedAt
      ]
    );
  }

  updateApprovalRule(ruleId: string, patch: Partial<ApprovalRule>): ApprovalRule {
    const current = this.getApprovalRule(ruleId);
    if (!current) throw new WorkflowRuleError("Approval rule was not found.", "APPROVAL_RULE_NOT_FOUND", 404);
    const next: ApprovalRule = {
      ...current,
      ...patch,
      id: current.id,
      ruleCode: patch.ruleCode ?? current.ruleCode,
      versionNo: current.versionNo + 1,
      updatedAt: now()
    };
    this.upsertApprovalRule(next);
    return next;
  }

  startApproval(args: StartApprovalArgs) {
    const rule = this.findMatchingRule(args);
    if (!rule) {
      throw new WorkflowRuleError("No enabled approval rule matched this business object. Default strategy is manual review required.", "APPROVAL_RULE_NOT_MATCHED", 400);
    }
    const order = rule.approvalOrder && rule.approvalOrder.length > 0 ? rule.approvalOrder : rule.nodeRoleIds;
    const currentRole = args.assigneeRoleId ?? order.find(isBusinessProcessorRole) ?? order[0] ?? "group_manager";
    const timestamp = now();
    const instanceId = this.instanceId(args.businessType, args.businessId);
    const existing = this.getApprovalInstance(instanceId);
    if (existing && !isTerminalStatus(existing.approvalStatus)) {
      const pendingTask = this.listTasksByInstance(instanceId).find((task) => task.status === "pending");
      return { approvalInstance: existing, task: pendingTask, notifications: [] as WorkflowNotification[] };
    }
    const instance: ApprovalInstance = {
      id: instanceId,
      businessType: args.businessType,
      businessId: args.businessId,
      businessTitle: args.title,
      projectId: args.projectId,
      orgId: args.orgId ?? args.initiator.orgId,
      supplierId: args.supplierId,
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      currentNodeIndex: 0,
      currentRoleId: currentRole,
      currentUserId: args.assigneeUserId,
      approvalStatus: "submitted",
      startedBy: args.initiator.id,
      startedAt: timestamp,
      updatedAt: timestamp
    };
    this.upsertApprovalInstance(instance, args.amount, args.sourceJson);
    this.insertApprovalAction(instance, args.initiator, "submit", "draft", "submitted", "submitted for approval", args.sourceJson);
    const task = this.upsertTask({
      id: `task:${instanceId}:node:0`,
      taskCode: `TASK-${args.businessType}-${args.businessId}`,
      taskType: taskTypeForBusiness(args.businessType),
      businessType: args.businessType,
      businessId: args.businessId,
      projectId: args.projectId,
      orgId: instance.orgId,
      supplierId: args.supplierId,
      approvalInstanceId: instance.id,
      assigneeRoleId: currentRole,
      assigneeUserId: args.assigneeUserId,
      title: args.title,
      sourceJson: { ...(args.sourceJson ?? {}), ruleCode: rule.ruleCode }
    });
    const notifications = [
      this.createNotification({
        eventType: `${args.businessType}.submitted`,
        businessType: args.businessType,
        businessId: args.businessId,
        projectId: args.projectId,
        orgId: instance.orgId,
        supplierId: args.supplierId,
        recipientUserId: args.initiator.id,
        title: args.title,
        contentSummary: "Business object submitted to workflow.",
        sourceJson: args.sourceJson
      }),
      this.createNotification({
        eventType: `${args.businessType}.pending_approval`,
        businessType: args.businessType,
        businessId: args.businessId,
        projectId: args.projectId,
        orgId: instance.orgId,
        supplierId: args.supplierId,
        recipientRoleId: currentRole,
        recipientUserId: args.assigneeUserId,
        title: args.title,
        contentSummary: "Pending approval task created.",
        sourceJson: { taskId: task.id, ruleCode: rule.ruleCode }
      })
    ];
    return { approvalInstance: this.getApprovalInstance(instance.id)!, task, notifications };
  }

  recordApprovalAction(args: ApprovalActionArgs) {
    const instance = args.instanceId ? this.getApprovalInstance(args.instanceId) : this.getApprovalInstanceByBusiness(args.businessType!, args.businessId!);
    if (!instance) throw new WorkflowRuleError("Approval instance was not found.", "APPROVAL_INSTANCE_NOT_FOUND", 404);
    if (isTerminalStatus(instance.approvalStatus)) throw new WorkflowRuleError("Completed approval instance cannot be processed again.", "APPROVAL_INSTANCE_COMPLETED", 400);
    if (["admin", "auditor", "system"].includes(args.actor.roleId)) {
      throw new WorkflowRuleError("Current role cannot process business approval tasks.", "WORKFLOW_PROCESS_DENIED", 403);
    }
    if (instance.currentUserId && instance.currentUserId !== args.actor.id) {
      throw new WorkflowRuleError("Current user is not the active approval assignee.", "WORKFLOW_ASSIGNEE_DENIED", 403);
    }
    if (instance.currentRoleId && instance.currentRoleId !== args.actor.roleId) {
      throw new WorkflowRuleError("Current role is not the active approval assignee.", "WORKFLOW_ASSIGNEE_DENIED", 403);
    }
    const rule = instance.ruleId ? this.getApprovalRule(instance.ruleId) : undefined;
    const allowedActions = rule?.actions ?? [];
    if (allowedActions.length > 0 && !allowedActions.includes(args.action)) {
      throw new WorkflowRuleError("Current approval rule does not allow this action.", "WORKFLOW_ACTION_NOT_ALLOWED", 400);
    }
    const fromStatus = instance.approvalStatus;
    const toStatus = this.statusForAction(args.action);
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `update r2_approval_instances
         set approval_status = ?, completed_by = ?, completed_at = ?, current_role_id = null,
             current_user_id = null, updated_at = ?
         where id = ?`
      ),
      [toStatus, args.actor.id, timestamp, timestamp, instance.id]
    );
    const updated = this.getApprovalInstance(instance.id)!;
    this.insertApprovalAction(updated, args.actor, args.action, fromStatus, toStatus, args.opinion, args.sourceJson);
    this.completeApprovalTasks(instance.id, args.actor.id, args.action === "approve" ? "completed" : "cancelled");
    const notification = this.createNotification({
      eventType: `${instance.businessType}.${toStatus}`,
      businessType: instance.businessType,
      businessId: instance.businessId,
      projectId: instance.projectId,
      orgId: instance.orgId,
      supplierId: instance.supplierId,
      recipientUserId: instance.startedBy,
      title: instance.businessTitle,
      contentSummary: args.opinion ?? `Approval ${toStatus}.`,
      sourceJson: { action: args.action, actorId: args.actor.id, ...(args.sourceJson ?? {}) }
    });
    return { approvalInstance: updated, notification };
  }

  cancelBusinessWorkflow(businessType: ApprovalBusinessType, businessId: string, actor: User, opinion?: string) {
    const instance = this.getApprovalInstanceByBusiness(businessType, businessId);
    if (!instance || isTerminalStatus(instance.approvalStatus)) return undefined;
    return this.recordApprovalAction({ instanceId: instance.id, actor, action: "cancel", opinion });
  }

  getApprovalInstance(instanceId: string): ApprovalInstance | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_approval_instances where id = ?").get(instanceId) as Row | undefined;
    return row ? this.instanceFromRow(row) : undefined;
  }

  getApprovalInstanceByBusiness(businessType: ApprovalBusinessType, businessId: string): ApprovalInstance | undefined {
    const formal = this.getApprovalInstance(this.instanceId(businessType, businessId));
    if (formal) return formal;
    const row = this.runtimeDb.db
      .prepare("select * from r2_approval_instances where business_type = ? and business_id = ? order by updated_at desc limit 1")
      .get(businessType, businessId) as Row | undefined;
    return row ? this.instanceFromRow(row) : undefined;
  }

  listApprovalInstances(user: User, roleId: RoleId): ApprovalInstance[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_approval_instances order by updated_at desc").all() as Row[];
    return rows.map((row) => this.instanceFromRow(row)).filter((instance) => this.canReadWorkflowObject(user, roleId, instance));
  }

  upsertTask(args: CreateTaskArgs): WorkflowTask {
    const timestamp = now();
    const id = args.id ?? `task:${args.businessType}:${args.businessId}:${randomSuffix()}`;
    const existing = this.getTask(id);
    if (existing && existing.status !== "pending" && (args.status ?? "pending") === "pending") return existing;
    const task: WorkflowTask = {
      id,
      taskCode: args.taskCode ?? `TASK-${id}`,
      taskType: args.taskType,
      businessType: args.businessType,
      businessId: args.businessId,
      projectId: args.projectId,
      title: args.title,
      assigneeRoleId: args.assigneeRoleId,
      assigneeUserId: args.assigneeUserId,
      supplierId: args.supplierId,
      orgId: args.orgId,
      approvalInstanceId: args.approvalInstanceId,
      status: args.status ?? "pending",
      dueAt: args.dueAt,
      createdAt: existing?.createdAt ?? timestamp,
      completedAt: existing?.completedAt,
      completedBy: existing?.completedBy,
      sourceJson: args.sourceJson ?? {},
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_task_items (
          id, task_code, task_type, business_type, business_id, project_id, title,
          assignee_role_id, assignee_user_id, supplier_id, org_id, approval_instance_id,
          task_status, due_at, created_at, completed_at, completed_by, source_json, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          task_code = excluded.task_code,
          task_type = excluded.task_type,
          business_type = excluded.business_type,
          business_id = excluded.business_id,
          project_id = excluded.project_id,
          title = excluded.title,
          assignee_role_id = excluded.assignee_role_id,
          assignee_user_id = excluded.assignee_user_id,
          supplier_id = excluded.supplier_id,
          org_id = excluded.org_id,
          approval_instance_id = excluded.approval_instance_id,
          task_status = excluded.task_status,
          due_at = excluded.due_at,
          completed_at = excluded.completed_at,
          completed_by = excluded.completed_by,
          source_json = excluded.source_json,
          updated_at = excluded.updated_at`
      ),
      [
        task.id,
        task.taskCode,
        task.taskType,
        task.businessType,
        task.businessId,
        task.projectId ?? null,
        task.title,
        task.assigneeRoleId ?? null,
        task.assigneeUserId ?? null,
        task.supplierId ?? null,
        task.orgId ?? null,
        task.approvalInstanceId ?? null,
        task.status,
        task.dueAt ?? null,
        task.createdAt,
        task.completedAt ?? null,
        task.completedBy ?? null,
        JSON.stringify(task.sourceJson ?? {}),
        task.updatedAt
      ]
    );
    return this.getTask(task.id)!;
  }

  getTask(taskId: string): WorkflowTask | undefined {
    const row = this.runtimeDb.db.prepare("select * from r2_task_items where id = ?").get(taskId) as Row | undefined;
    return row ? this.taskFromRow(row) : undefined;
  }

  listTasks(user: User, roleId: RoleId): WorkflowTask[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_task_items order by created_at desc, updated_at desc").all() as Row[];
    return rows.map((row) => this.taskFromRow(row)).filter((task) => this.canReadTask(user, roleId, task));
  }

  completeTask(taskId: string, actor: User): WorkflowTask {
    const task = this.getTask(taskId);
    if (!task) throw new WorkflowRuleError("Task was not found.", "WORKFLOW_TASK_NOT_FOUND", 404);
    if (task.status !== "pending") throw new WorkflowRuleError("Only pending task can be completed.", "WORKFLOW_TASK_NOT_PENDING", 400);
    if (!this.canProcessTask(actor, task)) throw new WorkflowRuleError("Current role cannot process this task.", "WORKFLOW_TASK_PROCESS_DENIED", 403);
    const timestamp = now();
    run(this.runtimeDb.db.prepare("update r2_task_items set task_status = 'completed', completed_by = ?, completed_at = ?, updated_at = ? where id = ?"), [
      actor.id,
      timestamp,
      timestamp,
      taskId
    ]);
    const completed = this.getTask(taskId)!;
    this.createNotification({
      eventType: `${task.businessType}.task_completed`,
      businessType: task.businessType,
      businessId: task.businessId,
      projectId: task.projectId,
      orgId: task.orgId,
      supplierId: task.supplierId,
      recipientUserId: actor.id,
      title: task.title,
      contentSummary: "Task completed.",
      sourceJson: { taskId }
    });
    return completed;
  }

  completeBusinessTasks(businessType: ApprovalBusinessType, businessId: string, actorId: string, status: WorkflowTaskStatus = "completed") {
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        "update r2_task_items set task_status = ?, completed_by = ?, completed_at = ?, updated_at = ? where business_type = ? and business_id = ? and task_status = 'pending'"
      ),
      [status, actorId, timestamp, timestamp, businessType, businessId]
    );
  }

  createNotification(args: NotifyArgs): WorkflowNotification {
    const timestamp = now();
    const recipientKey = args.recipientUserId ?? args.recipientRoleId ?? args.supplierId ?? args.orgId ?? "system";
    const notification: WorkflowNotification = {
      id: `msg:${args.eventType}:${args.businessType}:${args.businessId}:${recipientKey}:${randomSuffix()}`,
      messageCode: args.messageCode ?? `MSG-${args.eventType}-${args.businessId}`,
      eventType: args.eventType,
      businessType: args.businessType,
      businessId: args.businessId,
      projectId: args.projectId,
      recipientUserId: args.recipientUserId,
      recipientRoleId: args.recipientRoleId,
      supplierId: args.supplierId,
      orgId: args.orgId,
      title: args.title,
      contentSummary: args.contentSummary,
      read: false,
      createdAt: timestamp,
      deliveryChannels: args.deliveryChannels ?? ["in_app"],
      externalEventStatus: args.externalEventStatus ?? "not_dispatched",
      sourceJson: args.sourceJson ?? {},
      updatedAt: timestamp
    };
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_notifications (
          id, message_code, recipient_user_id, recipient_role_id, supplier_id, org_id,
          business_type, business_id, project_id, title, content_summary, read_flag,
          created_at, read_at, event_type, delivery_channels_json, external_event_status,
          source_json, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        notification.id,
        notification.messageCode,
        notification.recipientUserId ?? null,
        notification.recipientRoleId ?? null,
        notification.supplierId ?? null,
        notification.orgId ?? null,
        notification.businessType,
        notification.businessId,
        notification.projectId ?? null,
        notification.title,
        notification.contentSummary,
        notification.read ? 1 : 0,
        notification.createdAt,
        notification.readAt ?? null,
        notification.eventType,
        JSON.stringify(notification.deliveryChannels),
        notification.externalEventStatus,
        JSON.stringify(notification.sourceJson ?? {}),
        notification.updatedAt
      ]
    );
    return notification;
  }

  listNotifications(user: User, roleId: RoleId): WorkflowNotification[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_notifications order by created_at desc").all() as Row[];
    return rows.map((row) => this.notificationFromRow(row)).filter((message) => this.canReadNotification(user, roleId, message));
  }

  markNotificationRead(messageId: string, user: User, roleId: RoleId): WorkflowNotification {
    const row = this.runtimeDb.db.prepare("select * from r2_notifications where id = ?").get(messageId) as Row | undefined;
    if (!row) throw new WorkflowRuleError("Notification was not found.", "WORKFLOW_NOTIFICATION_NOT_FOUND", 404);
    const message = this.notificationFromRow(row);
    if (!this.canReadNotification(user, roleId, message)) throw new WorkflowRuleError("Current role cannot read this notification.", "WORKFLOW_NOTIFICATION_DENIED", 403);
    const timestamp = now();
    run(this.runtimeDb.db.prepare("update r2_notifications set read_flag = 1, read_at = ?, updated_at = ? where id = ?"), [timestamp, timestamp, messageId]);
    return this.notificationFromRow(this.runtimeDb.db.prepare("select * from r2_notifications where id = ?").get(messageId) as Row);
  }

  private findMatchingRule(args: StartApprovalArgs): ApprovalRule | undefined {
    const candidates = this.listApprovalRules()
      .filter((rule) => rule.businessType === args.businessType && rule.status === "enabled")
      .filter((rule) => args.amount === undefined || ((rule.amountMin === undefined || args.amount >= rule.amountMin) && (rule.amountMax === undefined || args.amount <= rule.amountMax)))
      .filter((rule) => {
        const methodTypes = rule.methodTypes ?? [];
        if (methodTypes.length === 0 || methodTypes.includes("all")) return true;
        if (!args.methodType || args.methodType === "pending") return true;
        return methodTypes.some((methodType) => methodTypeMatches(methodType, args.methodType));
      })
      .filter((rule) => {
        if (rule.orgScope && rule.orgScope.length > 0 && args.orgId && !rule.orgScope.includes(args.orgId)) return false;
        if (rule.hotelScope && rule.hotelScope.length > 0 && args.orgId && !rule.hotelScope.includes(args.orgId)) return false;
        return true;
      })
      .sort((left, right) => right.versionNo - left.versionNo);
    return candidates[0];
  }

  private upsertApprovalInstance(instance: ApprovalInstance, amount?: number, sourceJson: Record<string, unknown> = {}) {
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_approval_instances (
          id, business_type, business_id, approval_status, started_by, started_at,
          completed_at, updated_at, rule_id, rule_code, project_id, org_id, supplier_id,
          business_title, business_amount, current_node_index, current_role_id,
          current_user_id, completed_by, source_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          business_type = excluded.business_type,
          business_id = excluded.business_id,
          approval_status = excluded.approval_status,
          started_by = excluded.started_by,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          updated_at = excluded.updated_at,
          rule_id = excluded.rule_id,
          rule_code = excluded.rule_code,
          project_id = excluded.project_id,
          org_id = excluded.org_id,
          supplier_id = excluded.supplier_id,
          business_title = excluded.business_title,
          business_amount = excluded.business_amount,
          current_node_index = excluded.current_node_index,
          current_role_id = excluded.current_role_id,
          current_user_id = excluded.current_user_id,
          completed_by = excluded.completed_by,
          source_json = excluded.source_json`
      ),
      [
        instance.id,
        instance.businessType,
        instance.businessId,
        instance.approvalStatus,
        instance.startedBy ?? null,
        instance.startedAt ?? null,
        instance.completedAt ?? null,
        instance.updatedAt,
        instance.ruleId ?? null,
        instance.ruleCode ?? null,
        instance.projectId ?? null,
        instance.orgId ?? null,
        instance.supplierId ?? null,
        instance.businessTitle,
        amount ?? null,
        instance.currentNodeIndex,
        instance.currentRoleId ?? null,
        instance.currentUserId ?? null,
        instance.completedBy ?? null,
        JSON.stringify(sourceJson)
      ]
    );
  }

  private insertApprovalAction(
    instance: ApprovalInstance,
    actor: User,
    actionCode: string,
    fromStatus: string | undefined,
    toStatus: string,
    opinion?: string,
    sourceJson: Record<string, unknown> = {}
  ) {
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_approval_actions (
          id, approval_instance_id, actor_id, action_code, opinion, acted_at, updated_at,
          business_type, business_id, actor_role_id, from_status, to_status, project_id, source_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        `approval-action:${instance.id}:${actionCode}:${randomSuffix()}`,
        instance.id,
        actor.id,
        actionCode,
        opinion ?? null,
        timestamp,
        timestamp,
        instance.businessType,
        instance.businessId,
        actor.roleId,
        fromStatus ?? null,
        toStatus,
        instance.projectId ?? null,
        JSON.stringify(sourceJson)
      ]
    );
  }

  private listTasksByInstance(instanceId: string) {
    const rows = this.runtimeDb.db.prepare("select * from r2_task_items where approval_instance_id = ? order by created_at desc").all(instanceId) as Row[];
    return rows.map((row) => this.taskFromRow(row));
  }

  private completeApprovalTasks(instanceId: string, actorId: string, status: WorkflowTaskStatus) {
    const timestamp = now();
    run(
      this.runtimeDb.db.prepare(
        "update r2_task_items set task_status = ?, completed_by = ?, completed_at = ?, updated_at = ? where approval_instance_id = ? and task_status = 'pending'"
      ),
      [status, actorId, timestamp, timestamp, instanceId]
    );
  }

  private statusForAction(action: ApprovalActionArgs["action"]): ApprovalInstanceStatus {
    if (action === "approve") return "approved";
    if (action === "reject") return "rejected";
    if (action === "return") return "returned";
    if (action === "revoke") return "revoked";
    return "cancelled";
  }

  private instanceId(businessType: ApprovalBusinessType, businessId: string) {
    return `wf:${businessType}:${businessId}`;
  }

  private ruleFromRow(row: Row): ApprovalRule {
    return {
      id: String(row.id),
      ruleCode: String(row.rule_code),
      ruleName: String(row.rule_name),
      businessType: String(row.business_type) as ApprovalBusinessType,
      amountMin: optionalNumber(row.amount_min),
      amountMax: optionalNumber(row.amount_max),
      methodTypes: json<string[]>(row.method_types_json, []),
      nodeRoleIds: json<RoleId[]>(row.node_role_ids_json, []),
      actions: json<string[]>(row.actions_json, []),
      orgScope: json<string[]>(row.org_scope_json, []),
      hotelScope: json<string[]>(row.hotel_scope_json, []),
      approvalOrder: json<RoleId[]>(row.approval_order_json, []),
      defaultStrategy: String(row.default_strategy ?? "manual_review_required") as ApprovalRule["defaultStrategy"],
      status: String(row.rule_status) as ApprovalRule["status"],
      versionNo: Number(row.version_no),
      updatedAt: String(row.updated_at)
    };
  }

  private instanceFromRow(row: Row): ApprovalInstance {
    return {
      id: String(row.id),
      businessType: String(row.business_type) as ApprovalBusinessType,
      businessId: String(row.business_id),
      businessTitle: String(row.business_title ?? ""),
      projectId: optionalString(row.project_id),
      orgId: optionalString(row.org_id),
      supplierId: optionalString(row.supplier_id),
      ruleId: optionalString(row.rule_id),
      ruleCode: optionalString(row.rule_code),
      currentNodeIndex: Number(row.current_node_index ?? 0),
      currentRoleId: optionalString(row.current_role_id) as RoleId | undefined,
      currentUserId: optionalString(row.current_user_id),
      approvalStatus: String(row.approval_status) as ApprovalInstanceStatus,
      startedBy: optionalString(row.started_by),
      startedAt: optionalString(row.started_at),
      completedBy: optionalString(row.completed_by),
      completedAt: optionalString(row.completed_at),
      updatedAt: String(row.updated_at)
    };
  }

  private taskFromRow(row: Row): WorkflowTask {
    return {
      id: String(row.id),
      taskCode: String(row.task_code),
      taskType: String(row.task_type),
      businessType: String(row.business_type) as ApprovalBusinessType,
      businessId: String(row.business_id),
      projectId: optionalString(row.project_id),
      title: String(row.title),
      assigneeRoleId: optionalString(row.assignee_role_id) as RoleId | undefined,
      assigneeUserId: optionalString(row.assignee_user_id),
      supplierId: optionalString(row.supplier_id),
      orgId: optionalString(row.org_id),
      approvalInstanceId: optionalString(row.approval_instance_id),
      status: String(row.task_status) as WorkflowTaskStatus,
      dueAt: optionalString(row.due_at),
      createdAt: String(row.created_at),
      completedAt: optionalString(row.completed_at),
      completedBy: optionalString(row.completed_by),
      sourceJson: json<Record<string, unknown>>(row.source_json, {}),
      updatedAt: String(row.updated_at)
    };
  }

  private notificationFromRow(row: Row): WorkflowNotification {
    return {
      id: String(row.id),
      messageCode: String(row.message_code),
      eventType: String(row.event_type),
      businessType: String(row.business_type) as ApprovalBusinessType,
      businessId: String(row.business_id),
      projectId: optionalString(row.project_id),
      recipientUserId: optionalString(row.recipient_user_id),
      recipientRoleId: optionalString(row.recipient_role_id) as RoleId | undefined,
      supplierId: optionalString(row.supplier_id),
      orgId: optionalString(row.org_id),
      title: String(row.title),
      contentSummary: String(row.content_summary),
      read: boolFromSql(row.read_flag),
      createdAt: String(row.created_at),
      readAt: optionalString(row.read_at),
      deliveryChannels: json<string[]>(row.delivery_channels_json, ["in_app"]),
      externalEventStatus: String(row.external_event_status ?? "not_dispatched") as WorkflowNotification["externalEventStatus"],
      sourceJson: json<Record<string, unknown>>(row.source_json, {}),
      updatedAt: String(row.updated_at)
    };
  }

  private canReadWorkflowObject(user: User, roleId: RoleId, item: ApprovalInstance) {
    if (roleId === "admin" || roleId === "system") return false;
    if (isSupplierRole(roleId)) return Boolean(item.supplierId && supplierIdMatches(user, item.supplierId));
    if (roleId === "expert") return item.currentUserId === user.id || item.currentRoleId === "expert";
    if (roleId === "group_manager") return !item.orgId || userOrgScope(user).includes(item.orgId);
    if (isProcurementBuyerRole(roleId)) {
      return Boolean(item.startedBy === user.id || item.currentUserId === user.id || this.canBuyerReadScopedObject(user, item.projectId, item.orgId, item.businessType));
    }
    if (isOrgReaderRole(roleId)) return !item.orgId || userOrgScope(user).includes(item.orgId);
    return false;
  }

  private canReadTask(user: User, roleId: RoleId, task: WorkflowTask) {
    if (roleId === "admin" || roleId === "system") return false;
    if (task.assigneeUserId) return task.assigneeUserId === user.id;
    if (roleId === "auditor") return false;
    if (isSupplierRole(roleId)) return roleMatchesAssignee(roleId, task.assigneeRoleId) && Boolean(task.supplierId && supplierIdMatches(user, task.supplierId));
    if (roleId === "expert") return task.assigneeRoleId === "expert" && (!task.sourceJson?.expertId || task.sourceJson.expertId === user.expertId);
    if (roleId === "group_manager" && task.assigneeRoleId === "group_manager") return !task.orgId || userOrgScope(user).includes(task.orgId);
    if (task.assigneeRoleId === "buyer" && roleId !== "buyer") return false;
    if (!roleMatchesAssignee(roleId, task.assigneeRoleId)) return false;
    if (isProcurementBuyerRole(roleId)) return this.canBuyerReadScopedObject(user, task.projectId, task.orgId, task.businessType);
    if (isOrgReaderRole(roleId)) return !task.orgId || userOrgScope(user).includes(task.orgId);
    return false;
  }

  private canProcessTask(actor: User, task: WorkflowTask) {
    if (["admin", "auditor", "system"].includes(actor.roleId)) return false;
    if (task.assigneeUserId && task.assigneeUserId !== actor.id) return false;
    if (isSupplierRole(actor.roleId)) return roleMatchesAssignee(actor.roleId, task.assigneeRoleId) && supplierIdMatches(actor, task.supplierId);
    if (actor.roleId === "expert") return task.assigneeRoleId === "expert" && (!task.sourceJson?.expertId || task.sourceJson.expertId === actor.expertId);
    if (actor.roleId === "group_manager" && task.assigneeRoleId === "group_manager") return !task.orgId || userOrgScope(actor).includes(task.orgId);
    if (task.assigneeRoleId === "buyer" && actor.roleId !== "buyer") return false;
    if (!roleMatchesAssignee(actor.roleId, task.assigneeRoleId)) return false;
    if (isProcurementBuyerRole(actor.roleId) && !this.canBuyerReadScopedObject(actor, task.projectId, task.orgId, task.businessType)) return false;
    if (task.orgId && !userOrgScope(actor).includes(task.orgId)) return false;
    return true;
  }

  private canReadNotification(user: User, roleId: RoleId, message: WorkflowNotification) {
    if (roleId === "admin" || roleId === "system") return false;
    if (message.recipientUserId) return message.recipientUserId === user.id;
    if (message.recipientRoleId === "buyer" && roleId !== "buyer") return false;
    if (roleMatchesAssignee(roleId, message.recipientRoleId)) {
      if (message.orgId && !userOrgScope(user).includes(message.orgId)) return false;
      if (isSupplierRole(roleId) && message.supplierId && !supplierIdMatches(user, message.supplierId)) return false;
      if (isProcurementBuyerRole(roleId) && !this.canBuyerReadScopedObject(user, message.projectId, message.orgId, message.businessType)) return false;
      return true;
    }
    return false;
  }

  private canBuyerReadScopedObject(user: User, projectId?: string, orgId?: string, businessType?: ApprovalBusinessType) {
    if (projectId) {
      return user.managedProjectIds?.includes(projectId) ?? false;
    }
    if (businessType === "procurement_request" && user.roleId === "buyer") {
      return !orgId || userOrgScope(user).includes(orgId);
    }
    if (!orgId) return true;
    return userOrgScope(user).includes(orgId);
  }

  private ensureExpertScoringTasks(state: SeedState) {
    for (const sheet of state.scoringSheets ?? []) {
      if (["submitted_locked", "resubmitted_locked", "replaced", "archived"].includes(sheet.status)) continue;
      const user = (state.users ?? []).find((item) => item.expertId === sheet.expertId);
      const project = (state.projects ?? []).find((item) => item.id === sheet.projectId);
      this.upsertTask({
        id: `task:expert_scoring:${sheet.id}`,
        taskCode: `TASK-EXPERT-${sheet.id}`,
        taskType: "expert_scoring",
        businessType: "expert_scoring",
        businessId: sheet.id,
        projectId: sheet.projectId,
        orgId: project?.orgId,
        assigneeRoleId: "expert",
        assigneeUserId: user?.id,
        title: `Expert scoring ${sheet.projectId}`,
        sourceJson: { expertId: sheet.expertId, supplierId: sheet.supplierId, status: sheet.status }
      });
    }
  }

  private ensureReturnTasks(state: SeedState) {
    for (const returnRequest of state.mallReturnRequests ?? []) {
      if (returnRequest.status !== "submitted") continue;
      const order = (state.mallOrders ?? []).find((item) => item.id === returnRequest.orderId);
      this.upsertTask({
        id: `task:return_request:${returnRequest.id}`,
        taskCode: `TASK-RETURN-${returnRequest.id}`,
        taskType: "supplier_return_review",
        businessType: "return_request",
        businessId: returnRequest.id,
        orgId: order?.orgId,
        supplierId: order?.supplierId,
        assigneeRoleId: "supplier",
        title: `Supplier return review ${returnRequest.id}`,
        sourceJson: { orderId: returnRequest.orderId, productId: returnRequest.productId }
      });
    }
  }
}
