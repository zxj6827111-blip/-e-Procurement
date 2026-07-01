import { bpmnXmlDigest, type BpmnDefinitionRecord, type BpmnDefinitionRepository, type BpmnDefinitionStatus, type BpmnValidationIssue } from "../repositories/bpmn-definition-repository.js";
import { isProcessBusinessType, type ProcessBusinessType } from "../repositories/process-repository.js";
import type { RoleId, User } from "../types.js";

type BpmnElementType = "startEvent" | "endEvent" | "userTask" | "serviceTask" | "exclusiveGateway";
type ProcessNodeType = "start" | "end" | "user_task" | "system_task" | "gateway";

interface RawBpmnNode {
  id: string;
  name: string;
  type: BpmnElementType;
  attrs: Record<string, string>;
  incoming: string[];
  outgoing: string[];
}

interface RawBpmnFlow {
  id: string;
  name: string;
  sourceRef: string;
  targetRef: string;
  actionCode: string;
  conditionExpression?: string;
  explicitCondition?: string;
  isDefault: boolean;
}

interface ParsedBpmnModel {
  nodes: RawBpmnNode[];
  flows: RawBpmnFlow[];
}

export interface BpmnProcessNodeDraft {
  nodeKey: string;
  nodeName: string;
  nodeType: ProcessNodeType;
  assigneeRoleId?: RoleId;
  taskType?: string;
  businessAction?: string;
  sortOrder: number;
}

export interface BpmnProcessTransitionDraft {
  fromNodeKey: string;
  toNodeKey: string;
  actionCode: string;
  conditionJson: Record<string, unknown>;
  priority: number;
}

export interface BpmnProcessPreview {
  [key: string]: unknown;
  processDefinitionDraft: {
    processCode: string;
    processName: string;
    processType: ProcessBusinessType;
    versionNo: number;
    status: "draft";
    sourceType: "bpmn_preview";
    sourceJson: {
      sourceEngine: "bpmn_definition";
      phase: "M5-A";
      mode: "preview_only";
      defaultExecutionSource: "r8_workflow_or_process_layer";
      bpmnXmlSha256: string;
    };
  };
  nodes: BpmnProcessNodeDraft[];
  transitions: BpmnProcessTransitionDraft[];
}

export interface ValidateBpmnArgs {
  processCode: string;
  processName: string;
  versionNo?: number;
  businessType: string;
  bpmnXml: string;
}

export interface SaveBpmnDefinitionArgs extends ValidateBpmnArgs {
  status?: BpmnDefinitionStatus;
  actor: User;
}

export type BpmnSimulationEvent =
  | string
  | {
      action?: string;
      eventCode?: string;
      variables?: Record<string, unknown>;
    };

export interface SimulateBpmnArgs {
  definitionId?: string;
  bpmnXml?: string;
  processCode?: string;
  processName?: string;
  businessType?: string;
  events?: BpmnSimulationEvent[];
  variables?: Record<string, unknown>;
}

const allowedRoles = new Set<RoleId>([
  "group_manager",
  "buyer",
  "hotel_buyer",
  "hotel_finance",
  "platform_operator",
  "supplier",
  "supplier_admin",
  "supplier_quotation",
  "expert",
  "finance_reviewer",
  "auditor",
  "admin",
  "system"
]);

const roleAliases: Record<string, RoleId> = {
  procurement: "buyer",
  purchase: "buyer",
  buyer: "buyer",
  group_purchase: "group_manager",
  group_manager: "group_manager",
  hotel_purchase: "hotel_buyer",
  hotel_buyer: "hotel_buyer",
  supplier: "supplier",
  supplier_admin: "supplier_admin",
  supplier_quotation: "supplier_quotation",
  expert: "expert",
  finance: "finance_reviewer",
  finance_reviewer: "finance_reviewer",
  hotel_finance: "hotel_finance",
  audit: "auditor",
  auditor: "auditor",
  admin: "admin",
  system: "system",
  platform_operator: "platform_operator"
};

export class BpmnDefinitionService {
  constructor(private readonly repository: BpmnDefinitionRepository) {}

  validate(args: ValidateBpmnArgs) {
    return this.validateInternal(args);
  }

  saveDefinition(args: SaveBpmnDefinitionArgs) {
    const validation = this.validateInternal(args);
    const requestedStatus = args.status ?? "draft";
    if (!["draft", "enabled", "disabled"].includes(requestedStatus)) {
      throw new BpmnDefinitionError("BPMN_STATUS_INVALID", "BPMN status must be draft, enabled or disabled.", 400);
    }
    if (requestedStatus === "enabled" && !validation.valid) {
      throw new BpmnDefinitionError("BPMN_VALIDATION_REQUIRED", "BPMN definition must pass validation before it can be enabled.", 400, validation.errors);
    }
    const record = this.repository.createDefinition({
      processCode: args.processCode,
      processName: args.processName,
      versionNo: args.versionNo,
      status: requestedStatus === "enabled" ? "draft" : requestedStatus,
      businessType: this.requireBusinessType(args.businessType),
      bpmnXml: args.bpmnXml,
      createdBy: args.actor.id,
      actorRoleId: args.actor.roleId
    });
    const validated = this.repository.updateValidation({
      definitionId: record.id,
      validationStatus: validation.valid ? "valid" : "invalid",
      validationErrors: validation.errors,
      processPreview: validation.preview,
      actorId: args.actor.id,
      actorRoleId: args.actor.roleId
    })!;
    if (requestedStatus === "enabled") {
      return this.enableDefinition(validated.id, args.actor);
    }
    return validated;
  }

  enableDefinition(definitionId: string, actor: User) {
    const definition = this.repository.getDefinition(definitionId);
    if (!definition) {
      throw new BpmnDefinitionError("BPMN_DEFINITION_NOT_FOUND", "BPMN definition was not found.", 404);
    }
    if (definition.validationStatus !== "valid") {
      throw new BpmnDefinitionError("BPMN_VALIDATION_REQUIRED", "Only validated BPMN definitions can be enabled.", 400, definition.validationErrors);
    }
    return this.repository.setStatus({ definitionId, status: "enabled", actorId: actor.id, actorRoleId: actor.roleId })!;
  }

  disableDefinition(definitionId: string, actor: User) {
    const definition = this.repository.getDefinition(definitionId);
    if (!definition) {
      throw new BpmnDefinitionError("BPMN_DEFINITION_NOT_FOUND", "BPMN definition was not found.", 404);
    }
    return this.repository.setStatus({ definitionId, status: "disabled", actorId: actor.id, actorRoleId: actor.roleId })!;
  }

  listDefinitions(viewerRoleId: RoleId) {
    const records = viewerRoleId === "auditor" ? this.repository.listEnabledDefinitions() : this.repository.listDefinitions();
    return records.map((record) => this.toDto(record, viewerRoleId));
  }

  getDefinition(definitionId: string, viewerRoleId: RoleId) {
    const record = this.repository.getDefinition(definitionId);
    if (!record) return undefined;
    if (viewerRoleId === "auditor" && record.status !== "enabled") return undefined;
    return this.toDto(record, viewerRoleId);
  }

  listChangeLogs(viewerRoleId: RoleId, definitionId?: string) {
    const enabledIds = viewerRoleId === "auditor" ? new Set(this.repository.listEnabledDefinitions().map((item) => item.id)) : undefined;
    return this.repository
      .listChangeLogs(definitionId)
      .filter((entry) => !enabledIds || enabledIds.has(entry.definitionId))
      .map((entry) => ({
        id: entry.id,
        definitionId: entry.definitionId,
        actionCode: entry.actionCode,
        actorRoleId: entry.actorRoleId,
        before: entry.beforeJson,
        after: entry.afterJson,
        createdAt: entry.createdAt
      }));
  }

  simulate(args: SimulateBpmnArgs) {
    const source =
      args.definitionId === undefined
        ? {
            processCode: args.processCode ?? "bpmn_simulation",
            processName: args.processName ?? "BPMN simulation",
            versionNo: 1,
            businessType: args.businessType ?? "procurement_request",
            bpmnXml: args.bpmnXml ?? ""
          }
        : this.recordToValidationArgs(this.requireDefinition(args.definitionId));
    const validation = this.validateInternal(source);
    if (!validation.valid) {
      return {
        valid: false,
        errors: validation.errors,
        path: [],
        consumedEvents: 0,
        stoppedReason: "validation_failed"
      };
    }
    const parsed = this.parse(source.bpmnXml);
    const events = args.events ?? [];
    const variables = args.variables ?? {};
    const start = parsed.nodes.find((node) => node.type === "startEvent")!;
    const nodeById = new Map(parsed.nodes.map((node) => [node.id, node]));
    const outgoingByNode = groupBy(parsed.flows, (flow) => flow.sourceRef);
    const path: Array<{ nodeKey: string; nodeName: string; nodeType: ProcessNodeType; matchedEvent?: string; transitionAction?: string }> = [];
    let current = start;
    let eventIndex = 0;
    let stoppedReason = "completed";

    for (let step = 0; step < Math.max(parsed.nodes.length + parsed.flows.length + events.length + 5, 20); step += 1) {
      path.push({
        nodeKey: current.id,
        nodeName: current.name,
        nodeType: toProcessNodeType(current.type)
      });
      if (current.type === "endEvent") break;
      const outgoing = outgoingByNode.get(current.id) ?? [];
      if (outgoing.length === 0) {
        stoppedReason = "no_outgoing_transition";
        break;
      }
      const event = events[eventIndex];
      const selected = this.selectTransition(current, outgoing, event, variables);
      if (!selected) {
        stoppedReason = "waiting_for_matching_event";
        break;
      }
      if (event !== undefined && transitionMatchesEvent(selected, event, variables)) {
        eventIndex += 1;
      }
      const next = nodeById.get(selected.targetRef);
      if (!next) {
        stoppedReason = "target_node_missing";
        break;
      }
      current = next;
      const last = path[path.length - 1];
      last.matchedEvent = eventToAction(event);
      last.transitionAction = selected.actionCode;
    }

    return {
      valid: true,
      errors: [],
      path,
      consumedEvents: eventIndex,
      stoppedReason,
      preview: validation.preview
    };
  }

  toDto(record: BpmnDefinitionRecord, viewerRoleId: RoleId) {
    const canSeeValidationDetail = viewerRoleId === "admin" || viewerRoleId === "platform_operator";
    return {
      id: record.id,
      processCode: record.processCode,
      processName: record.processName,
      versionNo: record.versionNo,
      status: record.status,
      businessType: record.businessType,
      validationStatus: record.validationStatus,
      validationErrors: canSeeValidationDetail ? record.validationErrors : record.validationErrors.map((item) => ({ code: item.code, message: item.message, nodeId: item.nodeId, flowId: item.flowId })),
      xmlSha256: bpmnXmlDigest(record.bpmnXml),
      xmlLength: record.bpmnXml.length,
      processPreview: record.processPreview,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      validatedAt: record.validatedAt,
      enabledAt: record.enabledAt,
      disabledAt: record.disabledAt
    };
  }

  private validateInternal(args: ValidateBpmnArgs) {
    const errors: BpmnValidationIssue[] = [];
    const businessType = this.resolveBusinessType(args.businessType);
    if (!businessType) {
      errors.push({ code: "BPMN_BUSINESS_TYPE_UNSUPPORTED", message: "BPMN businessType must map to an existing Process Layer business type." });
    }
    if (!/^[a-z0-9_:-]{2,80}$/i.test(args.processCode)) {
      errors.push({ code: "BPMN_PROCESS_CODE_INVALID", message: "BPMN processCode must be a stable code using letters, numbers, underscore, colon or dash." });
    }
    if (!args.processName.trim()) {
      errors.push({ code: "BPMN_PROCESS_NAME_REQUIRED", message: "BPMN processName is required." });
    }
    if (!args.bpmnXml.trim()) {
      errors.push({ code: "BPMN_XML_REQUIRED", message: "BPMN XML is required." });
    }

    const parsed = this.parse(args.bpmnXml);
    errors.push(...this.validateParsedModel(parsed));
    const preview = businessType ? this.toPreview(parsed, { ...args, businessType }) : this.emptyPreview(args);
    return {
      valid: errors.length === 0,
      errors,
      parsed,
      preview
    };
  }

  private parse(xml: string): ParsedBpmnModel {
    const nodes = new Map<string, RawBpmnNode>();
    const flows: RawBpmnFlow[] = [];
    const nodePattern = /<(?:[\w.-]+:)?(startEvent|endEvent|userTask|serviceTask|exclusiveGateway)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?\1>)/gi;
    const flowPattern = /<(?:[\w.-]+:)?sequenceFlow\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?sequenceFlow>)/gi;
    for (const match of xml.matchAll(nodePattern)) {
      const type = match[1] as BpmnElementType;
      const attrs = parseAttributes(match[2] ?? "");
      const id = attrs.id?.trim();
      if (!id) continue;
      nodes.set(id, {
        id,
        name: attrs.name?.trim() || id,
        type,
        attrs,
        incoming: [],
        outgoing: []
      });
    }
    for (const match of xml.matchAll(flowPattern)) {
      const attrs = parseAttributes(match[1] ?? "");
      const body = match[2] ?? "";
      const id = attrs.id?.trim();
      if (!id) continue;
      const sourceRef = attrs.sourceRef?.trim();
      const targetRef = attrs.targetRef?.trim();
      flows.push({
        id,
        name: attrs.name ?? id,
        sourceRef: sourceRef ?? "",
        targetRef: targetRef ?? "",
        actionCode: normalizeCode(firstAttr(attrs, ["actionCode", "data-action-code", "businessAction", "data-business-action", "name"]) ?? id),
        conditionExpression: extractConditionExpression(body) ?? firstAttr(attrs, ["condition", "data-condition", "expression"]),
        explicitCondition: extractConditionExpression(body) ?? firstAttr(attrs, ["condition", "data-condition", "expression", "name"]),
        isDefault: false
      });
    }
    for (const flow of flows) {
      const source = nodes.get(flow.sourceRef);
      const target = nodes.get(flow.targetRef);
      source?.outgoing.push(flow.id);
      target?.incoming.push(flow.id);
      if (source?.type === "exclusiveGateway" && source.attrs.default === flow.id) {
        flow.isDefault = true;
      }
    }
    return { nodes: [...nodes.values()], flows };
  }

  private validateParsedModel(parsed: ParsedBpmnModel) {
    const errors: BpmnValidationIssue[] = [];
    if (parsed.nodes.length === 0) {
      errors.push({ code: "BPMN_NO_SUPPORTED_NODES", message: "BPMN must include supported startEvent, endEvent, userTask, serviceTask or exclusiveGateway nodes." });
      return errors;
    }
    const starts = parsed.nodes.filter((node) => node.type === "startEvent");
    if (starts.length !== 1) {
      errors.push({ code: "BPMN_START_EVENT_COUNT_INVALID", message: "BPMN must have exactly one startEvent." });
    }
    if (!parsed.nodes.some((node) => node.type === "endEvent")) {
      errors.push({ code: "BPMN_END_EVENT_REQUIRED", message: "BPMN must include at least one endEvent." });
    }
    const nodeIds = new Set(parsed.nodes.map((node) => node.id));
    for (const flow of parsed.flows) {
      if (!flow.sourceRef || !flow.targetRef) {
        errors.push({ code: "BPMN_SEQUENCE_FLOW_ENDPOINT_REQUIRED", message: "sequenceFlow must declare sourceRef and targetRef.", flowId: flow.id });
      }
      if (flow.sourceRef && !nodeIds.has(flow.sourceRef)) {
        errors.push({ code: "BPMN_SEQUENCE_FLOW_SOURCE_MISSING", message: "sequenceFlow sourceRef does not point to a supported node.", flowId: flow.id });
      }
      if (flow.targetRef && !nodeIds.has(flow.targetRef)) {
        errors.push({ code: "BPMN_SEQUENCE_FLOW_TARGET_MISSING", message: "sequenceFlow targetRef does not point to a supported node.", flowId: flow.id });
      }
    }
    for (const node of parsed.nodes) {
      if (node.type === "startEvent" && node.outgoing.length === 0) {
        errors.push({ code: "BPMN_START_OUTGOING_REQUIRED", message: "startEvent must have an outgoing sequenceFlow.", nodeId: node.id });
      }
      if (node.type === "endEvent" && node.incoming.length === 0) {
        errors.push({ code: "BPMN_END_INCOMING_REQUIRED", message: "endEvent must be reachable by an incoming sequenceFlow.", nodeId: node.id });
      }
      if (node.type !== "startEvent" && node.type !== "endEvent" && (node.incoming.length === 0 || node.outgoing.length === 0)) {
        errors.push({ code: "BPMN_NODE_ISOLATED", message: "Main process nodes must have both incoming and outgoing sequenceFlow links.", nodeId: node.id });
      }
      const role = resolveRole(firstAttr(node.attrs, ["roleId", "assigneeRoleId", "data-role-id", "candidateGroups", "camunda:candidateGroups", "role"]));
      const taskType = firstAttr(node.attrs, ["taskType", "data-task-type", "businessAction", "data-business-action", "actionCode", "data-action-code"]);
      if (node.type === "userTask") {
        if (!role) {
          errors.push({ code: "BPMN_USER_TASK_ROLE_REQUIRED", message: "userTask must map to a supported system role.", nodeId: node.id });
        }
        if (!taskType) {
          errors.push({ code: "BPMN_USER_TASK_ACTION_REQUIRED", message: "userTask must declare taskType or businessAction.", nodeId: node.id });
        }
      }
      if (node.type === "serviceTask" && !taskType) {
        errors.push({ code: "BPMN_SERVICE_TASK_ACTION_REQUIRED", message: "serviceTask must declare a businessAction or taskType.", nodeId: node.id });
      }
      const rawRole = firstAttr(node.attrs, ["roleId", "assigneeRoleId", "data-role-id", "candidateGroups", "camunda:candidateGroups", "role"]);
      if (rawRole && !role) {
        errors.push({ code: "BPMN_NODE_ROLE_INVALID", message: "BPMN node role is not one of the supported system roles.", nodeId: node.id });
      }
    }
    const outgoingByNode = groupBy(parsed.flows, (flow) => flow.sourceRef);
    for (const gateway of parsed.nodes.filter((node) => node.type === "exclusiveGateway")) {
      for (const flow of outgoingByNode.get(gateway.id) ?? []) {
        if (flow.isDefault) continue;
        if (!flow.explicitCondition || normalizeCode(flow.explicitCondition) === normalizeCode(flow.id)) {
          errors.push({ code: "BPMN_GATEWAY_CONDITION_REQUIRED", message: "exclusiveGateway outgoing sequenceFlow must declare a recognizable condition.", nodeId: gateway.id, flowId: flow.id });
        }
      }
    }
    const start = starts[0];
    if (start) {
      const reachable = new Set<string>();
      const queue = [start.id];
      const flowsBySource = groupBy(parsed.flows, (flow) => flow.sourceRef);
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachable.has(current)) continue;
        reachable.add(current);
        for (const flow of flowsBySource.get(current) ?? []) {
          if (!reachable.has(flow.targetRef)) queue.push(flow.targetRef);
        }
      }
      for (const node of parsed.nodes) {
        if (!reachable.has(node.id)) {
          errors.push({ code: "BPMN_NODE_UNREACHABLE", message: "BPMN node is not reachable from the startEvent.", nodeId: node.id });
        }
      }
    }
    return errors;
  }

  private toPreview(parsed: ParsedBpmnModel, args: ValidateBpmnArgs & { businessType: ProcessBusinessType }): BpmnProcessPreview {
    return {
      processDefinitionDraft: {
        processCode: args.processCode,
        processName: args.processName,
        processType: args.businessType,
        versionNo: args.versionNo ?? 1,
        status: "draft",
        sourceType: "bpmn_preview",
        sourceJson: {
          sourceEngine: "bpmn_definition",
          phase: "M5-A",
          mode: "preview_only",
          defaultExecutionSource: "r8_workflow_or_process_layer",
          bpmnXmlSha256: bpmnXmlDigest(args.bpmnXml)
        }
      },
      nodes: parsed.nodes.map((node, index) => {
        const taskType = firstAttr(node.attrs, ["taskType", "data-task-type", "businessAction", "data-business-action", "actionCode", "data-action-code"]);
        return {
          nodeKey: node.id,
          nodeName: node.name,
          nodeType: toProcessNodeType(node.type),
          assigneeRoleId: resolveRole(firstAttr(node.attrs, ["roleId", "assigneeRoleId", "data-role-id", "candidateGroups", "camunda:candidateGroups", "role"])),
          taskType: taskType ? normalizeCode(taskType) : undefined,
          businessAction: taskType ? normalizeCode(taskType) : undefined,
          sortOrder: index * 10
        };
      }),
      transitions: parsed.flows.map((flow, index) => ({
        fromNodeKey: flow.sourceRef,
        toNodeKey: flow.targetRef,
        actionCode: flow.actionCode,
        conditionJson: {
          expression: flow.conditionExpression,
          default: flow.isDefault || undefined,
          bpmnFlowId: flow.id
        },
        priority: index + 1
      }))
    };
  }

  private emptyPreview(args: ValidateBpmnArgs): BpmnProcessPreview {
    return {
      processDefinitionDraft: {
        processCode: args.processCode,
        processName: args.processName,
        processType: "procurement_request",
        versionNo: args.versionNo ?? 1,
        status: "draft",
        sourceType: "bpmn_preview",
        sourceJson: {
          sourceEngine: "bpmn_definition",
          phase: "M5-A",
          mode: "preview_only",
          defaultExecutionSource: "r8_workflow_or_process_layer",
          bpmnXmlSha256: bpmnXmlDigest(args.bpmnXml ?? "")
        }
      },
      nodes: [],
      transitions: []
    };
  }

  private selectTransition(node: RawBpmnNode, outgoing: RawBpmnFlow[], event: BpmnSimulationEvent | undefined, variables: Record<string, unknown>) {
    if (node.type === "startEvent" || node.type === "serviceTask") {
      return outgoing.find((flow) => event !== undefined && transitionMatchesEvent(flow, event, variables)) ?? (outgoing.length === 1 ? outgoing[0] : undefined);
    }
    if (node.type === "exclusiveGateway") {
      return outgoing.find((flow) => !flow.isDefault && event !== undefined && transitionMatchesEvent(flow, event, variables)) ?? outgoing.find((flow) => flow.isDefault);
    }
    return outgoing.find((flow) => event !== undefined && transitionMatchesEvent(flow, event, variables));
  }

  private requireDefinition(definitionId: string) {
    const definition = this.repository.getDefinition(definitionId);
    if (!definition) {
      throw new BpmnDefinitionError("BPMN_DEFINITION_NOT_FOUND", "BPMN definition was not found.", 404);
    }
    return definition;
  }

  private recordToValidationArgs(record: BpmnDefinitionRecord): ValidateBpmnArgs {
    return {
      processCode: record.processCode,
      processName: record.processName,
      versionNo: record.versionNo,
      businessType: record.businessType,
      bpmnXml: record.bpmnXml
    };
  }

  private requireBusinessType(value: string) {
    const resolved = this.resolveBusinessType(value);
    if (!resolved) {
      throw new BpmnDefinitionError("BPMN_BUSINESS_TYPE_UNSUPPORTED", "BPMN businessType must map to an existing Process Layer business type.", 400);
    }
    return resolved;
  }

  private resolveBusinessType(value: string): ProcessBusinessType | undefined {
    return isProcessBusinessType(value) ? value : undefined;
  }
}

export class BpmnDefinitionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly issues: BpmnValidationIssue[] = []
  ) {
    super(message);
  }
}

function parseAttributes(value: string) {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of value.matchAll(attrPattern)) {
    attrs[match[1]] = decodeXml(match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function firstAttr(attrs: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = attrs[name];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function extractConditionExpression(body: string) {
  const match = body.match(/<(?:[\w.-]+:)?conditionExpression\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?conditionExpression>/i);
  return match ? decodeXml(stripCdata(match[1]).trim()) : undefined;
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeXml(value: string) {
  return value.replaceAll("&quot;", "\"").replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function normalizeCode(value: string) {
  const normalized = value
    .trim()
    .replace(/^\$\{/, "")
    .replace(/\}$/, "")
    .replace(/==/g, "_")
    .replace(/[^a-zA-Z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return normalized || "default";
}

function resolveRole(value: string | undefined): RoleId | undefined {
  if (!value) return undefined;
  const primary = value.split(",")[0]?.trim();
  if (!primary) return undefined;
  const normalized = normalizeCode(primary);
  const alias = roleAliases[normalized];
  if (alias) return alias;
  if (allowedRoles.has(normalized as RoleId)) return normalized as RoleId;
  return undefined;
}

function toProcessNodeType(type: BpmnElementType): ProcessNodeType {
  if (type === "startEvent") return "start";
  if (type === "endEvent") return "end";
  if (type === "userTask") return "user_task";
  if (type === "serviceTask") return "system_task";
  return "gateway";
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return result;
}

function eventToAction(event: BpmnSimulationEvent | undefined) {
  if (event === undefined) return undefined;
  if (typeof event === "string") return normalizeCode(event);
  return normalizeCode(event.action ?? event.eventCode ?? "");
}

function transitionMatchesEvent(flow: RawBpmnFlow, event: BpmnSimulationEvent, variables: Record<string, unknown>) {
  const action = eventToAction(event);
  const eventVariables = typeof event === "object" ? { ...variables, ...(event.variables ?? {}) } : variables;
  if (action && (normalizeCode(flow.actionCode) === action || normalizeCode(flow.name) === action)) return true;
  if (!flow.conditionExpression && !flow.explicitCondition) return false;
  const expression = flow.conditionExpression ?? flow.explicitCondition ?? "";
  const normalizedExpression = normalizeCode(expression);
  if (action && normalizedExpression.includes(action)) return true;
  for (const [key, value] of Object.entries(eventVariables)) {
    const normalizedKey = normalizeCode(key);
    if (value === true && normalizedExpression.includes(normalizedKey) && !normalizedExpression.includes(`${normalizedKey}_false`)) return true;
    if (value === false && normalizedExpression.includes(`${normalizedKey}_false`)) return true;
  }
  return false;
}
