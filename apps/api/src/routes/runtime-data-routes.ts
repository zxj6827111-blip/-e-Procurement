import { Router } from "express";
import type { AppContext } from "../app-context.js";
import { seedRuntimeFiles } from "../runtime/seed-files.js";

const resetAllowedRoles = new Set(["admin", "group_manager", "platform_operator"]);

export function runtimeDataRoutes(ctx: AppContext) {
  const router = Router();

  router.post("/runtime/reset-data", (req, res) => {
    if (ctx.config.appEnv === "production") {
      return res.status(403).json({
        error: {
          code: "RUNTIME_DATA_RESET_DISABLED",
          message: "Runtime data reset is disabled in production."
        }
      });
    }
    if (!resetAllowedRoles.has(req.auth.roleId)) {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "runtime.data-reset.denied",
        objectType: "runtime_state",
        objectId: "seed_state",
        result: "denied",
        reason: `${req.auth.roleId} cannot reset runtime data`
      });
      return res.status(403).json({
        error: {
          code: "RUNTIME_DATA_RESET_FORBIDDEN",
          message: "Current role cannot reset runtime data.",
          auditLogId: auditLog.id
        }
      });
    }
    if (req.body?.confirm !== true) {
      return res.status(400).json({
        error: {
          code: "RUNTIME_DATA_RESET_CONFIRM_REQUIRED",
          message: "Reset confirmation is required."
        }
      });
    }

    ctx.stateStore.resetState(ctx.state, { cleanBusinessData: ctx.config.cleanBusinessData });
    ctx.authStore.resetAccounts(ctx.state.users, ctx.config.allowLocalPasswordLogin);
    syncRuntimeProjections(ctx);
    seedRuntimeFiles(ctx);

    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      "runtime.data-reset",
      "runtime_state",
      "seed_state",
      undefined,
      "manual dashboard reset"
    );
    ctx.stateStore.saveState(ctx.state);
    return res.json({ ok: true, auditLogId: auditLog.id });
  });

  return router;
}

function syncRuntimeProjections(ctx: AppContext) {
  ctx.r4SourcingRepository.syncSourcingState(ctx.state);
  ctx.r5ReviewAwardRepository.syncReviewAwardState(ctx.state);
  ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
  ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
  if (!ctx.config.cleanBusinessData) {
    ctx.r7SettlementFinanceRepository.ensureBusinessSettlementSamples();
    ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
  }
  ctx.r8WorkflowTaskRepository.syncWorkflowState(ctx.state);
}
