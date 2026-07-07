import { allRoleIds, type RoleId } from "../permissions/role-model";
import { canAccessRoute, canRemoveVue, resolveRuntimeRoute } from "./system-registry";
import { listRouteMatrixByModule, routeMatrix, type FrontendModuleId, type RouteMatrixItem } from "./route-matrix";

export interface RouteMigrationReadiness {
  route: string;
  moduleId: FrontendModuleId;
  status: RouteMatrixItem["status"];
  runtimeOwner: RouteMatrixItem["runtimeOwner"];
  reactOwner: boolean;
  vueOwner: boolean;
  apiReady: boolean;
  canRemoveVue: boolean;
  blockedReasons: string[];
}

export interface ModuleMigrationReadiness {
  moduleId: FrontendModuleId;
  totalRoutes: number;
  reactOwnedRoutes: number;
  apiReadyRoutes: number;
  removableVueRoutes: number;
  readinessPercent: number;
  routes: RouteMigrationReadiness[];
}

export interface RoleCoverageReport {
  roleId: RoleId;
  allowedRoutes: string[];
  reactRenderableRoutes: string[];
  blockedRoutes: string[];
}

export interface FrontendMigrationReport {
  generatedAt: string;
  routeProgress: {
    total: number;
    vue: number;
    hybrid: number;
    react: number;
    deprecated: number;
    removableVue: number;
  };
  vueDependencyCount: number;
  reactReadinessPercent: number;
  modules: ModuleMigrationReadiness[];
  roles: RoleCoverageReport[];
}

export function canRemoveVueRoute(route: string) {
  return canRemoveVue(route);
}

export function getRouteMigrationReadiness(route: string): RouteMigrationReadiness {
  const item = routeMatrix.find((candidate) => candidate.route === route);
  if (!item) {
    return {
      route,
      moduleId: "state",
      status: "vue",
      runtimeOwner: "blocked",
      reactOwner: false,
      vueOwner: false,
      apiReady: false,
      canRemoveVue: false,
      blockedReasons: ["route_not_registered"]
    };
  }

  const blockedReasons = [
    ...(item.reactOwner ? [] : ["react_owner_missing"]),
    ...(item.apiReady ? [] : ["api_contract_not_ready"]),
    ...(item.canRemoveVue ? [] : ["vue_removal_not_allowed"])
  ];

  return {
    route: item.route,
    moduleId: item.moduleId,
    status: item.status,
    runtimeOwner: item.runtimeOwner,
    reactOwner: item.reactOwner,
    vueOwner: item.vueOwner,
    apiReady: item.apiReady,
    canRemoveVue: item.canRemoveVue,
    blockedReasons
  };
}

export function getModuleMigrationReadiness(moduleId: FrontendModuleId): ModuleMigrationReadiness {
  const routes = listRouteMatrixByModule(moduleId).map((item) => getRouteMigrationReadiness(item.route));
  const totalRoutes = routes.length;
  const reactOwnedRoutes = routes.filter((item) => item.reactOwner).length;
  const apiReadyRoutes = routes.filter((item) => item.apiReady).length;
  const removableVueRoutes = routes.filter((item) => item.canRemoveVue).length;
  const readinessPercent = totalRoutes === 0 ? 0 : Math.round(((reactOwnedRoutes + apiReadyRoutes + removableVueRoutes) / (totalRoutes * 3)) * 100);

  return {
    moduleId,
    totalRoutes,
    reactOwnedRoutes,
    apiReadyRoutes,
    removableVueRoutes,
    readinessPercent,
    routes
  };
}

export function getRoleCoverage(roleId: RoleId): RoleCoverageReport {
  const allowedRoutes = routeMatrix.filter((item) => canAccessRoute(item.route, roleId, true)).map((item) => item.route);
  const reactRenderableRoutes = allowedRoutes.filter((route) => resolveRuntimeRoute(route, roleId).canRenderReact);
  return {
    roleId,
    allowedRoutes,
    reactRenderableRoutes,
    blockedRoutes: allowedRoutes.filter((route) => !reactRenderableRoutes.includes(route))
  };
}

export function assertVueRemovalAllowed(route: string) {
  const readiness = getRouteMigrationReadiness(route);
  if (readiness.canRemoveVue) return readiness;
  throw new Error(`Vue removal is blocked for ${route}: ${readiness.blockedReasons.join(", ")}`);
}

export function buildMigrationReport(generatedAt = new Date().toISOString()): FrontendMigrationReport {
  const moduleIds = Array.from(new Set(routeMatrix.map((item) => item.moduleId)));
  const reactReadyRoutes = routeMatrix.filter((item) => item.reactOwner && item.apiReady);
  const routeProgress = {
    total: routeMatrix.length,
    vue: routeMatrix.filter((item) => item.status === "vue").length,
    hybrid: routeMatrix.filter((item) => item.status === "hybrid").length,
    react: routeMatrix.filter((item) => item.status === "react").length,
    deprecated: routeMatrix.filter((item) => item.status === "deprecated").length,
    removableVue: routeMatrix.filter((item) => item.canRemoveVue).length
  };

  return {
    generatedAt,
    routeProgress,
    vueDependencyCount: routeMatrix.filter((item) => item.vueOwner).length,
    reactReadinessPercent: routeMatrix.length === 0 ? 0 : Math.round((reactReadyRoutes.length / routeMatrix.length) * 100),
    modules: moduleIds.map((moduleId) => getModuleMigrationReadiness(moduleId)),
    roles: allRoleIds.map((roleId) => getRoleCoverage(roleId))
  };
}

export const phaseOneMigrationReport = buildMigrationReport("phase-1-static-baseline");
