<script setup lang="ts">
import { ORDER_COLUMNS, PRODUCT_LISTING_STEPS, TEMPLATE_COLUMNS } from "./constants";
import SupplyMallMaintenanceSection from "./SupplyMallMaintenanceSection.vue";
import SupplyMallOrdersSection from "./SupplyMallOrdersSection.vue";
import SupplyMallPackagesSection from "./SupplyMallPackagesSection.vue";
import SupplyMallPageShell from "./SupplyMallPageShell.vue";
import SupplyMallPricingSection from "./SupplyMallPricingSection.vue";
import { useSupplyMallPage } from "./useSupplyMallPage";

const {
  applySelectedPricingReport,
  buyerVisible,
  canMaintainProductCatalog,
  canUsePurchasePackages,
  chooseImage,
  copyOrder,
  copyOrderForm,
  createProduct,
  createScenario,
  currentSupplierId,
  editingProductId,
  error,
  listingOperatorVisible,
  mallRoleHint,
  mallSections,
  message,
  money,
  operatorVisible,
  orderForm,
  orderSupplierName,
  packageSummary,
  prepareSelectedPriceProduct,
  priceForm,
  processRefreshKey,
  productForm,
  productImageName,
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
  showMaintenanceSection,
  showOrdersSection,
  showPackagesSection,
  showPricingSection,
  sourceProjects,
  submitPriceAndList,
  summaryItems,
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
