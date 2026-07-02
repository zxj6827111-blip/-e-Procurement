<script setup lang="ts">
import { ORDER_COLUMNS, PRODUCT_COLUMNS, PRODUCT_LISTING_STEPS, TEMPLATE_COLUMNS } from "./constants";
import SupplyMallCatalogSection from "./SupplyMallCatalogSection.vue";
import SupplyMallMaintenanceSection from "./SupplyMallMaintenanceSection.vue";
import SupplyMallOrdersSection from "./SupplyMallOrdersSection.vue";
import SupplyMallPackagesSection from "./SupplyMallPackagesSection.vue";
import SupplyMallPageShell from "./SupplyMallPageShell.vue";
import SupplyMallPricingSection from "./SupplyMallPricingSection.vue";
import { useSupplyMallPage } from "./useSupplyMallPage";

const {
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
} = useSupplyMallPage();
</script>
<template>
  <SupplyMallPageShell
    :summary-items="summaryItems"
    :sections="mallSections"
    :route-section="routeSection"
    :section-visible="sectionVisible"
    :mall-role-hint="mallRoleHint"
    :product-listing-steps="PRODUCT_LISTING_STEPS"
    :can-maintain-product-catalog="canMaintainProductCatalog"
    :current-supplier-id="currentSupplierId"
    :listing-operator-visible="listingOperatorVisible"
    :message="message"
    :error="error"
  />

  <SupplyMallCatalogSection
    v-if="showCatalogSection"
    v-model:category="categoryFilter"
    v-model:supplier="supplierFilter"
    v-model:price="priceFilter"
    v-model:keyword="keyword"
    :categories="categories"
    :suppliers="suppliers"
    :filtered-products="filteredProducts"
    :product-columns="PRODUCT_COLUMNS"
    :buyer-visible="buyerVisible"
    :maintainer-visible="canMaintainProductCatalog"
    :operator-visible="operatorVisible"
    :listing-operator-visible="listingOperatorVisible"
    :labels="catalogLabels"
    :quantity="productQuantity"
    @set-quantity="setProductQuantity"
    @add-to-cart="addToCart"
    @add-to-cart-and-order="addToCartAndOrder"
    @edit-product="editProduct"
    @prepare-price="preparePrice"
    @delist-product="delistProduct"
  />

  <SupplyMallOrdersSection
    v-if="showOrdersSection && canUsePurchasePackages"
    v-model:order-form="orderForm"
    v-model:copy-order-form="copyOrderForm"
    :recent-orders="recentOrders"
    :order-columns="ORDER_COLUMNS"
    :selected-order-process-id="selectedOrderProcessId"
    :process-refresh-key="processRefreshKey"
    :buyer-visible="buyerVisible"
    :money="money"
    :order-supplier-name="orderSupplierName"
    @copy-order="copyOrder"
  />

  <SupplyMallPackagesSection
    v-if="showPackagesSection && canUsePurchasePackages"
    v-model:scenario-form="scenarioForm"
    v-model:questionnaire-form="questionnaireForm"
    v-model:template-order-form="templateOrderForm"
    :visible-templates="visibleTemplates"
    :template-columns="TEMPLATE_COLUMNS"
    :operator-visible="operatorVisible"
    :buyer-visible="buyerVisible"
    :package-summary="packageSummary"
    @create-scenario="createScenario"
    @template-to-cart="templateToCart"
    @template-to-order="templateToOrder"
  />

  <SupplyMallMaintenanceSection
    v-if="showMaintenanceSection && canMaintainProductCatalog"
    v-model:product-form="productForm"
    :editing-product-id="editingProductId"
    :current-supplier-id="currentSupplierId"
    :product-image-name="productImageName"
    @choose-image="chooseImage"
    @create-product="createProduct"
    @update-product="updateProduct"
    @reset-product-form="resetProductForm"
  />

  <SupplyMallPricingSection
    v-if="showPricingSection && listingOperatorVisible"
    v-model:price-form="priceForm"
    :products="products"
    :source-projects="sourceProjects"
    :selected-pricing-reports="selectedPricingReports"
    :selected-report-items="selectedReportItems"
    :money="money"
    @prepare-selected-price-product="prepareSelectedPriceProduct"
    @apply-selected-pricing-report="applySelectedPricingReport"
    @submit-price-and-list="submitPriceAndList"
  />
</template>


