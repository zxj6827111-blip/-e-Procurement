import { labelStatus } from "../../utils/status-labels";
import type { MallProduct, MallSection, ProjectRow, SupplierRow } from "./types";

export function hasRole(roleId: string, roles: string[]) {
  return roles.includes(roleId);
}

export function canReadSuppliers(roleId: string) {
  return ["group_manager", "buyer", "platform_operator", "supplier", "supplier_admin", "auditor"].includes(roleId);
}

export function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

export function dateValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function numberValue(value: number | string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function stringList(value: string) {
  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveMallSection(section: string): MallSection {
  if (["orders", "packages", "maintenance", "pricing"].includes(section)) return section as MallSection;
  return "catalog";
}

export function productSupplierLabel(product: MallProduct, supplierRows: SupplierRow[]) {
  const supplierNameMap = new Map(supplierRows.map((item) => [item.id, item.name]));
  return product.supplierName ?? supplierNameMap.get(product.supplierId) ?? "供应商";
}

export function orderSupplierName(order: { supplierId: string; supplierName?: string }, supplierRows: SupplierRow[]) {
  const supplierNameMap = new Map(supplierRows.map((item) => [item.id, item.name]));
  return order.supplierName ?? supplierNameMap.get(order.supplierId) ?? "供应商";
}

export function priceTrace(product: MallProduct) {
  const source = product.priceSource;
  if (!source) return "协议价待确认";
  if (source.type === "pricing_report") return `定价报告 ${source.trace?.reportNo ?? "已归档"}`;
  return `供应商报价 ${source.trace?.quotationId ? "已归档" : "已采纳"}`;
}

export function productSourceLabel(product: MallProduct) {
  if (product.sourceType === "award_project") {
    const code = product.sourceTrace?.projectCode || product.sourceProjectId || "";
    const name = product.sourceTrace?.projectName || "未选择中标项目";
    return code ? `${code} / ${name}` : name;
  }
  if (product.sourceType === "agreement") return product.sourceAgreementNo || product.sourceTrace?.agreementNo || "未填写协议";
  return "未关联来源";
}

export function pricingReportLabel(product: MallProduct) {
  return product.sourceTrace?.pricingReportNo || product.priceSource?.trace?.reportNo || "未生成定价报告";
}

export function productPriceLabel(product: MallProduct) {
  const price = product.activePrice;
  if (!price) return "待定价";
  return money(price.salePrice ?? price.price);
}

export function deliveryLabel(product: MallProduct) {
  const days = product.activePrice?.deliveryDays;
  return days ? `${days} 天交付` : "交期待确认";
}

export function stockLabel(product: MallProduct) {
  return product.status === "listed" ? "可采购" : labelStatus(product.status);
}

export function productBlockedReason(product: MallProduct) {
  const reasons = product.blockReasons ?? [];
  if (!reasons.length || product.status === "listed") return "";
  return reasons.join("；");
}

export function mallRoleHint(input: {
  canMaintainProductCatalog: boolean;
  listingOperatorVisible: boolean;
  roleId: string;
}) {
  if (input.canMaintainProductCatalog) return "当前是供应商商品维护视角：这里只能维护商品基础资料；关联中标项目/协议来源、生成或选择定价报告、平台上架由集团采购或平台账号处理。";
  if (input.listingOperatorVisible) return "这里是商品定价和上架区。请按“关联来源 -> 定价报告 -> 平台上架”的顺序处理，完成后酒店采购账号才能下单。";
  if (input.roleId === "hotel_buyer") return "这里是酒店可采购商品目录。只有已上架并有有效价格的商品会显示，供应商草稿商品不会直接进入采购目录。";
  return "";
}

export function filterProducts(input: {
  products: MallProduct[];
  keyword: string;
  categoryFilter: string;
  supplierFilter: string;
  priceFilter: string;
  supplierRows: SupplierRow[];
}) {
  return input.products.filter((product) => {
    const price = Number(product.activePrice?.salePrice ?? product.activePrice?.price ?? 0);
    const supplierLabel = productSupplierLabel(product, input.supplierRows);
    const keywordMatched = [product.name, product.specification, product.brand, product.category, supplierLabel, productSourceLabel(product)]
      .join(" ")
      .toLowerCase()
      .includes(input.keyword.trim().toLowerCase());
    const categoryMatched = input.categoryFilter === "全部" || product.category === input.categoryFilter;
    const supplierMatched = input.supplierFilter === "全部" || supplierLabel === input.supplierFilter;
    const priceMatched =
      input.priceFilter === "全部" ||
      (input.priceFilter === "100以下" && price > 0 && price < 100) ||
      (input.priceFilter === "100-1000" && price >= 100 && price <= 1000) ||
      (input.priceFilter === "1000以上" && price > 1000);
    return keywordMatched && categoryMatched && supplierMatched && priceMatched;
  });
}

export function sourceProjects(projects: ProjectRow[]) {
  return projects.filter((project) => !project.externalTradeFlag);
}
