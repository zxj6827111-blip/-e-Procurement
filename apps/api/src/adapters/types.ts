import type { IntegrationAdapterContract } from "./integration-contracts.js";

export type IntegrationJobStatus = "pending" | "running" | "succeeded" | "failed" | "retrying" | "cancelled";
export type IntegrationAdapterMode = "mock" | "test" | "http";

export interface AdapterCallLog {
  id: string;
  jobId?: string;
  adapterKey: string;
  adapter: string;
  operation: string;
  mode: IntegrationAdapterMode;
  status: IntegrationJobStatus;
  endpoint?: string;
  businessType: string;
  businessId: string;
  requestId: string;
  idempotencyKey: string;
  attemptCount: number;
  nextRetryAt?: string | null;
  errorMessage?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  warning?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationAdapter {
  readonly name: string;
  readonly mode: IntegrationAdapterMode;
  call(operation: string, payload?: unknown, options?: IntegrationCallOptions): AdapterCallLog;
  execute(jobId: string): AdapterCallLog | null;
  retry(jobId: string): AdapterCallLog | null;
  cancel(jobId: string): AdapterCallLog | null;
  logs(): AdapterCallLog[];
  contract(): IntegrationAdapterContract;
}

export interface IntegrationCallOptions {
  idempotencyKey?: string;
  manual?: boolean;
  businessType?: string;
  businessId?: string;
  requestId?: string;
  forceFailure?: boolean;
}
