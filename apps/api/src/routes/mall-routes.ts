import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type {
  MallFundAccount,
  MallFundAccountLedgerEntry,
  MallOrder,
  MallPrice,
  MallProduct,
  MallQuestionnaire,
  MallQuestionnaireQuestion,
  MallReturnRequest,
  MallScenarioTemplate,
  MallSettlementInvoice,
  MallShipment,
  SupplierEvaluation
} from "../types.js";
import { isFinanceReviewRole, isFinanceRole, isProcurementBuyerRole, isSupplierAdminRole, isSupplierQuotationRole, isSupplierRole, supplierIdMatches, userOrgScope } from "../role-groups.js";
import { denyResponse } from "./permission-helpers.js";

const readerRoles = new Set(["buyer", "group_manager", "hotel_buyer", "hotel_finance", "platform_operator", "supplier", "supplier_admin", "supplier_quotation", "finance_reviewer", "auditor"]);
const simulatedFundBoundary = "本地模拟资金账户台账：完成余额、充值、授信、支付占用、退款/冲正留痕；未连接真实支付、银行、授信或财务系统。";
const invoiceVerificationBoundary = "本地模拟发票验真 adapter：完成发票号、金额、税额规则、驳回重传和电子发票文件边界；未连接真实税控/电子发票平台。";

function assertBuyer(ctx: AppContext, req: Request, res: Response, action: string) {
  if (isProcurementBuyerRole(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "MALL_BUYER_REQUIRED", "Only buyer-side roles can perform this mall action.", action, "mall", "operation");
  return false;
}

function assertSupplier(ctx: AppContext, req: Request, res: Response, supplierId: string, action: string) {
  if (isSupplierAdminRole(req.auth.roleId) && supplierIdMatches(req.auth.user, supplierId)) return true;
  denyResponse(ctx, req, res, 403, "MALL_SUPPLIER_SCOPE_DENIED", "Supplier can only operate own mall resources.", action, "supplier", supplierId);
  return false;
}

function assertSupplierQuotation(ctx: AppContext, req: Request, res: Response, supplierId: string, action: string) {
  if (isSupplierQuotationRole(req.auth.roleId) && supplierIdMatches(req.auth.user, supplierId)) return true;
  denyResponse(ctx, req, res, 403, "MALL_SUPPLIER_SCOPE_DENIED", "Supplier can only operate own mall resources.", action, "supplier", supplierId);
  return false;
}

function assertReader(ctx: AppContext, req: Request, res: Response) {
  if (readerRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "MALL_READ_DENIED", "Current role cannot read mall resources.", "mall.read.denied", "mall", "list");
  return false;
}

function now() {
  return new Date().toISOString();
}

function productVisible(req: Request, product: MallProduct) {
  if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, product.supplierId);
  if (req.auth.roleId === "auditor") return true;
  if (isFinanceRole(req.auth.roleId)) return product.status === "listed";
  if (isProcurementBuyerRole(req.auth.roleId)) return product.status === "listed" || product.createdBy === req.auth.user.id;
  return false;
}

function syncProductsFromR3(ctx: AppContext) {
  ctx.r3SupplierProductRepository.syncProductState(ctx.state.mallProducts, ctx.state.mallPrices);
}

function syncSuppliersFromR3(ctx: AppContext) {
  ctx.r3SupplierProductRepository.syncSupplierState(ctx.state.suppliers);
}

function supplierAdmitted(ctx: AppContext, supplierId: string) {
  syncSuppliersFromR3(ctx);
  const supplier = ctx.state.suppliers.find((item) => item.id === supplierId);
  if (!supplier) return false;
  const admissionStatus = supplier.admissionStatus ?? supplier.status;
  return admissionStatus === "admitted" && supplier.status !== "restricted";
}

function priceAvailable(price: MallPrice) {
  if (price.approvalStatus !== "approved") return false;
  if (!price.effectiveTo) return true;
  return new Date(price.effectiveTo).getTime() >= Date.now();
}

function activePrice(ctx: AppContext, productId: string) {
  return [...ctx.state.mallPrices].reverse().find((item) => item.productId === productId && priceAvailable(item));
}

function listingBlockReason(ctx: AppContext, product: MallProduct) {
  if (!supplierAdmitted(ctx, product.supplierId)) return "商品所属供应商未准入或已受限，不能上架。";
  if (!product.skuCode.trim() || !product.specification.trim()) return "商品缺少 SKU 或规格，不能上架。";
  if (product.imageFileIds.length === 0) return "商品缺少图片，不能上架。";
  if (!ctx.r6OrderFulfillmentRepository.resolvePriceSource(product, ctx.state.mallPrices)) return "商品缺少已审批且未过期的定价报告或供应商报价，不能上架。";
  return null;
}

function fileMetadata(ctx: AppContext, fileIds: string[]) {
  return fileIds
    .map((fileId) => ctx.fileStore.get(fileId))
    .filter((file): file is NonNullable<typeof file> => Boolean(file))
    .map((file) => ({
      id: file.fileId,
      fileId: file.fileId,
      fileName: file.originalName,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      uploadedAt: file.createdAt
    }));
}

function productResponse(ctx: AppContext, product: MallProduct, user = ctx.state.users[0]!) {
  const offer = ctx.r6OrderFulfillmentRepository.listOffers([product], ctx.state.mallPrices, user).at(0);
  const priceSource = offer?.priceSource ?? null;
  return {
    ...product,
    imageFileMetadata: fileMetadata(ctx, product.imageFileIds),
    attachmentFileMetadata: fileMetadata(ctx, product.attachmentFileIds),
    activePrice: priceSource
      ? {
          id: priceSource.sourceId,
          productId: product.id,
          supplierId: product.supplierId,
          price: priceSource.price,
          salePrice: priceSource.price,
          purchasePrice: priceSource.purchasePrice,
          taxRate: priceSource.taxRate,
          deliveryDays: priceSource.deliveryDays,
          effectiveFrom: priceSource.effectiveFrom,
          effectiveTo: priceSource.effectiveTo,
          approvalStatus: "approved",
          versionNo: 1,
          createdBy: "system",
          createdAt: priceSource.effectiveFrom,
          sourceType: priceSource.type,
          sourceLabel: priceSource.label,
          sourceTrace: priceSource.trace,
          sourceItemId: priceSource.sourceItemId
        }
      : activePrice(ctx, product.id) ?? null,
    priceSource: priceSource ? { ...priceSource, sourceTrace: priceSource.trace } : null,
    saleable: Boolean(offer?.saleable),
    blockReasons: offer?.blockReasons ?? [],
    statusLabel: offer?.statusLabel ?? product.status
  };
}

function orderVisible(req: Request, order: MallOrder) {
  if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, order.supplierId);
  if (req.auth.roleId === "auditor") return true;
  if (isFinanceRole(req.auth.roleId)) return userOrgScope(req.auth.user).includes(order.orgId);
  return isProcurementBuyerRole(req.auth.roleId) && (userOrgScope(req.auth.user).includes(order.orgId) || req.auth.user.id === order.buyerId);
}

function normalizeQuestion(value: unknown, index: number): string | MallQuestionnaireQuestion {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return `问题 ${index + 1}`;
  const record = value as Record<string, unknown>;
  const type = ["text", "single_choice", "multi_choice", "number", "score"].includes(String(record.type)) ? String(record.type) : "text";
  return {
    id: String(record.id ?? `q${index + 1}`),
    prompt: String(record.prompt ?? record.title ?? `问题 ${index + 1}`),
    type: type as MallQuestionnaireQuestion["type"],
    options: Array.isArray(record.options) ? record.options.map(String) : undefined,
    maxScore: record.maxScore === undefined ? undefined : Number(record.maxScore)
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter((item) => item.trim().length > 0) : [];
}

function questionId(question: string | MallQuestionnaireQuestion, index: number) {
  return typeof question === "string" ? `q${index + 1}` : question.id;
}

function answerScore(question: string | MallQuestionnaireQuestion, answer: unknown) {
  if (typeof question === "string") return String(answer ?? "").trim() ? 1 : 0;
  if (question.type === "score" || question.type === "number") {
    const numeric = Number(answer ?? 0);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(question.maxScore ?? 10, numeric));
  }
  if (Array.isArray(answer)) return answer.length > 0 ? 1 : 0;
  return String(answer ?? "").trim() ? 1 : 0;
}

function fundAccountForOrg(ctx: AppContext, orgId: string, actorId = "system") {
  const timestamp = now();
  ctx.state.mallFundAccounts ??= [];
  let account = ctx.state.mallFundAccounts.find((item: MallFundAccount) => item.orgId === orgId);
  if (!account) {
    account = {
      id: `mfa-${orgId}`,
      orgId,
      balance: 0,
      creditLimit: 100000,
      occupiedAmount: 0,
      status: "active",
      ledgerEntries: [
        {
          id: `mfal-${orgId}-opening`,
          accountId: `mfa-${orgId}`,
          orgId,
          direction: "inbound",
          entryType: "opening_balance",
          amount: 0,
          status: "simulated",
          createdBy: actorId,
          createdAt: timestamp,
          note: simulatedFundBoundary
        }
      ],
      adapterBoundary: simulatedFundBoundary,
      updatedAt: timestamp
    };
    ctx.state.mallFundAccounts.push(account);
  }
  return account;
}

function addFundLedger(account: MallFundAccount, entry: Omit<MallFundAccountLedgerEntry, "id" | "accountId" | "orgId" | "createdAt">) {
  const timestamp = now();
  const ledger: MallFundAccountLedgerEntry = {
    id: `mfal-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    accountId: account.id,
    orgId: account.orgId,
    createdAt: timestamp,
    ...entry
  };
  account.ledgerEntries.unshift(ledger);
  account.updatedAt = timestamp;
  return ledger;
}

function reserveOrderPayment(ctx: AppContext, order: MallOrder, actorId: string) {
  const account = fundAccountForOrg(ctx, order.orgId, actorId);
  const hasReserve = account.ledgerEntries.some((item) => item.orderId === order.id && item.entryType === "payment_reserve" && item.status === "reserved");
  if (!hasReserve) {
    account.occupiedAmount = Math.max(0, account.occupiedAmount + order.totalAmount);
    addFundLedger(account, {
      orderId: order.id,
      direction: "occupy",
      entryType: "payment_reserve",
      amount: order.totalAmount,
      status: "reserved",
      createdBy: actorId,
      note: "商城订单提交后占用本地模拟额度，真实支付待客户支付/财务系统资料。"
    });
  }
  order.paymentStatus = "payment_reserved";
  order.paymentReservedAmount = order.totalAmount;
  return account;
}

export function mallRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/mall/products", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertReader(ctx, req, res)) return;
    return res.json({ products: ctx.state.mallProducts.filter((product) => productVisible(req, product)).map((product) => productResponse(ctx, product, req.auth.user)) });
  });

  router.post("/mall/products", (req, res) => {
    syncProductsFromR3(ctx);
    const supplierId = String(req.body?.supplierId ?? req.auth.user.supplierId ?? "");
    if (isSupplierAdminRole(req.auth.roleId)) {
      if (!assertSupplier(ctx, req, res, supplierId, "mall_product.create.denied")) return;
    } else if (!assertBuyer(ctx, req, res, "mall_product.create.denied")) {
      return;
    }
    const timestamp = now();
    const product: MallProduct = {
      id: `mp-${ctx.state.mallProducts.length + 1}`,
      name: String(req.body?.name ?? "未命名商品"),
      category: String(req.body?.category ?? "酒店物资"),
      brand: String(req.body?.brand ?? "通用品牌"),
      unit: String(req.body?.unit ?? "件"),
      skuCode: String(req.body?.skuCode ?? `SKU-${ctx.state.mallProducts.length + 1}`),
      specification: String(req.body?.specification ?? "标准规格"),
      packingQuantity: req.body?.packingQuantity === undefined ? undefined : Number(req.body.packingQuantity),
      minOrderQty: req.body?.minOrderQty === undefined ? undefined : Number(req.body.minOrderQty),
      maxOrderQty: req.body?.maxOrderQty === undefined ? undefined : Number(req.body.maxOrderQty),
      taxRate: req.body?.taxRate === undefined ? undefined : Number(req.body.taxRate),
      invoiceName: req.body?.invoiceName === undefined ? undefined : String(req.body.invoiceName),
      taxClassificationCode: req.body?.taxClassificationCode === undefined ? undefined : String(req.body.taxClassificationCode),
      detailDescription: req.body?.detailDescription === undefined ? undefined : String(req.body.detailDescription),
      acceptanceGuide: req.body?.acceptanceGuide === undefined ? undefined : String(req.body.acceptanceGuide),
      installationRequirement: req.body?.installationRequirement === undefined ? undefined : String(req.body.installationRequirement),
      tags: normalizeStringArray(req.body?.tags),
      status: "draft",
      supplierId,
      serviceRegions: Array.isArray(req.body?.serviceRegions) ? req.body.serviceRegions.map(String) : ["全国"],
      procurementCategory: req.body?.procurementCategory === undefined ? undefined : String(req.body.procurementCategory),
      imageFileIds: Array.isArray(req.body?.imageFileIds) ? req.body.imageFileIds.map(String) : [],
      attachmentFileIds: Array.isArray(req.body?.attachmentFileIds) ? req.body.attachmentFileIds.map(String) : [],
      createdBy: req.auth.user.id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    ctx.r3SupplierProductRepository.upsertProduct(product);
    ctx.state.mallProducts.push(product);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_product.create", "mall_product", product.id, undefined, `supplier=${supplierId}`);
    return res.status(201).json({ product: productResponse(ctx, product, req.auth.user), auditLogId: auditLog.id });
  });

  router.patch("/mall/products/:productId", (req, res) => {
    syncProductsFromR3(ctx);
    const product = ctx.state.mallProducts.find((item) => item.id === req.params.productId);
    if (!product) return res.status(404).json({ error: { code: "MALL_PRODUCT_NOT_FOUND", message: "Mall product was not found." } });
    if (isSupplierAdminRole(req.auth.roleId)) {
      if (!assertSupplier(ctx, req, res, product.supplierId, "mall_product.update.denied")) return;
    } else if (!assertBuyer(ctx, req, res, "mall_product.update.denied")) {
      return;
    }
    for (const key of ["name", "category", "brand", "unit", "skuCode", "specification", "procurementCategory", "invoiceName", "taxClassificationCode", "detailDescription", "acceptanceGuide", "installationRequirement"] as const) {
      if (req.body?.[key] !== undefined) product[key] = String(req.body[key]);
    }
    for (const key of ["packingQuantity", "minOrderQty", "maxOrderQty", "taxRate"] as const) {
      if (req.body?.[key] !== undefined) product[key] = Number(req.body[key]);
    }
    if (Array.isArray(req.body?.serviceRegions)) product.serviceRegions = req.body.serviceRegions.map(String);
    if (Array.isArray(req.body?.tags)) product.tags = normalizeStringArray(req.body.tags);
    if (Array.isArray(req.body?.imageFileIds)) product.imageFileIds = req.body.imageFileIds.map(String);
    if (Array.isArray(req.body?.attachmentFileIds)) product.attachmentFileIds = req.body.attachmentFileIds.map(String);
    product.updatedAt = now();
    ctx.r3SupplierProductRepository.upsertProduct(product);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_product.update", "mall_product", product.id);
    return res.json({ product: productResponse(ctx, product, req.auth.user), auditLogId: auditLog.id });
  });

  router.post("/mall/products/bulk-status", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_product.bulk-status.denied")) return;
    const status = String(req.body?.status ?? "");
    if (!["listed", "delisted", "draft"].includes(status)) {
      return res.status(400).json({ error: { code: "MALL_PRODUCT_STATUS_INVALID", message: "Mall product status is invalid." } });
    }
    const productIds = normalizeStringArray(req.body?.productIds);
    const updated: MallProduct[] = [];
    const blocked: Array<{ productId: string; reason: string }> = [];
    for (const productId of productIds) {
      const product = ctx.state.mallProducts.find((item) => item.id === productId);
      if (!product) {
        blocked.push({ productId, reason: "product not found" });
        continue;
      }
      if (status === "listed") {
        const reason = listingBlockReason(ctx, product);
        if (reason) {
          blocked.push({ productId, reason });
          continue;
        }
      }
      product.status = status as MallProduct["status"];
      product.updatedAt = now();
      ctx.r3SupplierProductRepository.upsertProduct(product);
      updated.push(product);
    }
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_product.bulk-status.update", "mall_product", "bulk", undefined, `status=${status};updated=${updated.length};blocked=${blocked.length}`);
    return res.json({ updatedProducts: updated.map((product) => productResponse(ctx, product, req.auth.user)), blocked, auditLogId: auditLog.id });
  });

  router.post("/mall/products/:productId/status", (req, res) => {
    syncProductsFromR3(ctx);
    const product = ctx.state.mallProducts.find((item) => item.id === req.params.productId);
    if (!product) return res.status(404).json({ error: { code: "MALL_PRODUCT_NOT_FOUND", message: "Mall product was not found." } });
    if (!assertBuyer(ctx, req, res, "mall_product.status.denied")) return;
    const status = String(req.body?.status ?? "");
    if (!["listed", "delisted", "draft"].includes(status)) {
      return res.status(400).json({ error: { code: "MALL_PRODUCT_STATUS_INVALID", message: "Mall product status is invalid." } });
    }
    if (status === "listed") {
      const reason = listingBlockReason(ctx, product);
      if (reason) return res.status(400).json({ error: { code: "MALL_PRODUCT_LISTING_BLOCKED", message: reason } });
    }
    product.status = status as MallProduct["status"];
    product.updatedAt = now();
    ctx.r3SupplierProductRepository.upsertProduct(product);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_product.status.update", "mall_product", product.id, undefined, status);
    return res.json({ product: productResponse(ctx, product, req.auth.user), auditLogId: auditLog.id });
  });

  router.post("/mall/products/:productId/prices", (req, res) => {
    syncProductsFromR3(ctx);
    const product = ctx.state.mallProducts.find((item) => item.id === req.params.productId);
    if (!product) return res.status(404).json({ error: { code: "MALL_PRODUCT_NOT_FOUND", message: "Mall product was not found." } });
    if (isSupplierQuotationRole(req.auth.roleId)) {
      if (!assertSupplierQuotation(ctx, req, res, product.supplierId, "mall_price.create.denied")) return;
    } else if (!assertBuyer(ctx, req, res, "mall_price.create.denied")) {
      return;
    }
    const price: MallPrice = {
      id: `mprice-${ctx.state.mallPrices.length + 1}`,
      productId: product.id,
      supplierId: product.supplierId,
      price: Number(req.body?.salePrice ?? req.body?.price ?? 0),
      purchasePrice: req.body?.purchasePrice === undefined ? undefined : Number(req.body.purchasePrice),
      salePrice: Number(req.body?.salePrice ?? req.body?.price ?? 0),
      taxRate: req.body?.taxRate === undefined ? undefined : Number(req.body.taxRate),
      deliveryDays: req.body?.deliveryDays === undefined ? undefined : Number(req.body.deliveryDays),
      effectiveFrom: String(req.body?.effectiveFrom ?? now().slice(0, 10)),
      effectiveTo: req.body?.effectiveTo === undefined ? undefined : String(req.body.effectiveTo),
      approvalStatus: "submitted",
      versionNo: Math.max(0, ...ctx.state.mallPrices.filter((item) => item.productId === product.id).map((item) => item.versionNo)) + 1,
      createdBy: req.auth.user.id,
      createdAt: now()
    };
    ctx.r3SupplierProductRepository.upsertPrice(price);
    ctx.state.mallPrices.push(price);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_price.submit", "mall_price", price.id, undefined, `product=${product.id}`);
    return res.status(201).json({ price, auditLogId: auditLog.id });
  });

  router.post("/mall/prices/:priceId/approve", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_price.approve.denied")) return;
    const price = ctx.state.mallPrices.find((item) => item.id === req.params.priceId);
    if (!price) return res.status(404).json({ error: { code: "MALL_PRICE_NOT_FOUND", message: "Mall price was not found." } });
    price.approvalStatus = req.body?.approved === false ? "rejected" : "approved";
    ctx.r3SupplierProductRepository.upsertPrice(price);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_price.approve", "mall_price", price.id, undefined, price.approvalStatus);
    return res.json({ price, auditLogId: auditLog.id });
  });

  router.get("/mall/prices/:priceId/export", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertReader(ctx, req, res)) return;
    const price = ctx.state.mallPrices.find((item) => item.id === req.params.priceId);
    if (!price) return res.status(404).json({ error: { code: "MALL_PRICE_NOT_FOUND", message: "Mall price was not found." } });
    const product = ctx.state.mallProducts.find((item) => item.id === price.productId);
    if (!product || !productVisible(req, product)) return res.status(404).json({ error: { code: "MALL_PRODUCT_NOT_FOUND", message: "Mall product was not found." } });
    const quotationExport = {
      exportType: "supplier_quotation_version",
      adapterBoundary: "本地生成报价单版本 JSON/PDF 数据边界；正式导入导出模板、电子签章和外部合同系统待客户资料。",
      quotation: price,
      product: productResponse(ctx, product, req.auth.user),
      versionNo: price.versionNo,
      generatedAt: now()
    };
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_price.export", "mall_price", price.id, undefined, `version=${price.versionNo}`);
    return res.json({ quotationExport, auditLogId: auditLog.id });
  });

  router.post("/mall/cart/items", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_cart.update.denied")) return;
    const product = ctx.state.mallProducts.find((item) => item.id === String(req.body?.productId ?? "") && item.status === "listed");
    if (!product) return res.status(404).json({ error: { code: "MALL_PRODUCT_NOT_LISTED", message: "Listed product was not found." } });
    const offer = ctx.r6OrderFulfillmentRepository.listOffers([product], ctx.state.mallPrices, req.auth.user).at(0);
    if (!offer?.priceSource) return res.status(400).json({ error: { code: "MALL_PRODUCT_PRICE_MISSING", message: "Approved product price is required before adding to cart." } });
    if (!offer.saleable) return res.status(400).json({ error: { code: "MALL_PRODUCT_NOT_SALEABLE", message: offer.blockReasons.join("；") } });
    const quantity = Number(req.body?.quantity ?? 1);
    if (quantity <= 0) return res.status(400).json({ error: { code: "MALL_CART_QUANTITY_INVALID", message: "Cart quantity must be greater than 0." } });
    const cartItem = ctx.r6OrderFulfillmentRepository.upsertCartItem(req.auth.user, product, offer.priceSource, quantity);
    const existing = ctx.state.mallCartItems.find((item) => item.buyerId === req.auth.user.id && item.productId === product.id);
    if (existing) {
      Object.assign(existing, cartItem);
    } else {
      ctx.state.mallCartItems.push(cartItem);
    }
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_cart.update", "mall_product", product.id);
    return res.json({ cartItems: ctx.r6OrderFulfillmentRepository.listCart(req.auth.user, ctx.state.mallProducts, ctx.state.mallPrices).map((line) => line.cartItem), auditLogId: auditLog.id });
  });

  router.patch("/mall/cart/items/:cartItemId", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_cart.update.denied")) return;
    const current = ctx.state.mallCartItems.find((item) => item.id === req.params.cartItemId && item.buyerId === req.auth.user.id);
    if (!current) return res.status(404).json({ error: { code: "MALL_CART_ITEM_NOT_FOUND", message: "Cart item was not found." } });
    const product = ctx.state.mallProducts.find((item) => item.id === current.productId);
    if (!product) return res.status(404).json({ error: { code: "MALL_PRODUCT_NOT_FOUND", message: "Mall product was not found." } });
    const offer = ctx.r6OrderFulfillmentRepository.listOffers([product], ctx.state.mallPrices, req.auth.user).at(0);
    if (!offer?.priceSource || !offer.saleable) return res.status(400).json({ error: { code: "MALL_PRODUCT_NOT_SALEABLE", message: offer?.blockReasons.join("；") ?? "Product is not saleable." } });
    const quantity = Number(req.body?.quantity ?? current.quantity);
    if (quantity <= 0) return res.status(400).json({ error: { code: "MALL_CART_QUANTITY_INVALID", message: "Cart quantity must be greater than 0." } });
    const cartItem = ctx.r6OrderFulfillmentRepository.upsertCartItem(req.auth.user, product, offer.priceSource, quantity);
    Object.assign(current, cartItem);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_cart.update", "mall_cart", current.id);
    return res.json({ cartItems: ctx.r6OrderFulfillmentRepository.listCart(req.auth.user, ctx.state.mallProducts, ctx.state.mallPrices).map((line) => line.cartItem), auditLogId: auditLog.id });
  });

  router.delete("/mall/cart/items/:cartItemId", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_cart.delete.denied")) return;
    ctx.r6OrderFulfillmentRepository.deleteCartItem(req.auth.user, req.params.cartItemId);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => !(item.id === req.params.cartItemId && item.buyerId === req.auth.user.id));
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_cart.delete", "mall_cart", req.params.cartItemId);
    return res.json({ cartItems: ctx.r6OrderFulfillmentRepository.listCart(req.auth.user, ctx.state.mallProducts, ctx.state.mallPrices).map((line) => line.cartItem), auditLogId: auditLog.id });
  });

  router.delete("/mall/cart/items", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_cart.clear.denied")) return;
    ctx.r6OrderFulfillmentRepository.clearCart(req.auth.user);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => item.buyerId !== req.auth.user.id);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_cart.clear", "mall_cart", req.auth.user.id);
    return res.json({ cartItems: [], auditLogId: auditLog.id });
  });

  router.post("/mall/orders", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_order.submit.denied")) return;
    let order: MallOrder;
    try {
      order = ctx.r6OrderFulfillmentRepository.submitOrder({
        user: req.auth.user,
        products: ctx.state.mallProducts,
        prices: ctx.state.mallPrices,
        shippingAddress: String(req.body?.shippingAddress ?? "酒店收货地址"),
        invoiceTitle: String(req.body?.invoiceTitle ?? "酒店集团"),
        departmentId: req.body?.departmentId === undefined ? undefined : String(req.body.departmentId),
        expectedDeliveryAt: req.body?.expectedDeliveryAt === undefined ? undefined : String(req.body.expectedDeliveryAt)
      });
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_ORDER_SUBMIT_BLOCKED", message: error instanceof Error ? error.message : "Order submit blocked." } });
    }
    ctx.state.mallOrders.push(order);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => item.buyerId !== req.auth.user.id);
    const fundAccount = reserveOrderPayment(ctx, order, req.auth.user.id);
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_order.submit", "mall_order", order.id, undefined, `amount=${order.totalAmount}`);
    return res.status(201).json({ order, fundAccount, paymentAdapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
  });

  router.get("/mall/orders", (req, res) => {
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    if (!assertReader(ctx, req, res)) return;
    return res.json({ orders: ctx.state.mallOrders.filter((order) => orderVisible(req, order)) });
  });

  router.get("/mall/orders/:orderId", (req, res) => {
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    if (!assertReader(ctx, req, res)) return;
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order || !orderVisible(req, order)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    const settlementBills = ctx.r7SettlementFinanceRepository.listSettlementBills().filter((bill) => bill.purchaseOrderId === order.id);
    const account = fundAccountForOrg(ctx, order.orgId, req.auth.user.id);
    return res.json({
      order,
      shipments: ctx.state.mallShipments.filter((item) => item.orderId === order.id),
      returns: ctx.state.mallReturnRequests.filter((item) => item.orderId === order.id),
      invoices: ctx.state.mallSettlementInvoices.filter((item) => item.orderId === order.id),
      evaluations: ctx.state.supplierEvaluations.filter((item) => item.purchaseOrderId === order.id),
      settlementBills,
      fundLedgerEntries: account.ledgerEntries.filter((item) => item.orderId === order.id),
      contractView: {
        id: order.contractViewId ?? `mall-contract-${order.id}`,
        orderId: order.id,
        supplierId: order.supplierId,
        status: "adapter_contract_ready",
        adapterBoundary: "合同查看为本地订单合同摘要和合同系统 adapter 边界；真实合同系统待客户提供接口资料后联调。",
        downloadUrl: `/api/mall/orders/${order.id}/contract`
      }
    });
  });

  router.post("/mall/orders/:orderId/copy", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_order.copy.denied")) return;
    const source = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!source || !orderVisible(req, source)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    ctx.r6OrderFulfillmentRepository.clearCart(req.auth.user);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => item.buyerId !== req.auth.user.id);
    for (const line of source.lineItems) {
      const product = ctx.state.mallProducts.find((item) => item.id === line.productId && item.status === "listed");
      if (!product) continue;
      const offer = ctx.r6OrderFulfillmentRepository.listOffers([product], ctx.state.mallPrices, req.auth.user).at(0);
      if (!offer?.priceSource || !offer.saleable) continue;
      const cartItem = ctx.r6OrderFulfillmentRepository.upsertCartItem(req.auth.user, product, offer.priceSource, line.quantity);
      ctx.state.mallCartItems.push(cartItem);
    }
    let order: MallOrder;
    try {
      order = ctx.r6OrderFulfillmentRepository.submitOrder({
        user: req.auth.user,
        products: ctx.state.mallProducts,
        prices: ctx.state.mallPrices,
        shippingAddress: String(req.body?.shippingAddress ?? source.shippingAddress),
        invoiceTitle: String(req.body?.invoiceTitle ?? source.invoiceTitle),
        departmentId: req.body?.departmentId === undefined ? undefined : String(req.body.departmentId),
        expectedDeliveryAt: req.body?.expectedDeliveryAt === undefined ? undefined : String(req.body.expectedDeliveryAt)
      });
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_ORDER_COPY_BLOCKED", message: error instanceof Error ? error.message : "Order copy blocked." } });
    }
    order.sourceOrderId = source.id;
    ctx.state.mallOrders.push(order);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => item.buyerId !== req.auth.user.id);
    const fundAccount = reserveOrderPayment(ctx, order, req.auth.user.id);
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_order.copy", "mall_order", order.id, undefined, `source=${source.id}`);
    return res.status(201).json({ order, sourceOrderId: source.id, fundAccount, paymentAdapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
  });

  router.get("/mall/orders/:orderId/contract", (req, res) => {
    if (!assertReader(ctx, req, res)) return;
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order || !orderVisible(req, order)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    const supplier = ctx.state.suppliers.find((item) => item.id === order.supplierId);
    return res.json({
      contract: {
        id: order.contractViewId ?? `mall-contract-${order.id}`,
        orderId: order.id,
        orderNo: order.orderNo,
        buyerOrgId: order.orgId,
        supplierId: order.supplierId,
        supplierName: supplier?.name ?? order.supplierId,
        amount: order.totalAmount,
        lineItems: order.lineItems,
        status: "adapter_contract_ready",
        adapterBoundary: "合同查看已完成本地摘要、下载审计入口和合同系统 adapter 边界；未声明真实合同系统联调完成。"
      }
    });
  });

  router.get("/mall/fund-accounts", (req, res) => {
    if (!readerRoles.has(req.auth.roleId)) return denyResponse(ctx, req, res, 403, "MALL_FUND_READ_DENIED", "Current role cannot read mall fund accounts.", "mall_fund.read.denied", "mall_fund_account", "list");
    const orgIds = isFinanceRole(req.auth.roleId) || isProcurementBuyerRole(req.auth.roleId) || req.auth.roleId === "auditor" ? userOrgScope(req.auth.user) : [req.auth.user.orgId];
    const accounts = [...new Set(orgIds)].map((orgId) => fundAccountForOrg(ctx, orgId, req.auth.user.id));
    return res.json({ accounts, adapterBoundary: simulatedFundBoundary });
  });

  router.post("/mall/fund-accounts/:orgId/recharges", (req, res) => {
    if (!isFinanceRole(req.auth.roleId) && !isProcurementBuyerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "MALL_FUND_MAINTAIN_DENIED", "Current role cannot maintain mall fund accounts.", "mall_fund.recharge.denied", "mall_fund_account", req.params.orgId);
    }
    if (!userOrgScope(req.auth.user).includes(req.params.orgId)) {
      return denyResponse(ctx, req, res, 403, "MALL_FUND_ORG_SCOPE_DENIED", "Current role cannot maintain this org fund account.", "mall_fund.org_scope.denied", "mall_fund_account", req.params.orgId);
    }
    const amount = Number(req.body?.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: { code: "MALL_FUND_AMOUNT_INVALID", message: "Recharge amount must be greater than 0." } });
    const account = fundAccountForOrg(ctx, req.params.orgId, req.auth.user.id);
    account.balance = Math.round((account.balance + amount) * 100) / 100;
    const ledger = addFundLedger(account, {
      direction: "inbound",
      entryType: "recharge",
      amount,
      status: "simulated",
      createdBy: req.auth.user.id,
      note: String(req.body?.note ?? "本地模拟充值台账，真实充值待客户支付接口资料。")
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_fund.recharge", "mall_fund_account", account.id, undefined, `amount=${amount}`);
    return res.status(201).json({ account, ledger, adapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/fund-ledger", (req, res) => {
    if (!isFinanceRole(req.auth.roleId) && !isProcurementBuyerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "MALL_PAYMENT_MAINTAIN_DENIED", "Current role cannot maintain mall payment ledger.", "mall_payment.ledger.denied", "mall_order", req.params.orderId);
    }
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order || !orderVisible(req, order)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    const action = String(req.body?.action ?? "capture");
    const account = fundAccountForOrg(ctx, order.orgId, req.auth.user.id);
    if (action === "release" || action === "reverse") {
      account.occupiedAmount = Math.max(0, account.occupiedAmount - order.totalAmount);
      order.paymentStatus = action === "release" ? "released" : "reversed";
      const ledger = addFundLedger(account, {
        orderId: order.id,
        direction: action === "release" ? "release" : "reverse",
        entryType: action === "release" ? "return_refund" : "settlement_adjustment",
        amount: order.totalAmount,
        status: action === "release" ? "released" : "reversed",
        createdBy: req.auth.user.id,
        note: String(req.body?.note ?? "本地模拟退款/冲正台账，真实资金退回待客户支付/财务系统资料。")
      });
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, `mall_payment.${action}`, "mall_order", order.id, undefined, `amount=${order.totalAmount}`);
      return res.json({ order, account, ledger, adapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
    }
    account.occupiedAmount = Math.max(0, account.occupiedAmount - order.totalAmount);
    account.balance = Math.max(0, Math.round((account.balance - order.totalAmount) * 100) / 100);
    order.paymentStatus = "paid";
    const ledger = addFundLedger(account, {
      orderId: order.id,
      direction: "outbound",
      entryType: "payment_capture",
      amount: order.totalAmount,
      status: "paid",
      createdBy: req.auth.user.id,
      note: String(req.body?.note ?? "本地模拟支付扣款台账，真实支付待客户支付/财务系统资料。")
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_payment.capture", "mall_order", order.id, undefined, `amount=${order.totalAmount}`);
    return res.json({ order, account, ledger, adapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/confirm", (req, res) => {
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    if (!assertSupplier(ctx, req, res, order.supplierId, "mall_order.confirm.denied")) return;
    try {
      Object.assign(order, ctx.r6OrderFulfillmentRepository.confirmOrder(order, req.auth.user));
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_ORDER_CONFIRM_BLOCKED", message: error instanceof Error ? error.message : "Order confirm blocked." } });
    }
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_order.confirm", "mall_order", order.id);
    return res.json({ order, auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/shipments", (req, res) => {
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    if (!assertSupplier(ctx, req, res, order.supplierId, "mall_shipment.create.denied")) return;
    let shipment: MallShipment;
    try {
      const result = ctx.r6OrderFulfillmentRepository.createShipment(order, req.auth.user, {
        carrier: String(req.body?.carrier ?? "供应商配送"),
        trackingNo: String(req.body?.trackingNo ?? `TRK-${ctx.state.mallShipments.length + 1}`),
        contactName: req.body?.contactName === undefined ? undefined : String(req.body.contactName),
        contactPhone: req.body?.contactPhone === undefined ? undefined : String(req.body.contactPhone),
        estimatedArrivalAt: req.body?.estimatedArrivalAt === undefined ? undefined : String(req.body.estimatedArrivalAt),
        shippedQuantity: req.body?.shippedQuantity === undefined ? undefined : Number(req.body.shippedQuantity)
      });
      shipment = result.shipment;
      Object.assign(order, result.order);
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_SHIPMENT_BLOCKED", message: error instanceof Error ? error.message : "Shipment blocked." } });
    }
    ctx.state.mallShipments.push(shipment);
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_shipment.create", "mall_order", order.id);
    return res.status(201).json({ shipment, order, auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/receive", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_order.receive.denied")) return;
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order || !orderVisible(req, order)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    try {
      const result = ctx.r6OrderFulfillmentRepository.receiveOrder(order, req.auth.user, {
        receiptType: req.body?.receiptType,
        exceptionType: req.body?.exceptionType,
        summary: req.body?.summary === undefined ? undefined : String(req.body.summary),
        receivedItems: Array.isArray(req.body?.receivedItems)
          ? req.body.receivedItems.map((item: Record<string, unknown>) => ({
              productId: item.productId === undefined ? undefined : String(item.productId),
              orderLineItemId: item.orderLineItemId === undefined ? undefined : String(item.orderLineItemId),
              itemName: item.itemName === undefined ? undefined : String(item.itemName),
              receivedQuantity: Number(item.receivedQuantity),
              accepted: item.accepted === undefined ? undefined : Boolean(item.accepted)
            }))
          : undefined,
        attachmentFileIds: Array.isArray(req.body?.attachmentFileIds) ? req.body.attachmentFileIds.map(String) : [],
        fileLookup: (fileId) => ctx.fileStore.get(fileId)
      });
      Object.assign(order, result.order);
      ctx.state.receiptRecords.push(result.receipt);
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_RECEIPT_BLOCKED", message: error instanceof Error ? error.message : "Receipt blocked." } });
    }
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_order.receive", "mall_order", order.id);
    return res.json({ order, shipments: ctx.state.mallShipments.filter((item) => item.orderId === order.id), auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/returns", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_return.submit.denied")) return;
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order || !orderVisible(req, order)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    let returnRequest: MallReturnRequest;
    try {
      const result = ctx.r6OrderFulfillmentRepository.createReturn(order, req.auth.user, String(req.body?.productId ?? order.lineItems[0]?.productId ?? ""), Number(req.body?.quantity ?? 1), String(req.body?.reason ?? "退货申请"));
      returnRequest = result.returnRequest;
      Object.assign(order, result.order);
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_RETURN_BLOCKED", message: error instanceof Error ? error.message : "Return blocked." } });
    }
    ctx.state.mallReturnRequests.push(returnRequest);
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const workflowTask = ctx.r8WorkflowTaskRepository.upsertTask({
      id: `task:return_request:${returnRequest.id}`,
      taskCode: `TASK-RETURN-${returnRequest.id}`,
      taskType: "supplier_return_review",
      businessType: "return_request",
      businessId: returnRequest.id,
      orgId: order.orgId,
      supplierId: order.supplierId,
      assigneeRoleId: "supplier",
      title: `Supplier return review ${returnRequest.id}`,
      sourceJson: { route: "mall_return.submit", orderId: order.id, productId: returnRequest.productId }
    });
    ctx.r8WorkflowTaskRepository.createNotification({
      eventType: "return_request.submitted",
      businessType: "return_request",
      businessId: returnRequest.id,
      orgId: order.orgId,
      supplierId: order.supplierId,
      recipientRoleId: "supplier",
      title: `Supplier return review ${returnRequest.id}`,
      contentSummary: returnRequest.reason,
      sourceJson: { taskId: workflowTask.id, orderId: order.id }
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_return.submit", "mall_return", returnRequest.id);
    return res.status(201).json({ returnRequest, order, workflowTask, auditLogId: auditLog.id });
  });

  router.post("/mall/returns/:returnId/review", (req, res) => {
    const returnRequest = ctx.state.mallReturnRequests.find((item) => item.id === req.params.returnId);
    if (!returnRequest) return res.status(404).json({ error: { code: "MALL_RETURN_NOT_FOUND", message: "Mall return was not found." } });
    const order = ctx.state.mallOrders.find((item) => item.id === returnRequest.orderId);
    if (!order) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    if (!assertSupplier(ctx, req, res, order.supplierId, "mall_return.review.denied")) return;
    try {
      Object.assign(returnRequest, ctx.r6OrderFulfillmentRepository.reviewReturn(returnRequest, order, req.auth.user, req.body?.approved !== false, req.body?.handlingNote === undefined ? undefined : String(req.body.handlingNote)));
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_RETURN_REVIEW_BLOCKED", message: error instanceof Error ? error.message : "Return review blocked." } });
    }
    order.status = returnRequest.status === "approved" ? "return_approved" : "return_rejected";
    order.updatedAt = now();
    let refundLedger: ReturnType<typeof addFundLedger> | undefined;
    if (returnRequest.status === "approved") {
      const line = order.lineItems.find((item) => item.productId === returnRequest.productId);
      const refundAmount = Math.min(order.totalAmount, Number((line?.unitPrice ?? 0) * returnRequest.quantity));
      const account = fundAccountForOrg(ctx, order.orgId, req.auth.user.id);
      account.occupiedAmount = Math.max(0, account.occupiedAmount - refundAmount);
      returnRequest.refundAmount = refundAmount;
      returnRequest.settlementImpact = {
        originalOrderAmount: order.totalAmount,
        returnAmount: refundAmount,
        settlementAdjustmentType: "refund",
        financeLedgerStatus: "simulated_reversed"
      };
      refundLedger = addFundLedger(account, {
        orderId: order.id,
        returnId: returnRequest.id,
        direction: "reverse",
        entryType: "return_refund",
        amount: refundAmount,
        status: "reversed",
        createdBy: req.auth.user.id,
        note: "退货审核通过后写入本地模拟退款/冲正台账；真实支付退款待客户支付/财务接口资料。"
      });
      order.paymentStatus = "reversed";
    }
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    ctx.r8WorkflowTaskRepository.completeBusinessTasks("return_request", returnRequest.id, req.auth.user.id);
    ctx.r8WorkflowTaskRepository.createNotification({
      eventType: `return_request.${returnRequest.status}`,
      businessType: "return_request",
      businessId: returnRequest.id,
      orgId: order.orgId,
      supplierId: order.supplierId,
      recipientUserId: returnRequest.createdBy,
      title: `Return ${returnRequest.status}`,
      contentSummary: returnRequest.status,
      sourceJson: { route: "mall_return.review", orderId: order.id }
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_return.review", "mall_return", returnRequest.id, undefined, returnRequest.status);
    return res.json({ returnRequest, order, refundLedger, paymentAdapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/evaluations", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_evaluation.submit.denied")) return;
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order || !orderVisible(req, order)) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    let evaluation: SupplierEvaluation;
    try {
      evaluation = ctx.r6OrderFulfillmentRepository.evaluateSupplier(order, req.auth.user, {
        quality: Number(req.body?.quality ?? req.body?.qualityScore ?? 0),
        delivery: Number(req.body?.delivery ?? req.body?.deliverySpeed ?? 0),
        service: Number(req.body?.service ?? req.body?.serviceAttitude ?? 0),
        cooperation: req.body?.cooperation === undefined ? undefined : Number(req.body.cooperation),
        priceReasonableness: req.body?.priceReasonableness === undefined ? undefined : Number(req.body.priceReasonableness),
        description: req.body?.description === undefined ? undefined : String(req.body.description),
        improvementSuggestion: req.body?.improvementSuggestion === undefined ? undefined : String(req.body.improvementSuggestion)
      });
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_EVALUATION_BLOCKED", message: error instanceof Error ? error.message : "Evaluation blocked." } });
    }
    ctx.state.supplierEvaluations.push(evaluation);
    const supplier = ctx.state.suppliers.find((item) => item.id === order.supplierId);
    if (supplier) supplier.evaluationScore = evaluation.score;
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_evaluation.submit", "supplier_evaluation", evaluation.id);
    return res.status(201).json({ evaluation, auditLogId: auditLog.id });
  });

  router.post("/mall/orders/:orderId/invoices", (req, res) => {
    const order = ctx.state.mallOrders.find((item) => item.id === req.params.orderId);
    if (!order) return res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order was not found." } });
    if (!assertSupplier(ctx, req, res, order.supplierId, "mall_invoice.upload.denied")) return;
    let bill = ctx.r7SettlementFinanceRepository.listSettlementBills().find((item) => item.purchaseOrderId === order.id && item.supplierId === order.supplierId);
    if (!bill) {
      try {
        bill = ctx.r7SettlementFinanceRepository.generateSettlementBill(order.id, new Date().toISOString().slice(0, 7), req.auth.user, 0);
      } catch (error) {
        return res.status(400).json({ error: { code: "MALL_INVOICE_UPLOAD_BLOCKED", message: error instanceof Error ? error.message : "Invoice upload blocked." } });
      }
    }
    let invoice: MallSettlementInvoice;
    try {
      const requestedAmount = Number(req.body?.amount ?? order.totalAmount);
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) throw new Error("Invoice amount must be greater than 0.");
      const invoiceAmount = Math.min(requestedAmount, bill.settlementAmount);
      const created = ctx.r7SettlementFinanceRepository.uploadInvoice({
        settlementBillId: bill.id,
        invoiceNo: String(req.body?.invoiceNo ?? `INV-${Date.now()}`),
        invoiceType: String(req.body?.invoiceType ?? "special_vat"),
        issueDate: String(req.body?.issueDate ?? new Date().toISOString().slice(0, 10)),
        amount: invoiceAmount,
        taxRate: Number(req.body?.taxRate ?? 0),
        taxAmount: req.body?.taxAmount === undefined ? undefined : Number(req.body.taxAmount),
        fileId: req.body?.fileId === undefined ? undefined : String(req.body.fileId),
        fileName: req.body?.fileName === undefined ? undefined : String(req.body.fileName),
        uploadedBy: req.auth.user.id
      });
      invoice = {
        id: created.id,
        orderId: created.orderId,
        supplierId: created.supplierId,
        status: created.status,
        fileId: created.fileId,
        fileName: created.fileName,
        amount: created.amount,
        uploadedBy: created.uploadedBy,
        uploadedAt: created.uploadedAt,
        verifiedBy: created.verifiedBy,
        verifiedAt: created.verifiedAt,
        taxRate: created.taxRate,
        taxAmount: created.taxAmount,
        verificationAdapterBoundary: invoiceVerificationBoundary,
        reuploadOfInvoiceId: req.body?.reuploadOfInvoiceId === undefined ? undefined : String(req.body.reuploadOfInvoiceId)
      };
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_INVOICE_UPLOAD_BLOCKED", message: error instanceof Error ? error.message : "Invoice upload blocked." } });
    }
    ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
    const workflow = ctx.r8WorkflowTaskRepository.startApproval({
      businessType: "invoice",
      businessId: invoice.id,
      title: `Mall invoice ${invoice.id}`,
      amount: invoice.amount,
      methodType: "invoice",
      orgId: order.orgId,
      supplierId: order.supplierId,
      initiator: req.auth.user,
      sourceJson: { route: "mall_invoice.upload", orderId: order.id, settlementBillId: bill.id }
    });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_invoice.upload", "mall_invoice", invoice.id);
    return res.status(201).json({ invoice, workflow, invoiceVerificationAdapterBoundary: invoiceVerificationBoundary, auditLogId: auditLog.id });
  });

  router.post("/mall/invoices/:invoiceId/verify", (req, res) => {
    if (!isProcurementBuyerRole(req.auth.roleId) && !isFinanceReviewRole(req.auth.roleId)) {
      denyResponse(ctx, req, res, 403, "MALL_INVOICE_REVIEW_DENIED", "Only procurement or finance review roles can verify mall invoices.", "mall_invoice.verify.denied", "mall_invoice", req.params.invoiceId);
      return;
    }
    const invoice = ctx.state.mallSettlementInvoices.find((item) => item.id === req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: { code: "MALL_INVOICE_NOT_FOUND", message: "Mall invoice was not found." } });
    const formalInvoice = ctx.r7SettlementFinanceRepository.getInvoice(invoice.id);
    if (!formalInvoice) return res.status(404).json({ error: { code: "MALL_INVOICE_NOT_FOUND", message: "Mall invoice was not found." } });
    if (!ctx.r7SettlementFinanceRepository.canReviewInvoice(req.auth.user, req.auth.roleId, formalInvoice)) {
      return denyResponse(ctx, req, res, 403, "MALL_INVOICE_SCOPE_DENIED", "Current role cannot review this mall invoice.", "mall_invoice.scope.denied", "mall_invoice", invoice.id);
    }
    const expectedTaxAmount = Number((invoice.amount * Number(req.body?.taxRate ?? invoice.taxRate ?? 0)).toFixed(2));
    if (req.body?.taxAmount !== undefined && Math.abs(Number(req.body.taxAmount) - expectedTaxAmount) > 0.01) {
      const rejectReason = `税额不匹配：期望 ${expectedTaxAmount}`;
      const reviewed = ctx.r7SettlementFinanceRepository.reviewInvoice(invoice.id, req.auth.user, false, rejectReason);
      invoice.status = reviewed.status;
      invoice.verifiedBy = reviewed.verifiedBy;
      invoice.verifiedAt = reviewed.verifiedAt;
      invoice.rejectReason = rejectReason;
      invoice.verificationAdapterBoundary = invoiceVerificationBoundary;
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_invoice.verify.reject_tax", "mall_invoice", invoice.id, undefined, invoice.rejectReason);
      return res.json({ invoice, invoiceVerificationAdapterBoundary: invoiceVerificationBoundary, auditLogId: auditLog.id });
    }
    const reviewed = ctx.r7SettlementFinanceRepository.reviewInvoice(invoice.id, req.auth.user, req.body?.approved !== false, req.body?.opinion === undefined ? undefined : String(req.body.opinion));
    invoice.status = reviewed.status;
    invoice.verifiedBy = reviewed.verifiedBy;
    invoice.verifiedAt = reviewed.verifiedAt;
    invoice.rejectReason = reviewed.status === "rejected" ? reviewed.verificationOpinion : undefined;
    invoice.verificationAdapterBoundary = invoiceVerificationBoundary;
    ctx.r7SettlementFinanceRepository.syncSettlementFinanceState(ctx.state);
    try {
      ctx.r8WorkflowTaskRepository.recordApprovalAction({
        businessType: "invoice",
        businessId: invoice.id,
        actor: req.auth.user,
        action: req.body?.approved === false ? "reject" : "approve",
        opinion: reviewed.verificationOpinion,
        sourceJson: { route: "mall_invoice.verify" }
      });
    } catch {
      // Preserve existing mall invoice verification behavior for pre-R8 invoices.
    }
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_invoice.verify", "mall_invoice", invoice.id, undefined, invoice.status);
    return res.json({ invoice, invoiceVerificationAdapterBoundary: invoiceVerificationBoundary, auditLogId: auditLog.id });
  });

  router.post("/mall/questionnaires", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_questionnaire.create.denied")) return;
    const questionnaire: MallQuestionnaire = {
      id: `mq-${ctx.state.mallQuestionnaires.length + 1}`,
      title: String(req.body?.title ?? "供应链问卷"),
      scope: String(req.body?.scope ?? "门店"),
      status: "published",
      questions: Array.isArray(req.body?.questions) ? req.body.questions.map(normalizeQuestion) : [normalizeQuestion("是否满足开业物资需求？", 0)],
      targetSupplierIds: Array.isArray(req.body?.targetSupplierIds) ? req.body.targetSupplierIds.map(String) : [],
      submissions: [],
      createdBy: req.auth.user.id,
      createdAt: now()
    };
    ctx.state.mallQuestionnaires.push(questionnaire);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_questionnaire.publish", "mall_questionnaire", questionnaire.id);
    return res.status(201).json({ questionnaire, auditLogId: auditLog.id });
  });

  router.get("/mall/questionnaires", (req, res) => {
    if (!assertReader(ctx, req, res)) return;
    const questionnaires = ctx.state.mallQuestionnaires.filter((item) => {
      if (!isSupplierRole(req.auth.roleId)) return true;
      return !item.targetSupplierIds?.length || item.targetSupplierIds.some((supplierId) => supplierIdMatches(req.auth.user, supplierId));
    });
    return res.json({ questionnaires });
  });

  router.post("/mall/questionnaires/:questionnaireId/submissions", (req, res) => {
    const questionnaire = ctx.state.mallQuestionnaires.find((item) => item.id === req.params.questionnaireId);
    if (!questionnaire) return res.status(404).json({ error: { code: "MALL_QUESTIONNAIRE_NOT_FOUND", message: "Mall questionnaire was not found." } });
    if (questionnaire.status !== "published") return res.status(400).json({ error: { code: "MALL_QUESTIONNAIRE_NOT_OPEN", message: "Questionnaire is not open for submission." } });
    if (!isSupplierRole(req.auth.roleId) && !isProcurementBuyerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "MALL_QUESTIONNAIRE_SUBMIT_DENIED", "Current role cannot submit this questionnaire.", "mall_questionnaire.submit.denied", "mall_questionnaire", questionnaire.id);
    }
    if (isSupplierRole(req.auth.roleId) && questionnaire.targetSupplierIds?.length && !questionnaire.targetSupplierIds.some((supplierId) => supplierIdMatches(req.auth.user, supplierId))) {
      return denyResponse(ctx, req, res, 403, "MALL_QUESTIONNAIRE_SUPPLIER_SCOPE_DENIED", "Supplier cannot submit this questionnaire.", "mall_questionnaire.supplier_scope.denied", "mall_questionnaire", questionnaire.id);
    }
    const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const answers = questionnaire.questions.map((question, index) => {
      const id = questionId(question, index);
      const matched = rawAnswers.find((item: Record<string, unknown>) => String(item.questionId ?? item.id ?? "") === id);
      return { questionId: id, answer: (matched?.answer ?? matched?.value ?? "") as string | number | string[] };
    });
    const score = answers.reduce((sum, answer, index) => sum + answerScore(questionnaire.questions[index]!, answer.answer), 0);
    const timestamp = now();
    const submission = {
      id: `mqs-${questionnaire.id}-${(questionnaire.submissions?.length ?? 0) + 1}`,
      questionnaireId: questionnaire.id,
      respondentUserId: req.auth.user.id,
      supplierId: req.auth.user.supplierId,
      answers,
      score,
      status: "scored" as const,
      submittedAt: timestamp,
      scoredBy: "system",
      scoredAt: timestamp
    };
    questionnaire.submissions ??= [];
    questionnaire.submissions.push(submission);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_questionnaire.submit", "mall_questionnaire", questionnaire.id, undefined, `score=${score}`);
    return res.status(201).json({ submission, questionnaire, auditLogId: auditLog.id });
  });

  router.post("/mall/questionnaires/:questionnaireId/archive", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_questionnaire.archive.denied")) return;
    const questionnaire = ctx.state.mallQuestionnaires.find((item) => item.id === req.params.questionnaireId);
    if (!questionnaire) return res.status(404).json({ error: { code: "MALL_QUESTIONNAIRE_NOT_FOUND", message: "Mall questionnaire was not found." } });
    const timestamp = now();
    questionnaire.status = "closed";
    questionnaire.archivedAt = timestamp;
    questionnaire.submissions = (questionnaire.submissions ?? []).map((submission) => ({ ...submission, status: "archived", archivedBy: req.auth.user.id, archivedAt: timestamp }));
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_questionnaire.archive", "mall_questionnaire", questionnaire.id);
    return res.json({ questionnaire, auditLogId: auditLog.id });
  });

  router.post("/mall/scenario-templates", (req, res) => {
    if (!assertBuyer(ctx, req, res, "mall_scenario_template.create.denied")) return;
    const templateType = String(req.body?.templateType ?? "opening_package") as MallScenarioTemplate["templateType"];
    if (!["sample_room", "opening_package", "bulk_purchase_package"].includes(templateType)) {
      return res.status(400).json({ error: { code: "MALL_TEMPLATE_TYPE_INVALID", message: "Mall scenario template type is invalid." } });
    }
    const template: MallScenarioTemplate = {
      id: `mst-${ctx.state.mallScenarioTemplates.length + 1}`,
      templateType,
      name: String(req.body?.name ?? "场景模板"),
      status: "active",
      productIds: Array.isArray(req.body?.productIds) ? req.body.productIds.map(String) : [],
      packageItems: Array.isArray(req.body?.packageItems)
        ? req.body.packageItems.map((item: Record<string, unknown>) => ({ productId: String(item.productId ?? ""), quantity: Number(item.quantity ?? 1) })).filter((item: { productId: string; quantity: number }) => item.productId && item.quantity > 0)
        : Array.isArray(req.body?.productIds)
          ? req.body.productIds.map((productId: unknown) => ({ productId: String(productId), quantity: 1 }))
          : [],
      applicableBrands: Array.isArray(req.body?.applicableBrands) ? req.body.applicableBrands.map(String) : [],
      applicableHotelTypes: Array.isArray(req.body?.applicableHotelTypes) ? req.body.applicableHotelTypes.map(String) : [],
      applicableHotelIds: Array.isArray(req.body?.applicableHotelIds) ? req.body.applicableHotelIds.map(String) : [],
      roomCount: req.body?.roomCount === undefined ? undefined : Number(req.body.roomCount),
      budgetAmount: req.body?.budgetAmount === undefined ? undefined : Number(req.body.budgetAmount),
      description: req.body?.description === undefined ? undefined : String(req.body.description),
      generatedOrderIds: [],
      attachmentFileIds: Array.isArray(req.body?.attachmentFileIds) ? req.body.attachmentFileIds.map(String) : [],
      createdBy: req.auth.user.id,
      createdAt: now()
    };
    ctx.state.mallScenarioTemplates.push(template);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_scenario_template.create", "mall_scenario_template", template.id, undefined, template.templateType);
    return res.status(201).json({ template, auditLogId: auditLog.id });
  });

  router.get("/mall/scenario-templates", (req, res) => {
    if (!assertReader(ctx, req, res)) return;
    return res.json({ templates: ctx.state.mallScenarioTemplates });
  });

  router.get("/mall/scenario-templates/:templateId", (req, res) => {
    if (!assertReader(ctx, req, res)) return;
    const template = ctx.state.mallScenarioTemplates.find((item) => item.id === req.params.templateId);
    if (!template) return res.status(404).json({ error: { code: "MALL_TEMPLATE_NOT_FOUND", message: "Mall scenario template was not found." } });
    return res.json({ template });
  });

  router.post("/mall/scenario-templates/:templateId/cart", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_scenario_template.cart.denied")) return;
    const template = ctx.state.mallScenarioTemplates.find((item) => item.id === req.params.templateId);
    if (!template || template.status !== "active") return res.status(404).json({ error: { code: "MALL_TEMPLATE_NOT_FOUND", message: "Active mall scenario template was not found." } });
    const packageItems = template.packageItems?.length ? template.packageItems : template.productIds.map((productId) => ({ productId, quantity: 1 }));
    const cartItems = [];
    for (const packageItem of packageItems) {
      const product = ctx.state.mallProducts.find((item) => item.id === packageItem.productId && item.status === "listed");
      if (!product) continue;
      const offer = ctx.r6OrderFulfillmentRepository.listOffers([product], ctx.state.mallPrices, req.auth.user).at(0);
      if (!offer?.priceSource || !offer.saleable) continue;
      const cartItem = ctx.r6OrderFulfillmentRepository.upsertCartItem(req.auth.user, product, offer.priceSource, packageItem.quantity);
      const existing = ctx.state.mallCartItems.find((item) => item.buyerId === req.auth.user.id && item.productId === product.id);
      if (existing) Object.assign(existing, cartItem);
      else ctx.state.mallCartItems.push(cartItem);
      cartItems.push(cartItem);
    }
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_scenario_template.cart", "mall_scenario_template", template.id, undefined, `itemCount=${cartItems.length}`);
    return res.json({ template, cartItems, auditLogId: auditLog.id });
  });

  router.post("/mall/scenario-templates/:templateId/orders", (req, res) => {
    syncProductsFromR3(ctx);
    if (!assertBuyer(ctx, req, res, "mall_scenario_template.order.denied")) return;
    const template = ctx.state.mallScenarioTemplates.find((item) => item.id === req.params.templateId);
    if (!template || template.status !== "active") return res.status(404).json({ error: { code: "MALL_TEMPLATE_NOT_FOUND", message: "Active mall scenario template was not found." } });
    ctx.r6OrderFulfillmentRepository.clearCart(req.auth.user);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => item.buyerId !== req.auth.user.id);
    const packageItems = template.packageItems?.length ? template.packageItems : template.productIds.map((productId) => ({ productId, quantity: 1 }));
    for (const packageItem of packageItems) {
      const product = ctx.state.mallProducts.find((item) => item.id === packageItem.productId && item.status === "listed");
      if (!product) continue;
      const offer = ctx.r6OrderFulfillmentRepository.listOffers([product], ctx.state.mallPrices, req.auth.user).at(0);
      if (!offer?.priceSource || !offer.saleable) continue;
      const cartItem = ctx.r6OrderFulfillmentRepository.upsertCartItem(req.auth.user, product, offer.priceSource, packageItem.quantity);
      ctx.state.mallCartItems.push(cartItem);
    }
    let order: MallOrder;
    try {
      order = ctx.r6OrderFulfillmentRepository.submitOrder({
        user: req.auth.user,
        products: ctx.state.mallProducts,
        prices: ctx.state.mallPrices,
        shippingAddress: String(req.body?.shippingAddress ?? `${template.name}收货地址`),
        invoiceTitle: String(req.body?.invoiceTitle ?? "酒店集团"),
        departmentId: req.body?.departmentId === undefined ? undefined : String(req.body.departmentId),
        expectedDeliveryAt: req.body?.expectedDeliveryAt === undefined ? undefined : String(req.body.expectedDeliveryAt)
      });
    } catch (error) {
      return res.status(400).json({ error: { code: "MALL_TEMPLATE_ORDER_BLOCKED", message: error instanceof Error ? error.message : "Scenario template order blocked." } });
    }
    ctx.state.mallOrders.push(order);
    ctx.state.mallCartItems = ctx.state.mallCartItems.filter((item) => item.buyerId !== req.auth.user.id);
    template.generatedOrderIds ??= [];
    template.generatedOrderIds.push(order.id);
    const fundAccount = reserveOrderPayment(ctx, order, req.auth.user.id);
    ctx.r6OrderFulfillmentRepository.syncOrderFulfillmentState(ctx.state);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_scenario_template.order", "mall_scenario_template", template.id, undefined, `order=${order.id}`);
    return res.status(201).json({ template, order, fundAccount, paymentAdapterBoundary: simulatedFundBoundary, auditLogId: auditLog.id });
  });

  return router;
}
