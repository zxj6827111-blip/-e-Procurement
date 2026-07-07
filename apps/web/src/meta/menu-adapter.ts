import {
  pageTitle,
  roleHasMessageBell,
  roleHome,
  roleLabels,
  visibleNavItems,
  visibleUtilityItems,
  type NavItem,
  type RoleId
} from "../permissions/role-model";
import { geminiViewForPath } from "../gemini-react/route-mapping";

export interface RegistryMenuItem extends NavItem {
  source: "role-model";
  viewId: string | null;
  title: string;
  utility?: boolean;
}

export interface RegistryMenuConfig {
  roleId: string;
  roleLabel: string;
  homeRoute: string;
  showMessageBell: boolean;
  navItems: RegistryMenuItem[];
  utilityItems: RegistryMenuItem[];
  allItems: RegistryMenuItem[];
}

function toRegistryItem(roleId: string, item: NavItem, utility = false): RegistryMenuItem {
  return {
    ...item,
    source: "role-model",
    viewId: geminiViewForPath(item.to, roleId),
    title: pageTitle(item.to, roleId),
    utility
  };
}

export function resolveRegistryMenu(roleId: string): RegistryMenuConfig {
  const navItems = visibleNavItems(roleId).map((item) => toRegistryItem(roleId, item));
  const utilityItems = visibleUtilityItems(roleId).map((item) => toRegistryItem(roleId, item, true));
  return {
    roleId,
    roleLabel: roleLabels[roleId as RoleId] ?? "未知角色",
    homeRoute: roleHome(roleId),
    showMessageBell: roleHasMessageBell(roleId),
    navItems,
    utilityItems,
    allItems: [...navItems, ...utilityItems]
  };
}
