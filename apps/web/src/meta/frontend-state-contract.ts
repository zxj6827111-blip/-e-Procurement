import type { FrontendFeatureFlags } from "./feature-flags";
import type { RegistryMenuConfig } from "./menu-adapter";
import type { FrontendModuleId, RuntimeOwner } from "./route-matrix";

export interface SessionSnapshot {
  userId: string;
  userName: string;
  orgId?: string;
  mode: string;
  mockAuthEnabled: boolean;
  passwordChangeRequired: boolean;
}

export interface PermissionSnapshot {
  roleId: string;
  roleLabel: string;
  allowedRoutes: string[];
  deniedRoutes: string[];
}

export interface NavigationSnapshot {
  homeRoute: string;
  currentRoute: string;
  currentTitle: string;
  menuConfig: RegistryMenuConfig;
}

export interface UiContextSnapshot {
  environmentLabel: string;
  projectId: string | null;
  pageTitle: string;
}

export interface RouteContext {
  route: string;
  matchedRoute: string | null;
  moduleId: FrontendModuleId | null;
  runtimeOwner: RuntimeOwner;
  canAccess: boolean;
  canRenderReact: boolean;
  canRemoveVue: boolean;
  reasons: string[];
}

export interface FrontendRuntimeState {
  session: SessionSnapshot;
  roleId: string;
  permissions: PermissionSnapshot;
  navigation: NavigationSnapshot;
  uiContext: UiContextSnapshot;
  routeContext: RouteContext;
  featureFlags: FrontendFeatureFlags;
}

export interface ReactBridgeOutputs {
  navigate: (path: string) => void;
  logout: () => void;
  reportError: (error: unknown) => void;
}
