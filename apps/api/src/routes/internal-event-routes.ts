import { Router } from "express";
import type { AppContext } from "../app-context.js";
import type { InternalBusinessEvent } from "../repositories/internal-business-event-repository.js";
import type { AuthContext } from "../types.js";

const eventMonitorRoles = new Set(["auditor", "group_manager", "admin"]);

function canReadInternalEvent(auth: AuthContext, event: InternalBusinessEvent) {
  if (auth.roleId === "admin") return false;
  if (!eventMonitorRoles.has(auth.roleId)) return false;
  return !event.orgId || auth.orgScope.includes(event.orgId);
}

function sanitizeEvent(event: InternalBusinessEvent) {
  return {
    id: event.id,
    eventCode: event.eventCode,
    businessType: event.businessType,
    businessId: event.businessId,
    businessTitle: event.businessTitle,
    processInstanceId: event.processInstanceId,
    orgId: event.orgId,
    supplierId: event.supplierId,
    projectId: event.projectId,
    eventTime: event.eventTime,
    status: event.status,
    lastErrorMessage: event.lastErrorMessage,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

export function internalEventRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/internal-events", (req, res) => {
    if (!eventMonitorRoles.has(req.auth.roleId)) {
      return res.status(403).json({ error: { code: "INTERNAL_EVENT_READ_DENIED", message: "Current role cannot read internal event status." } });
    }
    const businessType = req.query.businessType === undefined ? undefined : String(req.query.businessType);
    const businessId = req.query.businessId === undefined ? undefined : String(req.query.businessId);
    const events = ctx.internalBusinessEventRepository
      .listEvents({ businessType, businessId })
      .filter((event) => canReadInternalEvent(req.auth, event))
      .map(sanitizeEvent);
    return res.json({ events });
  });

  router.get("/internal-events/:eventId/handler-logs", (req, res) => {
    if (!eventMonitorRoles.has(req.auth.roleId) || req.auth.roleId === "admin") {
      return res.status(403).json({ error: { code: "INTERNAL_EVENT_LOG_READ_DENIED", message: "Current role cannot read internal event handler logs." } });
    }
    const event = ctx.internalBusinessEventRepository.getEvent(req.params.eventId);
    if (!event) return res.status(404).json({ error: { code: "INTERNAL_EVENT_NOT_FOUND", message: "Internal event was not found." } });
    if (!canReadInternalEvent(req.auth, event)) {
      return res.status(403).json({ error: { code: "INTERNAL_EVENT_SCOPE_DENIED", message: "Current role cannot read this event log." } });
    }
    const logs = ctx.internalBusinessEventRepository.listHandlerLogs({ eventId: event.id }).map((log) => ({
      id: log.id,
      eventId: log.eventId,
      handlerName: log.handlerName,
      attemptNo: log.attemptNo,
      status: log.status,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt
    }));
    return res.json({ logs });
  });

  router.post("/internal-events/retry", (req, res) => {
    if (req.auth.roleId !== "group_manager") {
      return res.status(403).json({ error: { code: "INTERNAL_EVENT_RETRY_DENIED", message: "Current role cannot retry internal event handlers." } });
    }
    const eventId = req.body?.eventId === undefined ? "" : String(req.body.eventId);
    if (!eventId) {
      return res.status(400).json({ error: { code: "INTERNAL_EVENT_RETRY_TARGET_REQUIRED", message: "eventId is required for internal event retry." } });
    }
    const event = ctx.internalBusinessEventRepository.getEvent(eventId);
    if (!event) return res.status(404).json({ error: { code: "INTERNAL_EVENT_NOT_FOUND", message: "Internal event was not found." } });
    if (!canReadInternalEvent(req.auth, event)) {
      return res.status(403).json({ error: { code: "INTERNAL_EVENT_SCOPE_DENIED", message: "Current role cannot retry this event." } });
    }
    const retried = ctx.eventBus.retryFailedEvent(event.id);
    return res.json({ retried: retried ? sanitizeEvent(retried) : null });
  });

  return router;
}
