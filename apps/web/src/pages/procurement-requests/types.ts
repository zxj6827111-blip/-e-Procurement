import type { R8WorkflowTaskView } from "../../api/workflow";

export interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface ProcurementRequestLineItem {
  id: string;
  itemName: string;
  category?: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

export interface ProcurementRequest {
  id: string;
  code?: string;
  title: string;
  orgId: string;
  createdBy?: string;
  category?: string;
  status?: string;
  approvalStatus: string;
  methodRuleId?: string;
  methodSuggestion: string;
  externalTradeFlag: boolean;
  projectId: string | null;
  description?: string;
  requestDepartment?: string;
  requesterName?: string;
  budgetLabel?: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  approvalOpinion?: string;
  approvalBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: ProcurementRequestLineItem[];
  attachments?: Attachment[];
}

export interface MethodRule {
  id: string;
  ruleCode?: string;
  ruleName: string;
  resultMethod: string;
}

export interface ProjectRow {
  id: string;
  code?: string;
  name?: string;
  displayName?: string;
}

export interface RequestActionContext {
  roleId: string;
  userId?: string;
  workflowTasks: R8WorkflowTaskView[];
}
