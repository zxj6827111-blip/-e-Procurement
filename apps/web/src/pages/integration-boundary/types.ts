export interface IntegrationLog {
  id: string;
  jobId?: string;
  operation: string;
  status: string;
  mode?: string;
  businessType?: string;
  businessId?: string;
  requestId?: string;
  idempotencyKey?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  key?: string;
}

export interface IntegrationAdapter {
  key: string;
  name: string;
  mode: string;
  logs: IntegrationLog[];
}

export interface IntegrationCallForm {
  operation: string;
  businessType: string;
  businessId: string;
  requestId: string;
  idempotencyKey: string;
  forceFailure: boolean;
  payloadJson: string;
}

export type IntegrationJobAction = "execute" | "retry" | "repush" | "cancel";
