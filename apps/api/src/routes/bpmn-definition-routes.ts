import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import { BpmnDefinitionError } from "../services/bpmn-definition-service.js";
import { BpmnPilotError } from "../services/bpmn-pilot-service.js";
import { denyResponse } from "./permission-helpers.js";

const bpmnMaintainerRoles = new Set(["admin", "platform_operator"]);
const bpmnReaderRoles = new Set(["admin", "platform_operator", "auditor"]);

export function bpmnDefinitionRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/bpmn/definitions", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_definition", "list")) return;
    return res.json({ bpmnDefinitions: ctx.bpmnDefinitionService.listDefinitions(req.auth.roleId) });
  });

  router.get("/bpmn/definitions/:definitionId", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_definition", req.params.definitionId)) return;
    const definition = ctx.bpmnDefinitionService.getDefinition(req.params.definitionId, req.auth.roleId);
    if (!definition) return res.status(404).json({ error: { code: "BPMN_DEFINITION_NOT_FOUND", message: "BPMN definition was not found." } });
    return res.json({ bpmnDefinition: definition });
  });

  router.get("/bpmn/change-logs", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_definition_change_log", "list")) return;
    const definitionId = req.query.definitionId === undefined ? undefined : String(req.query.definitionId);
    return res.json({ bpmnChangeLogs: ctx.bpmnDefinitionService.listChangeLogs(req.auth.roleId, definitionId) });
  });

  router.get("/bpmn/pilots", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_pilot", "list")) return;
    return res.json({ bpmnPilots: ctx.bpmnPilotService.listPilots(req.auth.roleId) });
  });

  router.get("/bpmn/pilot-health", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_pilot_health", "list")) return;
    return res.json({ bpmnPilotHealth: ctx.bpmnPilotService.listHealth(req.auth.roleId) });
  });

  router.get("/bpmn/pilot-runs", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_pilot_run", "list")) return;
    return res.json({
      bpmnPilotRuns: ctx.bpmnPilotService.listRuns(req.auth.roleId, {
        pilotId: req.query.pilotId === undefined ? undefined : String(req.query.pilotId),
        businessType: req.query.businessType === undefined ? undefined : String(req.query.businessType),
        businessId: req.query.businessId === undefined ? undefined : String(req.query.businessId)
      })
    });
  });

  router.get("/bpmn/pilot-change-logs", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_pilot_change_log", "list")) return;
    const pilotId = req.query.pilotId === undefined ? undefined : String(req.query.pilotId);
    return res.json({ bpmnPilotChangeLogs: ctx.bpmnPilotService.listChangeLogs(req.auth.roleId, pilotId) });
  });

  router.post("/bpmn/definitions/validate", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_definition", "validate")) return;
    try {
      const validation = ctx.bpmnDefinitionService.validate({
        processCode: String(req.body?.processCode ?? ""),
        processName: String(req.body?.processName ?? ""),
        versionNo: req.body?.versionNo === undefined ? undefined : Number(req.body.versionNo),
        businessType: String(req.body?.businessType ?? ""),
        bpmnXml: String(req.body?.bpmnXml ?? "")
      });
      return res.json({ valid: validation.valid, errors: validation.errors, preview: validation.preview });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/definitions", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_definition", "create")) return;
    try {
      const definition = ctx.bpmnDefinitionService.saveDefinition({
        processCode: String(req.body?.processCode ?? ""),
        processName: String(req.body?.processName ?? ""),
        versionNo: req.body?.versionNo === undefined ? undefined : Number(req.body.versionNo),
        status: req.body?.status === undefined ? undefined : String(req.body.status) as never,
        businessType: String(req.body?.businessType ?? ""),
        bpmnXml: String(req.body?.bpmnXml ?? ""),
        actor: req.auth.user
      });
      return res.status(201).json({ bpmnDefinition: ctx.bpmnDefinitionService.toDto(definition, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/pilots", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_pilot", "create")) return;
    try {
      const pilot = ctx.bpmnPilotService.savePilot({
        definitionId: String(req.body?.definitionId ?? ""),
        pilotName: String(req.body?.pilotName ?? ""),
        businessType: String(req.body?.businessType ?? ""),
        status: req.body?.status === undefined ? undefined : String(req.body.status) as never,
        scope: typeof req.body?.scope === "object" && req.body.scope !== null ? req.body.scope : {},
        actor: req.auth.user
      });
      return res.status(201).json({ bpmnPilot: ctx.bpmnPilotService.toPilotDto(pilot, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/pilots/:pilotId/enable", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_pilot", req.params.pilotId)) return;
    try {
      const pilot = ctx.bpmnPilotService.enablePilot(req.params.pilotId, req.auth.user);
      return res.json({ bpmnPilot: ctx.bpmnPilotService.toPilotDto(pilot, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/pilots/:pilotId/disable", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_pilot", req.params.pilotId)) return;
    try {
      const pilot = ctx.bpmnPilotService.disablePilot(req.params.pilotId, req.auth.user);
      return res.json({ bpmnPilot: ctx.bpmnPilotService.toPilotDto(pilot, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/pilots/:pilotId/scope", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_pilot", req.params.pilotId)) return;
    try {
      const pilot = ctx.bpmnPilotService.updatePilotScope({
        pilotId: req.params.pilotId,
        scope: typeof req.body?.scope === "object" && req.body.scope !== null ? req.body.scope : {},
        actor: req.auth.user
      });
      return res.json({ bpmnPilot: ctx.bpmnPilotService.toPilotDto(pilot, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/pilots/:pilotId/switch-definition", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_pilot", req.params.pilotId)) return;
    try {
      const pilot = ctx.bpmnPilotService.switchPilotDefinition({
        pilotId: req.params.pilotId,
        definitionId: String(req.body?.definitionId ?? ""),
        reason: req.body?.reason === undefined ? undefined : String(req.body.reason),
        actor: req.auth.user
      });
      return res.json({ bpmnPilot: ctx.bpmnPilotService.toPilotDto(pilot, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/pilots/:pilotId/rollback", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_pilot", req.params.pilotId)) return;
    try {
      const pilot = ctx.bpmnPilotService.rollbackPilot({
        pilotId: req.params.pilotId,
        targetDefinitionId: req.body?.targetDefinitionId === undefined ? undefined : String(req.body.targetDefinitionId),
        reason: req.body?.reason === undefined ? undefined : String(req.body.reason),
        actor: req.auth.user
      });
      return res.json({ bpmnPilot: ctx.bpmnPilotService.toPilotDto(pilot, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/definitions/:definitionId/enable", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_definition", req.params.definitionId)) return;
    try {
      const definition = ctx.bpmnDefinitionService.enableDefinition(req.params.definitionId, req.auth.user);
      return res.json({ bpmnDefinition: ctx.bpmnDefinitionService.toDto(definition, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/definitions/:definitionId/disable", (req, res) => {
    if (!assertMaintainer(ctx, req, res, "bpmn_definition", req.params.definitionId)) return;
    try {
      const definition = ctx.bpmnDefinitionService.disableDefinition(req.params.definitionId, req.auth.user);
      return res.json({ bpmnDefinition: ctx.bpmnDefinitionService.toDto(definition, req.auth.roleId) });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  router.post("/bpmn/simulate", (req, res) => {
    if (!assertReader(ctx, req, res, "bpmn_simulation", "simulate")) return;
    try {
      return res.json({
        simulation: ctx.bpmnDefinitionService.simulate({
          definitionId: req.body?.definitionId === undefined ? undefined : String(req.body.definitionId),
          bpmnXml: req.body?.bpmnXml === undefined ? undefined : String(req.body.bpmnXml),
          processCode: req.body?.processCode === undefined ? undefined : String(req.body.processCode),
          processName: req.body?.processName === undefined ? undefined : String(req.body.processName),
          businessType: req.body?.businessType === undefined ? undefined : String(req.body.businessType),
          events: Array.isArray(req.body?.events) ? req.body.events : [],
          variables: typeof req.body?.variables === "object" && req.body.variables !== null ? req.body.variables : {}
        })
      });
    } catch (error) {
      return bpmnError(res, error);
    }
  });

  return router;
}

function assertMaintainer(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  if (bpmnMaintainerRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "BPMN_DEFINITION_MAINTAIN_DENIED", "Only system configuration roles can maintain BPMN definitions.", "bpmn_definition.maintain.denied", objectType, objectId);
  return false;
}

function assertReader(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  if (bpmnReaderRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "BPMN_DEFINITION_READ_DENIED", "Current role cannot read BPMN definition configuration.", "bpmn_definition.read.denied", objectType, objectId);
  return false;
}

function bpmnError(res: Response, error: unknown) {
  if (error instanceof BpmnDefinitionError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message, issues: error.issues } });
  }
  if (error instanceof BpmnPilotError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
