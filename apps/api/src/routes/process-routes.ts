import { Router } from "express";
import { isProcessBusinessType } from "../repositories/process-repository.js";
import type { AppContext } from "../app-context.js";

export function processRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/process/instances", (req, res) => {
    const instances = ctx.processService.listReadableInstances(req.auth.user, req.auth.roleId);
    const businessType = req.query.businessType === undefined ? undefined : String(req.query.businessType);
    const businessId = req.query.businessId === undefined ? undefined : String(req.query.businessId);
    return res.json({
      processInstances: instances.filter((instance) => {
        if (businessType && instance.businessType !== businessType) return false;
        if (businessId && instance.businessId !== businessId) return false;
        return true;
      })
    });
  });

  router.get("/process/tasks", (req, res) => {
    return res.json({
      processTasks: ctx.processService.listReadableTasks(req.auth.user, req.auth.roleId)
    });
  });

  router.get("/process/instances/:instanceId", (req, res) => {
    const result = ctx.processService.getReadableInstance(req.params.instanceId, req.auth.user, req.auth.roleId);
    if (!result) return res.status(403).json({ error: { code: "PROCESS_INSTANCE_READ_DENIED", message: "Current role cannot read this process instance." } });
    return res.json(result);
  });

  router.get("/process/business/:businessType/:businessId", (req, res) => {
    const businessType = String(req.params.businessType);
    if (!isProcessBusinessType(businessType)) {
      return res.status(400).json({
        error: {
          code: "PROCESS_BUSINESS_TYPE_UNSUPPORTED",
          message: "Current process layer does not support this business type."
        }
      });
    }
    return res.json(ctx.processService.getReadableBusinessProcess(businessType, req.params.businessId, req.auth.user, req.auth.roleId));
  });

  return router;
}
