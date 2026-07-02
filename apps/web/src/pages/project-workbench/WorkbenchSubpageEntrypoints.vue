<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, SummaryCards } from "../../components/base";
import type { WorkbenchResponse } from "./types";

defineProps<{
  workbench: WorkbenchResponse;
  showSourcingDetails: boolean;
  sourcingMetrics: {
    supplierCount: number;
    qualifiedRegistrationCount: number;
    bidCount: number;
    submittedScoreCount: number;
  };
  fulfillmentMetrics: {
    orderCount: number;
    receiptCount: number;
    settlementMaterialCount: number;
    collectedArchiveCount: number;
    totalArchiveCount: number;
  };
}>();
</script>

<template>
  <div class="eds-section">
    <EnterpriseSurface v-if="showSourcingDetails" title="招采执行详情" description="采购文件、公告报名、报价评审和定标已移至独立子页">
      <template #actions>
        <RouterLink class="eds-button eds-button-text" :to="`/project-workbench/${encodeURIComponent(workbench.project.id)}/sourcing`">进入招采执行</RouterLink>
      </template>
      <SummaryCards
        :items="[
          { label: '参与供应商', value: sourcingMetrics.supplierCount },
          { label: '资格通过', value: sourcingMetrics.qualifiedRegistrationCount },
          { label: '报价记录', value: sourcingMetrics.bidCount },
          { label: '已提交评分', value: sourcingMetrics.submittedScoreCount }
        ]"
      />
      <p class="eds-meta">项目详情页只保留项目阶段、需求依据和子页入口；招采过程明细、报价保密、专家评分、比价定标和响应文件在独立页面处理。</p>
    </EnterpriseSurface>

    <EnterpriseSurface id="fulfillment" title="履约结算与归档" description="订单、收货、结算、评价和归档已移至独立子页">
      <template #actions>
        <RouterLink class="eds-button eds-button-text" :to="`/project-workbench/${encodeURIComponent(workbench.project.id)}/fulfillment`">进入履约结算</RouterLink>
      </template>
      <SummaryCards
        :items="[
          { label: '采购订单', value: fulfillmentMetrics.orderCount },
          { label: '收货记录', value: fulfillmentMetrics.receiptCount },
          { label: '结算材料', value: fulfillmentMetrics.settlementMaterialCount },
          { label: '归档项', value: `${fulfillmentMetrics.collectedArchiveCount}/${fulfillmentMetrics.totalArchiveCount}` }
        ]"
      />
      <p class="eds-meta">定标后的订单生成、供应商确认、收货登记、结算核验、供应商评价和项目归档在独立页面处理。</p>
    </EnterpriseSurface>
  </div>
</template>
