<script setup lang="ts">
import type { ProcessBusinessType } from "../../api/process";
import ProcessTimeline from "../../components/ProcessTimeline.vue";
import { EnterpriseSurface } from "../../components/base";

defineProps<{
  selectedProjectId: string;
  processRefreshKey: number;
  projectProcessType: (projectId: string) => ProcessBusinessType;
}>();
</script>

<template>
  <EnterpriseSurface title="招采响应流程轨迹" description="保存、提交、撤回和重新提交报价后会更新项目流程记录。">
    <ProcessTimeline
      v-if="selectedProjectId"
      :business-type="projectProcessType(selectedProjectId)"
      :business-id="selectedProjectId"
      title="招采响应流程轨迹"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
