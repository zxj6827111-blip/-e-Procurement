import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPatch, apiPost, uploadFile } from "../../api/http";
import { useSessionStore } from "../../stores/session";
import {
  LISTING_OPERATOR_ROLES,
  createCopyOrderForm,
  createOrderForm,
  createPriceForm,
  createProductForm,
  createQuestionnaireForm,
  createScenarioForm,
  createTemplateOrderForm
} from "./constants";
import {
  canReadSuppliers,
  deliveryLabel,
  filterProducts,
  hasRole as roleMatches,
  money,
  numberValue,
  orderSupplierName as resolveOrderSupplierName,
  priceTrace,
  pricingReportLabel,
  productBlockedReason,
  productPriceLabel,
  productSourceLabel,
  productSupplierLabel as resolveProductSupplierLabel,
  sourceProjects as filterSourceProjects,
  stockLabel,
  stringList
} from "./display";
import {
  applyPricingReportItem,
  productPayload as buildProductPayload,
  productToForm,
  productToPriceForm,
  questionnaireQuestions,
  scenarioItems
} from "./forms";
import { mallSummaryItems, mallVisibility, recentOrders as selectRecentOrders, selectedOrderProcessId as selectSelectedOrderProcessId } from "./view-model";
import type {
  FundAccount,
  MallOrder,
  MallProduct,
  MallQuestionnaireForm,
  MallSection,
  PriceForm,
  ProductForm,
  ProjectRow,
  ScenarioForm,
  ScenarioTemplate,
  SupplierRow,
  TemplateOrderForm
} from "./types";

export function useSupplyMallPage() {
  const session = useSessionStore();
  const route = useRoute();
  const products = ref<MallProduct[]>([]);
  const orders = ref<MallOrder[]>([]);
  const templates = ref<ScenarioTemplate[]>([]);
  const fundAccounts = ref<FundAccount[]>([]);
  const supplierRows = ref<SupplierRow[]>([]);
  const projects = ref<ProjectRow[]>([]);
  const productImage = ref<File | null>(null);
  const productImageName = ref("");
  const message = ref("");
  const error = ref("");
  const processRefreshKey = ref(0);

  const keyword = ref("");
  const categoryFilter = ref("全部");
  const supplierFilter = ref("全部");
  const priceFilter = ref("全部");
  const quantityByProduct = ref<Record<string, number>>({});

  const productForm = ref<ProductForm>(createProductForm());
  const editingProductId = ref("");
  const priceForm = ref<PriceForm>(createPriceForm());
  const orderForm = ref(createOrderForm());
  const copyOrderForm = ref(createCopyOrderForm());
  const scenarioForm = ref<ScenarioForm>(createScenarioForm());
  const questionnaireForm = ref<MallQuestionnaireForm>(createQuestionnaireForm());
  const templateOrderForm = ref<TemplateOrderForm>(createTemplateOrderForm());

  const currentSupplierId = computed(() => session.user?.supplierId ?? "");
  const categories = computed(() => ["全部", ...Array.from(new Set(products.value.map((product) => product.category).filter(Boolean)))]);
  const suppliers = computed(() => ["全部", ...Array.from(new Set(products.value.map((product) => productSupplierLabel(product)).filter(Boolean)))]);
  const recentOrders = computed(() => selectRecentOrders(orders.value));
  const selectedOrderProcessId = computed(() => selectSelectedOrderProcessId(orders.value));
  const visibility = computed(() => mallVisibility(session.roleId, String(route.params.section ?? "")));
  const canUsePurchasePackages = computed(() => visibility.value.canUsePurchasePackages);
  const canMaintainProductCatalog = computed(() => visibility.value.canMaintainProductCatalog);
  const buyerVisible = computed(() => visibility.value.buyerVisible);
  const operatorVisible = computed(() => visibility.value.operatorVisible);
  const listingOperatorVisible = computed(() => visibility.value.listingOperatorVisible);
  const visibleTemplates = computed(() => (canUsePurchasePackages.value ? templates.value.slice(0, 3) : []));
  const sourceProjects = computed(() => filterSourceProjects(projects.value));
  const selectedPriceProduct = computed(() => products.value.find((product) => product.id === priceForm.value.productId));
  const selectedPricingReports = computed(() => selectedPriceProduct.value?.availablePricingReports ?? []);
  const selectedReportItems = computed(() => selectedPricingReports.value.find((report) => report.id === priceForm.value.pricingReportId)?.items ?? []);
  const routeSection = computed<MallSection>(() => visibility.value.routeSection);
  const mallSections = computed(() => visibility.value.mallSections);
  const showCatalogSection = computed(() => visibility.value.showCatalogSection);
  const showOrdersSection = computed(() => visibility.value.showOrdersSection);
  const showPackagesSection = computed(() => visibility.value.showPackagesSection);
  const showMaintenanceSection = computed(() => visibility.value.showMaintenanceSection);
  const showPricingSection = computed(() => visibility.value.showPricingSection);
  const sectionVisible = computed(() => visibility.value.sectionVisible);
  const mallRoleHint = computed(() => visibility.value.mallRoleHint);
  const summaryItems = computed(() => mallSummaryItems({ products: products.value, orders: orders.value, fundAccounts: fundAccounts.value }));

  const filteredProducts = computed(() =>
    filterProducts({
      products: products.value,
      keyword: keyword.value,
      categoryFilter: categoryFilter.value,
      supplierFilter: supplierFilter.value,
      priceFilter: priceFilter.value,
      supplierRows: supplierRows.value
    })
  );

  const catalogLabels = {
    blockedReason: productBlockedReason,
    supplier: productSupplierLabel,
    price: productPriceLabel,
    priceTrace,
    source: productSourceLabel,
    pricingReport: pricingReportLabel,
    delivery: deliveryLabel,
    stock: stockLabel
  };

  function hasRole(roles: string[]) {
    return roleMatches(session.roleId, roles);
  }

  function chooseImage(event: Event) {
    productImage.value = (event.target as HTMLInputElement).files?.[0] ?? null;
    productImageName.value = productImage.value?.name ?? "";
  }

  async function loadMall() {
    const [productData, orderData, templateData, fundData, supplierData, projectData] = await Promise.all([
      apiGet<{ products: MallProduct[] }>("/api/mall/products"),
      apiGet<{ orders: MallOrder[] }>("/api/mall/orders"),
      apiGet<{ templates: ScenarioTemplate[] }>("/api/mall/scenario-templates"),
      apiGet<{ accounts: FundAccount[] }>("/api/mall/fund-accounts"),
      canReadSuppliers(session.roleId) ? apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })) : Promise.resolve({ suppliers: [] }),
      hasRole(LISTING_OPERATOR_ROLES) ? apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })) : Promise.resolve({ projects: [] })
    ]);
    products.value = productData.products;
    orders.value = orderData.orders;
    templates.value = templateData.templates;
    fundAccounts.value = fundData.accounts;
    supplierRows.value = supplierData.suppliers;
    projects.value = projectData.projects;
    if (!priceForm.value.productId && products.value[0]) preparePrice(products.value[0]);
  }

  async function runMallAction(action: () => Promise<void>) {
    error.value = "";
    try {
      await action();
      processRefreshKey.value += 1;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    }
  }

  function productSupplierLabel(product: MallProduct) {
    return resolveProductSupplierLabel(product, supplierRows.value);
  }

  function orderSupplierName(order: MallOrder) {
    return resolveOrderSupplierName(order, supplierRows.value);
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

  function selectedSupplierId() {
    const supplierId = currentSupplierId.value;
    if (!supplierId) throw new Error("当前供应商账号缺少供应商归属，不能维护商品。");
    return supplierId;
  }

  function resetProductForm() {
    editingProductId.value = "";
    productForm.value = createProductForm();
    productImage.value = null;
    productImageName.value = "";
  }

  function editProduct(product: MallProduct) {
    editingProductId.value = product.id;
    productForm.value = productToForm(product);
  }

  function preparePrice(product: MallProduct) {
    priceForm.value = productToPriceForm(product);
  }

  function prepareSelectedPriceProduct() {
    const product = products.value.find((item) => item.id === priceForm.value.productId);
    if (product) preparePrice(product);
  }

  function applySelectedPricingReport() {
    const item = selectedReportItems.value.find((entry) => entry.id === priceForm.value.pricingReportItemId) ?? selectedReportItems.value[0];
    priceForm.value = applyPricingReportItem(priceForm.value, item);
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
      const created = await apiPost<{ product: MallProduct }>("/api/mall/products", buildProductPayload(productForm.value, selectedSupplierId(), imageFileIds));
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
      const updated = await apiPatch<{ product: MallProduct }>(
        `/api/mall/products/${editingProductId.value}`,
        buildProductPayload(productForm.value, selectedSupplierId(), imageFileIds)
      );
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
      if (!priceForm.value.sourceType) {
        error.value = "请先选择商品来源类型。";
        return;
      }
      if (priceForm.value.sourceType === "award_project" && !priceForm.value.sourceProjectId) {
        error.value = "请选择该商品关联的中标项目。";
        return;
      }
      if (priceForm.value.sourceType === "agreement" && !priceForm.value.sourceAgreementNo.trim()) {
        error.value = "请填写协议编号或协议名称。";
        return;
      }
      await apiPost(`/api/mall/products/${targetProductId}/status`, {
        status: "listed",
        sourceType: priceForm.value.sourceType,
        sourceProjectId: priceForm.value.sourceType === "award_project" ? priceForm.value.sourceProjectId : undefined,
        sourceAgreementNo: priceForm.value.sourceType === "agreement" ? priceForm.value.sourceAgreementNo.trim() : undefined,
        pricingReportId: priceForm.value.pricingReportId || undefined,
        pricingReportItemId: priceForm.value.pricingReportItemId || undefined,
        purchasePrice: numberValue(priceForm.value.purchasePrice),
        salePrice: numberValue(priceForm.value.salePrice),
        taxRate: numberValue(priceForm.value.taxRate, 0.13),
        deliveryDays: numberValue(priceForm.value.deliveryDays, 3),
        effectiveFrom: priceForm.value.effectiveFrom,
        effectiveTo: priceForm.value.effectiveTo || undefined
      });
      message.value = "商品已关联来源、生成或选择定价报告并上架";
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
      processRefreshKey.value += 1;
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
      processRefreshKey.value += 1;
    });
  }

  async function createScenario(templateType = scenarioForm.value.templateType) {
    await runMallAction(async () => {
      await apiPost("/api/mall/questionnaires", {
        title: questionnaireForm.value.title,
        scope: questionnaireForm.value.scope,
        targetSupplierIds: stringList(questionnaireForm.value.targetSupplierIds),
        questions: questionnaireQuestions(questionnaireForm.value)
      });
      const packageItems = scenarioItems(scenarioForm.value, products.value);
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
      processRefreshKey.value += 1;
    });
  }

  onMounted(loadMall);

  return {
    addToCart,
    addToCartAndOrder,
    applySelectedPricingReport,
    buyerVisible,
    canMaintainProductCatalog,
    canUsePurchasePackages,
    catalogLabels,
    categories,
    categoryFilter,
    chooseImage,
    copyOrder,
    copyOrderForm,
    createProduct,
    createScenario,
    currentSupplierId,
    delistProduct,
    editProduct,
    editingProductId,
    error,
    filteredProducts,
    keyword,
    listingOperatorVisible,
    mallRoleHint,
    mallSections,
    message,
    money,
    operatorVisible,
    orderForm,
    orderSupplierName,
    packageSummary,
    preparePrice,
    prepareSelectedPriceProduct,
    priceFilter,
    priceForm,
    processRefreshKey,
    productForm,
    productImageName,
    productQuantity,
    products,
    questionnaireForm,
    recentOrders,
    resetProductForm,
    routeSection,
    scenarioForm,
    sectionVisible,
    selectedOrderProcessId,
    selectedPricingReports,
    selectedReportItems,
    setProductQuantity,
    showCatalogSection,
    showMaintenanceSection,
    showOrdersSection,
    showPackagesSection,
    showPricingSection,
    sourceProjects,
    submitPriceAndList,
    summaryItems,
    supplierFilter,
    suppliers,
    templateOrderForm,
    templateToCart,
    templateToOrder,
    updateProduct,
    visibleTemplates
  };
}
