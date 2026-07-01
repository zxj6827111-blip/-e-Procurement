import {
  isM1ProcessBusinessType,
  type InsertProcessEventArgs,
  type ProcessBusinessType,
  type ProcessEvent,
  type ProcessInstance,
  type ProcessTaskInstance,
  type ProcessRepository,
  type ProcessStatus,
  type ProcessTaskStatus
} from "../repositories/process-repository.js";
import type { InternalBusinessEvent } from "../repositories/internal-business-event-repository.js";
import { isOrgReaderRole, isProcurementBuyerRole, isSupplierRole, roleMatchesAssignee, supplierIdMatches, userOrgScope } from "../role-groups.js";
import type { ApprovalBusinessType, ApprovalInstance, ApprovalInstanceStatus, ProcurementProject, ProcurementRequest, RoleId, Supplier, User, WorkflowTask, WorkflowTaskStatus } from "../types.js";

export interface MirrorApprovalStartedArgs {
  approvalInstance: ApprovalInstance;
  task?: WorkflowTask;
  initiator: User;
  sourceJson?: Record<string, unknown>;
}

export interface MirrorApprovalActionArgs {
  approvalInstance: ApprovalInstance;
  tasks: WorkflowTask[];
  actor: User;
  action: "approve" | "reject" | "return" | "cancel" | "revoke";
  fromStatus: ApprovalInstanceStatus;
  toStatus: ApprovalInstanceStatus;
  opinion?: string;
  sourceJson?: Record<string, unknown>;
}

export interface RecordProcurementRequestCreatedArgs {
  request: ProcurementRequest;
  actor: User;
}

export interface RecordProcurementProjectCreatedArgs {
  request: ProcurementRequest;
  project?: ProcurementProject;
  actor: User;
}

export interface StartSupplierOnboardingArgs {
  supplier: Supplier;
  actor: User;
  supplierAdminUserId?: string;
}

export interface RecordSupplierOnboardingActionArgs {
  supplier: Supplier;
  actor: User;
  action:
    | "profile_submitted"
    | "qualification_passed"
    | "qualification_rejected"
    | "admission_approved"
    | "admission_rejected"
    | "category_authorized"
    | "activated"
    | "restricted";
  detail?: Record<string, unknown>;
}

type SupplierOnboardingTaskDraft = {
  nodeKey: string;
  taskType: string;
  title: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  sourceTaskId: string;
};

type SupplierOnboardingActionMapping = {
  eventCode: string;
  eventName: string;
  fromNodeKey: string;
  toNodeKey: string;
  fromStatus: string;
  toStatus: string;
  processStatus: ProcessStatus;
  completedAt?: string;
  completeTaskIds: (supplierId: string) => string[];
  nextTasks: (supplier: Supplier) => SupplierOnboardingTaskDraft[];
  cancelCompletedTasks: boolean;
};

type SourcingProcessType = "rfq" | "tender" | "direct_purchase";
type ReviewAwardProcessType = "review_award" | "contract_preparation";
type FulfillmentProcessType = "order_fulfillment" | "settlement" | "invoice" | "payment" | "archive";
type ProcessLayerProjectionType = ReviewAwardProcessType | FulfillmentProcessType;

type ProcessLayerTaskDraft = {
  nodeKey: string;
  taskType: string;
  title: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  supplierId?: string;
  sourceTaskId: string;
  sourceJson?: Record<string, unknown>;
};

type SourcingEventMapping = {
  processType: SourcingProcessType;
  eventCode: string;
  eventName: string;
  fromNodeKey: string;
  toNodeKey: string;
  fromStatus: string;
  toStatus: string;
  processStatus: ProcessStatus;
  updateInstance?: boolean;
  completed?: boolean;
  completeTaskSourceIds?: string[];
  nextTasks?: ProcessLayerTaskDraft[];
};

type ProcessLayerEventMapping = {
  processType: ProcessLayerProjectionType;
  eventCode: string;
  eventName: string;
  fromNodeKey: string;
  toNodeKey: string;
  fromStatus: string;
  toStatus: string;
  processStatus: ProcessStatus;
  completed?: boolean;
  completeTaskSourceIds?: string[];
  nextTasks?: ProcessLayerTaskDraft[];
};

export class ProcessService {
  constructor(private readonly processRepository: ProcessRepository) {}

  recordProcurementRequestCreated(args: RecordProcurementRequestCreatedArgs) {
    return this.tryProcessWrite(() => this.recordProcurementRequestCreatedUnsafe(args));
  }

  private recordProcurementRequestCreatedUnsafe(args: RecordProcurementRequestCreatedArgs) {
    const definition = this.processRepository.getDefinition("procurement_request");
    if (!definition) return undefined;
    const existing = this.processRepository.listProcessInstancesByBusiness("procurement_request", args.request.id)[0];
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id ?? `pi:procurement_request:${args.request.id}`,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: "procurement_request",
      businessId: args.request.id,
      businessTitle: args.request.title,
      currentNodeKey: "request_created",
      status: "draft",
      startedBy: args.request.createdBy ?? args.actor.id,
      startedAt: args.request.createdAt,
      orgId: args.request.orgId,
      projectId: args.request.projectId ?? undefined,
      sourceEngine: "process_layer",
      sourceInstanceId: `procurement_request:${args.request.id}`,
      sourceJson: {
        sourceEngine: "process_layer",
        phase: "M4-A",
        mode: "request_created_before_r8",
        methodSuggestion: args.request.methodSuggestion,
        externalTradeFlag: args.request.externalTradeFlag
      }
    });
    this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: "procurement_request.created",
      eventName: "采购需求已创建",
      businessType: "procurement_request",
      businessId: args.request.id,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId,
      fromNodeKey: "start",
      toNodeKey: "request_created",
      fromStatus: "none",
      toStatus: args.request.status ?? "draft",
      payloadJson: {
        sourceEngine: "process_layer",
        reservedFields: ["budgetAmount", "category", "costCenter", "receivingLocation", "attachments"]
      }
    });
    return instance;
  }

  recordProcurementProjectCreated(args: RecordProcurementProjectCreatedArgs) {
    return this.tryProcessWrite(() => this.recordProcurementProjectCreatedUnsafe(args));
  }

  private recordProcurementProjectCreatedUnsafe(args: RecordProcurementProjectCreatedArgs) {
    const definition = this.processRepository.getDefinition("procurement_request");
    if (!definition) return undefined;
    const existing = this.processRepository.listProcessInstancesByBusiness("procurement_request", args.request.id)[0];
    if (!existing) return undefined;
    const instance = this.processRepository.upsertProcessInstance({
      id: existing.id,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: "procurement_request",
      businessId: args.request.id,
      businessTitle: args.request.title,
      currentNodeKey: "project_created",
      status: "completed",
      startedBy: existing.startedBy,
      startedAt: existing.startedAt,
      completedBy: args.actor.id,
      completedAt: args.request.updatedAt,
      orgId: args.request.orgId,
      projectId: args.request.projectId ?? undefined,
      sourceEngine: existing.sourceEngine,
      sourceInstanceId: existing.sourceInstanceId,
      sourceJson: {
        ...existing.sourceJson,
        phase: "M4-A",
        projectId: args.request.projectId
      }
    });
    if (args.project) {
      this.startSourcingProcess({
        project: args.project,
        actor: args.actor,
        source: "procurement_request_project_created"
      });
    }
    this.processRepository.completeProcessTask("process_layer", `procurement_request:${args.request.id}:method_decision`, args.actor.id);
    this.processRepository.completeProcessTask("process_layer", `procurement_request:${args.request.id}:project_generation`, args.actor.id);
    this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: "procurement_request.project_created",
      eventName: "采购项目已生成",
      businessType: "procurement_request",
      businessId: args.request.id,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId,
      fromNodeKey: "method_decision",
      toNodeKey: "project_created",
      fromStatus: "method_decided",
      toStatus: "project_created",
      payloadJson: {
        sourceEngine: "process_layer",
        projectId: args.request.projectId
      }
    });
    return instance;
  }

  startSourcingProcess(args: { project: ProcurementProject; actor: User; source?: string }) {
    return this.tryProcessWrite(() => this.startSourcingProcessUnsafe(args));
  }

  private startSourcingProcessUnsafe(args: { project: ProcurementProject; actor: User; source?: string }) {
    const processType = sourcingProcessType(args.project.type);
    const definition = this.processRepository.getDefinition(processType);
    if (!definition) return undefined;
    const currentNodeKey = sourcingInitialNode(processType);
    const existing = this.processRepository.listProcessInstancesByBusiness(processType, args.project.id)[0];
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id ?? `pi:${processType}:${args.project.id}`,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: processType,
      businessId: args.project.id,
      businessTitle: args.project.name,
      currentNodeKey,
      status: "running",
      startedBy: existing?.startedBy ?? args.actor.id,
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      orgId: args.project.orgId,
      projectId: args.project.id,
      sourceEngine: "process_layer",
      sourceInstanceId: `${processType}:${args.project.id}`,
      sourceJson: {
        ...(existing?.sourceJson ?? {}),
        sourceEngine: "process_layer",
        phase: "M4-B",
        projectType: args.project.type,
        source: args.source
      }
    });
    this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: `${processType}.project_created`,
      eventName: sourcingProjectCreatedName(processType),
      businessType: processType,
      businessId: args.project.id,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId,
      fromNodeKey: "start",
      toNodeKey: currentNodeKey,
      fromStatus: "none",
      toStatus: String(args.project.status),
      payloadJson: {
        sourceEngine: "process_layer",
        projectType: args.project.type,
        phase: "M4-B"
      }
    });
    if (!existing) {
      for (const task of sourcingInitialTasks(processType, args.project)) {
        this.upsertProcessLayerTask({
          processInstanceId: instance.id,
          businessType: processType,
          businessId: args.project.id,
          orgId: args.project.orgId,
          projectId: args.project.id,
          phase: "M4-B",
          ...task
        });
      }
    }
    return instance;
  }

  startSupplierOnboarding(args: StartSupplierOnboardingArgs) {
    return this.tryProcessWrite(() => this.startSupplierOnboardingUnsafe(args));
  }

  private startSupplierOnboardingUnsafe(args: StartSupplierOnboardingArgs) {
    const definition = this.processRepository.getDefinition("supplier_onboarding");
    if (!definition) return undefined;
    const existing = this.processRepository.listProcessInstancesByBusiness("supplier_onboarding", args.supplier.id)[0];
    const startedAt = args.supplier.registrationTrace?.submittedAt ?? new Date().toISOString();
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id ?? `pi:supplier_onboarding:${args.supplier.id}`,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: "supplier_onboarding",
      businessId: args.supplier.id,
      businessTitle: args.supplier.name,
      currentNodeKey: "profile_completion",
      status: "running",
      startedBy: args.actor.id,
      startedAt,
      supplierId: args.supplier.id,
      sourceEngine: "process_layer",
      sourceInstanceId: `supplier_onboarding:${args.supplier.id}`,
      sourceJson: {
        sourceEngine: "process_layer",
        phase: "M4-A",
        reservedFields: ["legalRepresentative", "socialCreditCode", "contact", "licenseValidUntil", "categoryScope", "serviceRegions"]
      }
    });
    this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: "supplier_onboarding.registered",
      eventName: "供应商已注册",
      businessType: "supplier_onboarding",
      businessId: args.supplier.id,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId,
      fromNodeKey: "start",
      toNodeKey: "registered",
      fromStatus: "none",
      toStatus: args.supplier.admissionStatus ?? args.supplier.status,
      payloadJson: {
        sourceEngine: "process_layer",
        supplierAdminUserId: args.supplierAdminUserId
      }
    });
    this.upsertProcessLayerTask({
      processInstanceId: instance.id,
      nodeKey: "profile_completion",
      taskType: "supplier_profile_completion",
      businessType: "supplier_onboarding",
      businessId: args.supplier.id,
      title: `${args.supplier.name} 资料补全`,
      assigneeRoleId: "supplier",
      assigneeUserId: args.supplierAdminUserId,
      supplierId: args.supplier.id,
      sourceTaskId: `supplier_onboarding:${args.supplier.id}:profile_completion`
    });
    return instance;
  }

  recordSupplierOnboardingAction(args: RecordSupplierOnboardingActionArgs) {
    return this.tryProcessWrite(() => this.recordSupplierOnboardingActionUnsafe(args));
  }

  private recordSupplierOnboardingActionUnsafe(args: RecordSupplierOnboardingActionArgs) {
    const definition = this.processRepository.getDefinition("supplier_onboarding");
    if (!definition) return undefined;
    const existing = this.processRepository.listProcessInstancesByBusiness("supplier_onboarding", args.supplier.id)[0];
    const mapping = supplierOnboardingActionMapping(args.action, args.supplier);
    const completed = mapping.processStatus === "completed" || mapping.processStatus === "rejected" || mapping.processStatus === "cancelled";
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id ?? `pi:supplier_onboarding:${args.supplier.id}`,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: "supplier_onboarding",
      businessId: args.supplier.id,
      businessTitle: args.supplier.name,
      currentNodeKey: mapping.toNodeKey,
      status: mapping.processStatus,
      startedBy: existing?.startedBy,
      startedAt: existing?.startedAt ?? args.supplier.registrationTrace?.submittedAt,
      completedBy: completed ? args.actor.id : existing?.completedBy,
      completedAt: completed ? mapping.completedAt : existing?.completedAt,
      supplierId: args.supplier.id,
      sourceEngine: "process_layer",
      sourceInstanceId: `supplier_onboarding:${args.supplier.id}`,
      sourceJson: {
        ...(existing?.sourceJson ?? {}),
        sourceEngine: "process_layer",
        phase: "M4-A"
      }
    });
    for (const sourceTaskId of mapping.completeTaskIds(args.supplier.id)) {
      this.processRepository.completeProcessTask("process_layer", sourceTaskId, args.actor.id, mapping.cancelCompletedTasks ? "cancelled" : "completed");
    }
    for (const task of mapping.nextTasks(args.supplier)) {
      this.upsertProcessLayerTask({
        processInstanceId: instance.id,
        businessType: "supplier_onboarding",
        businessId: args.supplier.id,
        supplierId: args.supplier.id,
        ...task
      });
    }
    this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: mapping.eventCode,
      eventName: mapping.eventName,
      businessType: "supplier_onboarding",
      businessId: args.supplier.id,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId,
      fromNodeKey: mapping.fromNodeKey,
      toNodeKey: mapping.toNodeKey,
      fromStatus: mapping.fromStatus,
      toStatus: mapping.toStatus,
      payloadJson: {
        sourceEngine: "process_layer",
        action: args.action,
        ...(args.detail ?? {})
      }
    });
    return instance;
  }

  private tryProcessWrite<T>(write: () => T) {
    try {
      return write();
    } catch {
      return undefined;
    }
  }

  mirrorApprovalStarted(args: MirrorApprovalStartedArgs) {
    if (!isM1ProcessBusinessType(args.approvalInstance.businessType)) return undefined;
    const definition = this.processRepository.getDefinition(args.approvalInstance.businessType);
    if (!definition) return undefined;
    const existing =
      this.processRepository.getProcessInstanceBySource("r8_workflow", args.approvalInstance.id) ??
      this.processRepository.listProcessInstancesByBusiness(args.approvalInstance.businessType, args.approvalInstance.businessId)[0];
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: args.approvalInstance.businessType,
      businessId: args.approvalInstance.businessId,
      businessTitle: args.approvalInstance.businessTitle,
      currentNodeKey: nodeKeyFromApprovalStatus(args.approvalInstance.approvalStatus, args.approvalInstance.businessType),
      status: processStatusFromApproval(args.approvalInstance.approvalStatus, args.approvalInstance.businessType),
      startedBy: args.approvalInstance.startedBy,
      startedAt: args.approvalInstance.startedAt,
      completedBy: args.approvalInstance.completedBy,
      completedAt: args.approvalInstance.completedAt,
      orgId: args.approvalInstance.orgId,
      supplierId: args.approvalInstance.supplierId,
      projectId: args.approvalInstance.projectId,
      sourceEngine: "r8_workflow",
      sourceInstanceId: args.approvalInstance.id,
      sourceJson: {
        sourceEngine: "r8_workflow",
        phase: "M4-A",
        mode: "shadow",
        ruleId: args.approvalInstance.ruleId,
        ruleCode: args.approvalInstance.ruleCode,
        ...(args.sourceJson ?? {})
      }
    });
    if (args.task) this.mirrorTask(instance.id, args.task);
    if (!existing) {
      this.processRepository.insertProcessEvent({
        processInstanceId: instance.id,
        eventCode: `${args.approvalInstance.businessType}.submitted`,
        eventName: eventName(args.approvalInstance.businessType, "submitted"),
        businessType: args.approvalInstance.businessType,
        businessId: args.approvalInstance.businessId,
        actorId: args.initiator.id,
        actorRoleId: args.initiator.roleId,
        fromNodeKey: args.approvalInstance.businessType === "procurement_request" ? "request_created" : "start",
        toNodeKey: "approval_pending",
        fromStatus: "draft",
        toStatus: args.approvalInstance.approvalStatus,
        payloadJson: {
          sourceEngine: "r8_workflow",
          sourceInstanceId: args.approvalInstance.id,
          sourceTaskId: args.task?.id,
          ...(args.sourceJson ?? {})
        }
      });
    }
    return instance;
  }

  mirrorApprovalActionRecorded(args: MirrorApprovalActionArgs) {
    if (!isM1ProcessBusinessType(args.approvalInstance.businessType)) return undefined;
    const definition = this.processRepository.getDefinition(args.approvalInstance.businessType);
    if (!definition) return undefined;
    const instance = this.processRepository.upsertProcessInstance({
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: args.approvalInstance.businessType,
      businessId: args.approvalInstance.businessId,
      businessTitle: args.approvalInstance.businessTitle,
      currentNodeKey: nodeKeyFromApprovalStatus(args.approvalInstance.approvalStatus, args.approvalInstance.businessType),
      status: processStatusFromApproval(args.approvalInstance.approvalStatus, args.approvalInstance.businessType),
      startedBy: args.approvalInstance.startedBy,
      startedAt: args.approvalInstance.startedAt,
      completedBy: args.approvalInstance.completedBy,
      completedAt: args.approvalInstance.completedAt,
      orgId: args.approvalInstance.orgId,
      supplierId: args.approvalInstance.supplierId,
      projectId: args.approvalInstance.projectId,
      sourceEngine: "r8_workflow",
      sourceInstanceId: args.approvalInstance.id,
      sourceJson: {
        sourceEngine: "r8_workflow",
        phase: "M4-A",
        mode: "shadow",
        ruleId: args.approvalInstance.ruleId,
        ruleCode: args.approvalInstance.ruleCode,
        ...(args.sourceJson ?? {})
      }
    });
    for (const task of args.tasks) this.mirrorTask(instance.id, task);
    this.processRepository.insertProcessEvent({
      processInstanceId: instance.id,
      eventCode: `${args.approvalInstance.businessType}.${args.toStatus}`,
      eventName: eventName(args.approvalInstance.businessType, args.toStatus),
      businessType: args.approvalInstance.businessType,
      businessId: args.approvalInstance.businessId,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId,
      fromNodeKey: nodeKeyFromApprovalStatus(args.fromStatus, args.approvalInstance.businessType),
      toNodeKey: nodeKeyFromApprovalStatus(args.toStatus, args.approvalInstance.businessType),
      fromStatus: args.fromStatus,
      toStatus: args.toStatus,
      payloadJson: {
        sourceEngine: "r8_workflow",
        sourceInstanceId: args.approvalInstance.id,
        sourceAction: args.action,
        opinion: args.opinion,
        ...(args.sourceJson ?? {})
      }
    });
    return instance;
  }

  recordInternalBusinessEvent(event: InternalBusinessEvent) {
    const sourcingProjection = this.recordSourcingInternalBusinessEvent(event);
    const reviewAwardProjection = this.recordReviewAwardInternalBusinessEvent(event);
    const fulfillmentProjection = this.recordFulfillmentInternalBusinessEvent(event);
    if (fulfillmentProjection) return fulfillmentProjection;
    if (reviewAwardProjection) return reviewAwardProjection;
    if (sourcingProjection) return sourcingProjection;
    if (!isM1ProcessBusinessType(event.businessType)) return undefined;
    const businessType = event.businessType as ApprovalBusinessType;
    const mapping = processEventMapping(event.eventCode, businessType);
    if (!mapping) return undefined;
    const instance =
      (event.processInstanceId ? this.processRepository.getProcessInstance(event.processInstanceId) : undefined) ??
      this.processRepository.listProcessInstancesByBusiness(businessType, event.businessId)[0];
    if (!instance) return undefined;
    if (event.eventCode === "ProcurementRequestApproved") {
      mapping.nextTask = {
        nodeKey: "method_decision",
        taskType: "procurement_method_decision",
        title: `${instance.businessTitle} 采购方式决策`,
        assigneeRoleId: "buyer",
        sourceTaskId: `procurement_request:${event.businessId}:method_decision`
      };
    }
    if (event.eventCode === "ProcurementMethodDecided") {
      mapping.completeTaskSourceId = `procurement_request:${event.businessId}:method_decision`;
      mapping.nextTask = {
        nodeKey: "project_created",
        taskType: "procurement_project_generation",
        title: `${instance.businessTitle} 生成采购项目`,
        assigneeRoleId: "buyer",
        sourceTaskId: `procurement_request:${event.businessId}:project_generation`
      };
    }
    if (mapping.updateInstance) {
      const definition = this.processRepository.getDefinition(businessType);
      if (definition) {
        this.processRepository.upsertProcessInstance({
          id: instance.id,
          processDefinitionId: definition.id,
          processCode: definition.processCode,
          businessType,
          businessId: instance.businessId,
          businessTitle: instance.businessTitle,
          currentNodeKey: mapping.toNodeKey ?? instance.currentNodeKey,
          status: mapping.processStatus ?? instance.status,
          startedBy: instance.startedBy,
          startedAt: instance.startedAt,
          completedBy: mapping.completedBy ?? instance.completedBy,
          completedAt: mapping.completedAt ?? instance.completedAt,
          orgId: instance.orgId,
          supplierId: instance.supplierId,
          projectId: event.projectId ?? mapping.projectId ?? instance.projectId,
          sourceEngine: instance.sourceEngine,
          sourceInstanceId: instance.sourceInstanceId,
          sourceJson: {
            ...instance.sourceJson,
            phase: "M4-A"
          }
        });
      }
    }
    if (mapping.completeTaskSourceId) {
      this.processRepository.completeProcessTask("process_layer", mapping.completeTaskSourceId, event.actorId ?? "system");
    }
    if (mapping.nextTask) {
      this.upsertProcessLayerTask({
        processInstanceId: instance.id,
        businessType,
        businessId: event.businessId,
        orgId: event.orgId,
        projectId: event.projectId,
        ...mapping.nextTask
      });
    }
    const args: InsertProcessEventArgs = {
      processInstanceId: instance.id,
      eventCode: mapping.eventCode,
      eventName: mapping.eventName,
      businessType,
      businessId: event.businessId,
      actorId: event.actorId,
      actorRoleId: event.actorRoleId,
      fromNodeKey: mapping.fromNodeKey,
      toNodeKey: mapping.toNodeKey,
      fromStatus: mapping.fromStatus,
      toStatus: mapping.toStatus,
      payloadJson: {
        sourceEngine: "internal_event_bus",
        sourceEventId: event.id,
        eventCode: event.eventCode
      }
    };
    return this.insertUniqueEvent(args);
  }

  private recordSourcingInternalBusinessEvent(event: InternalBusinessEvent) {
    const mapping = sourcingEventMapping(event);
    if (!mapping) return undefined;
    const instance =
      (event.processInstanceId ? this.processRepository.getProcessInstance(event.processInstanceId) : undefined) ??
      this.processRepository.listProcessInstancesByBusiness(mapping.processType, event.projectId ?? event.businessId)[0];
    if (!instance) return undefined;
    if (mapping.updateInstance) {
      const definition = this.processRepository.getDefinition(mapping.processType);
      if (definition) {
        this.processRepository.upsertProcessInstance({
          id: instance.id,
          processDefinitionId: definition.id,
          processCode: definition.processCode,
          businessType: mapping.processType,
          businessId: instance.businessId,
          businessTitle: instance.businessTitle,
          currentNodeKey: mapping.toNodeKey,
          status: mapping.processStatus,
          startedBy: instance.startedBy,
          startedAt: instance.startedAt,
          completedBy: mapping.completed ? event.actorId : instance.completedBy,
          completedAt: mapping.completed ? event.eventTime : instance.completedAt,
          orgId: event.orgId ?? instance.orgId,
          supplierId: instance.supplierId,
          projectId: event.projectId ?? instance.projectId,
          sourceEngine: instance.sourceEngine,
          sourceInstanceId: instance.sourceInstanceId,
          sourceJson: {
            ...instance.sourceJson,
            phase: "M4-B",
            lastEventCode: event.eventCode
          }
        });
      }
    }
    for (const sourceTaskId of mapping.completeTaskSourceIds ?? []) {
      this.processRepository.completeProcessTask("process_layer", sourceTaskId, event.actorId ?? "system");
    }
    for (const task of mapping.nextTasks ?? []) {
      this.upsertProcessLayerTask({
        processInstanceId: instance.id,
        businessType: mapping.processType,
        businessId: instance.businessId,
        orgId: event.orgId ?? instance.orgId,
        projectId: event.projectId ?? instance.projectId,
        supplierId: task.supplierId,
        phase: "M4-B",
        nodeKey: task.nodeKey,
        taskType: task.taskType,
        title: task.title,
        assigneeRoleId: task.assigneeRoleId,
        sourceTaskId: task.sourceTaskId
      });
    }
    return this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: mapping.eventCode,
      eventName: mapping.eventName,
      businessType: mapping.processType,
      businessId: instance.businessId,
      actorId: event.actorId,
      actorRoleId: event.actorRoleId,
      fromNodeKey: mapping.fromNodeKey,
      toNodeKey: mapping.toNodeKey,
      fromStatus: mapping.fromStatus,
      toStatus: mapping.toStatus,
      payloadJson: {
        sourceEngine: "internal_event_bus",
        sourceEventId: event.id,
        sourceBusinessType: event.businessType,
        sourceBusinessId: event.businessId,
        eventCode: event.eventCode
      }
    });
  }

  private recordReviewAwardInternalBusinessEvent(event: InternalBusinessEvent) {
    const mappings = [reviewAwardEventMapping(event), contractPreparationEventMapping(event)].filter((mapping): mapping is ProcessLayerEventMapping => Boolean(mapping));
    let projection: ProcessEvent | undefined;
    for (const mapping of mappings) {
      projection = this.recordReviewAwardProcessEvent(event, mapping) ?? projection;
    }
    return projection;
  }

  private recordReviewAwardProcessEvent(event: InternalBusinessEvent, mapping: ProcessLayerEventMapping) {
    const projectId = String(event.projectId ?? event.payloadJson.projectId ?? event.businessId);
    const businessId = projectId;
    const definition = this.processRepository.getDefinition(mapping.processType);
    if (!definition) return undefined;
    const existing = this.processRepository.listProcessInstancesByBusiness(mapping.processType, businessId)[0];
    const title = String(event.businessTitle ?? event.payloadJson.projectName ?? event.payloadJson.title ?? businessId);
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id ?? `pi:${mapping.processType}:${businessId}`,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: mapping.processType,
      businessId,
      businessTitle: title,
      currentNodeKey: mapping.toNodeKey,
      status: mapping.processStatus,
      startedBy: existing?.startedBy ?? event.actorId,
      startedAt: existing?.startedAt ?? event.eventTime,
      completedBy: mapping.completed ? event.actorId : existing?.completedBy,
      completedAt: mapping.completed ? event.eventTime : existing?.completedAt,
      orgId: event.orgId ?? existing?.orgId,
      supplierId: event.supplierId ?? existing?.supplierId,
      projectId,
      sourceEngine: "process_layer",
      sourceInstanceId: `${mapping.processType}:${businessId}`,
      sourceJson: {
        ...(existing?.sourceJson ?? {}),
        sourceEngine: "process_layer",
        phase: "M4-C",
        lastEventCode: event.eventCode
      }
    });
    for (const sourceTaskId of mapping.completeTaskSourceIds ?? []) {
      this.processRepository.completeProcessTask("process_layer", sourceTaskId, event.actorId ?? "system");
    }
    for (const task of mapping.nextTasks ?? []) {
      this.upsertProcessLayerTask({
        processInstanceId: instance.id,
        businessType: mapping.processType,
        businessId,
        orgId: event.orgId ?? instance.orgId,
        projectId,
        supplierId: task.supplierId,
        phase: "M4-C",
        nodeKey: task.nodeKey,
        taskType: task.taskType,
        title: task.title,
        assigneeRoleId: task.assigneeRoleId,
        assigneeUserId: task.assigneeUserId,
        sourceTaskId: task.sourceTaskId,
        sourceJson: task.sourceJson
      });
    }
    return this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: mapping.eventCode,
      eventName: mapping.eventName,
      businessType: mapping.processType,
      businessId,
      actorId: event.actorId,
      actorRoleId: event.actorRoleId,
      fromNodeKey: mapping.fromNodeKey,
      toNodeKey: mapping.toNodeKey,
      fromStatus: mapping.fromStatus,
      toStatus: mapping.toStatus,
      payloadJson: {
        sourceEngine: "internal_event_bus",
        sourceEventId: event.id,
        sourceBusinessType: event.businessType,
        sourceBusinessId: event.businessId,
        eventCode: event.eventCode
      }
    });
  }

  private recordFulfillmentInternalBusinessEvent(event: InternalBusinessEvent) {
    const mappings = fulfillmentEventMappings(event);
    let projection: ProcessEvent | undefined;
    for (const mapping of mappings) {
      projection = this.recordFulfillmentProcessEvent(event, mapping) ?? projection;
    }
    return projection;
  }

  private recordFulfillmentProcessEvent(event: InternalBusinessEvent, mapping: ProcessLayerEventMapping) {
    const businessId =
      mapping.processType === "settlement" && typeof event.payloadJson.settlementBillId === "string"
        ? event.payloadJson.settlementBillId
        : mapping.processType === "archive" && typeof event.payloadJson.projectId === "string"
          ? event.payloadJson.projectId
          : event.businessId;
    const projectId = event.projectId ?? (typeof event.payloadJson.projectId === "string" ? event.payloadJson.projectId : undefined);
    const definition = this.processRepository.getDefinition(mapping.processType);
    if (!definition) return undefined;
    const existing = this.processRepository.listProcessInstancesByBusiness(mapping.processType, businessId)[0];
    const title = String(event.businessTitle ?? event.payloadJson.title ?? event.payloadJson.orderNo ?? event.payloadJson.billNo ?? businessId);
    const instance = this.processRepository.upsertProcessInstance({
      id: existing?.id ?? `pi:${mapping.processType}:${businessId}`,
      processDefinitionId: definition.id,
      processCode: definition.processCode,
      businessType: mapping.processType,
      businessId,
      businessTitle: title,
      currentNodeKey: mapping.toNodeKey,
      status: mapping.processStatus,
      startedBy: existing?.startedBy ?? event.actorId,
      startedAt: existing?.startedAt ?? event.eventTime,
      completedBy: mapping.completed ? event.actorId : existing?.completedBy,
      completedAt: mapping.completed ? event.eventTime : existing?.completedAt,
      orgId: event.orgId ?? existing?.orgId,
      supplierId: event.supplierId ?? existing?.supplierId,
      projectId: projectId ?? existing?.projectId,
      sourceEngine: "process_layer",
      sourceInstanceId: `${mapping.processType}:${businessId}`,
      sourceJson: {
        ...(existing?.sourceJson ?? {}),
        sourceEngine: "process_layer",
        phase: "M4-D",
        lastEventCode: event.eventCode
      }
    });
    for (const sourceTaskId of mapping.completeTaskSourceIds ?? []) {
      this.processRepository.completeProcessTask("process_layer", sourceTaskId, event.actorId ?? "system");
    }
    for (const task of mapping.nextTasks ?? []) {
      this.upsertProcessLayerTask({
        processInstanceId: instance.id,
        businessType: mapping.processType,
        businessId,
        orgId: event.orgId ?? instance.orgId,
        projectId: projectId ?? instance.projectId,
        supplierId: task.supplierId ?? event.supplierId ?? instance.supplierId,
        phase: "M4-D",
        nodeKey: task.nodeKey,
        taskType: task.taskType,
        title: task.title,
        assigneeRoleId: task.assigneeRoleId,
        assigneeUserId: task.assigneeUserId,
        sourceTaskId: task.sourceTaskId,
        sourceJson: task.sourceJson
      });
    }
    return this.insertUniqueEvent({
      processInstanceId: instance.id,
      eventCode: mapping.eventCode,
      eventName: mapping.eventName,
      businessType: mapping.processType,
      businessId,
      actorId: event.actorId,
      actorRoleId: event.actorRoleId,
      fromNodeKey: mapping.fromNodeKey,
      toNodeKey: mapping.toNodeKey,
      fromStatus: mapping.fromStatus,
      toStatus: mapping.toStatus,
      payloadJson: {
        sourceEngine: "internal_event_bus",
        sourceEventId: event.id,
        sourceBusinessType: event.businessType,
        sourceBusinessId: event.businessId,
        eventCode: event.eventCode
      }
    });
  }

  listReadableInstances(user: User, roleId: RoleId) {
    return this.processRepository.listProcessInstances().filter((instance) => this.canReadProcessInstance(user, roleId, instance)).map((instance) => this.toProcessInstanceView(instance));
  }

  listReadableTasks(user: User, roleId: RoleId) {
    return this.processRepository
      .listProcessInstances()
      .filter((instance) => this.canReadProcessInstance(user, roleId, instance))
      .flatMap((instance) =>
        this.processRepository
          .listProcessTasksByInstance(instance.id)
          .filter((task) => this.canReadProcessTask(user, roleId, task))
          .map((task) => this.toProcessTaskView(task, instance))
      );
  }

  getReadableInstance(instanceId: string, user: User, roleId: RoleId) {
    const instance = this.processRepository.getProcessInstance(instanceId);
    if (!instance || !this.canReadProcessInstance(user, roleId, instance)) return undefined;
    return {
      processInstance: this.toProcessInstanceView(instance),
      tasks: this.processRepository.listProcessTasksByInstance(instance.id).filter((task) => this.canReadProcessTask(user, roleId, task)).map((task) => this.toProcessTaskView(task, instance)),
      events: this.processRepository.listProcessEventsByInstance(instance.id).map((event) => this.toProcessEventView(event))
    };
  }

  getReadableBusinessProcess(businessType: ProcessBusinessType, businessId: string, user: User, roleId: RoleId) {
    const instances = this.processRepository.listProcessInstancesByBusiness(businessType, businessId).filter((instance) => this.canReadProcessInstance(user, roleId, instance));
    const processInstanceIds = new Set(instances.map((instance) => instance.id));
    return {
      processInstances: instances.map((instance) => this.toProcessInstanceView(instance)),
      tasks: instances.flatMap((instance) => this.processRepository.listProcessTasksByInstance(instance.id).filter((task) => this.canReadProcessTask(user, roleId, task)).map((task) => this.toProcessTaskView(task, instance))),
      events: instances.flatMap((instance) => this.processRepository.listProcessEventsByInstance(instance.id)).filter((event) => processInstanceIds.has(event.processInstanceId)).map((event) => this.toProcessEventView(event))
    };
  }

  canReadProcessInstance(user: User, roleId: RoleId, instance: ProcessInstance) {
    if (roleId === "admin" || roleId === "system") return false;
    if (instance.businessType === "supplier_onboarding") {
      if (isSupplierRole(roleId)) return Boolean(instance.supplierId && supplierIdMatches(user, instance.supplierId));
      if (roleId === "expert") return false;
      if (roleId === "auditor") return true;
      if (roleId === "group_manager") return true;
      if (isProcurementBuyerRole(roleId)) return true;
      return false;
    }
    if (isSourcingProcessType(instance.businessType)) {
      if (isSupplierRole(roleId)) {
        if (instance.supplierId && supplierIdMatches(user, instance.supplierId)) return true;
        return this.processRepository.listProcessTasksByInstance(instance.id).some((task) => Boolean(task.supplierId && supplierIdMatches(user, task.supplierId)));
      }
      if (roleId === "expert" || roleId === "finance_reviewer" || roleId === "hotel_finance") return false;
      if (roleId === "auditor") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
      if (roleId === "group_manager") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
      if (isProcurementBuyerRole(roleId)) return this.canBuyerReadScopedProcess(user, instance.projectId, instance.orgId, instance.businessType);
      return false;
    }
    if (isReviewAwardProcessType(instance.businessType)) {
      if (isSupplierRole(roleId)) return false;
      if (roleId === "finance_reviewer" || roleId === "hotel_finance") return false;
      if (roleId === "expert") return this.processRepository.listProcessTasksByInstance(instance.id).some((task) => this.isExpertScopedTask(user, task));
      if (roleId === "auditor") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
      if (roleId === "group_manager") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
      if (isProcurementBuyerRole(roleId)) return this.canBuyerReadScopedProcess(user, instance.projectId, instance.orgId, instance.businessType);
      return false;
    }
    if (isFulfillmentProcessType(instance.businessType)) {
      if (isSupplierRole(roleId)) return Boolean(instance.supplierId && supplierIdMatches(user, instance.supplierId));
      if (roleId === "expert") return false;
      if (roleId === "auditor") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
      if (roleId === "finance_reviewer" || roleId === "hotel_finance") return ["settlement", "invoice", "payment"].includes(instance.businessType) && (!instance.orgId || userOrgScope(user).includes(instance.orgId));
      if (roleId === "group_manager") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
      if (isProcurementBuyerRole(roleId)) return this.canBuyerReadScopedProcess(user, instance.projectId, instance.orgId, instance.businessType);
      return false;
    }
    if (isSupplierRole(roleId)) return Boolean(instance.supplierId && supplierIdMatches(user, instance.supplierId));
    if (roleId === "expert") return false;
    if (roleId === "group_manager") return !instance.orgId || userOrgScope(user).includes(instance.orgId);
    if (isProcurementBuyerRole(roleId)) {
      if (instance.startedBy === user.id) return true;
      return this.canBuyerReadScopedProcess(user, instance.projectId, instance.orgId, instance.businessType);
    }
    if (isOrgReaderRole(roleId)) return !instance.orgId || userOrgScope(user).includes(instance.orgId);
    return false;
  }

  private mirrorTask(processInstanceId: string, task: WorkflowTask) {
    this.processRepository.upsertProcessTask({
      processInstanceId,
      nodeKey: task.businessType === "procurement_request" && task.status === "pending" ? "approval_pending" : nodeKeyFromTaskStatus(task.status, task.businessType),
      taskType: task.taskType,
      businessType: task.businessType,
      businessId: task.businessId,
      title: task.title,
      assigneeRoleId: task.assigneeRoleId,
      assigneeUserId: task.assigneeUserId,
      supplierId: task.supplierId,
      orgId: task.orgId,
      projectId: task.projectId,
      status: processTaskStatusFromWorkflow(task.status),
      dueAt: task.dueAt,
      completedBy: task.completedBy,
      completedAt: task.completedAt,
      sourceEngine: "r8_workflow",
      sourceTaskId: task.id,
      sourceJson: {
        sourceEngine: "r8_workflow",
        approvalInstanceId: task.approvalInstanceId,
        taskCode: task.taskCode,
        ...(task.sourceJson ?? {})
      },
      createdAt: task.createdAt
    });
  }

  private canReadProcessTask(user: User, roleId: RoleId, task: ProcessTaskInstance) {
    if (roleId === "admin" || roleId === "system") return false;
    if (task.assigneeUserId) return task.assigneeUserId === user.id;
    if (roleId === "auditor") return false;
    if (roleId === "expert") return this.isExpertScopedTask(user, task);
    if (isSupplierRole(roleId)) return roleMatchesAssignee(roleId, task.assigneeRoleId) && Boolean(task.supplierId && supplierIdMatches(user, task.supplierId));
    if ((roleId === "finance_reviewer" || roleId === "hotel_finance") && isReviewAwardProcessType(task.businessType)) return false;
    if (roleId === "finance_reviewer" || roleId === "hotel_finance") {
      return ["settlement", "invoice", "payment"].includes(task.businessType) && roleMatchesAssignee(roleId, task.assigneeRoleId) && (!task.orgId || userOrgScope(user).includes(task.orgId));
    }
    if (roleId === "group_manager" && task.assigneeRoleId === "group_manager") return !task.orgId || userOrgScope(user).includes(task.orgId);
    if (task.assigneeRoleId === "buyer" && !isProcurementBuyerRole(roleId)) return false;
    if (!roleMatchesAssignee(roleId, task.assigneeRoleId)) return false;
    if (isProcurementBuyerRole(roleId)) return this.canBuyerReadScopedProcess(user, task.projectId, task.orgId, task.businessType);
    if (isOrgReaderRole(roleId)) return !task.orgId || userOrgScope(user).includes(task.orgId);
    return false;
  }

  private isExpertScopedTask(user: User, task: ProcessTaskInstance) {
    if (task.assigneeRoleId !== "expert" || !user.expertId) return false;
    return task.sourceJson.expertId === user.expertId;
  }

  private upsertProcessLayerTask(args: {
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
    sourceTaskId: string;
    phase?: "M4-A" | "M4-B" | "M4-C" | "M4-D";
    sourceJson?: Record<string, unknown>;
  }) {
    return this.processRepository.upsertProcessTask({
      ...args,
      status: "pending",
      sourceEngine: "process_layer",
      sourceJson: {
        sourceEngine: "process_layer",
        phase: args.phase ?? "M4-A",
        ...(args.sourceJson ?? {})
      }
    });
  }

  private insertUniqueEvent(args: InsertProcessEventArgs) {
    if (this.processRepository.getProcessEventByBusinessCode(args.businessType, args.businessId, args.eventCode)) return undefined;
    return this.processRepository.insertProcessEvent(args);
  }

  private canBuyerReadScopedProcess(user: User, projectId?: string, orgId?: string, businessType?: ProcessBusinessType) {
    if (projectId) return user.managedProjectIds?.includes(projectId) ?? false;
    if (businessType === "procurement_request" && user.roleId === "buyer") return !orgId || userOrgScope(user).includes(orgId);
    if (businessType === "supplier_onboarding" && user.roleId === "buyer") return true;
    if (businessType && isSourcingProcessType(businessType) && user.roleId === "buyer") return !orgId || userOrgScope(user).includes(orgId);
    if (!orgId) return true;
    return userOrgScope(user).includes(orgId);
  }

  private toProcessInstanceView(instance: ProcessInstance) {
    return {
      id: instance.id,
      processDefinitionId: instance.processDefinitionId,
      processCode: instance.processCode,
      businessType: instance.businessType,
      businessId: instance.businessId,
      businessTitle: instance.businessTitle,
      currentNodeKey: instance.currentNodeKey,
      status: instance.status,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      orgId: instance.orgId,
      supplierId: instance.supplierId,
      projectId: instance.projectId,
      sourceEngine: instance.sourceEngine,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt
    };
  }

  private toProcessTaskView(task: ProcessTaskInstance, instance?: ProcessInstance) {
    return {
      id: task.id,
      processInstanceId: task.processInstanceId,
      processStatus: instance?.status,
      processCurrentNodeKey: instance?.currentNodeKey,
      processStartedAt: instance?.startedAt,
      processCompletedAt: instance?.completedAt,
      businessTitle: instance?.businessTitle,
      nodeKey: task.nodeKey,
      taskType: task.taskType,
      businessType: task.businessType,
      businessId: task.businessId,
      title: task.title,
      assigneeRoleId: task.assigneeRoleId,
      supplierId: task.supplierId,
      orgId: task.orgId,
      projectId: task.projectId,
      status: task.status,
      dueAt: task.dueAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  private toProcessEventView(event: ProcessEvent) {
    return {
      id: event.id,
      processInstanceId: event.processInstanceId,
      eventCode: event.eventCode,
      eventName: event.eventName,
      businessType: event.businessType,
      businessId: event.businessId,
      fromNodeKey: event.fromNodeKey,
      toNodeKey: event.toNodeKey,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      createdAt: event.createdAt
    };
  }
}

function processStatusFromApproval(status: ApprovalInstanceStatus, businessType?: ApprovalBusinessType): ProcessStatus {
  if (businessType === "procurement_request" && status === "approved") return "running";
  if (status === "approved") return "completed";
  if (status === "rejected" || status === "returned") return "rejected";
  if (status === "cancelled" || status === "revoked") return "cancelled";
  if (status === "manual_review_required") return "waiting";
  return "running";
}

function processTaskStatusFromWorkflow(status: WorkflowTaskStatus): ProcessTaskStatus {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function nodeKeyFromTaskStatus(status: WorkflowTaskStatus, businessType?: ApprovalBusinessType) {
  if (businessType === "procurement_request" && status === "completed") return "method_decision";
  if (status === "completed") return "approved_end";
  if (status === "cancelled") return "cancelled_end";
  return "approval_pending";
}

function nodeKeyFromApprovalStatus(status: string, businessType?: ApprovalBusinessType) {
  if (businessType === "procurement_request" && status === "approved") return "method_decision";
  if (status === "approved") return "approved_end";
  if (status === "rejected" || status === "returned") return "rejected_end";
  if (status === "cancelled" || status === "revoked") return "cancelled_end";
  return "approval_pending";
}

function eventName(businessType: ApprovalBusinessType, status: string) {
  if (businessType === "procurement_request" && status === "created") return "采购需求已创建";
  if (businessType === "procurement_request" && status === "method_decided") return "采购方式已判定";
  const businessName: Record<ApprovalBusinessType, string> = {
    procurement_document: "采购文件审核",
    procurement_request: "采购需求审批",
    review_award: "评审定标",
    award_approval: "定标审批",
    archive_supplement: "档案补档审批",
    price_approval: "价格审批",
    mall_order: "商城订单",
    settlement_bill: "结算审批",
    invoice: "发票审批",
    payment_request: "付款审批",
    return_request: "退货审批",
    expert_scoring: "专家评分"
  };
  const statusName: Record<string, string> = {
    submitted: "已提交",
    approved: "已通过",
    rejected: "已驳回",
    returned: "已退回",
    cancelled: "已取消",
    revoked: "已撤回",
    method_decided: "采购方式已判定"
  };
  return `${businessName[businessType]}${statusName[status] ?? status}`;
}

function supplierOnboardingActionMapping(action: RecordSupplierOnboardingActionArgs["action"], supplier: Supplier): SupplierOnboardingActionMapping {
  const completedAt = new Date().toISOString();
  const base = {
    completeTaskIds: (_supplierId: string) => [] as string[],
    nextTasks: (_supplier: Supplier) => [] as SupplierOnboardingTaskDraft[],
    cancelCompletedTasks: false
  };
  const mappings = {
    profile_submitted: {
      ...base,
      eventCode: "supplier_onboarding.profile_submitted",
      eventName: "供应商资料已提交",
      fromNodeKey: "profile_completion",
      toNodeKey: "qualification_review",
      fromStatus: "pending",
      toStatus: supplier.qualification,
      processStatus: "running" as ProcessStatus,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:profile_completion`],
      nextTasks: (item: Supplier) => [
        {
          nodeKey: "qualification_review",
          taskType: "supplier_qualification_review",
          title: `${item.name} 资质审核`,
          assigneeRoleId: "buyer" as RoleId,
          sourceTaskId: `supplier_onboarding:${item.id}:qualification_review`
        }
      ]
    },
    qualification_passed: {
      ...base,
      eventCode: "supplier_onboarding.qualification_passed",
      eventName: "供应商资质审核通过",
      fromNodeKey: "qualification_review",
      toNodeKey: "admission_approval",
      fromStatus: "pending_initial_review",
      toStatus: supplier.qualification,
      processStatus: "running" as ProcessStatus,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:qualification_review`],
      nextTasks: (item: Supplier) => [
        {
          nodeKey: "admission_approval",
          taskType: "supplier_admission_approval",
          title: `${item.name} 准入审批`,
          assigneeRoleId: "buyer" as RoleId,
          sourceTaskId: `supplier_onboarding:${item.id}:admission_approval`
        }
      ]
    },
    qualification_rejected: {
      ...base,
      eventCode: "supplier_onboarding.qualification_rejected",
      eventName: "供应商资质审核驳回",
      fromNodeKey: "qualification_review",
      toNodeKey: "rejected_end",
      fromStatus: "pending_initial_review",
      toStatus: supplier.qualification,
      processStatus: "rejected" as ProcessStatus,
      completedAt,
      cancelCompletedTasks: true,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:qualification_review`, `supplier_onboarding:${supplierId}:admission_approval`, `supplier_onboarding:${supplierId}:category_authorization`]
    },
    admission_approved: {
      ...base,
      eventCode: "supplier_onboarding.admission_approved",
      eventName: "供应商准入审批通过",
      fromNodeKey: "admission_approval",
      toNodeKey: "category_authorization",
      fromStatus: "pending",
      toStatus: supplier.admissionStatus ?? "admitted",
      processStatus: "running" as ProcessStatus,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:admission_approval`],
      nextTasks: (item: Supplier) => [
        {
          nodeKey: "category_authorization",
          taskType: "supplier_category_authorization",
          title: `${item.name} 品类授权`,
          assigneeRoleId: "buyer" as RoleId,
          sourceTaskId: `supplier_onboarding:${item.id}:category_authorization`
        }
      ]
    },
    admission_rejected: {
      ...base,
      eventCode: "supplier_onboarding.admission_rejected",
      eventName: "供应商准入审批驳回",
      fromNodeKey: "admission_approval",
      toNodeKey: "rejected_end",
      fromStatus: "pending",
      toStatus: supplier.admissionStatus ?? "rejected",
      processStatus: "rejected" as ProcessStatus,
      completedAt,
      cancelCompletedTasks: true,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:admission_approval`, `supplier_onboarding:${supplierId}:category_authorization`]
    },
    category_authorized: {
      ...base,
      eventCode: "supplier_onboarding.category_authorized",
      eventName: "供应商品类已授权",
      fromNodeKey: "category_authorization",
      toNodeKey: supplier.admissionStatus === "admitted" ? "active_online" : "category_authorization",
      fromStatus: "pending",
      toStatus: supplier.admissionStatus ?? "pending",
      processStatus: supplier.admissionStatus === "admitted" ? ("completed" as ProcessStatus) : ("running" as ProcessStatus),
      completedAt: supplier.admissionStatus === "admitted" ? completedAt : undefined,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:category_authorization`]
    },
    activated: {
      ...base,
      eventCode: "supplier_onboarding.activated",
      eventName: "供应商已生效上线",
      fromNodeKey: "category_authorization",
      toNodeKey: "active_online",
      fromStatus: "pending",
      toStatus: supplier.admissionStatus ?? "admitted",
      processStatus: "completed" as ProcessStatus,
      completedAt,
      completeTaskIds: (supplierId: string) => [`supplier_onboarding:${supplierId}:category_authorization`]
    },
    restricted: {
      ...base,
      eventCode: "supplier_onboarding.restricted",
      eventName: "供应商准入受限",
      fromNodeKey: "active_online",
      toNodeKey: "restricted_end",
      fromStatus: "admitted",
      toStatus: supplier.admissionStatus ?? "restricted",
      processStatus: "cancelled" as ProcessStatus,
      completedAt,
      cancelCompletedTasks: true,
      completeTaskIds: (supplierId: string) => [
        `supplier_onboarding:${supplierId}:profile_completion`,
        `supplier_onboarding:${supplierId}:qualification_review`,
        `supplier_onboarding:${supplierId}:admission_approval`,
        `supplier_onboarding:${supplierId}:category_authorization`
      ]
    }
  };
  return mappings[action];
}

function isSourcingProcessType(value: ProcessBusinessType): value is SourcingProcessType {
  return value === "rfq" || value === "tender" || value === "direct_purchase";
}

function isReviewAwardProcessType(value: ProcessBusinessType): value is ReviewAwardProcessType {
  return value === "review_award" || value === "contract_preparation";
}

function isFulfillmentProcessType(value: ProcessBusinessType): value is FulfillmentProcessType {
  return value === "order_fulfillment" || value === "settlement" || value === "invoice" || value === "payment" || value === "archive";
}

function sourcingProcessType(method: string | undefined): SourcingProcessType {
  const normalized = String(method ?? "").toLowerCase();
  if (normalized.includes("direct") || normalized.includes("直接") || normalized.includes("单一来源")) return "direct_purchase";
  if (normalized.includes("comparison") || normalized.includes("rfq") || normalized.includes("询价") || normalized.includes("比选")) return "rfq";
  return "tender";
}

function sourcingInitialNode(processType: SourcingProcessType) {
  if (processType === "rfq") return "inquiry_created";
  if (processType === "direct_purchase") return "demand_confirmed";
  return "announcement_preparation";
}

function sourcingProjectCreatedName(processType: SourcingProcessType) {
  if (processType === "rfq") return "RFQ 询价流程已启动";
  if (processType === "direct_purchase") return "DIRECT 直接采购流程已启动";
  return "TENDER 招标流程已启动";
}

function sourcingInitialTasks(processType: SourcingProcessType, project: ProcurementProject) {
  if (processType === "direct_purchase") {
    return [
      {
        nodeKey: "supplier_confirmation",
        taskType: "direct_supplier_confirmation",
        title: `${project.name} 直接采购供应商确认`,
        assigneeRoleId: "buyer" as RoleId,
        sourceTaskId: `direct_purchase:${project.id}:supplier_confirmation`
      }
    ];
  }
  return [
    {
      nodeKey: processType === "rfq" ? "supplier_invitation" : "announcement_preparation",
      taskType: "sourcing_prepare_announcement",
      title: `${project.name} 招采公告准备`,
      assigneeRoleId: "buyer" as RoleId,
      sourceTaskId: `${processType}:${project.id}:prepare_announcement`
    }
  ];
}

function sourcingEventMapping(event: InternalBusinessEvent): SourcingEventMapping | undefined {
  const processType = sourcingProcessType(String(event.payloadJson.projectType ?? event.payloadJson.procurementMethod ?? event.payloadJson.resultMethod ?? event.payloadJson.methodSuggestion ?? ""));
  const projectId = String(event.projectId ?? event.payloadJson.projectId ?? event.businessId);
  const supplierId = event.supplierId ?? (typeof event.payloadJson.supplierId === "string" ? event.payloadJson.supplierId : undefined);
  const title = String(event.businessTitle ?? event.payloadJson.projectName ?? event.businessId);
  const sourcePrefix = `${processType}:${projectId}`;
  const commonTaskTitle = title;
  if (event.eventCode === "AnnouncementCreated") {
    return {
      processType,
      eventCode: `${processType}.announcement_created`,
      eventName: processType === "rfq" ? "RFQ 询价已创建" : "招标公告已创建",
      fromNodeKey: sourcingInitialNode(processType),
      toNodeKey: processType === "rfq" ? "supplier_invitation" : "announcement_preparation",
      fromStatus: "project_created",
      toStatus: "announcement_draft",
      processStatus: "running",
      updateInstance: true
    };
  }
  if (event.eventCode === "AnnouncementPublished") {
    return {
      processType,
      eventCode: `${processType}.announcement_published`,
      eventName: processType === "rfq" ? "RFQ 询价已发布" : "招标公告已发布",
      fromNodeKey: processType === "rfq" ? "supplier_invitation" : "announcement_preparation",
      toNodeKey: processType === "rfq" ? "supplier_quotation" : "supplier_registration",
      fromStatus: "draft",
      toStatus: "published",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: [`${sourcePrefix}:prepare_announcement`, `${sourcePrefix}:invite_supplier`],
      nextTasks: [
        {
          nodeKey: processType === "rfq" ? "supplier_quotation" : "supplier_registration",
          taskType: processType === "rfq" ? "sourcing_supplier_quote" : "sourcing_supplier_registration",
          title: `${commonTaskTitle} 供应商响应`,
          assigneeRoleId: "supplier_quotation",
          supplierId,
          sourceTaskId: supplierId ? `${sourcePrefix}:supplier_response:${supplierId}` : `${sourcePrefix}:supplier_response`
        },
        {
          nodeKey: "bid_cutoff",
          taskType: "sourcing_bid_cutoff",
          title: `${commonTaskTitle} 截标控制`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:bid_cutoff`
        }
      ]
    };
  }
  if (event.eventCode === "AnnouncementClosed") {
    return {
      processType,
      eventCode: `${processType}.announcement_closed`,
      eventName: "招采公告已关闭",
      fromNodeKey: processType === "rfq" ? "supplier_quotation" : "supplier_registration",
      toNodeKey: "announcement_preparation",
      fromStatus: "published",
      toStatus: "closed",
      processStatus: "running",
      updateInstance: true,
      nextTasks: [
        {
          nodeKey: processType === "rfq" ? "supplier_invitation" : "announcement_preparation",
          taskType: "sourcing_prepare_announcement",
          title: `${commonTaskTitle} 重新准备公告`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:prepare_announcement:reopen`
        }
      ]
    };
  }
  if (event.eventCode === "SupplierInvited") {
    return {
      processType,
      eventCode: `${processType}.supplier_invited`,
      eventName: "供应商已邀请",
      fromNodeKey: processType === "rfq" ? "supplier_invitation" : "announcement_published",
      toNodeKey: processType === "rfq" ? "supplier_quotation" : "supplier_registration",
      fromStatus: "published",
      toStatus: "invited",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: [`${sourcePrefix}:invite_supplier`],
      nextTasks: [
        {
          nodeKey: processType === "rfq" ? "supplier_quotation" : "supplier_registration",
          taskType: processType === "rfq" ? "sourcing_supplier_quote" : "sourcing_supplier_registration",
          title: `${commonTaskTitle} 供应商响应`,
          assigneeRoleId: "supplier_quotation",
          supplierId,
          sourceTaskId: supplierId ? `${sourcePrefix}:supplier_response:${supplierId}` : `${sourcePrefix}:supplier_response`
        }
      ]
    };
  }
  if (event.eventCode === "SupplierRegistered") {
    return {
      processType,
      eventCode: `${processType}.supplier_registered`,
      eventName: "供应商报名已提交",
      fromNodeKey: "supplier_registration",
      toNodeKey: "qualification_confirmation",
      fromStatus: "published",
      toStatus: "registered",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: supplierId ? [`${sourcePrefix}:supplier_response:${supplierId}`] : [],
      nextTasks: [
        {
          nodeKey: "qualification_confirmation",
          taskType: "sourcing_registration_qualification",
          title: `${commonTaskTitle} 报名资格确认`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:registration_qualification`
        }
      ]
    };
  }
  if (event.eventCode === "SupplierRegistrationQualified" || event.eventCode === "SupplierRegistrationRejected") {
    const qualified = event.eventCode === "SupplierRegistrationQualified";
    return {
      processType,
      eventCode: `${processType}.${qualified ? "supplier_registration_qualified" : "supplier_registration_rejected"}`,
      eventName: qualified ? "供应商报名资格已确认" : "供应商报名资格已驳回",
      fromNodeKey: "qualification_confirmation",
      toNodeKey: qualified ? "bid_response" : "qualification_confirmation",
      fromStatus: "registered",
      toStatus: qualified ? "qualified" : "rejected",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: [`${sourcePrefix}:registration_qualification`],
      nextTasks: qualified
        ? [
            {
              nodeKey: "bid_response",
              taskType: "sourcing_supplier_quote",
              title: `${commonTaskTitle} 报价 / 响应文件提交`,
              assigneeRoleId: "supplier_quotation",
              supplierId,
              sourceTaskId: supplierId ? `${sourcePrefix}:supplier_quote:${supplierId}` : `${sourcePrefix}:supplier_quote`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "QuoteDraftCreated") {
    return {
      processType,
      eventCode: `${processType}.quote_draft_created`,
      eventName: "供应商报价草稿已创建",
      fromNodeKey: processType === "rfq" ? "supplier_quotation" : "bid_response",
      toNodeKey: processType === "rfq" ? "supplier_quotation" : "bid_response",
      fromStatus: "invited",
      toStatus: "draft",
      processStatus: "running",
      updateInstance: true
    };
  }
  if (event.eventCode === "QuoteSubmitted" || event.eventCode === "QuoteResubmitted" || event.eventCode === "QuoteWithdrawn") {
    const submitted = event.eventCode !== "QuoteWithdrawn";
    return {
      processType,
      eventCode: `${processType}.${event.eventCode === "QuoteResubmitted" ? "quote_resubmitted" : submitted ? "quote_submitted" : "quote_withdrawn"}`,
      eventName: event.eventCode === "QuoteResubmitted" ? "供应商报价已重新提交" : submitted ? "供应商报价已提交" : "供应商报价已撤回",
      fromNodeKey: processType === "rfq" ? "supplier_quotation" : "bid_response",
      toNodeKey: submitted ? "bid_cutoff" : processType === "rfq" ? "supplier_quotation" : "bid_response",
      fromStatus: submitted ? "draft" : "submitted",
      toStatus: submitted ? "submitted" : "withdrawn",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: submitted && supplierId ? [`${sourcePrefix}:supplier_response:${supplierId}`, `${sourcePrefix}:supplier_quote:${supplierId}`] : [],
      nextTasks: submitted
        ? [
            {
              nodeKey: "bid_cutoff",
              taskType: "sourcing_bid_cutoff",
              title: `${commonTaskTitle} 截标控制`,
              assigneeRoleId: "buyer",
              sourceTaskId: `${sourcePrefix}:bid_cutoff`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "BidCutoffCompleted") {
    return {
      processType,
      eventCode: `${processType}.bid_cutoff_completed`,
      eventName: "截标已完成",
      fromNodeKey: "bid_cutoff",
      toNodeKey: processType === "rfq" ? "comparison_preparation" : "bid_opening_locked",
      fromStatus: "bidding_open",
      toStatus: "cutoff_completed",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: [`${sourcePrefix}:bid_cutoff`],
      nextTasks: [
        {
          nodeKey: processType === "rfq" ? "comparison_preparation" : "bid_opening_locked",
          taskType: processType === "rfq" ? "sourcing_comparison_preparation" : "sourcing_bid_lock",
          title: processType === "rfq" ? `${commonTaskTitle} 比价准备` : `${commonTaskTitle} 锁标 / 开标准备`,
          assigneeRoleId: "buyer",
          sourceTaskId: processType === "rfq" ? `${sourcePrefix}:comparison_preparation` : `${sourcePrefix}:bid_lock`
        }
      ]
    };
  }
  if (event.eventCode === "BidLocked") {
    return {
      processType,
      eventCode: `${processType}.bid_locked`,
      eventName: "报价已锁定 / 开标完成",
      fromNodeKey: "bid_opening_locked",
      toNodeKey: "review_preparation",
      fromStatus: "cutoff_completed",
      toStatus: "bidding_locked",
      processStatus: "running",
      updateInstance: true,
      completeTaskSourceIds: [`${sourcePrefix}:bid_lock`],
      nextTasks: [
        {
          nodeKey: "review_preparation",
          taskType: "sourcing_award_preparation",
          title: `${commonTaskTitle} 评审准备`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:review_preparation`
        }
      ]
    };
  }
  if (event.eventCode === "ComparisonReportGenerated") {
    return {
      processType,
      eventCode: `${processType}.comparison_report_generated`,
      eventName: "比价报告已生成",
      fromNodeKey: processType === "rfq" ? "comparison_preparation" : "bid_opening_locked",
      toNodeKey: processType === "rfq" ? "award_preparation" : "review_preparation",
      fromStatus: "cutoff_completed",
      toStatus: "comparison_generated",
      processStatus: "completed",
      updateInstance: true,
      completed: true,
      completeTaskSourceIds: [`${sourcePrefix}:comparison_preparation`, `${sourcePrefix}:review_preparation`, `${sourcePrefix}:bid_lock`]
    };
  }
  return undefined;
}

function reviewAwardEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  const projectId = String(event.projectId ?? event.payloadJson.projectId ?? event.businessId);
  const title = String(event.businessTitle ?? event.payloadJson.projectName ?? event.payloadJson.title ?? event.businessId);
  const expertId = typeof event.payloadJson.expertId === "string" ? event.payloadJson.expertId : undefined;
  const assignmentId = typeof event.payloadJson.assignmentId === "string" ? event.payloadJson.assignmentId : undefined;
  const sheetId = typeof event.payloadJson.sheetId === "string" ? event.payloadJson.sheetId : event.businessType === "expert_scoring" ? event.businessId : undefined;
  const approvalId = event.businessType === "award_approval" ? event.businessId : typeof event.payloadJson.approvalId === "string" ? event.payloadJson.approvalId : undefined;
  const contractId = event.businessType === "contract_preparation" ? event.businessId : typeof event.payloadJson.contractId === "string" ? event.payloadJson.contractId : undefined;
  const sourcePrefix = `review_award:${projectId}`;

  if (event.eventCode === "BidLocked") {
    return {
      processType: "review_award",
      eventCode: "review_award.quote_locked",
      eventName: "报价已锁定，进入评审准备",
      fromNodeKey: "quote_locked",
      toNodeKey: "expert_assignment",
      fromStatus: "bidding_locked",
      toStatus: "expert_assignment_pending",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:quote_lock`],
      nextTasks: [
        {
          nodeKey: "expert_assignment",
          taskType: "review_award_expert_assignment",
          title: `${title} 专家抽取 / 指定`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:expert_assignment`
        }
      ]
    };
  }
  if (event.eventCode === "ExpertAssignmentCreated" || event.eventCode === "ExpertAssignmentReplaced") {
    const replaced = event.eventCode === "ExpertAssignmentReplaced";
    return {
      processType: "review_award",
      eventCode: replaced ? "review_award.expert_assignment_replaced" : "review_award.expert_assignment_created",
      eventName: replaced ? "评审专家已替换" : "评审专家已抽取 / 指定",
      fromNodeKey: "expert_assignment",
      toNodeKey: "expert_confirmation",
      fromStatus: "expert_assignment_pending",
      toStatus: "expert_confirmation_pending",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:expert_assignment`],
      nextTasks: expertId
        ? [
            {
              nodeKey: "expert_confirmation",
              taskType: "review_award_expert_confirmation",
              title: `${title} 专家确认`,
              assigneeRoleId: "expert",
              sourceTaskId: `${sourcePrefix}:expert_confirmation:${expertId}`,
              sourceJson: { expertId, assignmentId }
            }
          ]
        : []
    };
  }
  if (event.eventCode === "ExpertAssignmentConfirmed") {
    return {
      processType: "review_award",
      eventCode: "review_award.expert_assignment_confirmed",
      eventName: "评审专家已确认",
      fromNodeKey: "expert_confirmation",
      toNodeKey: "expert_scoring",
      fromStatus: "expert_confirmation_pending",
      toStatus: "expert_scoring_pending",
      processStatus: "running",
      completeTaskSourceIds: expertId ? [`${sourcePrefix}:expert_confirmation:${expertId}`] : [],
      nextTasks: expertId
        ? [
            {
              nodeKey: "expert_scoring",
              taskType: "review_award_expert_scoring",
              title: `${title} 专家评分`,
              assigneeRoleId: "expert",
              sourceTaskId: `${sourcePrefix}:expert_scoring:${expertId}`,
              sourceJson: { expertId, assignmentId }
            }
          ]
        : []
    };
  }
  if (event.eventCode === "ExpertScoreSubmitted") {
    return {
      processType: "review_award",
      eventCode: "review_award.expert_score_submitted",
      eventName: "专家评分已提交",
      fromNodeKey: "expert_scoring",
      toNodeKey: "score_summary",
      fromStatus: "expert_scoring_pending",
      toStatus: "score_submitted",
      processStatus: "running",
      completeTaskSourceIds: expertId ? [`${sourcePrefix}:expert_scoring:${expertId}`] : [],
      nextTasks: [
        {
          nodeKey: "score_summary",
          taskType: "review_award_score_summary",
          title: `${title} 评分汇总`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:score_summary`
        },
        {
          nodeKey: "comparison_report",
          taskType: "review_award_comparison_report",
          title: `${title} 比选报告生成`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:comparison_report`
        }
      ],
      ...(sheetId ? { } : {})
    };
  }
  if (event.eventCode === "ComparisonReportGenerated") {
    return {
      processType: "review_award",
      eventCode: "review_award.comparison_report_generated",
      eventName: "比选报告已生成",
      fromNodeKey: "comparison_report",
      toNodeKey: "review_report",
      fromStatus: "score_submitted",
      toStatus: "comparison_generated",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:score_summary`, `${sourcePrefix}:comparison_report`],
      nextTasks: [
        {
          nodeKey: "review_report",
          taskType: "review_award_review_report",
          title: `${title} 评审报告生成`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:review_report`
        }
      ]
    };
  }
  if (event.eventCode === "ReviewReportGenerated") {
    return {
      processType: "review_award",
      eventCode: "review_award.review_report_generated",
      eventName: "评审报告已生成",
      fromNodeKey: "review_report",
      toNodeKey: "review_report",
      fromStatus: "comparison_generated",
      toStatus: "review_report_generated",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:review_report`],
      nextTasks: [
        {
          nodeKey: "review_report",
          taskType: "review_award_review_report_freeze",
          title: `${title} 评审报告冻结`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:review_report_freeze`
        }
      ]
    };
  }
  if (event.eventCode === "ReviewReportFrozen") {
    return {
      processType: "review_award",
      eventCode: "review_award.review_report_frozen",
      eventName: "评审报告已冻结",
      fromNodeKey: "review_report",
      toNodeKey: "award_approval",
      fromStatus: "review_report_generated",
      toStatus: "award_approval_pending",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:review_report_freeze`],
      nextTasks: [
        {
          nodeKey: "award_approval",
          taskType: "review_award_approval_submit",
          title: `${title} 定标审批提交`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:award_approval_submit`
        }
      ]
    };
  }
  if (event.eventCode === "AwardApprovalCreated" || event.eventCode === "AwardApprovalSubmitted") {
    const submitted = event.eventCode === "AwardApprovalSubmitted";
    return {
      processType: "review_award",
      eventCode: submitted ? "review_award.award_approval_submitted" : "review_award.award_approval_created",
      eventName: submitted ? "定标审批已提交" : "定标审批草稿已创建",
      fromNodeKey: "award_approval",
      toNodeKey: "award_approval",
      fromStatus: "award_approval_pending",
      toStatus: submitted ? "award_approval_submitted" : "award_approval_draft",
      processStatus: "running",
      completeTaskSourceIds: submitted ? [`${sourcePrefix}:award_approval_submit`] : [],
      nextTasks: submitted
        ? [
            {
              nodeKey: "award_approval",
              taskType: "review_award_approval_followup",
              title: `${title} 定标审批跟踪`,
              assigneeRoleId: "buyer",
              sourceTaskId: approvalId ? `${sourcePrefix}:award_approval_followup:${approvalId}` : `${sourcePrefix}:award_approval_followup`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "AwardApproved" || event.eventCode === "AwardRejected") {
    const approved = event.eventCode === "AwardApproved";
    return {
      processType: "review_award",
      eventCode: approved ? "review_award.award_approved" : "review_award.award_rejected",
      eventName: approved ? "定标审批已通过" : "定标审批已驳回",
      fromNodeKey: "award_approval",
      toNodeKey: approved ? "result_preparation" : "rejected_end",
      fromStatus: "award_approval_submitted",
      toStatus: approved ? "award_approved" : "award_rejected",
      processStatus: approved ? "running" : "rejected",
      completeTaskSourceIds: approvalId ? [`${sourcePrefix}:award_approval_followup:${approvalId}`, `${sourcePrefix}:award_approval_submit`] : [`${sourcePrefix}:award_approval_submit`],
      nextTasks: approved
        ? [
            {
              nodeKey: "result_preparation",
              taskType: "review_award_result_preparation",
              title: `${title} 结果通知 / 公示准备`,
              assigneeRoleId: "buyer",
              sourceTaskId: `${sourcePrefix}:result_preparation`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "ResultNotificationSent" || event.eventCode === "InternalPublicityPublished") {
    return {
      processType: "review_award",
      eventCode: event.eventCode === "ResultNotificationSent" ? "review_award.result_notification_sent" : "review_award.internal_publicity_published",
      eventName: event.eventCode === "ResultNotificationSent" ? "定标结果通知已发送" : "定标结果内部公示已发布",
      fromNodeKey: "result_preparation",
      toNodeKey: "completed",
      fromStatus: "award_approved",
      toStatus: "result_published",
      processStatus: "completed",
      completed: true,
      completeTaskSourceIds: [`${sourcePrefix}:result_preparation`]
    };
  }
  if (event.eventCode === "AwardApproved") {
    return {
      processType: "contract_preparation",
      eventCode: "contract_preparation.award_approved",
      eventName: "定标审批通过，进入合同准备",
      fromNodeKey: "award_approved",
      toNodeKey: "result_published",
      fromStatus: "award_approved",
      toStatus: "contract_preparing",
      processStatus: "running",
      nextTasks: [
        {
          nodeKey: "result_published",
          taskType: "contract_preparation_result_publish",
          title: `${title} 结果通知 / 公示确认`,
          assigneeRoleId: "buyer",
          sourceTaskId: `contract_preparation:${projectId}:result_publish`
        },
        {
          nodeKey: "pricing_report",
          taskType: "contract_preparation_pricing_report",
          title: `${title} 定价报告生成`,
          assigneeRoleId: "buyer",
          sourceTaskId: `contract_preparation:${projectId}:pricing_report`
        }
      ]
    };
  }
  if (event.eventCode === "PricingReportGenerated") {
    return {
      processType: "contract_preparation",
      eventCode: "contract_preparation.pricing_report_generated",
      eventName: "定价报告已生成",
      fromNodeKey: "pricing_report",
      toNodeKey: "contract_entry",
      fromStatus: "contract_preparing",
      toStatus: "pricing_report_generated",
      processStatus: "running",
      completeTaskSourceIds: [`contract_preparation:${projectId}:pricing_report`],
      nextTasks: [
        {
          nodeKey: "contract_entry",
          taskType: "contract_preparation_contract_entry",
          title: `${title} 合同台账登记`,
          assigneeRoleId: "buyer",
          sourceTaskId: `contract_preparation:${projectId}:contract_entry`
        }
      ]
    };
  }
  if (event.eventCode === "ResultNotificationSent" || event.eventCode === "InternalPublicityPublished") {
    return {
      processType: "contract_preparation",
      eventCode: event.eventCode === "ResultNotificationSent" ? "contract_preparation.result_notification_sent" : "contract_preparation.internal_publicity_published",
      eventName: event.eventCode === "ResultNotificationSent" ? "结果通知已发送" : "内部公示已发布",
      fromNodeKey: "result_published",
      toNodeKey: "pricing_report",
      fromStatus: "contract_preparing",
      toStatus: "result_published",
      processStatus: "running",
      completeTaskSourceIds: [`contract_preparation:${projectId}:result_publish`]
    };
  }
  if (event.eventCode === "ContractLedgerCreated") {
    return {
      processType: "contract_preparation",
      eventCode: "contract_preparation.contract_entry_created",
      eventName: "合同台账已登记",
      fromNodeKey: "contract_entry",
      toNodeKey: "contract_ready",
      fromStatus: "pricing_report_generated",
      toStatus: "contract_ready",
      processStatus: "completed",
      completed: true,
      completeTaskSourceIds: [`contract_preparation:${projectId}:contract_entry`],
      nextTasks: contractId
        ? []
        : []
    };
  }
  return undefined;
}

function contractPreparationEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  const projectId = String(event.projectId ?? event.payloadJson.projectId ?? event.businessId);
  const title = String(event.businessTitle ?? event.payloadJson.projectName ?? event.payloadJson.title ?? event.businessId);
  if (event.eventCode === "AwardApproved") {
    return {
      processType: "contract_preparation",
      eventCode: "contract_preparation.award_approved",
      eventName: "定标审批通过，进入合同准备",
      fromNodeKey: "award_approved",
      toNodeKey: "result_published",
      fromStatus: "award_approved",
      toStatus: "contract_preparing",
      processStatus: "running",
      nextTasks: [
        {
          nodeKey: "result_published",
          taskType: "contract_preparation_result_publish",
          title: `${title} 结果通知 / 公示确认`,
          assigneeRoleId: "buyer",
          sourceTaskId: `contract_preparation:${projectId}:result_publish`
        },
        {
          nodeKey: "pricing_report",
          taskType: "contract_preparation_pricing_report",
          title: `${title} 定价报告生成`,
          assigneeRoleId: "buyer",
          sourceTaskId: `contract_preparation:${projectId}:pricing_report`
        }
      ]
    };
  }
  if (event.eventCode === "ResultNotificationSent" || event.eventCode === "InternalPublicityPublished") {
    return {
      processType: "contract_preparation",
      eventCode: event.eventCode === "ResultNotificationSent" ? "contract_preparation.result_notification_sent" : "contract_preparation.internal_publicity_published",
      eventName: event.eventCode === "ResultNotificationSent" ? "结果通知已发送" : "内部公示已发布",
      fromNodeKey: "result_published",
      toNodeKey: "pricing_report",
      fromStatus: "contract_preparing",
      toStatus: "result_published",
      processStatus: "running",
      completeTaskSourceIds: [`contract_preparation:${projectId}:result_publish`]
    };
  }
  if (event.eventCode === "PricingReportGenerated") {
    return {
      processType: "contract_preparation",
      eventCode: "contract_preparation.pricing_report_generated",
      eventName: "定价报告已生成",
      fromNodeKey: "pricing_report",
      toNodeKey: "contract_entry",
      fromStatus: "contract_preparing",
      toStatus: "pricing_report_generated",
      processStatus: "running",
      completeTaskSourceIds: [`contract_preparation:${projectId}:pricing_report`],
      nextTasks: [
        {
          nodeKey: "contract_entry",
          taskType: "contract_preparation_contract_entry",
          title: `${title} 合同台账登记`,
          assigneeRoleId: "buyer",
          sourceTaskId: `contract_preparation:${projectId}:contract_entry`
        }
      ]
    };
  }
  if (event.eventCode === "ContractLedgerCreated") {
    return {
      processType: "contract_preparation",
      eventCode: "contract_preparation.contract_entry_created",
      eventName: "合同台账已登记",
      fromNodeKey: "contract_entry",
      toNodeKey: "contract_ready",
      fromStatus: "pricing_report_generated",
      toStatus: "contract_ready",
      processStatus: "completed",
      completed: true,
      completeTaskSourceIds: [`contract_preparation:${projectId}:contract_entry`]
    };
  }
  return undefined;
}

function fulfillmentEventMappings(event: InternalBusinessEvent): ProcessLayerEventMapping[] {
  return [
    orderFulfillmentEventMapping(event),
    settlementEventMapping(event),
    invoiceEventMapping(event),
    paymentEventMapping(event),
    archiveEventMapping(event)
  ].filter((mapping): mapping is ProcessLayerEventMapping => Boolean(mapping));
}

function orderFulfillmentEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  const orderId = event.businessId;
  const title = String(event.businessTitle ?? event.payloadJson.orderNo ?? orderId);
  const sourcePrefix = `order_fulfillment:${orderId}`;
  if (event.eventCode === "PurchaseOrderCreated") {
    return {
      processType: "order_fulfillment",
      eventCode: "order_fulfillment.order_created",
      eventName: "订单已创建",
      fromNodeKey: "order_created",
      toNodeKey: "supplier_confirmation",
      fromStatus: "none",
      toStatus: "submitted",
      processStatus: "running",
      nextTasks: [
        {
          nodeKey: "supplier_confirmation",
          taskType: "order_fulfillment_supplier_confirm",
          title: `${title} 供应商确认`,
          assigneeRoleId: "supplier",
          supplierId: event.supplierId,
          sourceTaskId: `${sourcePrefix}:supplier_confirm`
        }
      ]
    };
  }
  if (event.eventCode === "SupplierOrderConfirmed") {
    return {
      processType: "order_fulfillment",
      eventCode: "order_fulfillment.supplier_confirmed",
      eventName: "供应商已确认订单",
      fromNodeKey: "supplier_confirmation",
      toNodeKey: "shipment",
      fromStatus: "submitted",
      toStatus: "supplier_confirmed",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:supplier_confirm`],
      nextTasks: [
        {
          nodeKey: "shipment",
          taskType: "order_fulfillment_ship",
          title: `${title} 供应商发货`,
          assigneeRoleId: "supplier",
          supplierId: event.supplierId,
          sourceTaskId: `${sourcePrefix}:ship`
        }
      ]
    };
  }
  if (event.eventCode === "OrderShipped") {
    return {
      processType: "order_fulfillment",
      eventCode: "order_fulfillment.shipped",
      eventName: "订单已发货",
      fromNodeKey: "shipment",
      toNodeKey: "receiving",
      fromStatus: "supplier_confirmed",
      toStatus: "shipped",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:ship`],
      nextTasks: [
        {
          nodeKey: "receiving",
          taskType: "order_fulfillment_receive",
          title: `${title} 收货确认`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:receive`
        }
      ]
    };
  }
  if (event.eventCode === "OrderReceived") {
    return {
      processType: "order_fulfillment",
      eventCode: "order_fulfillment.received",
      eventName: "订单已收货",
      fromNodeKey: "receiving",
      toNodeKey: "evaluation",
      fromStatus: "shipped",
      toStatus: "received",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:receive`],
      nextTasks: [
        {
          nodeKey: "evaluation",
          taskType: "order_fulfillment_supplier_evaluation",
          title: `${title} 供应商评价`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:evaluation`
        }
      ]
    };
  }
  if (event.eventCode === "SupplierEvaluationSubmitted") {
    return {
      processType: "order_fulfillment",
      eventCode: "order_fulfillment.evaluation_submitted",
      eventName: "供应商评价已提交",
      fromNodeKey: "evaluation",
      toNodeKey: "settlement_entry",
      fromStatus: "received",
      toStatus: "ready_for_settlement",
      processStatus: "completed",
      completed: true,
      completeTaskSourceIds: [`${sourcePrefix}:evaluation`]
    };
  }
  return undefined;
}

function settlementEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  const billId = event.eventCode === "PaymentRequested" && typeof event.payloadJson.settlementBillId === "string" ? event.payloadJson.settlementBillId : event.businessId;
  const title = String(event.businessTitle ?? event.payloadJson.billNo ?? billId);
  const sourcePrefix = `settlement:${billId}`;
  if (event.eventCode === "SettlementBillGenerated") {
    return {
      processType: "settlement",
      eventCode: "settlement.generated",
      eventName: "结算单已生成",
      fromNodeKey: "settlement_generated",
      toNodeKey: "settlement_submit",
      fromStatus: "none",
      toStatus: "generated",
      processStatus: "running",
      nextTasks: [
        {
          nodeKey: "settlement_submit",
          taskType: "settlement_submit",
          title: `${title} 提交结算`,
          assigneeRoleId: "supplier",
          supplierId: event.supplierId,
          sourceTaskId: `${sourcePrefix}:submit`
        }
      ]
    };
  }
  if (event.eventCode === "SettlementBillSubmitted") {
    return {
      processType: "settlement",
      eventCode: "settlement.submitted",
      eventName: "结算已提交",
      fromNodeKey: "settlement_submit",
      toNodeKey: "settlement_review",
      fromStatus: "generated",
      toStatus: "submitted",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:submit`],
      nextTasks: [
        {
          nodeKey: "settlement_review",
          taskType: "settlement_review",
          title: `${title} 结算审核`,
          assigneeRoleId: "hotel_finance",
          sourceTaskId: `${sourcePrefix}:review`
        }
      ]
    };
  }
  if (event.eventCode === "SettlementBillApproved" || event.eventCode === "SettlementBillRejected") {
    const approved = event.eventCode === "SettlementBillApproved";
    return {
      processType: "settlement",
      eventCode: approved ? "settlement.approved" : "settlement.rejected",
      eventName: approved ? "结算已审核通过" : "结算已驳回",
      fromNodeKey: "settlement_review",
      toNodeKey: approved ? "materials_review" : "rejected_end",
      fromStatus: "submitted",
      toStatus: approved ? "approved" : "rejected",
      processStatus: approved ? "running" : "rejected",
      completeTaskSourceIds: [`${sourcePrefix}:review`],
      nextTasks: approved
        ? [
            {
              nodeKey: "materials_review",
              taskType: "settlement_material_upload",
              title: `${title} 上传 / 审核结算材料`,
              assigneeRoleId: "supplier",
              supplierId: event.supplierId,
              sourceTaskId: `${sourcePrefix}:material_upload`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "SettlementMaterialUploaded") {
    return {
      processType: "settlement",
      eventCode: "settlement.material_uploaded",
      eventName: "结算材料已上传",
      fromNodeKey: "materials_review",
      toNodeKey: "materials_review",
      fromStatus: "approved",
      toStatus: "material_uploaded",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:material_upload`],
      nextTasks: [
        {
          nodeKey: "materials_review",
          taskType: "settlement_material_review",
          title: `${title} 结算材料审核`,
          assigneeRoleId: "hotel_finance",
          sourceTaskId: `${sourcePrefix}:material_review`
        }
      ]
    };
  }
  if (event.eventCode === "SettlementMaterialApproved" || event.eventCode === "SettlementMaterialRejected") {
    const approved = event.eventCode === "SettlementMaterialApproved";
    return {
      processType: "settlement",
      eventCode: approved ? "settlement.material_approved" : "settlement.material_rejected",
      eventName: approved ? "结算材料审核通过" : "结算材料已驳回",
      fromNodeKey: "materials_review",
      toNodeKey: approved ? "invoice_entry" : "materials_review",
      fromStatus: "material_uploaded",
      toStatus: approved ? "material_approved" : "material_rejected",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:material_review`],
      nextTasks: approved
        ? [
            {
              nodeKey: "invoice_entry",
              taskType: "settlement_invoice_submit",
              title: `${title} 提交发票`,
              assigneeRoleId: "supplier",
              supplierId: event.supplierId,
              sourceTaskId: `${sourcePrefix}:invoice_submit`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "PaymentRequested") {
    return {
      processType: "settlement",
      eventCode: "settlement.payment_requested",
      eventName: "付款申请已发起",
      fromNodeKey: "invoice_entry",
      toNodeKey: "payment_entry",
      fromStatus: "invoice_approved",
      toStatus: "payment_requested",
      processStatus: "completed",
      completed: true,
      completeTaskSourceIds: [`${sourcePrefix}:invoice_submit`]
    };
  }
  return undefined;
}

function invoiceEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  if (event.eventCode !== "InvoiceSubmitted" && event.eventCode !== "InvoiceApproved" && event.eventCode !== "InvoiceRejected") return undefined;
  const invoiceId = event.businessId;
  const title = String(event.businessTitle ?? event.payloadJson.invoiceNo ?? invoiceId);
  const sourcePrefix = `invoice:${invoiceId}`;
  if (event.eventCode === "InvoiceSubmitted") {
    return {
      processType: "invoice",
      eventCode: "invoice.submitted_process",
      eventName: "发票已提交",
      fromNodeKey: "start",
      toNodeKey: "invoice_review",
      fromStatus: "none",
      toStatus: "submitted",
      processStatus: "running",
      completeTaskSourceIds: typeof event.payloadJson.settlementBillId === "string" ? [`settlement:${event.payloadJson.settlementBillId}:invoice_submit`] : [],
      nextTasks: [
        {
          nodeKey: "invoice_review",
          taskType: "invoice_review_process",
          title: `${title} 发票审核`,
          assigneeRoleId: "hotel_finance",
          sourceTaskId: `${sourcePrefix}:review`
        }
      ]
    };
  }
  const approved = event.eventCode === "InvoiceApproved";
  return {
    processType: "invoice",
    eventCode: approved ? "invoice.approved_process" : "invoice.rejected_process",
    eventName: approved ? "发票审核通过" : "发票已驳回",
    fromNodeKey: "invoice_review",
    toNodeKey: approved ? "invoice_approved" : "invoice_rejected",
    fromStatus: "submitted",
    toStatus: approved ? "approved" : "rejected",
    processStatus: approved ? "completed" : "rejected",
    completed: true,
    completeTaskSourceIds: [`${sourcePrefix}:review`]
  };
}

function paymentEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  if (event.eventCode !== "PaymentRequested" && event.eventCode !== "PaymentCaptured") return undefined;
  const title = String(event.businessTitle ?? event.payloadJson.ledgerNo ?? event.businessId);
  const paymentId = event.businessId;
  const sourcePrefix = `payment:${paymentId}`;
  if (event.eventCode === "PaymentRequested") {
    return {
      processType: "payment",
      eventCode: "payment.requested",
      eventName: "付款申请已发起",
      fromNodeKey: "payment_requested",
      toNodeKey: "payment_review",
      fromStatus: "none",
      toStatus: "payment_requested",
      processStatus: "running",
      nextTasks: [
        {
          nodeKey: "payment_review",
          taskType: "payment_review",
          title: `${title} 付款复核`,
          assigneeRoleId: "hotel_finance",
          sourceTaskId: `${sourcePrefix}:review`
        }
      ]
    };
  }
  return {
    processType: "payment",
    eventCode: "payment.captured",
    eventName: "付款已确认",
    fromNodeKey: "payment_review",
    toNodeKey: "payment_completed",
    fromStatus: "payment_requested",
    toStatus: "paid",
    processStatus: "completed",
    completed: true,
    completeTaskSourceIds: [`${sourcePrefix}:review`]
  };
}

function archiveEventMapping(event: InternalBusinessEvent): ProcessLayerEventMapping | undefined {
  const projectId = String(event.projectId ?? event.payloadJson.projectId ?? event.businessId);
  const title = String(event.businessTitle ?? event.payloadJson.projectName ?? projectId);
  const sourcePrefix = `archive:${projectId}`;
  if (event.eventCode === "ArchiveSnapshotCreated") {
    return {
      processType: "archive",
      eventCode: "archive.snapshot_created",
      eventName: "档案快照已生成",
      fromNodeKey: "archive_generated",
      toNodeKey: "completeness_check",
      fromStatus: "none",
      toStatus: "snapshot_created",
      processStatus: "running",
      nextTasks: [
        {
          nodeKey: "completeness_check",
          taskType: "archive_completeness_check",
          title: `${title} 档案完整性检查`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:check`
        }
      ]
    };
  }
  if (event.eventCode === "ArchiveChecked") {
    const complete = event.payloadJson.status === "complete";
    return {
      processType: "archive",
      eventCode: "archive.checked",
      eventName: "档案完整性已检查",
      fromNodeKey: "completeness_check",
      toNodeKey: complete ? "sealed" : "supplement_request",
      fromStatus: "snapshot_created",
      toStatus: complete ? "complete" : "incomplete",
      processStatus: complete ? "running" : "waiting",
      completeTaskSourceIds: [`${sourcePrefix}:check`],
      nextTasks: complete
        ? [
            {
              nodeKey: "sealed",
              taskType: "archive_seal",
              title: `${title} 档案封存`,
              assigneeRoleId: "buyer",
              sourceTaskId: `${sourcePrefix}:seal`
            }
          ]
        : [
            {
              nodeKey: "supplement_request",
              taskType: "archive_supplement_request",
              title: `${title} 补档申请`,
              assigneeRoleId: "buyer",
              sourceTaskId: `${sourcePrefix}:supplement_request`
            }
          ]
    };
  }
  if (event.eventCode === "ArchiveSupplementRequested") {
    return {
      processType: "archive",
      eventCode: "archive.supplement_requested",
      eventName: "补档申请已提交",
      fromNodeKey: "supplement_request",
      toNodeKey: "supplement_approval",
      fromStatus: "incomplete",
      toStatus: "supplement_requested",
      processStatus: "waiting",
      completeTaskSourceIds: [`${sourcePrefix}:supplement_request`],
      nextTasks: [
        {
          nodeKey: "supplement_approval",
          taskType: "archive_supplement_approval",
          title: `${title} 补档审批`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:supplement_approval`
        }
      ]
    };
  }
  if (event.eventCode === "ArchiveSupplementApproved" || event.eventCode === "ArchiveSupplementRejected") {
    const approved = event.eventCode === "ArchiveSupplementApproved";
    return {
      processType: "archive",
      eventCode: approved ? "archive.supplement_approved" : "archive.supplement_rejected",
      eventName: approved ? "补档审批通过" : "补档审批驳回",
      fromNodeKey: "supplement_approval",
      toNodeKey: approved ? "supplemented" : "supplement_request",
      fromStatus: "supplement_requested",
      toStatus: approved ? "supplement_approved" : "supplement_rejected",
      processStatus: "waiting",
      completeTaskSourceIds: [`${sourcePrefix}:supplement_approval`],
      nextTasks: approved
        ? [
            {
              nodeKey: "supplemented",
              taskType: "archive_supplement_apply",
              title: `${title} 补档执行`,
              assigneeRoleId: "buyer",
              sourceTaskId: `${sourcePrefix}:supplement_apply`
            }
          ]
        : []
    };
  }
  if (event.eventCode === "ArchiveSupplementApplied") {
    return {
      processType: "archive",
      eventCode: "archive.supplement_applied",
      eventName: "补档已完成",
      fromNodeKey: "supplemented",
      toNodeKey: "sealed",
      fromStatus: "supplement_approved",
      toStatus: "supplemented",
      processStatus: "running",
      completeTaskSourceIds: [`${sourcePrefix}:supplement_apply`],
      nextTasks: [
        {
          nodeKey: "sealed",
          taskType: "archive_seal",
          title: `${title} 档案封存`,
          assigneeRoleId: "buyer",
          sourceTaskId: `${sourcePrefix}:seal`
        }
      ]
    };
  }
  if (event.eventCode === "ArchiveSealed") {
    return {
      processType: "archive",
      eventCode: "archive.sealed",
      eventName: "档案已封存",
      fromNodeKey: "sealed",
      toNodeKey: "sealed",
      fromStatus: "complete",
      toStatus: "sealed",
      processStatus: "completed",
      completed: true,
      completeTaskSourceIds: [`${sourcePrefix}:seal`]
    };
  }
  if (event.eventCode === "ArchiveAuditViewed") {
    return {
      processType: "archive",
      eventCode: "archive.audit_viewed",
      eventName: "审计已查阅档案",
      fromNodeKey: "sealed",
      toNodeKey: "audit_read",
      fromStatus: "sealed",
      toStatus: "audit_read",
      processStatus: "completed"
    };
  }
  return undefined;
}

function processEventMapping(eventCode: string, businessType: ApprovalBusinessType) {
  const mapping: Partial<
    Record<
      string,
      {
        status: string;
        fromNodeKey?: string;
        toNodeKey?: string;
        fromStatus?: string;
        toStatus?: string;
        processStatus?: ProcessStatus;
        updateInstance?: boolean;
        completedBy?: string;
        completedAt?: string;
        projectId?: string;
        completeTaskSourceId?: string;
        nextTask?: {
          nodeKey: string;
          taskType: string;
          title: string;
          assigneeRoleId?: RoleId;
          sourceTaskId: string;
        };
      }
    >
  > = {
    ProcurementRequestCreated: {
      status: "created",
      fromNodeKey: "start",
      toNodeKey: "request_created",
      fromStatus: "none",
      toStatus: "draft",
      processStatus: "draft"
    },
    ProcurementRequestSubmitted: {
      status: "submitted",
      fromNodeKey: "request_created",
      toNodeKey: "approval_pending",
      fromStatus: "draft",
      toStatus: "submitted",
      processStatus: "running"
    },
    ProcurementRequestApproved: {
      status: "approved",
      fromNodeKey: "approval_pending",
      toNodeKey: "method_decision",
      fromStatus: "submitted",
      toStatus: "approved",
      processStatus: "running"
    },
    ProcurementRequestRejected: {
      status: "rejected",
      fromNodeKey: "approval_pending",
      toNodeKey: "request_rejected",
      fromStatus: "submitted",
      toStatus: "rejected",
      processStatus: "rejected"
    },
    ProcurementMethodDecided: {
      status: "method_decided",
      fromNodeKey: "method_decision",
      toNodeKey: "method_decision",
      fromStatus: "approved",
      toStatus: "method_decided",
      processStatus: "running",
      updateInstance: true
    },
    AwardApprovalSubmitted: {
      status: "submitted",
      fromNodeKey: "start",
      toNodeKey: "approval_pending",
      fromStatus: "draft",
      toStatus: "submitted"
    },
    AwardApproved: {
      status: "approved",
      fromNodeKey: "approval_pending",
      toNodeKey: "approved_end",
      fromStatus: "submitted",
      toStatus: "approved"
    },
    AwardRejected: {
      status: "rejected",
      fromNodeKey: "approval_pending",
      toNodeKey: "rejected_end",
      fromStatus: "submitted",
      toStatus: "rejected"
    }
  };
  const matched = mapping[eventCode];
  if (!matched) return undefined;
  const eventCodeByStatus = matched.status === "method_decided" ? `${businessType}.method_decided` : `${businessType}.${matched.status}`;
  return {
    eventCode: eventCodeByStatus,
    eventName: eventName(businessType, matched.status),
    ...matched
  };
}
