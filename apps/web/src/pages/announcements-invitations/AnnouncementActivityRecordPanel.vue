<script setup lang="ts">
import type { ProcessBusinessType } from "../../api/process";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { EnterpriseSurface } from "../../components/base";

defineProps<{
  selectedProjectId: string;
  processBusinessType: ProcessBusinessType;
  processRefreshKey: number;
}>();
</script>

<template>
  <EnterpriseSurface title="采购活动记录" description="展示公告创建、发布、邀请和关闭后的项目级招采活动。">
    <ActivityRecordPanel
      v-if="selectedProjectId"
      :business-type="processBusinessType"
      :business-id="selectedProjectId"
      title="项目招采活动记录"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
