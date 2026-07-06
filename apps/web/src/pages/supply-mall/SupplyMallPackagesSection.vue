<script setup lang="ts">
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  FormSection,
  SubmitPanel,
  type DataTableColumn
} from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { MallQuestionnaireForm, ScenarioForm, ScenarioTemplate, TemplateOrderForm } from "./types";

defineProps<{
  visibleTemplates: ScenarioTemplate[];
  templateColumns: DataTableColumn[];
  operatorVisible: boolean;
  buyerVisible: boolean;
  packageSummary: (template: ScenarioTemplate) => string;
}>();

const scenarioForm = defineModel<ScenarioForm>("scenarioForm", { required: true });
const questionnaireForm = defineModel<MallQuestionnaireForm>("questionnaireForm", { required: true });
const templateOrderForm = defineModel<TemplateOrderForm>("templateOrderForm", { required: true });

const emit = defineEmits<{
  createScenario: [];
  templateToCart: [templateId: string];
  templateToOrder: [templateId: string];
}>();
</script>

<template>
  <FormSection title="采购包配置抽屉" description="用于门店开业、样板间和批量采购场景的商品包配置。">
    <label v-if="operatorVisible">
      采购包类型
      <select v-model="scenarioForm.templateType">
        <option value="opening_package">开业物资包</option>
        <option value="sample_room">样板间标准包</option>
        <option value="bulk_purchase_package">批量采购包</option>
      </select>
    </label>
    <label v-if="operatorVisible">
      采购包名称
      <input v-model="scenarioForm.name" placeholder="不填则使用类型默认名称" />
    </label>
    <label v-if="operatorVisible">
      适用品牌
      <input v-model="scenarioForm.applicableBrands" />
    </label>
    <label v-if="operatorVisible">
      适用酒店类型
      <input v-model="scenarioForm.applicableHotelTypes" />
    </label>
    <label v-if="operatorVisible">
      适用酒店 ID
      <input v-model="scenarioForm.applicableHotelIds" />
    </label>
    <label v-if="operatorVisible">
      客房数
      <input v-model.number="scenarioForm.roomCount" type="number" min="0" />
    </label>
    <label v-if="operatorVisible">
      预算
      <input v-model.number="scenarioForm.budgetAmount" type="number" min="0" />
    </label>
    <label v-if="operatorVisible">
      商品数量配置
      <input v-model="scenarioForm.productQuantities" placeholder="mp-1:3，mp-2:1；留空使用全部商品" />
    </label>
    <label v-if="operatorVisible">
      问卷标题
      <input v-model="questionnaireForm.title" />
    </label>
    <label v-if="operatorVisible">
      问卷范围
      <input v-model="questionnaireForm.scope" />
    </label>
    <label v-if="operatorVisible">
      目标供应商
      <input v-model="questionnaireForm.targetSupplierIds" placeholder="多个供应商 ID 用逗号分隔" />
    </label>
    <label v-if="operatorVisible">
      采购包说明
      <input v-model="scenarioForm.description" />
    </label>
    <label v-if="operatorVisible">
      问卷问题
      <textarea v-model="questionnaireForm.questions" rows="4"></textarea>
    </label>
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
  </FormSection>

  <SubmitPanel v-if="operatorVisible">
    <EnterpriseButton type="primary" @click="emit('createScenario')">新建采购包</EnterpriseButton>
  </SubmitPanel>

  <EnterpriseSurface title="采购包台账">
    <DataTable :columns="templateColumns" :rows="visibleTemplates" empty-text="暂无采购包配置。">
      <template #type="{ row }">{{ labelStatus(row.templateType) }}</template>
      <template #summary="{ row }">{{ packageSummary(row) }}</template>
      <template #actions="{ row }">
        <div class="eds-actions">
          <EnterpriseButton v-if="buyerVisible" @click="emit('templateToCart', row.id)">加入采购包清单</EnterpriseButton>
          <EnterpriseButton v-if="buyerVisible" type="primary" @click="emit('templateToOrder', row.id)">模板转订单</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
