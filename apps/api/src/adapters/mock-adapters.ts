import crypto from "node:crypto";
import type { RuntimeConfig } from "../runtime/index.js";
import type { RuntimeDb } from "../runtime/runtime-db.js";
import type { AdapterCallLog, IntegrationAdapter, IntegrationAdapterMode, IntegrationCallOptions, IntegrationJobStatus } from "./types.js";

interface AdapterDefinition {
  key: string;
  name: string;
  envKey: string;
  businessTypes: string[];
}

const adapterDefinitions = [
  { key: "sso", name: "SSO 统一身份适配器", envKey: "SSO", businessTypes: ["identity.user_mapping", "identity.role_mapping", "identity.org_mapping"] },
  { key: "oa", name: "OA 审批适配器", envKey: "OA", businessTypes: ["approval.push", "approval.callback", "workflow.status"] },
  { key: "organizationUserSync", name: "组织与用户同步适配器", envKey: "ORG_USER", businessTypes: ["organization.sync", "department.sync", "user.sync"] },
  { key: "masterData", name: "主数据适配器", envKey: "MASTER_DATA", businessTypes: ["supplier.sync", "product.sync", "category.sync"] },
  { key: "erp", name: "ERP 采购结果适配器", envKey: "ERP", businessTypes: ["purchase_order.sync", "supplier.sync", "product.sync"] },
  { key: "wms", name: "WMS 发货收货适配器", envKey: "WMS", businessTypes: ["shipment.sync", "receipt.callback", "logistics.sync"] },
  { key: "contractSystem", name: "合同系统适配器", envKey: "CONTRACT", businessTypes: ["award_result.push", "contract_ledger.sync", "contract_attachment.sync"] },
  { key: "finance", name: "财务与结算适配器", envKey: "FINANCE", businessTypes: ["settlement.push", "invoice.sync", "payment_request.push", "payment_status.callback"] },
  { key: "fileService", name: "文件服务适配器", envKey: "FILE_SERVICE", businessTypes: ["file.scan", "file.archive", "file.lifecycle"] },
  { key: "messageNotification", name: "消息通知适配器", envKey: "MESSAGE", businessTypes: ["email.send", "sms.send", "enterprise_im.send"] },
  { key: "auditExport", name: "审计导出适配器", envKey: "AUDIT_EXPORT", businessTypes: ["audit.export", "audit.archive"] },
  { key: "eSignature", name: "电子签章适配器", envKey: "E_SIGNATURE", businessTypes: ["signature.request", "signature.status"] },
  { key: "ca", name: "CA 证书适配器", envKey: "CA", businessTypes: ["ca.verify", "ca.timestamp"] },
  { key: "eInvoice", name: "电子发票平台适配器", envKey: "E_INVOICE", businessTypes: ["invoice.issue", "invoice.status"] }
] as const satisfies readonly AdapterDefinition[];

class RuntimeIntegrationAdapter implements IntegrationAdapter {
  readonly mode: IntegrationAdapterMode;

  constructor(
    private readonly runtimeDb: RuntimeDb,
    private readonly config: RuntimeConfig,
    private readonly definition: AdapterDefinition
  ) {
    this.mode = endpointFor(config, definition) ? "http" : config.appEnv === "local" ? "mock" : "test";
  }

  get name() {
    return this.definition.name;
  }

  call(operation: string, payload?: unknown, options: IntegrationCallOptions = {}): AdapterCallLog {
    const now = new Date().toISOString();
    const endpoint = endpointFor(this.config, this.definition);
    const businessType = options.businessType ?? inferBusinessType(operation, this.definition.businessTypes);
    const businessId = options.businessId ?? inferBusinessId(payload);
    const requestId = options.requestId ?? `req-${crypto.randomUUID()}`;
    const idempotencyKey = options.idempotencyKey ?? makeIdempotencyKey(this.definition.key, operation, businessType, businessId, payload);
    const existing = this.runtimeDb.db.prepare("select * from integration_jobs where idempotency_key = ?").get(idempotencyKey) as IntegrationJobRow | undefined;
    if (existing) return fromRow(existing);

    const jobId = `job-${crypto.randomUUID()}`;
    const initialStatus: IntegrationJobStatus = this.mode === "http" || options.manual ? "pending" : options.forceFailure ? "failed" : "succeeded";
    const attemptCount = initialStatus === "succeeded" || initialStatus === "failed" ? 1 : 0;
    const nextRetryAt = initialStatus === "failed" ? new Date(Date.now() + retryDelayMs(attemptCount)).toISOString() : null;
    const responsePayload =
      initialStatus === "succeeded"
        ? JSON.stringify(redactPayload({ accepted: true, mode: this.mode, adapter: this.definition.key, requestId }))
        : null;
    const errorMessage = initialStatus === "failed" ? sanitizeError("Mock/test adapter forced failure. token=redacted") : null;

    this.runtimeDb.db
      .prepare(
        `insert into integration_jobs
         (job_id, adapter_key, adapter_name, operation, mode, endpoint, business_type, business_id, request_id, request_payload_json, response_payload_json, status, attempt_count, idempotency_key, next_retry_at, error_message, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        jobId,
        this.definition.key,
        this.name,
        operation,
        this.mode,
        endpoint,
        businessType,
        businessId,
        requestId,
        JSON.stringify(redactPayload(payload ?? null)),
        responsePayload,
        initialStatus,
        attemptCount,
        idempotencyKey,
        nextRetryAt,
        errorMessage,
        now,
        now
      );
    return this.get(jobId)!;
  }

  execute(jobId: string): AdapterCallLog | null {
    const row = this.runtimeDb.db.prepare("select * from integration_jobs where job_id = ? and adapter_key = ?").get(jobId, this.definition.key) as IntegrationJobRow | undefined;
    if (!row) return null;
    if (!["pending", "retrying"].includes(row.status)) return { ...fromRow(row), warning: `Job in ${row.status} status cannot be executed.` };
    const shouldFail = row.request_payload_json.includes("forceFailure") || row.request_payload_json.includes("triggerFailure");
    return this.finishAttempt(row, shouldFail);
  }

  retry(jobId: string): AdapterCallLog | null {
    const row = this.runtimeDb.db.prepare("select * from integration_jobs where job_id = ? and adapter_key = ?").get(jobId, this.definition.key) as IntegrationJobRow | undefined;
    if (!row) return null;
    if (!["failed", "retrying", "pending"].includes(row.status)) return { ...fromRow(row), warning: `Job in ${row.status} status cannot be retried.` };
    this.runtimeDb.db.prepare("update integration_jobs set status = ?, updated_at = ? where job_id = ?").run("retrying", new Date().toISOString(), jobId);
    return this.finishAttempt({ ...row, status: "retrying" }, false);
  }

  cancel(jobId: string): AdapterCallLog | null {
    const row = this.runtimeDb.db.prepare("select * from integration_jobs where job_id = ? and adapter_key = ?").get(jobId, this.definition.key) as IntegrationJobRow | undefined;
    if (!row) return null;
    if (!["pending", "retrying", "running"].includes(row.status)) return { ...fromRow(row), warning: `Job in ${row.status} status cannot be cancelled.` };
    this.runtimeDb.db.prepare("update integration_jobs set status = ?, updated_at = ? where job_id = ?").run("cancelled", new Date().toISOString(), jobId);
    return this.get(jobId);
  }

  logs(): AdapterCallLog[] {
    const rows = this.runtimeDb.db.prepare("select * from integration_jobs where adapter_key = ? order by created_at desc").all(this.definition.key) as unknown as IntegrationJobRow[];
    return rows.map(fromRow);
  }

  private finishAttempt(row: IntegrationJobRow, shouldFail: boolean) {
    const now = new Date().toISOString();
    const attemptCount = row.attempt_count + 1;
    const status: IntegrationJobStatus = shouldFail ? (attemptCount >= this.config.integrationMaxAttempts ? "failed" : "retrying") : "succeeded";
    const responsePayload = shouldFail
      ? row.response_payload_json
      : JSON.stringify(redactPayload({ accepted: true, retried: row.status === "retrying", mode: this.mode, adapter: this.definition.key, requestId: row.request_id }));
    const errorMessage = shouldFail ? sanitizeError("External adapter returned token=secret-password-key failure.") : null;
    const nextRetryAt = shouldFail && status === "retrying" ? new Date(Date.now() + retryDelayMs(attemptCount)).toISOString() : null;
    this.runtimeDb.db
      .prepare("update integration_jobs set status = ?, attempt_count = ?, response_payload_json = ?, error_message = ?, next_retry_at = ?, updated_at = ? where job_id = ?")
      .run(status, attemptCount, responsePayload, errorMessage, nextRetryAt, now, row.job_id);
    return this.get(row.job_id);
  }

  private get(jobId: string) {
    const row = this.runtimeDb.db.prepare("select * from integration_jobs where job_id = ?").get(jobId) as IntegrationJobRow | undefined;
    return row ? fromRow(row) : null;
  }
}

export function createAdapters(runtimeDb: RuntimeDb, config: RuntimeConfig) {
  const entries = adapterDefinitions.map((definition) => [definition.key, new RuntimeIntegrationAdapter(runtimeDb, config, definition)] as const);
  return Object.fromEntries(entries) as unknown as Record<(typeof adapterDefinitions)[number]["key"], IntegrationAdapter>;
}

export type AdapterRegistry = ReturnType<typeof createAdapters>;

function endpointFor(config: RuntimeConfig, definition: AdapterDefinition) {
  return config.integrationEndpoints[definition.key] ?? process.env[`INTEGRATION_${definition.envKey}_ENDPOINT`]?.trim() ?? null;
}

function retryDelayMs(attemptCount: number) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attemptCount - 1));
}

function inferBusinessType(operation: string, supportedTypes: string[]) {
  return supportedTypes.find((type) => operation.startsWith(type.split(".")[0])) ?? operation.split(".")[0] ?? "integration";
}

function inferBusinessId(payload: unknown) {
  if (!payload || typeof payload !== "object") return "n/a";
  const record = payload as Record<string, unknown>;
  return String(record.businessId ?? record.approvalId ?? record.projectId ?? record.orderId ?? record.settlementId ?? record.invoiceId ?? "n/a");
}

function makeIdempotencyKey(adapterKey: string, operation: string, businessType: string, businessId: string, payload: unknown) {
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(redactPayload(payload ?? null))).digest("hex");
  return `${adapterKey}:${operation}:${businessType}:${businessId}:${payloadHash}`;
}

export function redactPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPayload);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/(token|secret|password|credential|authorization|accessKey|privateKey|session|cookie|url|path|sql)/i.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactPayload(nested);
    }
  }
  return result;
}

function sanitizeError(message: string) {
  return message.replace(/(token|secret|password|credential|authorization|accessKey|privateKey|session|cookie|sql)(=|:)?[^\s,;]*/gi, "$1=[REDACTED]");
}

function parsePayload(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function fromRow(row: IntegrationJobRow): AdapterCallLog {
  return {
    id: row.job_id,
    jobId: row.job_id,
    adapterKey: row.adapter_key,
    adapter: row.adapter_name,
    operation: row.operation,
    mode: row.mode,
    status: row.status,
    endpoint: row.endpoint ?? undefined,
    businessType: row.business_type,
    businessId: row.business_id,
    requestId: row.request_id,
    idempotencyKey: row.idempotency_key,
    attemptCount: row.attempt_count,
    nextRetryAt: row.next_retry_at,
    errorMessage: row.error_message,
    requestPayload: parsePayload(row.request_payload_json),
    responsePayload: parsePayload(row.response_payload_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface IntegrationJobRow {
  job_id: string;
  adapter_key: string;
  adapter_name: string;
  operation: string;
  mode: IntegrationAdapterMode;
  endpoint: string | null;
  business_type: string;
  business_id: string;
  request_id: string;
  request_payload_json: string;
  response_payload_json: string | null;
  status: IntegrationJobStatus;
  attempt_count: number;
  idempotency_key: string;
  next_retry_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
