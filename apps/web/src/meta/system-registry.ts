import { pageTitle, routeAllowed, type RoleId } from "../permissions/role-model";
import { evaluateReactFeatureFlag, resolveFrontendFeatureFlags, type FrontendFeatureFlags } from "./feature-flags";
import { resolveRegistryMenu } from "./menu-adapter";
import { resolveRouteMatrixItem, routeMatrix, type FrontendModuleId, type RuntimeOwner } from "./route-matrix";
import type {
  FrontendRuntimeState,
  PermissionSnapshot,
  RouteContext,
  SessionSnapshot,
  UiContextSnapshot
} from "./frontend-state-contract";

export interface RuntimeRouteDecision extends RouteContext {
  pageTitle: string;
  featureFlagReasons: string[];
}

export interface FrontendRuntimeStateInput {
  route: string;
  roleId: string;
  session: SessionSnapshot;
  uiContext: Omit<UiContextSnapshot, "pageTitle">;
  flags?: FrontendFeatureFlags;
}

function resolveRuntimeOwner(canAccess: boolean, routeOwner: RuntimeOwner | undefined, canRenderReactRoute: boolean): RuntimeOwner {
  if (!canAccess) return "blocked";
  if (canRenderReactRoute) return "react";
  if (routeOwner === "redirect") return "redirect";
  if (routeOwner === "state") return "state";
  return "vue-shell";
}

export function canAccessRoute(route: string, roleId: string, mockAuthEnabled = true) {
  const item = resolveRouteMatrixItem(route);
  if (!item) return false;
  if (item.systemRoute || item.runtimeOwner === "state") return true;
  if (item.roleAccess.includes(roleId as RoleId)) return true;
  return routeAllowed(route, roleId, mockAuthEnabled);
}

export function canRenderReact(route: string, roleId: string, flags = resolveFrontendFeatureFlags()) {
  const item = resolveRouteMatrixItem(route);
  const evaluation = evaluateReactFeatureFlag(route, roleId, flags);
  return Boolean(item?.reactOwner && evaluation.enabled && canAccessRoute(route, roleId, true));
}

export function canRemoveVue(route: string) {
  return resolveRouteMatrixItem(route)?.canRemoveVue === true;
}

export function getModuleOwner(route: string): FrontendModuleId | null {
  return resolveRouteMatrixItem(route)?.moduleId ?? null;
}

export function resolveRuntimeRoute(route: string, roleId: string, flags = resolveFrontendFeatureFlags()): RuntimeRouteDecision {
  const item = resolveRouteMatrixItem(route);
  const flagEvaluation = evaluateReactFeatureFlag(route, roleId, flags);
  const access = canAccessRoute(route, roleId, true);
  const reactRenderable = Boolean(item?.reactOwner && flagEvaluation.enabled && access);
  const reasons = [
    ...(item ? [] : ["route_not_registered"]),
    ...(access ? [] : ["route_not_allowed"]),
    ...flagEvaluation.reasons
  ];
  const runtimeOwner = resolveRuntimeOwner(access, item?.runtimeOwner, reactRenderable);

  return {
    route,
    matchedRoute: item?.route ?? null,
    moduleId: item?.moduleId ?? null,
    runtimeOwner,
    canAccess: access,
    canRenderReact: reactRenderable,
    canRemoveVue: item?.canRemoveVue === true,
    pageTitle: pageTitle(route, roleId),
    featureFlagReasons: flagEvaluation.reasons,
    reasons
  };
}

export function resolveMenu(roleId: string) {
  return resolveRegistryMenu(roleId);
}

export function createPermissionSnapshot(roleId: string): PermissionSnapshot {
  const roleLabel = resolveRegistryMenu(roleId).roleLabel;
  const routeList = resolveRouteListForRole(roleId);
  return {
    roleId,
    roleLabel,
    allowedRoutes: routeList.allowedRoutes,
    deniedRoutes: routeList.deniedRoutes
  };
}

function resolveRouteListForRole(roleId: string) {
  const allowedRoutes = routeMatrix.filter((item) => canAccessRoute(item.route, roleId, true)).map((item) => item.route);
  return {
    allowedRoutes,
    deniedRoutes: routeMatrix.filter((item) => !allowedRoutes.includes(item.route)).map((item) => item.route)
  };
}

export function createFrontendRuntimeState(input: FrontendRuntimeStateInput): FrontendRuntimeState {
  const flags = input.flags ?? resolveFrontendFeatureFlags();
  const menuConfig = resolveRegistryMenu(input.roleId);
  const decision = resolveRuntimeRoute(input.route, input.roleId, flags);
  const permissions = createPermissionSnapshot(input.roleId);

  return {
    session: input.session,
    roleId: input.roleId,
    permissions,
    navigation: {
      homeRoute: menuConfig.homeRoute,
      currentRoute: input.route,
      currentTitle: decision.pageTitle,
      menuConfig
    },
    uiContext: {
      ...input.uiContext,
      pageTitle: decision.pageTitle
    },
    routeContext: {
      route: decision.route,
      matchedRoute: decision.matchedRoute,
      moduleId: decision.moduleId,
      runtimeOwner: decision.runtimeOwner,
      canAccess: decision.canAccess,
      canRenderReact: decision.canRenderReact,
      canRemoveVue: decision.canRemoveVue,
      reasons: decision.reasons
    },
    featureFlags: flags
  };
}
