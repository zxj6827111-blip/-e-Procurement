import type { FeatureFlagEvaluation } from "../meta/feature-flags";
import type { RuntimeRouteDecision } from "../meta/system-registry";

export type FrontendObservabilityEventType =
  | "route_usage"
  | "feature_flag_evaluation"
  | "react_module_error"
  | "api_error"
  | "migration_progress";

export interface FrontendObservabilityEvent {
  type: FrontendObservabilityEventType;
  timestamp: string;
  route?: string;
  roleId?: string;
  owner?: string;
  moduleId?: string | null;
  message?: string;
  details?: Record<string, unknown>;
}

const frontendEvents: FrontendObservabilityEvent[] = [];

function pushEvent(event: Omit<FrontendObservabilityEvent, "timestamp">) {
  const nextEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };
  frontendEvents.push(nextEvent);
  if (import.meta.env.DEV) {
    console.info("[frontend-observability]", nextEvent);
  }
}

export function recordRouteUsage(decision: RuntimeRouteDecision, roleId: string) {
  pushEvent({
    type: "route_usage",
    route: decision.route,
    roleId,
    owner: decision.runtimeOwner,
    moduleId: decision.moduleId,
    details: {
      matchedRoute: decision.matchedRoute,
      canRenderReact: decision.canRenderReact,
      canRemoveVue: decision.canRemoveVue,
      reasons: decision.reasons
    }
  });
}

export function recordFeatureFlagEvaluation(evaluation: FeatureFlagEvaluation) {
  pushEvent({
    type: "feature_flag_evaluation",
    route: evaluation.route,
    roleId: evaluation.roleId,
    moduleId: evaluation.moduleId,
    details: {
      enabled: evaluation.enabled,
      globalEnabled: evaluation.globalEnabled,
      moduleEnabled: evaluation.moduleEnabled,
      roleEnabled: evaluation.roleEnabled,
      routeEnabled: evaluation.routeEnabled,
      fallbackToVueShell: evaluation.fallbackToVueShell,
      reasons: evaluation.reasons
    }
  });
}

export function recordReactModuleError(route: string, roleId: string, error: unknown) {
  pushEvent({
    type: "react_module_error",
    route,
    roleId,
    message: error instanceof Error ? error.message : String(error),
    details: {
      name: error instanceof Error ? error.name : "UnknownError"
    }
  });
}

export function recordApiError(route: string, roleId: string, error: unknown) {
  pushEvent({
    type: "api_error",
    route,
    roleId,
    message: error instanceof Error ? error.message : String(error)
  });
}

export function recordMigrationProgress(details: Record<string, unknown>) {
  pushEvent({
    type: "migration_progress",
    details
  });
}

export function listFrontendObservabilityEvents() {
  return [...frontendEvents];
}

export function resetFrontendObservabilityEvents() {
  frontendEvents.length = 0;
}
