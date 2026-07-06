<script setup lang="ts">
import { ref } from "vue";
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  FilterBar,
  PaginationBar,
  StatusTag,
  type DataTableColumn
} from "../../components/base";
import type { MallProduct } from "./types";

defineProps<{
  categories: string[];
  suppliers: string[];
  filteredProducts: MallProduct[];
  productColumns: DataTableColumn[];
  buyerVisible: boolean;
  maintainerVisible: boolean;
  operatorVisible: boolean;
  listingOperatorVisible: boolean;
  labels: {
    blockedReason: (product: MallProduct) => string;
    supplier: (product: MallProduct) => string;
    price: (product: MallProduct) => string;
    priceTrace: (product: MallProduct) => string;
    source: (product: MallProduct) => string;
    pricingReport: (product: MallProduct) => string;
    delivery: (product: MallProduct) => string;
    stock: (product: MallProduct) => string;
  };
  quantity: (productId: string) => number;
}>();

const categoryModel = defineModel<string>("category", { required: true });
const supplierModel = defineModel<string>("supplier", { required: true });
const priceModel = defineModel<string>("price", { required: true });
const keywordModel = defineModel<string>("keyword", { required: true });

const emit = defineEmits<{
  setQuantity: [productId: string, value: string | number];
  addToCart: [productId: string];
  addToCartAndOrder: [productId: string];
  editProduct: [product: MallProduct];
  preparePrice: [product: MallProduct];
  delistProduct: [productId: string];
}>();

const selectedProduct = ref<MallProduct | null>(null);
</script>

<template>
  <FilterBar class="g-hotel-filter-bar">
    <label>
      分类
      <select v-model="categoryModel">
        <option v-for="category in categories" :key="category">{{ category }}</option>
      </select>
    </label>
    <label>
      供应商
      <select v-model="supplierModel">
        <option v-for="supplier in suppliers" :key="supplier">{{ supplier }}</option>
      </select>
    </label>
    <label>
      价格区间
      <select v-model="priceModel">
        <option>全部</option>
        <option>100以下</option>
        <option>100-1000</option>
        <option>1000以上</option>
      </select>
    </label>
    <label>
      关键词
      <input v-model="keywordModel" placeholder="名称、规格、品牌" />
    </label>
  </FilterBar>

  <EnterpriseSurface class="g-hotel-table-card" title="商品目录" :description="`${filteredProducts.length} 条商品`">
    <DataTable :columns="productColumns" :rows="filteredProducts" empty-text="暂无符合条件的商品。">
      <template #name="{ row }">
        <strong>{{ row.name }}</strong>
        <small class="eds-meta">{{ row.skuCode }} / {{ row.category }} / {{ row.specification }}</small>
        <small v-if="labels.blockedReason(row)" class="eds-meta">暂不可采购：{{ labels.blockedReason(row) }}</small>
      </template>
      <template #category="{ row }">{{ row.category }}</template>
      <template #unit="{ row }">{{ row.unit }}</template>
      <template #price="{ row }">
        <strong>{{ labels.price(row) }}</strong>
        <small class="eds-meta">{{ labels.priceTrace(row) }}</small>
      </template>
      <template #status="{ row }">
        <StatusTag :tone="row.status === 'listed' ? 'success' : 'default'">{{ labels.stock(row) }}</StatusTag>
      </template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton type="text" @click="selectedProduct = row">商品信息</EnterpriseButton>
          <input
            v-if="buyerVisible"
            class="eds-compact-input g-hotel-inline-qty"
            type="number"
            min="1"
            :value="quantity(row.id)"
            aria-label="采购数量"
            @input="emit('setQuantity', row.id, ($event.target as HTMLInputElement).value)"
          />
          <EnterpriseButton v-if="buyerVisible" :disabled="row.status !== 'listed'" @click="emit('addToCart', row.id)">加入清单</EnterpriseButton>
          <EnterpriseButton v-if="buyerVisible" type="primary" :disabled="row.status !== 'listed'" @click="emit('addToCartAndOrder', row.id)">提交订单</EnterpriseButton>
          <EnterpriseButton v-if="maintainerVisible || operatorVisible" @click="emit('editProduct', row)">编辑</EnterpriseButton>
          <EnterpriseButton v-if="listingOperatorVisible && row.status !== 'listed'" @click="emit('preparePrice', row)">填定价</EnterpriseButton>
          <EnterpriseButton v-if="listingOperatorVisible && row.status === 'listed'" @click="emit('delistProduct', row.id)">下架</EnterpriseButton>
        </div>
      </template>
    </DataTable>
    <PaginationBar :total="filteredProducts.length" />
  </EnterpriseSurface>

  <div v-if="selectedProduct" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="商品信息">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedProduct = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>商品信息</h3>
        <button type="button" aria-label="关闭" @click="selectedProduct = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>名称：</span>{{ selectedProduct.name }}</p>
        <p><span>编号：</span>{{ selectedProduct.skuCode || selectedProduct.id }}</p>
        <p><span>分类：</span>{{ selectedProduct.category }}</p>
        <p><span>单位：</span>{{ selectedProduct.unit }}</p>
        <p><span>参考价：</span>{{ labels.price(selectedProduct) }}</p>
        <p><span>供应商：</span>{{ labels.supplier(selectedProduct) }}</p>
        <p><span>来源：</span>{{ labels.source(selectedProduct) }} / {{ labels.pricingReport(selectedProduct) }}</p>
      </div>
      <footer>
        <EnterpriseButton @click="selectedProduct = null">取消</EnterpriseButton>
        <EnterpriseButton v-if="maintainerVisible || operatorVisible" type="primary" @click="emit('editProduct', selectedProduct); selectedProduct = null">编辑</EnterpriseButton>
        <EnterpriseButton v-else type="primary" @click="selectedProduct = null">关闭</EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
