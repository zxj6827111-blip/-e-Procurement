import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { denyResponse } from "./permission-helpers.js";

function assertIntegrationOperator(ctx: AppContext, req: Request, res: Response) {
  if (["admin", "group_manager", "auditor"].includes(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "INTEGRATION_OPERATION_DENIED", "Current role cannot operate integration jobs.", "integration.operation.denied", "integration", "operation");
  return false;
}

export function integrationRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/integration-adapters", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const adapters = Object.entries(ctx.adapters).map(([key, adapter]) => ({
      key,
      name: adapter.name,
      mode: adapter.mode,
      logs: adapter.logs()
    }));
    return res.json({ adapters });
  });

  router.get("/integration-jobs", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const jobs = Object.entries(ctx.adapters).flatMap(([key, adapter]) => adapter.logs().map((log) => ({ ...log, key })));
    return res.json({ jobs });
  });

  router.post("/integration-adapters/:adapterKey/call", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const adapter = ctx.adapters[req.params.adapterKey as keyof typeof ctx.adapters];
    if (!adapter) return res.status(404).json({ error: { code: "ADAPTER_NOT_FOUND", message: "Adapter 不存在。" } });
    const operation = String(req.body?.operation ?? "integration.operation");
    const payload = req.body?.payload ?? {};
    const idempotencyKey = req.body?.idempotencyKey === undefined ? undefined : String(req.body.idempotencyKey);
    const log = adapter.call(operation, payload, {
      idempotencyKey,
      businessType: req.body?.businessType === undefined ? undefined : String(req.body.businessType),
      businessId: req.body?.businessId === undefined ? undefined : String(req.body.businessId),
      requestId: req.body?.requestId === undefined ? undefined : String(req.body.requestId),
      forceFailure: req.body?.forceFailure === true
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "integration.call", "integration_job", log.jobId ?? log.id, undefined, `${req.params.adapterKey}:${operation}`);
    return res.status(202).json({ log, auditLogId: auditLog.id });
  });

  router.post("/integration-adapters/:adapterKey/mock-call", (req, res) => {
    const adapter = ctx.adapters[req.params.adapterKey as keyof typeof ctx.adapters];
    if (!adapter) return res.status(404).json({ error: { code: "ADAPTER_NOT_FOUND", message: "Adapter 不存在。" } });
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const operation = String(req.body?.operation ?? "integration.operation");
    const log = adapter.call(operation, req.body?.payload ?? {}, {
      idempotencyKey: req.body?.idempotencyKey === undefined ? undefined : String(req.body.idempotencyKey),
      businessType: req.body?.businessType === undefined ? undefined : String(req.body.businessType),
      businessId: req.body?.businessId === undefined ? undefined : String(req.body.businessId),
      requestId: req.body?.requestId === undefined ? undefined : String(req.body.requestId),
      forceFailure: req.body?.forceFailure === true
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "integration.call", "integration_job", log.jobId ?? log.id, undefined, `${req.params.adapterKey}:${operation}`);
    return res.status(202).json({ log, auditLogId: auditLog.id });
  });

  router.post("/integration-adapters/:adapterKey/jobs/:jobId/execute", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const adapter = ctx.adapters[req.params.adapterKey as keyof typeof ctx.adapters];
    if (!adapter) return res.status(404).json({ error: { code: "ADAPTER_NOT_FOUND", message: "Adapter 不存在。" } });
    const log = adapter.execute(req.params.jobId);
    if (!log) return res.status(404).json({ error: { code: "INTEGRATION_JOB_NOT_FOUND", message: "Integration job was not found." } });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "integration.execute", "integration_job", log.jobId ?? log.id, undefined, `${req.params.adapterKey}:${log.operation}`);
    return res.json({ log, auditLogId: auditLog.id });
  });

  router.post("/integration-adapters/:adapterKey/jobs/:jobId/retry", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const adapter = ctx.adapters[req.params.adapterKey as keyof typeof ctx.adapters];
    if (!adapter) return res.status(404).json({ error: { code: "ADAPTER_NOT_FOUND", message: "Adapter 不存在。" } });
    const log = adapter.retry(req.params.jobId);
    if (!log) return res.status(404).json({ error: { code: "INTEGRATION_JOB_NOT_FOUND", message: "Integration job was not found." } });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "integration.retry", "integration_job", log.jobId ?? log.id, undefined, `${req.params.adapterKey}:${log.operation}`);
    return res.json({ log, auditLogId: auditLog.id });
  });

  router.post("/integration-adapters/:adapterKey/jobs/:jobId/repush", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const adapter = ctx.adapters[req.params.adapterKey as keyof typeof ctx.adapters];
    if (!adapter) return res.status(404).json({ error: { code: "ADAPTER_NOT_FOUND", message: "Adapter 不存在。" } });
    const original = adapter.logs().find((item) => item.jobId === req.params.jobId);
    if (!original) return res.status(404).json({ error: { code: "INTEGRATION_JOB_NOT_FOUND", message: "Integration job was not found." } });
    const log = adapter.call(original.operation, original.requestPayload, {
      manual: true,
      businessType: original.businessType,
      businessId: original.businessId,
      requestId: `manual-${Date.now()}`,
      idempotencyKey: `${original.idempotencyKey}:manual:${Date.now()}`
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      "integration.repush_task_created",
      "integration_job",
      log.jobId ?? log.id,
      undefined,
      `${req.params.adapterKey}:${original.jobId}:redacted-payload`
    );
    return res.status(202).json({
      log,
      auditLogId: auditLog.id,
      originalJobId: original.jobId,
      replayMode: "redacted_payload_manual_task",
      warning: "Manual repush creates a new operator task from the redacted stored payload. Real external replay requires the R10 HTTP adapter and secure credential store."
    });
  });

  router.post("/integration-adapters/:adapterKey/jobs/:jobId/cancel", (req, res) => {
    if (!assertIntegrationOperator(ctx, req, res)) return;
    const adapter = ctx.adapters[req.params.adapterKey as keyof typeof ctx.adapters];
    if (!adapter) return res.status(404).json({ error: { code: "ADAPTER_NOT_FOUND", message: "Adapter 不存在。" } });
    const log = adapter.cancel(req.params.jobId);
    if (!log) return res.status(404).json({ error: { code: "INTEGRATION_JOB_NOT_FOUND", message: "Integration job was not found." } });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "integration.cancel", "integration_job", log.jobId ?? log.id, undefined, `${req.params.adapterKey}:${log.operation}`);
    return res.json({ log, auditLogId: auditLog.id });
  });

  return router;
}
