import type { SummaryCardItem } from "../../components/base";
import { BUYER_ROLES, LISTING_OPERATOR_ROLES, OPERATOR_ROLES, SUPPLIER_ADMIN_ROLES } from "./constants";
import { mallRoleHint, money, resolveMallSection } from "./display";
import type { FundAccount, MallNavigationItem, MallOrder, MallProduct, MallSection } from "./types";

export function mallSummaryItems(input: {
  products: MallProduct[];
  orders: MallOrder[];
  fundAccounts: FundAccount[];
}): SummaryCardItem[] {
  const listedProducts = input.products.filter((product) => product.status === "listed").length;
  const pendingOrders = input.orders.filter((order) => !["received", "closed"].includes(order.status)).length;
  const totalFundBalance = input.fundAccounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
  return [
    { label: "商品总数", value: input.products.length, meta: "当前角色可见目录" },
    { label: "已上架", value: listedProducts, meta: "酒店可采购范围" },
    { label: "进行中订单", value: pendingOrders, meta: "未收货或未关闭" },
    { label: "资金余额", value: money(totalFundBalance), meta: "门店账户合计" }
  ];
}

export function mallNavigation(input: {
  roleId: string;
  canUsePurchasePackages: boolean;
  canMaintainProductCatalog: boolean;
  listingOperatorVisible: boolean;
}): MallNavigationItem[] {
  const sections: MallNavigationItem[] = [
    { key: "catalog", label: "商品目录", path: "/supply-mall", visible: true },
    { key: "orders", label: "订单与复购", path: "/supply-mall/orders", visible: input.canUsePurchasePackages },
    { key: "packages", label: "采购包", path: "/supply-mall/packages", visible: input.canUsePurchasePackages },
    { key: "maintenance", label: "商品维护", path: "/supply-mall/maintenance", visible: input.canMaintainProductCatalog },
    { key: "pricing", label: "定价上架", path: "/supply-mall/pricing", visible: input.listingOperatorVisible }
  ];
  return sections.filter((item) => item.visible);
}

export function mallVisibility(roleId: string, sectionParam: string) {
  const hasRole = (roles: string[]) => roles.includes(roleId);
  const canUsePurchasePackages = hasRole([...BUYER_ROLES, ...OPERATOR_ROLES]);
  const canMaintainProductCatalog = hasRole(SUPPLIER_ADMIN_ROLES);
  const buyerVisible = hasRole(BUYER_ROLES);
  const operatorVisible = hasRole(OPERATOR_ROLES);
  const listingOperatorVisible = hasRole(LISTING_OPERATOR_ROLES);
  const routeSection = resolveMallSection(sectionParam);
  const mallSections = mallNavigation({ roleId, canUsePurchasePackages, canMaintainProductCatalog, listingOperatorVisible });
  return {
    canUsePurchasePackages,
    canMaintainProductCatalog,
    buyerVisible,
    operatorVisible,
    listingOperatorVisible,
    routeSection,
    mallSections,
    showCatalogSection: routeSection === "catalog",
    showOrdersSection: routeSection === "orders",
    showPackagesSection: routeSection === "packages",
    showMaintenanceSection: routeSection === "maintenance",
    showPricingSection: routeSection === "pricing",
    sectionVisible: mallSections.some((section) => section.key === routeSection),
    mallRoleHint: mallRoleHint({ canMaintainProductCatalog, listingOperatorVisible, roleId })
  };
}

export function selectedOrderProcessId(orders: MallOrder[]) {
  return [...orders].sort((a, b) => String(b.id).localeCompare(String(a.id)))[0]?.id ?? "";
}

export function recentOrders(orders: MallOrder[]) {
  return orders.slice(0, 4);
}

export function routeSectionFromParam(sectionParam: string): MallSection {
  return resolveMallSection(sectionParam);
}
