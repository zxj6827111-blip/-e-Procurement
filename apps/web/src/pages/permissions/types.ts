export interface UserRow {
  id: string;
  name: string;
  roleId: string;
  orgId: string;
  status?: string;
  departmentId?: string;
  position?: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
}

export interface ApprovalRuleRow {
  id: string;
  ruleName: string;
  businessType: string;
  nodeRoleIds: string[];
  actions: string[];
  status: string;
  versionNo: number;
}

export interface BpmnDefinitionRow {
  id: string;
  processCode: string;
  processName: string;
  businessType: string;
  versionNo: number;
  status: string;
  validationStatus: string;
  xmlSha256: string;
}

export interface BpmnPilotScope {
  orgIds: string[];
  businessIdCount: number;
  environments: string[];
}

export interface BpmnPilotRow {
  id: string;
  definitionId: string;
  pilotName: string;
  businessType: string;
  status: string;
  mode: string;
  fallbackTo: string;
  previousDefinitionId?: string;
  lastRollbackReason?: string;
  scope: BpmnPilotScope;
}

export interface BpmnPilotRunRow {
  id: string;
  pilotId: string;
  eventCode: string;
  businessType: string;
  businessRef: string;
  status: string;
  stoppedReason: string;
  predictedNodeKey?: string;
  fallbackTo: string;
  createdAt: string;
}

export interface BpmnPilotHealthRow extends BpmnPilotRow {
  runCount: number;
  compatibleCount: number;
  fallbackCount: number;
  failedCount: number;
  skippedCount: number;
  compatibilityRate: number | null;
  latestRunAt?: string;
  latestRunStatus?: string;
  latestStoppedReason?: string;
  latestPredictedNodeKey?: string;
  latestErrorCode?: string;
  latestFallbackAt?: string;
  latestFallbackReason?: string;
  latestFallbackErrorCode?: string;
  lastGovernanceAction?: string;
  lastGovernanceAt?: string;
  fallbackActive: boolean;
  needsAttention: boolean;
}

export interface BpmnPilotChangeLogRow {
  id: string;
  pilotId: string;
  actionCode: string;
  actorRoleId?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
}
