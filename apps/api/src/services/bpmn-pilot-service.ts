import type { InternalBusinessEvent } from "../repositories/internal-business-event-repository.js";
import { isProcessBusinessType, type ProcessBusinessType } from "../repositories/process-repository.js";
import type { BpmnDefinitionRepository } from "../repositories/bpmn-definition-repository.js";
import {
  bpmnPilotBusinessRef,
  type BpmnPilotRecord,
  type BpmnPilotRepository,
  type BpmnPilotRunRecord,
  type BpmnPilotStatus
} from "../repositories/bpmn-pilot-repository.js";
import type { BpmnDefinitionService, BpmnSimulationEvent } from "./bpmn-definition-service.js";
import type { RoleId, User } from "../types.js";

export interface SaveBpmnPilotArgs {
  definitionId: string;
  pilotName: string;
  businessType: string;
  status?: BpmnPilotStatus;
  scope?: {
    orgIds?: unknown;
    businessIds?: unknown;
    environments?: unknown;
  };
  actor: User;
}

export interface UpdateBpmnPilotScopeServiceArgs {
  pilotId: string;
  scope?: {
    orgIds?: unknown;
    businessIds?: unknown;
    environments?: unknown;
  };
  actor: User;
}

export interface SwitchBpmnPilotDefinitionServiceArgs {
  pilotId: string;
  definitionId: string;
  reason?: string;
  actor: User;
}

export interface RollbackBpmnPilotServiceArgs {
  pilotId: string;
  targetDefinitionId?: string;
  reason?: string;
  actor: User;
}

const pilotReaderRoles = new Set<RoleId>(["admin", "platform_operator", "auditor"]);
const procurementRequestPilotEvents = new Set(["ProcurementRequestCreated", "ProcurementRequestSubmitted", "ProcurementRequestApproved", "ProcurementRequestRejected", "ProcurementMethodDecided"]);

export class BpmnPilotService {
  constructor(
    private readonly pilotRepository: BpmnPilotRepository,
    private readonly definitionRepository: BpmnDefinitionRepository,
    private readonly definitionService: BpmnDefinitionService,
    private readonly currentEnvironment = "local"
  ) {}

  savePilot(args: SaveBpmnPilotArgs) {
    const businessType = this.requireBusinessType(args.businessType);
    const definition = this.definitionRepository.getDefinition(args.definitionId);
    if (!definition) throw new BpmnPilotError("BPMN_DEFINITION_NOT_FOUND", "BPMN definition was not found.", 404);
    if (definition.status !== "enabled" || definition.validationStatus !== "valid") {
      throw new BpmnPilotError("BPMN_PILOT_DEFINITION_NOT_ENABLED", "BPMN pilot requires an enabled and validated BPMN definition.", 400);
    }
    if (definition.businessType !== businessType) {
      throw new BpmnPilotError("BPMN_PILOT_BUSINESS_TYPE_MISMATCH", "BPMN pilot businessType must match the BPMN definition.", 400);
    }
    const status = args.status ?? "draft";
    if (!["draft", "enabled", "disabled"].includes(status)) {
      throw new BpmnPilotError("BPMN_PILOT_STATUS_INVALID", "BPMN pilot status must be draft, enabled or disabled.", 400);
    }
    return this.pilotRepository.createPilot({
      definitionId: definition.id,
      pilotName: args.pilotName.trim() || definition.processName,
      businessType,
      status,
      scope: {
        orgIds: normalizeStringArray(args.scope?.orgIds),
        businessIds: normalizeStringArray(args.scope?.businessIds),
        environments: normalizeStringArray(args.scope?.environments)
      },
      createdBy: args.actor.id,
      actorRoleId: args.actor.roleId
    });
  }

  enablePilot(pilotId: string, actor: User) {
    const pilot = this.requirePilot(pilotId);
    const definition = this.definitionRepository.getDefinition(pilot.definitionId);
    if (!definition || definition.status !== "enabled" || definition.validationStatus !== "valid") {
      throw new BpmnPilotError("BPMN_PILOT_DEFINITION_NOT_ENABLED", "BPMN pilot requires an enabled and validated BPMN definition.", 400);
    }
    return this.pilotRepository.setPilotStatus({ pilotId, status: "enabled", actorId: actor.id, actorRoleId: actor.roleId })!;
  }

  disablePilot(pilotId: string, actor: User) {
    this.requirePilot(pilotId);
    return this.pilotRepository.setPilotStatus({ pilotId, status: "disabled", actorId: actor.id, actorRoleId: actor.roleId })!;
  }

  updatePilotScope(args: UpdateBpmnPilotScopeServiceArgs) {
    this.requirePilot(args.pilotId);
    return this.pilotRepository.updatePilotScope({
      pilotId: args.pilotId,
      scope: {
        orgIds: normalizeStringArray(args.scope?.orgIds),
        businessIds: normalizeStringArray(args.scope?.businessIds),
        environments: normalizeStringArray(args.scope?.environments)
      },
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId
    })!;
  }

  switchPilotDefinition(args: SwitchBpmnPilotDefinitionServiceArgs) {
    const pilot = this.requirePilot(args.pilotId);
    const definition = this.requireEnabledDefinition(args.definitionId);
    if (definition.businessType !== pilot.businessType) {
      throw new BpmnPilotError("BPMN_PILOT_BUSINESS_TYPE_MISMATCH", "BPMN pilot businessType must match the BPMN definition.", 400);
    }
    if (definition.id === pilot.definitionId) {
      throw new BpmnPilotError("BPMN_PILOT_DEFINITION_UNCHANGED", "BPMN pilot already uses this definition.", 400);
    }
    return this.pilotRepository.switchPilotDefinition({
      pilotId: args.pilotId,
      definitionId: definition.id,
      reason: args.reason,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId
    })!;
  }

  rollbackPilot(args: RollbackBpmnPilotServiceArgs) {
    const pilot = this.requirePilot(args.pilotId);
    const targetDefinitionId = args.targetDefinitionId ?? pilot.previousDefinitionId;
    if (targetDefinitionId) {
      const definition = this.requireEnabledDefinition(targetDefinitionId);
      if (definition.businessType !== pilot.businessType) {
        throw new BpmnPilotError("BPMN_PILOT_BUSINESS_TYPE_MISMATCH", "Rollback target businessType must match the BPMN pilot.", 400);
      }
    }
    return this.pilotRepository.rollbackPilot({
      pilotId: args.pilotId,
      targetDefinitionId,
      reason: args.reason,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId
    })!;
  }

  listPilots(viewerRoleId: RoleId) {
    if (!pilotReaderRoles.has(viewerRoleId)) return [];
    const pilots = viewerRoleId === "auditor" ? this.pilotRepository.listPilots().filter((pilot) => pilot.status === "enabled") : this.pilotRepository.listPilots();
    return pilots.map((pilot) => this.toPilotDto(pilot, viewerRoleId));
  }

  listRuns(viewerRoleId: RoleId, filter: { pilotId?: string; businessType?: string; businessId?: string } = {}) {
    if (!pilotReaderRoles.has(viewerRoleId)) return [];
    const businessType = filter.businessType && isProcessBusinessType(filter.businessType) ? filter.businessType : undefined;
    const runs = this.pilotRepository.listRuns({ pilotId: filter.pilotId, businessType, businessId: filter.businessId });
    const enabledPilotIds = viewerRoleId === "auditor" ? new Set(this.pilotRepository.listPilots().filter((pilot) => pilot.status === "enabled").map((pilot) => pilot.id)) : undefined;
    return runs.filter((run) => !enabledPilotIds || enabledPilotIds.has(run.pilotId)).map((run) => this.toRunDto(run));
  }

  listHealth(viewerRoleId: RoleId) {
    if (!pilotReaderRoles.has(viewerRoleId)) return [];
    const pilots = viewerRoleId === "auditor" ? this.pilotRepository.listPilots().filter((pilot) => pilot.status === "enabled") : this.pilotRepository.listPilots();
    return pilots.map((pilot) => {
      const runs = this.pilotRepository.listRuns({ pilotId: pilot.id });
      const latestRun = runs.at(-1);
      const latestFallback = runs
        .slice()
        .reverse()
        .find((run) => run.status === "fallback" || run.status === "failed");
      const latestChangeLog = this.pilotRepository.listChangeLogs(pilot.id)[0];
      const runCount = runs.length;
      const compatibleCount = countPilotRuns(runs, "compatible");
      const fallbackCount = countPilotRuns(runs, "fallback");
      const failedCount = countPilotRuns(runs, "failed");
      const skippedCount = countPilotRuns(runs, "skipped");
      return {
        id: `bpmn-pilot-health:${pilot.id}`,
        pilotId: pilot.id,
        definitionId: pilot.definitionId,
        pilotName: pilot.pilotName,
        businessType: pilot.businessType,
        status: pilot.status,
        mode: pilot.mode,
        scope: {
          orgIds: pilot.scope.orgIds,
          businessIdCount: pilot.scope.businessIds.length,
          environments: pilot.scope.environments
        },
        fallbackTo: pilot.fallbackTo,
        previousDefinitionId: pilot.previousDefinitionId,
        lastRollbackReason: pilot.lastRollbackReason,
        runCount,
        compatibleCount,
        fallbackCount,
        failedCount,
        skippedCount,
        compatibilityRate: runCount === 0 ? null : Number((compatibleCount / runCount).toFixed(4)),
        latestRunAt: latestRun?.createdAt,
        latestRunStatus: latestRun?.status,
        latestStoppedReason: latestRun?.stoppedReason,
        latestPredictedNodeKey: latestRun?.predictedNodeKey,
        latestErrorCode: latestRun?.errorCode,
        latestFallbackAt: latestFallback?.createdAt,
        latestFallbackReason: latestFallback?.stoppedReason,
        latestFallbackErrorCode: latestFallback?.errorCode,
        lastGovernanceAction: latestChangeLog?.actionCode,
        lastGovernanceAt: latestChangeLog?.createdAt,
        fallbackActive: pilot.status === "disabled" || fallbackCount > 0 || failedCount > 0 || Boolean(pilot.lastRollbackReason),
        needsAttention: pilot.status === "enabled" && (fallbackCount > 0 || failedCount > 0)
      };
    });
  }

  listChangeLogs(viewerRoleId: RoleId, pilotId?: string) {
    if (!pilotReaderRoles.has(viewerRoleId)) return [];
    const enabledPilotIds = viewerRoleId === "auditor" ? new Set(this.pilotRepository.listPilots().filter((pilot) => pilot.status === "enabled").map((pilot) => pilot.id)) : undefined;
    return this.pilotRepository
      .listChangeLogs(pilotId)
      .filter((entry) => !enabledPilotIds || enabledPilotIds.has(entry.pilotId))
      .map((entry) => ({
        id: entry.id,
        pilotId: entry.pilotId,
        actionCode: entry.actionCode,
        actorRoleId: entry.actorRoleId,
        before: entry.beforeJson,
        after: entry.afterJson,
        createdAt: entry.createdAt
      }));
  }

  handleInternalBusinessEvent(event: InternalBusinessEvent) {
    if (!isProcessBusinessType(event.businessType)) return undefined;
    if (event.businessType !== "procurement_request" || !procurementRequestPilotEvents.has(event.eventCode)) return undefined;
    const pilot = this.matchEnabledPilot(event.businessType, event.businessId, event.orgId);
    if (!pilot) return undefined;
    try {
      const events = eventsForProcurementRequestPilot(event.eventCode);
      const simulation = this.definitionService.simulate({ definitionId: pilot.definitionId, events });
      if (!simulation.valid) {
        return this.pilotRepository.recordPilotRun({
          pilotId: pilot.id,
          definitionId: pilot.definitionId,
          internalEventId: event.id,
          eventCode: event.eventCode,
          businessType: event.businessType,
          businessId: event.businessId,
          orgId: event.orgId,
          status: "fallback",
          stoppedReason: "validation_failed",
          consumedEvents: 0,
          pathJson: [],
          errorCode: "BPMN_PILOT_VALIDATION_FAILED",
          errorMessage: simulation.errors.map((item) => item.code).join(", ")
        });
      }
      const lastNode = simulation.path.at(-1);
      const compatible = isSimulationProgressCompatible(event.eventCode, simulation.stoppedReason, lastNode?.nodeKey);
      const expectedNodeKey = expectedNodeForProcurementRequestEvent(event.eventCode);
      return this.pilotRepository.recordPilotRun({
        pilotId: pilot.id,
        definitionId: pilot.definitionId,
        internalEventId: event.id,
        eventCode: event.eventCode,
        businessType: event.businessType,
        businessId: event.businessId,
        orgId: event.orgId,
        status: compatible ? "compatible" : "fallback",
        stoppedReason: compatible ? simulation.stoppedReason : "expected_node_mismatch",
        predictedNodeKey: lastNode?.nodeKey,
        consumedEvents: simulation.consumedEvents,
        pathJson: simulation.path.map((node) => ({ nodeKey: node.nodeKey, nodeName: node.nodeName, nodeType: node.nodeType })),
        errorCode: compatible ? undefined : "BPMN_PILOT_NODE_MISMATCH",
        errorMessage: compatible ? undefined : `expected=${expectedNodeKey ?? ""};actual=${lastNode?.nodeKey ?? ""}`
      });
    } catch (error) {
      return this.pilotRepository.recordPilotRun({
        pilotId: pilot.id,
        definitionId: pilot.definitionId,
        internalEventId: event.id,
        eventCode: event.eventCode,
        businessType: event.businessType,
        businessId: event.businessId,
        orgId: event.orgId,
        status: "fallback",
        stoppedReason: "simulation_error",
        consumedEvents: 0,
        pathJson: [],
        errorCode: error instanceof BpmnPilotError ? error.code : "BPMN_PILOT_SIMULATION_FAILED",
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  toPilotDto(pilot: BpmnPilotRecord, _viewerRoleId: RoleId) {
    return {
      id: pilot.id,
      definitionId: pilot.definitionId,
      pilotName: pilot.pilotName,
      businessType: pilot.businessType,
      status: pilot.status,
      mode: pilot.mode,
      scope: {
        orgIds: pilot.scope.orgIds,
        businessIdCount: pilot.scope.businessIds.length,
        environments: pilot.scope.environments
      },
      fallbackTo: pilot.fallbackTo,
      previousDefinitionId: pilot.previousDefinitionId,
      lastRollbackReason: pilot.lastRollbackReason,
      createdAt: pilot.createdAt,
      updatedAt: pilot.updatedAt,
      enabledAt: pilot.enabledAt,
      disabledAt: pilot.disabledAt
    };
  }

  private toRunDto(run: BpmnPilotRunRecord) {
    return {
      id: run.id,
      pilotId: run.pilotId,
      definitionId: run.definitionId,
      eventCode: run.eventCode,
      businessType: run.businessType,
      businessRef: run.businessRef,
      orgId: run.orgId,
      status: run.status,
      stoppedReason: run.stoppedReason,
      predictedNodeKey: run.predictedNodeKey,
      consumedEvents: run.consumedEvents,
      path: run.pathJson,
      fallbackTo: run.fallbackTo,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt
    };
  }

  private matchEnabledPilot(businessType: ProcessBusinessType, businessId: string, orgId?: string) {
    return this.pilotRepository.listEnabledPilots().find((pilot) => {
      if (pilot.businessType !== businessType || pilot.mode !== "shadow") return false;
      const orgMatched = pilot.scope.orgIds.length === 0 || (orgId !== undefined && pilot.scope.orgIds.includes(orgId));
      const businessMatched = pilot.scope.businessIds.length === 0 || pilot.scope.businessIds.includes(businessId);
      const envMatched = pilot.scope.environments.length === 0 || pilot.scope.environments.includes(this.currentEnvironment);
      return orgMatched && businessMatched && envMatched;
    });
  }

  private requirePilot(pilotId: string) {
    const pilot = this.pilotRepository.getPilot(pilotId);
    if (!pilot) throw new BpmnPilotError("BPMN_PILOT_NOT_FOUND", "BPMN pilot was not found.", 404);
    return pilot;
  }

  private requireEnabledDefinition(definitionId: string) {
    const definition = this.definitionRepository.getDefinition(definitionId);
    if (!definition) throw new BpmnPilotError("BPMN_DEFINITION_NOT_FOUND", "BPMN definition was not found.", 404);
    if (definition.status !== "enabled" || definition.validationStatus !== "valid") {
      throw new BpmnPilotError("BPMN_PILOT_DEFINITION_NOT_ENABLED", "BPMN pilot requires an enabled and validated BPMN definition.", 400);
    }
    return definition;
  }

  private requireBusinessType(value: string) {
    if (!isProcessBusinessType(value)) {
      throw new BpmnPilotError("BPMN_PILOT_BUSINESS_TYPE_UNSUPPORTED", "BPMN pilot businessType must map to an existing Process Layer business type.", 400);
    }
    return value;
  }
}

export class BpmnPilotError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function eventsForProcurementRequestPilot(eventCode: string): BpmnSimulationEvent[] {
  if (eventCode === "ProcurementRequestCreated") return [];
  if (eventCode === "ProcurementRequestSubmitted") return ["submit"];
  if (eventCode === "ProcurementRequestApproved") return ["submit", "review", "approve"];
  if (eventCode === "ProcurementRequestRejected") return ["submit", "review", "reject"];
  if (eventCode === "ProcurementMethodDecided") return ["submit", "review", "approve", "method_decided"];
  return [];
}

function expectedNodeForProcurementRequestEvent(eventCode: string) {
  if (eventCode === "ProcurementRequestCreated") return "start";
  if (eventCode === "ProcurementRequestSubmitted") return "purchase_review";
  if (eventCode === "ProcurementRequestApproved") return "method_decision";
  if (eventCode === "ProcurementRequestRejected") return "rejected_end";
  if (eventCode === "ProcurementMethodDecided") return "approved_end";
  return undefined;
}

function isSimulationProgressCompatible(eventCode: string, stoppedReason: string, predictedNodeKey?: string) {
  if (stoppedReason !== "completed" && stoppedReason !== "waiting_for_matching_event") return false;
  const expectedNodeKey = expectedNodeForProcurementRequestEvent(eventCode);
  return !expectedNodeKey || predictedNodeKey === expectedNodeKey;
}

function countPilotRuns(runs: BpmnPilotRunRecord[], status: BpmnPilotRunRecord["status"]) {
  return runs.filter((run) => run.status === status).length;
}

export { bpmnPilotBusinessRef };
