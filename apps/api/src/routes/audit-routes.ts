import { Router } from "express";
import type { AppContext } from "../app-context.js";
import { assertAuditReader, canReadAuditLog, canReadProject, denyResponse } from "./permission-helpers.js";

export function auditRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/audit-logs", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "audit_log", "list")) return;
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => canReadAuditLog(req, ctx, log)) });
  });
  router.get("/projects/:projectId/audit-trail", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "project", req.params.projectId, req.params.projectId)) return;
    const project = ctx.state.projects.find((item) => item.id === req.params.projectId);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    if (!canReadProject(req, project)) {
      return denyResponse(ctx, req, res, 403, "AUDIT_LOG_SCOPE_DENIED", "Current user cannot read this project audit trail.", "audit_log.project.scope.denied", "project", project.id, project.id);
    }
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => log.projectId === req.params.projectId && canReadAuditLog(req, ctx, log)) });
  });
  router.get("/users/:userId/audit-logs", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "user", req.params.userId)) return;
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => log.actorId === req.params.userId && canReadAuditLog(req, ctx, log)) });
  });
  router.get("/sensitive-action-logs", (_req, res) => {
    const sensitivePrefixes = [
      "bid.",
      "bid_view",
      "expert.",
      "scoring_",
      "review_report",
      "award_",
      "result_notification",
      "external_trade",
      "contract_",
      "performance_",
      "acceptance_payment",
      "supplier_evaluation",
      "archive."
    ];
    if (!assertAuditReader(ctx, _req, res, "audit_log", "sensitive")) return;
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => sensitivePrefixes.some((prefix) => log.action.startsWith(prefix)) && canReadAuditLog(_req, ctx, log)) });
  });
  router.get("/result-notification-logs", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "audit_log", "result-notification")) return;
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => log.action.startsWith("result_notification") && canReadAuditLog(req, ctx, log)) });
  });
  router.get("/archive-audit-logs", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "audit_log", "archive")) return;
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => log.action.startsWith("archive") && canReadAuditLog(req, ctx, log)) });
  });
  router.get("/external-trade-block-logs", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "audit_log", "external-trade-block")) return;
    return res.json({ auditLogs: ctx.state.auditLogs.filter((log) => log.action.startsWith("external_trade.block") && canReadAuditLog(req, ctx, log)) });
  });
  router.get("/scoring-version-logs", (req, res) => {
    if (!assertAuditReader(ctx, req, res, "scoring_version", "list")) return;
    const scoringVersions = ctx.state.scoringVersions.filter((version) => {
      const sheet = ctx.state.scoringSheets.find((item) => item.id === version.sheetId);
      if (!sheet) return false;
      const project = ctx.state.projects.find((item) => item.id === sheet.projectId);
      return project ? canReadProject(req, project) : false;
    });
    return res.json({ scoringVersions });
  });

  return router;
}
