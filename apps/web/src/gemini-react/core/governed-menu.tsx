import type { ReactNode } from "react";
import {
  Activity,
  Archive,
  Bell,
  Building,
  CheckSquare,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  PackageSearch,
  PenTool,
  Settings,
  Store,
  Users
} from "lucide-react";
import type { RegistryMenuConfig } from "../../meta/menu-adapter";
import type { ViewState } from "../shared/types";

export interface GovernedMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  route: string;
  menuKey: string;
}

const menuIconsByView: Partial<Record<ViewState, ReactNode>> = {
  DASHBOARD: <LayoutDashboard className="w-5 h-5" />,
  TODO: <ListTodo className="w-5 h-5" />,
  MESSAGES: <Bell className="w-5 h-5" />,
  APPROVAL_RULES: <CheckSquare className="w-5 h-5" />,
  REQUEST_APPROVE: <FileCheck className="w-5 h-5" />,
  PURCHASE_REQUEST: <FileText className="w-5 h-5" />,
  PROJECTS: <FolderKanban className="w-5 h-5" />,
  PROCUREMENT_DOCUMENT: <FileText className="w-5 h-5" />,
  ANNOUNCEMENT: <Megaphone className="w-5 h-5" />,
  QUOTE_PROGRESS: <Activity className="w-5 h-5" />,
  REVIEW_AWARD: <Users className="w-5 h-5" />,
  RATING_TEMPLATE: <PenTool className="w-5 h-5" />,
  AWARD_APPROVE: <FileCheck className="w-5 h-5" />,
  SUPPLIERS: <Building className="w-5 h-5" />,
  ITEM_CATALOG: <Store className="w-5 h-5" />,
  ORDER_FULFILLMENT: <PackageSearch className="w-5 h-5" />,
  SETTLEMENT: <FileSpreadsheet className="w-5 h-5" />,
  PAYMENT_PROGRESS: <HandCoins className="w-5 h-5" />,
  AUDIT_LOG: <Archive className="w-5 h-5" />,
  ITEM_MAINTENANCE: <Store className="w-5 h-5" />,
  SUPPLIER_PROFILE: <Building className="w-5 h-5" />,
  REGISTRATION: <FileText className="w-5 h-5" />,
  QUOTE_RESPONSE: <FileText className="w-5 h-5" />,
  AWARD_RESULT: <FolderKanban className="w-5 h-5" />,
  SETTLEMENT_MATS: <FileSpreadsheet className="w-5 h-5" />,
  AUDIT_SUPERVISION: <Activity className="w-5 h-5" />,
  AWARD_SUPERVISION: <CheckSquare className="w-5 h-5" />,
  SUPPLIER_SUPERVISION: <Building className="w-5 h-5" />,
  OPERATION_LOGS: <Archive className="w-5 h-5" />,
  INTEGRATION: <Settings className="w-5 h-5" />,
  SYS_MANAGE: <Settings className="w-5 h-5" />,
  SYSTEM_SETTINGS: <Settings className="w-5 h-5" />,
  EXPERT_RATING: <PenTool className="w-5 h-5" />
};

export function getGovernedMenuItems(menuConfig?: RegistryMenuConfig): GovernedMenuItem[] {
  return (menuConfig?.navItems ?? [])
    .filter((item) => item.viewId)
    .map((item) => ({
      id: item.viewId as ViewState,
      label: item.label,
      route: item.to,
      menuKey: item.menuKey,
      icon: menuIconsByView[item.viewId as ViewState] ?? <FileText className="w-5 h-5" />
    }));
}
