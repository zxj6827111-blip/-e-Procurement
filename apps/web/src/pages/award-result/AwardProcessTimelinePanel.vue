<script setup lang="ts">
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import { EnterpriseSurface } from "../../components/base";

defineProps<{
  isSupplierResultView: boolean;
  selectedProjectId: string;
  selectedApprovalId: string;
  processRefreshKey: number;
}>();
</script>

<template>
  <EnterpriseSurface title="流程轨迹" description="按当前视角展示结果通知、定标审批、评审定标和合同准备流程。">
    <ProcessTimeline
      v-if="isSupplierResultView && selectedProjectId"
      business-type="review_award"
      :business-id="selectedProjectId"
      title="结果通知流程轨迹"
      :refresh-key="processRefreshKey"
    />
    <ProcessTimeline
      v-if="!isSupplierResultView && selectedApprovalId"
      business-type="award_approval"
      :business-id="selectedApprovalId"
      title="定标审批流程进度"
      :refresh-key="processRefreshKey"
    />
    <ProcessTimeline
      v-if="!isSupplierResultView && selectedProjectId"
      business-type="review_award"
      :business-id="selectedProjectId"
      title="评审定标流程轨迹"
      :refresh-key="processRefreshKey"
    />
    <ProcessTimeline
      v-if="!isSupplierResultView && selectedProjectId"
      business-type="contract_preparation"
      :business-id="selectedProjectId"
      title="合同准备流程轨迹"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
