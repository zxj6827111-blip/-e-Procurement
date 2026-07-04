<script setup lang="ts">
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { EnterpriseSurface } from "../../components/base";

defineProps<{
  isSupplierResultView: boolean;
  selectedProjectId: string;
  selectedApprovalId: string;
  processRefreshKey: number;
}>();
</script>

<template>
  <EnterpriseSurface title="活动记录" description="按当前视角展示结果通知、定标审批、评审定标和合同准备等关键业务活动。">
    <ActivityRecordPanel
      v-if="isSupplierResultView && selectedProjectId"
      business-type="review_award"
      :business-id="selectedProjectId"
      title="结果通知记录"
      :refresh-key="processRefreshKey"
    />
    <ActivityRecordPanel
      v-if="!isSupplierResultView && selectedApprovalId"
      business-type="award_approval"
      :business-id="selectedApprovalId"
      title="定标审批进度"
      :refresh-key="processRefreshKey"
    />
    <ActivityRecordPanel
      v-if="!isSupplierResultView && selectedProjectId"
      business-type="review_award"
      :business-id="selectedProjectId"
      title="评审定标记录"
      :refresh-key="processRefreshKey"
    />
    <ActivityRecordPanel
      v-if="!isSupplierResultView && selectedProjectId"
      business-type="contract_preparation"
      :business-id="selectedProjectId"
      title="合同准备记录"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
