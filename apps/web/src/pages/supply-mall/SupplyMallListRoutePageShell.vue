<script setup lang="ts">
import { PRODUCT_COLUMNS, PRODUCT_LISTING_STEPS } from "./constants";
import SupplyMallCatalogSection from "./SupplyMallCatalogSection.vue";
import SupplyMallPageShell from "./SupplyMallPageShell.vue";
import { useSupplyMallPage } from "./useSupplyMallPage";

const {
  addToCart,
  addToCartAndOrder,
  buyerVisible,
  canMaintainProductCatalog,
  catalogLabels,
  categories,
  categoryFilter,
  currentSupplierId,
  delistProduct,
  editProduct,
  error,
  filteredProducts,
  keyword,
  listingOperatorVisible,
  mallRoleHint,
  mallSections,
  message,
  operatorVisible,
  preparePrice,
  priceFilter,
  productQuantity,
  routeSection,
  sectionVisible,
  setProductQuantity,
  summaryItems,
  supplierFilter,
  suppliers
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
</template>
