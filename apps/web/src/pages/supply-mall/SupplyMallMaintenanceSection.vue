<script setup lang="ts">
import { EnterpriseButton, FormSection, StatusTag, SubmitPanel } from "../../components/base";
import type { ProductForm } from "./types";

defineProps<{
  editingProductId: string;
  currentSupplierId: string;
  productImageName: string;
}>();

const productForm = defineModel<ProductForm>("productForm", { required: true });

const emit = defineEmits<{
  chooseImage: [event: Event];
  createProduct: [];
  updateProduct: [];
  resetProductForm: [];
}>();
</script>

<template>
  <FormSection class="g-hotel-form-card" title="商品信息" description="维护商品基础资料。缺少供应商归属的账号不能创建或更新商品。">
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
      <input type="file" accept="image/*" @change="emit('chooseImage', $event)" />
    </label>
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
  </FormSection>

  <SubmitPanel class="g-hotel-sticky-actions">
    <StatusTag v-if="productImageName">{{ productImageName }}</StatusTag>
    <StatusTag v-else>未选择商品图片</StatusTag>
    <EnterpriseButton v-if="!editingProductId" type="primary" :disabled="!currentSupplierId" @click="emit('createProduct')">新建商品</EnterpriseButton>
    <EnterpriseButton v-else type="primary" :disabled="!currentSupplierId" @click="emit('updateProduct')">保存商品</EnterpriseButton>
    <EnterpriseButton v-if="editingProductId" @click="emit('resetProductForm')">取消编辑</EnterpriseButton>
  </SubmitPanel>
</template>
