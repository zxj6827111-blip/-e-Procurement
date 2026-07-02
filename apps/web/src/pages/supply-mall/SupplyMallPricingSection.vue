<script setup lang="ts">
import { EnterpriseButton, FormSection, SubmitPanel } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { MallProduct, PriceForm, PricingReport, PricingReportItem, ProjectRow } from "./types";

defineProps<{
  products: MallProduct[];
  sourceProjects: ProjectRow[];
  selectedPricingReports: PricingReport[];
  selectedReportItems: PricingReportItem[];
  money: (value: number | undefined) => string;
}>();

const priceForm = defineModel<PriceForm>("priceForm", { required: true });

const emit = defineEmits<{
  prepareSelectedPriceProduct: [];
  applySelectedPricingReport: [];
  submitPriceAndList: [];
}>();
</script>

<template>
  <FormSection title="商品定价上架" description="按来源、定价报告和有效期提交商品上架。">
    <label>
      商品
      <select v-model="priceForm.productId" @change="emit('prepareSelectedPriceProduct')">
        <option value="">请选择商品</option>
        <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }} / {{ product.skuCode }}</option>
      </select>
    </label>
    <label>
      来源类型
      <select v-model="priceForm.sourceType">
        <option value="agreement">协议来源</option>
        <option value="award_project">中标项目</option>
      </select>
    </label>
    <label v-if="priceForm.sourceType === 'award_project'">
      中标项目
      <select v-model="priceForm.sourceProjectId">
        <option value="">请选择中标项目</option>
        <option v-for="project in sourceProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
      </select>
    </label>
    <label v-if="priceForm.sourceType === 'agreement'">
      协议编号 / 来源
      <input v-model="priceForm.sourceAgreementNo" placeholder="例如 AG-2026-001" />
    </label>
    <label>
      定价报告
      <select v-model="priceForm.pricingReportId" @change="emit('applySelectedPricingReport')">
        <option value="">自动生成新的定价报告</option>
        <option v-for="report in selectedPricingReports" :key="report.id" :value="report.id">{{ report.reportNo || report.id }} / {{ labelStatus(report.status) }}</option>
      </select>
    </label>
    <label v-if="selectedReportItems.length">
      报告明细
      <select v-model="priceForm.pricingReportItemId" @change="emit('applySelectedPricingReport')">
        <option v-for="item in selectedReportItems" :key="item.id" :value="item.id">{{ item.id }} / {{ money(item.salePrice) }}</option>
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
  </FormSection>

  <SubmitPanel>
    <EnterpriseButton type="primary" @click="emit('submitPriceAndList')">提交定价并上架</EnterpriseButton>
  </SubmitPanel>
</template>
