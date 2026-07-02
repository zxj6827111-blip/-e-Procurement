<script setup lang="ts">
import type { UploadPayload } from "../../api/http";
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import { attachmentText } from "./display";
import type { ProductDraft } from "./types";

const products = defineModel<ProductDraft[]>("products", { required: true });

defineEmits<{
  addProduct: [];
  attachFiles: [event: Event, target: UploadPayload[]];
  removeProduct: [index: number];
}>();

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <section class="eds-section">
    <header class="eds-page-header">
      <div>
        <h3>主营产品</h3>
        <p>第 {{ stepSummary }} 步。至少填写一项主营产品，用于生成品类授权和资质初审范围。</p>
      </div>
    </header>
    <div v-for="(product, index) in products" :key="index" class="eds-surface">
      <header class="eds-page-header">
        <div>
          <h3>产品 {{ index + 1 }}</h3>
          <p>产品分类和名称为必填资料。</p>
        </div>
        <EnterpriseButton :disabled="products.length === 1" @click="$emit('removeProduct', index)">删除</EnterpriseButton>
      </header>
      <div class="eds-form-section">
        <label>产品分类<input v-model="product.category" placeholder="例如：客房日用品" /></label>
        <label>产品名称<input v-model="product.name" /></label>
        <label>规格说明<input v-model="product.specification" /></label>
        <label>月产量 / 供货能力<input v-model="product.monthlyCapacity" /></label>
        <label>产品说明<textarea v-model="product.description" rows="3" /></label>
        <label>产品资料<input type="file" multiple @change="$emit('attachFiles', $event, product.attachments)" /></label>
        <p class="eds-meta">{{ attachmentText(product.attachments.length, "可上传产品介绍、检测报告、图片等资料") }}</p>
      </div>
    </div>
    <SubmitPanel>
      <EnterpriseButton @click="$emit('addProduct')">新增产品</EnterpriseButton>
    </SubmitPanel>
  </section>
</template>
