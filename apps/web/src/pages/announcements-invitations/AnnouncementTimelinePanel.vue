<script setup lang="ts">
import type { ProcessBusinessType } from "../../api/process";
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import { EnterpriseSurface } from "../../components/base";

defineProps<{
  selectedProjectId: string;
  processBusinessType: ProcessBusinessType;
  processRefreshKey: number;
}>();
</script>

<template>
  <EnterpriseSurface title="采购流程轨迹" description="展示项目级招采主流程，公告创建、发布、邀请和关闭后会追加对应事件。">
    <ProcessTimeline
      v-if="selectedProjectId"
      :business-type="processBusinessType"
      :business-id="selectedProjectId"
      title="项目招采流程轨迹"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
