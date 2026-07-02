import { dateValue, numberValue, stringList } from "./display";
import type { MallProduct, MallQuestionnaireForm, PriceForm, ProductForm, ScenarioForm } from "./types";

export function productPayload(form: ProductForm, supplierId: string, imageFileIds: string[] = []) {
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    brand: form.brand.trim(),
    unit: form.unit.trim(),
    skuCode: form.skuCode.trim() || `SKU-${Date.now()}`,
    specification: form.specification.trim(),
    supplierId,
    procurementCategory: form.procurementCategory.trim(),
    invoiceName: form.invoiceName.trim(),
    taxClassificationCode: form.taxClassificationCode.trim(),
    detailDescription: form.detailDescription.trim(),
    acceptanceGuide: form.acceptanceGuide.trim(),
    installationRequirement: form.installationRequirement.trim(),
    packingQuantity: numberValue(form.packingQuantity, 1),
    minOrderQty: numberValue(form.minOrderQty, 1),
    maxOrderQty: form.maxOrderQty === undefined || form.maxOrderQty === null ? undefined : numberValue(form.maxOrderQty),
    taxRate: numberValue(form.taxRate, 0.13),
    serviceRegions: stringList(form.serviceRegions),
    tags: stringList(form.tags),
    imageFileIds
  };
}

export function productToForm(product: MallProduct): ProductForm {
  return {
    name: product.name,
    category: product.category,
    brand: product.brand ?? "",
    unit: product.unit,
    skuCode: product.skuCode,
    specification: product.specification,
    procurementCategory: product.procurementCategory ?? product.category,
    invoiceName: product.invoiceName ?? "",
    taxClassificationCode: product.taxClassificationCode ?? "",
    detailDescription: product.detailDescription ?? "",
    acceptanceGuide: product.acceptanceGuide ?? "",
    installationRequirement: product.installationRequirement ?? "",
    packingQuantity: product.packingQuantity ?? 1,
    minOrderQty: product.minOrderQty ?? 1,
    maxOrderQty: product.maxOrderQty,
    taxRate: product.taxRate ?? 0.13,
    serviceRegions: (product.serviceRegions ?? []).join("，"),
    tags: (product.tags ?? []).join("，")
  };
}

export function productToPriceForm(product: MallProduct): PriceForm {
  const report = product.availablePricingReports?.find((item) => item.id === product.sourcePricingReportId) ?? product.availablePricingReports?.[0];
  const reportItem = report?.items.find((item) => item.id === product.sourcePricingReportItemId) ?? report?.items[0];
  return {
    productId: product.id,
    sourceType: product.sourceType ?? "agreement",
    sourceProjectId: product.sourceProjectId ?? "",
    sourceAgreementNo: product.sourceAgreementNo ?? "",
    pricingReportId: report?.id ?? "",
    pricingReportItemId: reportItem?.id ?? "",
    purchasePrice: Number(reportItem?.purchasePrice ?? product.activePrice?.purchasePrice ?? product.activePrice?.price ?? 0),
    salePrice: Number(reportItem?.salePrice ?? product.activePrice?.salePrice ?? product.activePrice?.price ?? 0),
    taxRate: Number(product.activePrice?.taxRate ?? product.taxRate ?? 0.13),
    deliveryDays: Number(product.activePrice?.deliveryDays ?? 3),
    effectiveFrom: dateValue(reportItem?.effectiveFrom ?? product.activePrice?.effectiveFrom) || new Date().toISOString().slice(0, 10),
    effectiveTo: dateValue(reportItem?.effectiveTo ?? product.activePrice?.effectiveTo)
  };
}

export function applyPricingReportItem(form: PriceForm, item?: { id: string; purchasePrice?: number; salePrice?: number; effectiveFrom?: string; effectiveTo?: string }) {
  if (!item) return form;
  return {
    ...form,
    pricingReportItemId: item.id,
    purchasePrice: Number(item.purchasePrice ?? form.purchasePrice),
    salePrice: Number(item.salePrice ?? form.salePrice),
    effectiveFrom: dateValue(item.effectiveFrom) || form.effectiveFrom,
    effectiveTo: dateValue(item.effectiveTo)
  };
}

export function scenarioItems(form: ScenarioForm, products: MallProduct[]) {
  const configured = form.productQuantities
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [productId, quantity] = item.split(/[:：=]/).map((part) => part.trim());
      return { productId, quantity: Math.max(1, Number(quantity) || 1) };
    })
    .filter((item) => item.productId);
  if (configured.length) return configured;
  return products.map((item) => ({
    productId: item.id,
    quantity: form.templateType === "sample_room" ? 1 : 3
  }));
}

export function questionnaireQuestions(form: MallQuestionnaireForm) {
  return form.questions
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const [id, prompt, type, maxScore] = item.split("|").map((part) => part.trim());
      return {
        id: id || `q${index + 1}`,
        prompt: prompt || item,
        type: type || "text",
        maxScore: maxScore ? Number(maxScore) : undefined
      };
    });
}
