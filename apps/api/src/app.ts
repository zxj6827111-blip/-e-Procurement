import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { AppContext } from "./app-context.js";
import { createAppContext } from "./app-context.js";
import { auditContextMiddleware, authMiddleware, requireAuthenticated } from "./auth.js";
import { errorBody, NotFoundError, PolicyError } from "./errors.js";
import { buildHealthStatus } from "./runtime/index.js";
import { archiveRoutes } from "./routes/archive-routes.js";
import { auditRoutes } from "./routes/audit-routes.js";
import { authRoutes } from "./routes/auth-routes.js";
import { awardRoutes } from "./routes/award-routes.js";
import { bidRoutes } from "./routes/bid-routes.js";
import { bidViewRoutes } from "./routes/bid-view-routes.js";
import { bpmnDefinitionRoutes } from "./routes/bpmn-definition-routes.js";
import { contractPerformanceRoutes } from "./routes/contract-performance-routes.js";
import { expertReviewRoutes } from "./routes/expert-review-routes.js";
import { externalTradeRoutes } from "./routes/external-trade-routes.js";
import { fileRoutes } from "./routes/file-routes.js";
import { integrationRoutes } from "./routes/integration-routes.js";
import { internalEventRoutes } from "./routes/internal-event-routes.js";
import { mallRoutes } from "./routes/mall-routes.js";
import { organizationRoutes } from "./routes/organization-routes.js";
import { processRoutes } from "./routes/process-routes.js";
import { procurementParticipationRoutes } from "./routes/procurement-participation-routes.js";
import { projectWorkbenchRoutes } from "./routes/project-workbench-routes.js";
import { projectRoutes } from "./routes/project-routes.js";
import { runtimeDataRoutes } from "./routes/runtime-data-routes.js";
import { settlementFinanceRoutes } from "./routes/settlement-finance-routes.js";
import { supplierRoutes } from "./routes/supplier-routes.js";
import { workflowTaskRoutes } from "./routes/workflow-task-routes.js";

export function createApp(ctx: AppContext = createAppContext()) {
  const app = express();
  app.locals.ctx = ctx;
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (ctx.config.corsAllowedOrigins.length === 0) {
          return callback(null, ctx.config.appEnv !== "production");
        }
        return callback(null, ctx.config.corsAllowedOrigins.includes(origin));
      },
      credentials: true
    })
  );
  const jsonBodyLimitBytes = Math.min(Math.max(ctx.config.fileUploadMaxBytes * 2, 1024 * 1024), 50 * 1024 * 1024);
  app.use(express.json({ limit: jsonBodyLimitBytes }));
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (isPayloadTooLargeError(error)) {
      return res.status(400).json({ error: { code: "FILE_TOO_LARGE", message: `Request body exceeds ${ctx.config.fileUploadMaxBytes} bytes file limit.` } });
    }
    next(error);
  });
  app.use(authMiddleware(ctx));
  app.use(auditContextMiddleware());
  app.use((req, _res, next) => {
    ctx.auditService.useRequestMeta(req.auditMeta);
    next();
  });
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (req.method === "GET" || req.method === "HEAD") return;
      ctx.stateStore.saveState(ctx.state);
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json(buildHealthStatus(ctx.config));
  });

  const api = express.Router();
  api.use((req, res, next) => {
    const publicPaths = new Set([
      "/auth/login",
      "/auth/mock-login",
      "/auth/mock-users",
      "/auth/providers",
      "/auth/session",
      "/auth/sso/mock-callback",
      "/suppliers/register",
      "/suppliers/registration-boundary"
    ]);
    if (publicPaths.has(req.path)) return next();
    if (!requireAuthenticated(req, res)) return;
    if (supplierPasswordChangeRequired(ctx, req)) {
      return res.status(403).json({
        error: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Supplier account must change temporary password before using business functions."
        }
      });
    }
    next();
  });
  api.use(authRoutes(ctx));
  api.use(organizationRoutes(ctx));
  api.use(supplierRoutes(ctx));
  api.use(projectRoutes(ctx));
  api.use(externalTradeRoutes(ctx));
  api.use(fileRoutes(ctx));
  api.use(procurementParticipationRoutes(ctx));
  api.use(bidRoutes(ctx));
  api.use(bidViewRoutes(ctx));
  api.use(expertReviewRoutes(ctx));
  api.use(awardRoutes(ctx));
  api.use(projectWorkbenchRoutes(ctx));
  api.use(contractPerformanceRoutes(ctx));
  api.use(archiveRoutes(ctx));
  api.use(runtimeDataRoutes(ctx));
  api.use(auditRoutes(ctx));
  api.use(integrationRoutes(ctx));
  api.use(internalEventRoutes(ctx));
  api.use(mallRoutes(ctx));
  api.use(settlementFinanceRoutes(ctx));
  api.use(workflowTaskRoutes(ctx));
  api.use(processRoutes(ctx));
  api.use(bpmnDefinitionRoutes(ctx));

  app.use("/api", api);

  app.use((_req, _res, next) => next(new NotFoundError("接口不存在或未开放访问。")));
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    if (error instanceof PolicyError) {
      return res.status(error.status).json(errorBody(error));
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: error.message } });
    }
    const message = ctx.config.appEnv === "production" ? "Internal server error." : error instanceof Error ? error.message : "未知错误";
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  });

  return app;
}

function isPayloadTooLargeError(error: unknown) {
  return Boolean(error && typeof error === "object" && "type" in error && (error as { type?: string }).type === "entity.too.large");
}

function supplierPasswordChangeRequired(ctx: AppContext, req: express.Request) {
  const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
  if (!supplierRoles.has(req.auth.roleId)) return false;
  if (["/auth/session", "/auth/logout", "/me", "/me/change-password"].includes(req.path)) return false;
  const account = ctx.authStore.getAccountsByUserIds([req.auth.user.id])[0];
  return Boolean(account?.passwordChangeRequired);
}
