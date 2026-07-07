import { allRoleIds, type RoleId } from "../permissions/role-model";
import { resolveRouteMatrixItem, routeMatrix, type FrontendModuleId } from "./route-matrix";

export interface FrontendFeatureFlags {
  USE_REACT_UI: boolean;
  MODULE_REACT_ENABLE_MAP: Record<string, boolean>;
  ROLE_REACT_ENABLE_MAP: Record<string, boolean>;
  ROUTE_REACT_ENABLE_MAP: Record<string, boolean>;
  FALLBACK_TO_VUE_SHELL: boolean;
}

export interface FeatureFlagEvaluation {
  route: string;
  roleId: string;
  moduleId?: FrontendModuleId;
  globalEnabled: boolean;
  moduleEnabled: boolean;
  roleEnabled: boolean;
  routeEnabled: boolean;
  fallbackToVueShell: boolean;
  enabled: boolean;
  reasons: string[];
}

const moduleIds = Array.from(new Set(routeMatrix.map((item) => item.moduleId)));

export const defaultFrontendFeatureFlags: FrontendFeatureFlags = {
  USE_REACT_UI: true,
  MODULE_REACT_ENABLE_MAP: Object.fromEntries(moduleIds.map((moduleId) => [moduleId, true])),
  ROLE_REACT_ENABLE_MAP: Object.fromEntries(allRoleIds.map((roleId) => [roleId, true])),
  ROUTE_REACT_ENABLE_MAP: Object.fromEntries(routeMatrix.map((item) => [item.route, item.reactOwner])),
  FALLBACK_TO_VUE_SHELL: true
};

function envFlag(name: string, fallback: boolean) {
  const value = import.meta.env[name];
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function resolveFrontendFeatureFlags(): FrontendFeatureFlags {
  return {
    ...defaultFrontendFeatureFlags,
    USE_REACT_UI: envFlag("VITE_USE_REACT_UI", defaultFrontendFeatureFlags.USE_REACT_UI),
    FALLBACK_TO_VUE_SHELL: envFlag("VITE_FALLBACK_TO_VUE_SHELL", defaultFrontendFeatureFlags.FALLBACK_TO_VUE_SHELL)
  };
}

export function evaluateReactFeatureFlag(route: string, roleId: string, flags = resolveFrontendFeatureFlags()): FeatureFlagEvaluation {
  const routeItem = resolveRouteMatrixItem(route);
  const routeKey = routeItem?.route ?? route;
  const moduleId = routeItem?.moduleId;
  const globalEnabled = flags.USE_REACT_UI;
  const moduleEnabled = moduleId ? flags.MODULE_REACT_ENABLE_MAP[moduleId] !== false : false;
  const roleEnabled = flags.ROLE_REACT_ENABLE_MAP[roleId as RoleId] !== false;
  const routeEnabled = flags.ROUTE_REACT_ENABLE_MAP[routeKey] !== false;
  const reasons: string[] = [];

  if (!routeItem) reasons.push("route_not_registered");
  if (routeItem && !routeItem.reactOwner) reasons.push("route_not_react_owned");
  if (!globalEnabled) reasons.push("global_react_disabled");
  if (!moduleEnabled) reasons.push("module_react_disabled");
  if (!roleEnabled) reasons.push("role_react_disabled");
  if (!routeEnabled) reasons.push("route_react_disabled");

  return {
    route,
    roleId,
    moduleId,
    globalEnabled,
    moduleEnabled,
    roleEnabled,
    routeEnabled,
    fallbackToVueShell: flags.FALLBACK_TO_VUE_SHELL,
    enabled: Boolean(routeItem?.reactOwner && globalEnabled && moduleEnabled && roleEnabled && routeEnabled),
    reasons
  };
}
