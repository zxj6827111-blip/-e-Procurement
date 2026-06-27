<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import { useSessionStore } from "../stores/session";
import { labelStatus } from "../utils/status-labels";

interface MallProduct {
  id: string;
  name: string;
  category: string;
  brand?: string;
  unit: string;
  skuCode: string;
  specification: string;
  procurementCategory?: string;
  invoiceName?: string;
  taxClassificationCode?: string;
  detailDescription?: string;
  acceptanceGuide?: string;
  installationRequirement?: string;
  packingQuantity?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  taxRate?: number;
  supplierId: string;
  supplierName?: string;
  serviceRegions?: string[];
  tags?: string[];
  status: string;
  activePrice?: {
    price?: number;
    salePrice?: number;
    purchasePrice?: number;
    deliveryDays?: number;
    taxRate?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
  } | null;
  priceSource?: {
    type: string;
    sourceId: string;
    trace?: { reportNo?: string; quotationId?: string };
  } | null;
  imageFileIds?: string[];
  imageFileMetadata?: UploadedFileMetadata[];
  attachmentFileIds?: string[];
  attachmentFileMetadata?: UploadedFileMetadata[];
  blockReasons?: string[];
}

interface MallOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  orgId?: string;
  invoiceTitle?: string;
  expectedDeliveryAt?: string;
  paymentStatus?: string;
  lineItems: Array<{ productId: string; productName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }>;
}

interface ScenarioTemplate {
  id: string;
  templateType: string;
  name: string;
  budgetAmount?: number;
  applicableBrands?: string[];
  applicableHotelTypes?: string[];
  applicableHotelIds?: string[];
  roomCount?: number;
  description?: string;
  packageItems?: Array<{ productId: string; quantity: number }>;
  productIds?: string[];
  attachmentFileIds?: string[];
  attachmentFileMetadata?: UploadedFileMetadata[];
}

interface MallQuestionnaire {
  id: string;
  title: string;
  scope: string;
  status: string;
  submissions?: unknown[];
}

interface FundAccount {
  id: string;
  orgId: string;
  orgName?: string;
  balance: number;
  creditLimit: number;
  occupiedAmount: number;
  status: string;
}

interface SupplierRow {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

const session = useSessionStore();
const products = ref<MallProduct[]>([]);
const orders = ref<MallOrder[]>([]);
const templates = ref<ScenarioTemplate[]>([]);
const questionnaires = ref<MallQuestionnaire[]>([]);
const fundAccounts = ref<FundAccount[]>([]);
const supplierRows = ref<SupplierRow[]>([]);
const organizations = ref<Organization[]>([]);
const productImage = ref<File | null>(null);
const productImageName = ref("");
const message = ref("");
const error = ref("");

const keyword = ref("");
const categoryFilter = ref("全部");
const supplierFilter = ref("全部");
const priceFilter = ref("全部");
const quantityByProduct = ref<Record<string, number>>({});
const showMaintenance = ref(true);

const productForm = ref({
  name: "",
  category: "客房物资",
  brand: "",
  unit: "件",
  skuCode: "",
  specification: "",
  procurementCategory: "客房物资",
  invoiceName: "",
  taxClassificationCode: "",
  detailDescription: "",
  acceptanceGuide: "",
  installationRequirement: "",
  packingQuantity: 1,
  minOrderQty: 1,
  maxOrderQty: undefined as number | undefined,
  taxRate: 0.13,
  serviceRegions: "全国",
  tags: ""
});
const editingProductId = ref("");
const priceForm = ref({
  productId: "",
  purchasePrice: 0,
  salePrice: 0,
  taxRate: 0.13,
  deliveryDays: 3,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: ""
});
const orderForm = ref({
  shippingAddress: "上海滨江华礼酒店后勤仓",
  invoiceTitle: "华礼酒店集团",
  expectedDeliveryAt: "",
  departmentId: ""
});
const copyOrderForm = ref({
  shippingAddress: "复购订单收货地址",
  invoiceTitle: "华礼酒店集团",
  expectedDeliveryAt: ""
});
const scenarioForm = ref({
  templateType: "opening_package",
  name: "",
  productQuantities: "",
  applicableBrands: "华礼",
  applicableHotelTypes: "高端酒店",
  applicableHotelIds: "org-hotel",
  roomCount: 100,
  budgetAmount: 10000,
  description: ""
});
const questionnaireForm = ref({
  title: "门店开业物资问卷",
  scope: "新开业门店",
  targetSupplierIds: "sup-1",
  questions: "room-count|客房数量|number|1000\nlinen-spec|布草规格|text|\nopening-date|开业日期|text|"
});
const templateOrderForm = ref({
  shippingAddress: "场景包收货地址",
  invoiceTitle: "华礼酒店集团",
  expectedDeliveryAt: "",
  departmentId: ""
});

const buyerRoles = ["group_manager", "buyer", "hotel_buyer", "platform_operator"];
const supplierRoles = ["supplier", "supplier_admin", "supplier_quotation"];
const supplierAdminRoles = ["supplier", "supplier_admin"];
const financeRoles = ["group_manager", "buyer", "hotel_finance", "finance_reviewer"];
const operatorRoles = ["group_manager", "buyer", "platform_operator"];

const listedProducts = computed(() => products.value.filter((product) => product.status === "listed").length);
const pendingOrders = computed(() => orders.value.filter((order) => !["received", "closed"].includes(order.status)).length);
const totalFundBalance = computed(() => fundAccounts.value.reduce((sum, account) => sum + Number(account.balance ?? 0), 0));
const categories = computed(() => ["全部", ...Array.from(new Set(products.value.map((product) => product.category).filter(Boolean)))]);
const suppliers = computed(() => ["全部", ...Array.from(new Set(products.value.map((product) => productSupplierLabel(product)).filter(Boolean)))]);
const recentOrders = computed(() => orders.value.slice(0, 4));
const canUsePurchasePackages = computed(() => hasRole([...buyerRoles, ...operatorRoles]));
const canMaintainProductCatalog = computed(() => hasRole(supplierAdminRoles));
const visibleTemplates = computed(() => (canUsePurchasePackages.value ? templates.value.slice(0, 3) : []));
const supplierNameMap = computed(() => new Map(supplierRows.value.map((item) => [item.id, item.name])));
const orgNameMap = computed(() => new Map(organizations.value.map((item) => [item.id, item.name])));

const filteredProducts = computed(() =>
  products.value.filter((product) => {
    const price = Number(product.activePrice?.salePrice ?? product.activePrice?.price ?? 0);
    const keywordMatched = [product.name, product.specification, product.brand, product.category, productSupplierLabel(product)]
      .join(" ")
      .toLowerCase()
      .includes(keyword.value.trim().toLowerCase());
    const categoryMatched = categoryFilter.value === "全部" || product.category === categoryFilter.value;
    const supplierMatched = supplierFilter.value === "全部" || productSupplierLabel(product) === supplierFilter.value;
    const priceMatched =
      priceFilter.value === "全部" ||
      (priceFilter.value === "100以下" && price > 0 && price < 100) ||
      (priceFilter.value === "100-1000" && price >= 100 && price <= 1000) ||
      (priceFilter.value === "1000以上" && price > 1000);
    return keywordMatched && categoryMatched && supplierMatched && priceMatched;
  })
);

function hasRole(roles: string[]) {
  return roles.includes(session.roleId);
}

function canReadSuppliers(roleId: string) {
  return ["group_manager", "buyer", "platform_operator", "supplier", "supplier_admin", "auditor"].includes(roleId);
}

function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function chooseImage(event: Event) {
  productImage.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  productImageName.value = productImage.value?.name ?? "";
}

async function loadMall() {
  const [productData, orderData, templateData, questionnaireData, fundData, supplierData, orgData] = await Promise.all([
    apiGet<{ products: MallProduct[] }>("/api/mall/products"),
    apiGet<{ orders: MallOrder[] }>("/api/mall/orders"),
    apiGet<{ templates: ScenarioTemplate[] }>("/api/mall/scenario-templates"),
    apiGet<{ questionnaires: MallQuestionnaire[] }>("/api/mall/questionnaires"),
    apiGet<{ accounts: FundAccount[] }>("/api/mall/fund-accounts"),
    canReadSuppliers(session.roleId) ? apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })) : Promise.resolve({ suppliers: [] }),
    apiGet<{ organizations: Organization[] }>("/api/organizations").catch(() => ({ organizations: [] }))
  ]);
  products.value = productData.products;
  orders.value = orderData.orders;
  templates.value = templateData.templates;
  questionnaires.value = questionnaireData.questionnaires;
  fundAccounts.value = fundData.accounts;
  supplierRows.value = supplierData.suppliers;
  organizations.value = orgData.organizations;
  if (!priceForm.value.productId && products.value[0]) preparePrice(products.value[0]);
}

async function runMallAction(action: () => Promise<void>) {
  error.value = "";
  try {
    await action();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function priceTrace(product: MallProduct) {
  const source = product.priceSource;
  if (!source) return "协议价待确认";
  if (source.type === "pricing_report") return `定价报告 ${source.trace?.reportNo ?? "已归档"}`;
  return `供应商报价 ${source.trace?.quotationId ? "已归档" : "已采纳"}`;
}

function productAttachments(product: MallProduct): UploadedFileMetadata[] {
  if (product.imageFileMetadata?.length) return product.imageFileMetadata;
  return (product.imageFileIds ?? []).map((id) => ({ id, fileName: "商品图片.png", contentType: "image/png", sizeBytes: 0, uploadedAt: "" }));
}

function productSupplierLabel(product: MallProduct) {
  return product.supplierName ?? supplierNameMap.value.get(product.supplierId) ?? "供应商";
}

function orderSupplierName(order: MallOrder) {
  return order.supplierName ?? supplierNameMap.value.get(order.supplierId) ?? "供应商";
}

function accountOrgName(account: FundAccount) {
  return account.orgName ?? orgNameMap.value.get(account.orgId) ?? "门店账户";
}

function productPriceLabel(product: MallProduct) {
  const price = product.activePrice;
  if (!price) return "待定价";
  return money(price.salePrice ?? price.price);
}

function deliveryLabel(product: MallProduct) {
  const days = product.activePrice?.deliveryDays;
  return days ? `${days} 天交付` : "交期待确认";
}

function stockLabel(product: MallProduct) {
  return product.status === "listed" ? "可采购" : labelStatus(product.status);
}

function templateAttachments(template: ScenarioTemplate): UploadedFileMetadata[] {
  if (template.attachmentFileMetadata?.length) return template.attachmentFileMetadata;
  return (template.attachmentFileIds ?? []).map((id) => ({ id, fileName: "场景模板图.png", contentType: "image/png", sizeBytes: 0, uploadedAt: "" }));
}

function packageSummary(template: ScenarioTemplate) {
  const count = template.packageItems?.length || template.productIds?.length || 0;
  return `${count} 类商品 / 预算 ${money(template.budgetAmount)}`;
}

function productQuantity(productId: string) {
  return Math.max(1, Number(quantityByProduct.value[productId] ?? 1));
}

function setProductQuantity(productId: string, value: string | number) {
  const next = Math.max(1, Number(value) || 1);
  quantityByProduct.value = { ...quantityByProduct.value, [productId]: next };
}

function stringList(value: string) {
  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberValue(value: number | string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function selectedSupplierId() {
  return session.user?.supplierId ?? "sup-1";
}

function productPayload(imageFileIds: string[] = []) {
  const form = productForm.value;
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    brand: form.brand.trim(),
    unit: form.unit.trim(),
    skuCode: form.skuCode.trim() || `SKU-${Date.now()}`,
    specification: form.specification.trim(),
    supplierId: selectedSupplierId(),
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

function resetProductForm() {
  editingProductId.value = "";
  productForm.value = {
    name: "",
    category: "客房物资",
    brand: "",
    unit: "件",
    skuCode: "",
    specification: "",
    procurementCategory: "客房物资",
    invoiceName: "",
    taxClassificationCode: "",
    detailDescription: "",
    acceptanceGuide: "",
    installationRequirement: "",
    packingQuantity: 1,
    minOrderQty: 1,
    maxOrderQty: undefined,
    taxRate: 0.13,
    serviceRegions: "全国",
    tags: ""
  };
  productImage.value = null;
  productImageName.value = "";
}

function editProduct(product: MallProduct) {
  showMaintenance.value = true;
  editingProductId.value = product.id;
  productForm.value = {
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

function preparePrice(product: MallProduct) {
  priceForm.value = {
    productId: product.id,
    purchasePrice: Number(product.activePrice?.purchasePrice ?? product.activePrice?.price ?? 0),
    salePrice: Number(product.activePrice?.salePrice ?? product.activePrice?.price ?? 0),
    taxRate: Number(product.activePrice?.taxRate ?? product.taxRate ?? 0.13),
    deliveryDays: Number(product.activePrice?.deliveryDays ?? 3),
    effectiveFrom: product.activePrice?.effectiveFrom ?? new Date().toISOString().slice(0, 10),
    effectiveTo: product.activePrice?.effectiveTo ?? ""
  };
}

async function uploadProductImage() {
  if (!productImage.value) return [];
  const uploaded = await uploadFile(productImage.value, {
    attachmentKind: "mall_product_image",
    objectType: "supplier",
    objectId: selectedSupplierId(),
    supplierId: selectedSupplierId()
  });
  return [uploaded.file.id];
}

async function createProduct() {
  await runMallAction(async () => {
    if (!productForm.value.name.trim() || !productForm.value.specification.trim()) {
      error.value = "请填写商品名称和规格。";
      return;
    }
    const imageFileIds = await uploadProductImage();
    const created = await apiPost<{ product: MallProduct }>("/api/mall/products", productPayload(imageFileIds));
    message.value = `已创建商品 ${created.product.name}`;
    resetProductForm();
    await loadMall();
  });
}

async function updateProduct() {
  await runMallAction(async () => {
    if (!editingProductId.value) {
      error.value = "请先选择要编辑的商品。";
      return;
    }
    const existing = products.value.find((product) => product.id === editingProductId.value);
    const imageFileIds = [...(existing?.imageFileIds ?? []), ...(await uploadProductImage())];
    const updated = await apiPatch<{ product: MallProduct }>(`/api/mall/products/${editingProductId.value}`, productPayload(imageFileIds));
    message.value = `已更新商品 ${updated.product.name}`;
    resetProductForm();
    await loadMall();
  });
}

async function submitPriceAndList(productId = priceForm.value.productId) {
  await runMallAction(async () => {
    const targetProductId = productId || priceForm.value.productId;
    if (!targetProductId) {
      error.value = "请先选择定价商品。";
      return;
    }
    const price = await apiPost<{ price: { id: string } }>(`/api/mall/products/${targetProductId}/prices`, {
      price: numberValue(priceForm.value.salePrice),
      purchasePrice: numberValue(priceForm.value.purchasePrice),
      salePrice: numberValue(priceForm.value.salePrice),
      taxRate: numberValue(priceForm.value.taxRate, 0.13),
      deliveryDays: numberValue(priceForm.value.deliveryDays, 3),
      effectiveFrom: priceForm.value.effectiveFrom,
      effectiveTo: priceForm.value.effectiveTo || undefined
    });
    await apiPost(`/api/mall/prices/${price.price.id}/approve`, { approved: true });
    await apiPost(`/api/mall/products/${targetProductId}/status`, { status: "listed" });
    message.value = "商品已审批定价并上架";
    await loadMall();
  });
}

async function delistProduct(productId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/products/${productId}/status`, { status: "delisted" });
    message.value = "商品已下架";
    await loadMall();
  });
}

async function addToCart(productId: string) {
  await runMallAction(async () => {
    await apiPost("/api/mall/cart/items", { productId, quantity: productQuantity(productId) });
    message.value = "已加入采购清单";
  });
}

async function addToCartAndOrder(productId: string) {
  await runMallAction(async () => {
    await apiPost("/api/mall/cart/items", { productId, quantity: productQuantity(productId) });
    const order = await apiPost<{ order: MallOrder }>("/api/mall/orders", {
      shippingAddress: orderForm.value.shippingAddress,
      invoiceTitle: orderForm.value.invoiceTitle,
      expectedDeliveryAt: orderForm.value.expectedDeliveryAt || undefined,
      departmentId: orderForm.value.departmentId || undefined
    });
    message.value = `订单已提交：${order.order.orderNo}`;
    await loadMall();
  });
}

async function copyOrder(orderId: string) {
  await runMallAction(async () => {
    const copied = await apiPost<{ order: MallOrder }>(`/api/mall/orders/${orderId}/copy`, {
      shippingAddress: copyOrderForm.value.shippingAddress,
      invoiceTitle: copyOrderForm.value.invoiceTitle,
      expectedDeliveryAt: copyOrderForm.value.expectedDeliveryAt || undefined
    });
    message.value = `已复制订单：${copied.order.orderNo}`;
    await loadMall();
  });
}

function scenarioItems() {
  const configured = scenarioForm.value.productQuantities
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [productId, quantity] = item.split(/[:：=]/).map((part) => part.trim());
      return { productId, quantity: Math.max(1, Number(quantity) || 1) };
    })
    .filter((item) => item.productId);
  if (configured.length) return configured;
  return products.value.map((item) => ({
    productId: item.id,
    quantity: scenarioForm.value.templateType === "sample_room" ? 1 : 3
  }));
}

function questionnaireQuestions() {
  return questionnaireForm.value.questions
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

async function createScenario(templateType = scenarioForm.value.templateType) {
  await runMallAction(async () => {
    await apiPost("/api/mall/questionnaires", {
      title: questionnaireForm.value.title,
      scope: questionnaireForm.value.scope,
      targetSupplierIds: stringList(questionnaireForm.value.targetSupplierIds),
      questions: questionnaireQuestions()
    });
    const packageItems = scenarioItems();
    await apiPost("/api/mall/scenario-templates", {
      templateType,
      name: scenarioForm.value.name || (templateType === "sample_room" ? "样板间标准包" : "酒店开业基础包"),
      productIds: packageItems.map((item) => item.productId),
      packageItems,
      applicableBrands: stringList(scenarioForm.value.applicableBrands),
      applicableHotelTypes: stringList(scenarioForm.value.applicableHotelTypes),
      applicableHotelIds: stringList(scenarioForm.value.applicableHotelIds),
      roomCount: numberValue(scenarioForm.value.roomCount),
      budgetAmount: numberValue(scenarioForm.value.budgetAmount),
      description: scenarioForm.value.description
    });
    message.value = "采购包配置已创建";
    await loadMall();
  });
}

async function submitQuestionnaire(questionnaire: MallQuestionnaire) {
  await runMallAction(async () => {
    const questions = (questionnaire as MallQuestionnaire & { questions?: Array<{ id: string; type?: string } | string> }).questions ?? [];
    await apiPost(`/api/mall/questionnaires/${questionnaire.id}/submissions`, {
      answers: questions.map((question, index) => ({
        questionId: typeof question === "string" ? `q${index + 1}` : question.id,
        answer: typeof question === "string" ? "已填写" : question.type === "score" || question.type === "number" ? 9 : "已填写"
      }))
    });
    message.value = "问卷已提交";
    await loadMall();
  });
}

async function archiveQuestionnaire(questionnaireId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/questionnaires/${questionnaireId}/archive`, {});
    message.value = "问卷已归档";
    await loadMall();
  });
}

async function templateToCart(templateId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/scenario-templates/${templateId}/cart`, {});
    message.value = "采购包配置已加入采购清单";
    await loadMall();
  });
}

async function templateToOrder(templateId: string) {
  await runMallAction(async () => {
    const result = await apiPost<{ order: MallOrder }>(`/api/mall/scenario-templates/${templateId}/orders`, {
      shippingAddress: templateOrderForm.value.shippingAddress,
      invoiceTitle: templateOrderForm.value.invoiceTitle,
      expectedDeliveryAt: templateOrderForm.value.expectedDeliveryAt || undefined,
      departmentId: templateOrderForm.value.departmentId || undefined
    });
    message.value = `模板转订单已完成：${result.order.orderNo}`;
    await loadMall();
  });
}

onMounted(loadMall);
</script>

<template>
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">商品目录</p>
        <h2>酒店物资采购目录</h2>
      </div>
      <div class="summary-strip">
        <span><strong>{{ products.length }}</strong> 商品</span>
        <span><strong>{{ listedProducts }}</strong> 上架</span>
        <span><strong>{{ pendingOrders }}</strong> 进行中订单</span>
        <span><strong>{{ money(totalFundBalance) }}</strong> 资金余额</span>
      </div>
    </div>

    <div class="filter-bar">
      <label>
        分类
        <select v-model="categoryFilter">
          <option v-for="category in categories" :key="category">{{ category }}</option>
        </select>
      </label>
      <label>
        供应商
        <select v-model="supplierFilter">
          <option v-for="supplier in suppliers" :key="supplier">{{ supplier }}</option>
        </select>
      </label>
      <label>
        价格区间
        <select v-model="priceFilter">
          <option>全部</option>
          <option>100以下</option>
          <option>100-1000</option>
          <option>1000以上</option>
        </select>
      </label>
      <label class="filter-keyword">
        关键词
        <input v-model="keyword" placeholder="名称、规格、品牌" />
      </label>
    </div>

    <p v-if="message" class="notice">{{ message }}</p>
    <p v-if="error" class="inline-error">{{ error }}</p>
  </section>

  <section class="catalog-layout">
    <div class="catalog-main">
      <article v-for="product in filteredProducts" :key="product.id" class="catalog-row">
        <div class="catalog-image">
          <AttachmentList v-if="productAttachments(product).length" :attachments="productAttachments(product)" variant="gallery" image-only empty-text="暂无商品图" />
          <div v-else class="visual-placeholder">
            <strong>商品图片</strong>
            <span>{{ product.category }}</span>
          </div>
        </div>
        <div class="catalog-info">
          <div class="catalog-title">
            <div>
              <span class="tag">{{ labelStatus(product.status) }}</span>
              <h3>{{ product.name }}</h3>
            </div>
            <strong class="product-price">{{ productPriceLabel(product) }}</strong>
          </div>
          <div class="info-grid compact-info">
            <div><span>规格</span><strong>{{ product.specification }}</strong></div>
            <div><span>供应商</span><strong>{{ productSupplierLabel(product) }}</strong></div>
            <div><span>库存/状态</span><strong>{{ stockLabel(product) }}</strong></div>
            <div><span>交期</span><strong>{{ deliveryLabel(product) }}</strong></div>
          </div>
          <div class="catalog-meta">
            <span>{{ product.category }}</span>
            <span>{{ product.brand || "-" }}</span>
            <span>{{ product.unit }}</span>
            <span>{{ priceTrace(product) }}</span>
          </div>
          <div class="actions">
            <input
              v-if="hasRole(buyerRoles)"
              class="qty-input"
              type="number"
              min="1"
              :value="productQuantity(product.id)"
              @input="setProductQuantity(product.id, ($event.target as HTMLInputElement).value)"
            />
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" :disabled="product.status !== 'listed'" @click="addToCart(product.id)">加入采购清单</button>
            <button v-if="hasRole(buyerRoles)" type="button" :disabled="product.status !== 'listed'" @click="addToCartAndOrder(product.id)">提交订单</button>
            <button v-if="canMaintainProductCatalog || hasRole(operatorRoles)" type="button" class="secondary-button" @click="editProduct(product)">编辑商品</button>
            <button v-if="hasRole(operatorRoles) && product.status !== 'listed'" type="button" class="secondary-button" @click="preparePrice(product)">填定价</button>
            <button v-if="hasRole(operatorRoles) && product.status === 'listed'" type="button" class="secondary-button" @click="delistProduct(product.id)">下架</button>
          </div>
        </div>
      </article>
      <div v-if="!filteredProducts.length" class="empty">暂无符合条件的商品。</div>
    </div>

    <aside class="catalog-side">
      <section v-if="canUsePurchasePackages" class="business-panel">
        <div class="panel-head">
          <h3>采购清单 / 最近订单</h3>
        </div>
        <div class="form-grid">
          <label>
            下单收货地址
            <input v-model="orderForm.shippingAddress" />
          </label>
          <label>
            发票抬头
            <input v-model="orderForm.invoiceTitle" />
          </label>
          <label>
            期望到货日期
            <input v-model="orderForm.expectedDeliveryAt" type="date" />
          </label>
          <label>
            使用部门
            <input v-model="orderForm.departmentId" placeholder="可选" />
          </label>
        </div>
        <div class="form-grid">
          <label>
            复购收货地址
            <input v-model="copyOrderForm.shippingAddress" />
          </label>
          <label>
            复购发票抬头
            <input v-model="copyOrderForm.invoiceTitle" />
          </label>
          <label>
            复购期望到货
            <input v-model="copyOrderForm.expectedDeliveryAt" type="date" />
          </label>
        </div>
        <div v-if="recentOrders.length" class="side-list">
          <article v-for="order in recentOrders" :key="order.id" class="side-list-row">
            <strong>{{ order.orderNo }}</strong>
            <span>{{ labelStatus(order.status) }} / {{ money(order.totalAmount) }}</span>
            <small>{{ order.shippingAddress }}</small>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" @click="copyOrder(order.id)">复购</button>
          </article>
        </div>
        <div v-else class="empty compact-empty">暂无订单。</div>
      </section>

      <section v-if="canUsePurchasePackages" class="business-panel">
        <div class="panel-head">
          <h3>采购包配置</h3>
          <button v-if="hasRole(operatorRoles)" type="button" class="secondary-button" @click="createScenario()">新建</button>
        </div>
        <div v-if="hasRole(operatorRoles)" class="form-grid">
          <label>
            采购包类型
            <select v-model="scenarioForm.templateType">
              <option value="opening_package">开业物资包</option>
              <option value="sample_room">样板间标准包</option>
              <option value="bulk_purchase_package">批量采购包</option>
            </select>
          </label>
          <label>
            采购包名称
            <input v-model="scenarioForm.name" placeholder="不填则使用类型默认名称" />
          </label>
          <label>
            适用品牌
            <input v-model="scenarioForm.applicableBrands" />
          </label>
          <label>
            适用酒店类型
            <input v-model="scenarioForm.applicableHotelTypes" />
          </label>
          <label>
            适用酒店ID
            <input v-model="scenarioForm.applicableHotelIds" />
          </label>
          <label>
            客房数
            <input v-model.number="scenarioForm.roomCount" type="number" min="0" />
          </label>
          <label>
            预算
            <input v-model.number="scenarioForm.budgetAmount" type="number" min="0" />
          </label>
          <label>
            商品数量配置
            <input v-model="scenarioForm.productQuantities" placeholder="mp-1:3，mp-2:1；留空使用全部商品" />
          </label>
          <label>
            问卷标题
            <input v-model="questionnaireForm.title" />
          </label>
          <label>
            问卷范围
            <input v-model="questionnaireForm.scope" />
          </label>
          <label>
            目标供应商
            <input v-model="questionnaireForm.targetSupplierIds" />
          </label>
          <label>
            采购包说明
            <input v-model="scenarioForm.description" />
          </label>
        </div>
        <label v-if="hasRole(operatorRoles)" class="form-grid">
          问卷问题
          <textarea v-model="questionnaireForm.questions" rows="4"></textarea>
        </label>
        <div class="form-grid">
          <label>
            采购包收货地址
            <input v-model="templateOrderForm.shippingAddress" />
          </label>
          <label>
            采购包发票抬头
            <input v-model="templateOrderForm.invoiceTitle" />
          </label>
          <label>
            采购包期望到货
            <input v-model="templateOrderForm.expectedDeliveryAt" type="date" />
          </label>
          <label>
            采购包使用部门
            <input v-model="templateOrderForm.departmentId" placeholder="可选" />
          </label>
        </div>
        <div v-if="visibleTemplates.length" class="template-list">
          <article v-for="template in visibleTemplates" :key="template.id" class="template-row">
            <div class="template-thumb">
              <AttachmentList v-if="templateAttachments(template).length" :attachments="templateAttachments(template)" variant="gallery" image-only empty-text="暂无模板图" />
              <div v-else class="visual-placeholder"><strong>采购包</strong></div>
            </div>
            <strong>{{ template.name }}</strong>
            <span>{{ labelStatus(template.templateType) }} / {{ packageSummary(template) }}</span>
            <div class="actions">
              <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" @click="templateToCart(template.id)">加入采购包清单</button>
              <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" @click="templateToOrder(template.id)">模板转订单</button>
            </div>
          </article>
        </div>
        <div v-else class="empty compact-empty">暂无采购包配置。</div>
      </section>
    </aside>
  </section>

  <section v-if="canMaintainProductCatalog" class="business-panel">
    <button type="button" class="section-toggle" @click="showMaintenance = !showMaintenance">{{ showMaintenance ? "收起供应商商品维护" : "展开供应商商品维护" }}</button>
    <div v-if="showMaintenance">
      <div class="form-grid">
        <label>
          商品名称
          <input v-model="productForm.name" />
        </label>
        <label>
          分类
          <input v-model="productForm.category" />
        </label>
        <label>
          采购分类
          <input v-model="productForm.procurementCategory" />
        </label>
        <label>
          品牌
          <input v-model="productForm.brand" />
        </label>
        <label>
          单位
          <input v-model="productForm.unit" />
        </label>
        <label>
          SKU 编码
          <input v-model="productForm.skuCode" placeholder="不填自动生成" />
        </label>
        <label>
          规格
          <input v-model="productForm.specification" />
        </label>
        <label>
          包装数量
          <input v-model.number="productForm.packingQuantity" type="number" min="1" />
        </label>
        <label>
          最小起订量
          <input v-model.number="productForm.minOrderQty" type="number" min="1" />
        </label>
        <label>
          最大订购量
          <input v-model.number="productForm.maxOrderQty" type="number" min="1" />
        </label>
        <label>
          税率
          <input v-model.number="productForm.taxRate" type="number" step="0.01" min="0" />
        </label>
        <label>
          发票品名
          <input v-model="productForm.invoiceName" />
        </label>
        <label>
          税收分类编码
          <input v-model="productForm.taxClassificationCode" />
        </label>
        <label>
          服务区域
          <input v-model="productForm.serviceRegions" placeholder="多个用逗号分隔" />
        </label>
        <label>
          标签
          <input v-model="productForm.tags" placeholder="多个用逗号分隔" />
        </label>
        <label>
          商品图片
          <input type="file" accept="image/*" @change="chooseImage" />
        </label>
      </div>
      <div class="form-grid">
        <label>
          商品说明
          <textarea v-model="productForm.detailDescription" rows="3"></textarea>
        </label>
        <label>
          验收说明
          <textarea v-model="productForm.acceptanceGuide" rows="3"></textarea>
        </label>
        <label>
          安装/交付要求
          <textarea v-model="productForm.installationRequirement" rows="3"></textarea>
        </label>
      </div>
      <div class="form-grid">
        <div class="notice">{{ productImageName || "未选择商品图片" }}</div>
        <button v-if="!editingProductId" type="button" @click="createProduct">新建商品</button>
        <button v-else type="button" @click="updateProduct">保存商品</button>
        <button v-if="editingProductId" type="button" class="secondary-button" @click="resetProductForm">取消编辑</button>
      </div>
    </div>
  </section>

  <section v-if="hasRole(operatorRoles)" class="business-panel">
    <div class="panel-head">
      <h3>商品定价上架</h3>
    </div>
    <div class="form-grid">
      <label>
        商品
        <select v-model="priceForm.productId">
          <option value="">请选择商品</option>
          <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }} / {{ product.skuCode }}</option>
        </select>
      </label>
      <label>
        采购价
        <input v-model.number="priceForm.purchasePrice" type="number" min="0" step="0.01" />
      </label>
      <label>
        销售价
        <input v-model.number="priceForm.salePrice" type="number" min="0" step="0.01" />
      </label>
      <label>
        税率
        <input v-model.number="priceForm.taxRate" type="number" min="0" step="0.01" />
      </label>
      <label>
        交付天数
        <input v-model.number="priceForm.deliveryDays" type="number" min="1" />
      </label>
      <label>
        生效日期
        <input v-model="priceForm.effectiveFrom" type="date" />
      </label>
      <label>
        失效日期
        <input v-model="priceForm.effectiveTo" type="date" />
      </label>
      <button type="button" @click="submitPriceAndList()">提交定价并上架</button>
    </div>
  </section>

</template>
