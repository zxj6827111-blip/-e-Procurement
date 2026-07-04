<script setup lang="ts">
import type { ProcessBusinessType } from "../../api/process";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { EnterpriseSurface } from "../../components/base";

defineProps<{
  selectedProjectId: string;
  processRefreshKey: number;
  projectProcessType: (projectId: string) => ProcessBusinessType;
}>();
</script>

<template>
  <EnterpriseSurface title="招采响应活动记录" description="保存、提交、撤回和重新提交报价后会更新项目业务记录。">
    <ActivityRecordPanel
      v-if="selectedProjectId"
      :business-type="projectProcessType(selectedProjectId)"
      :business-id="selectedProjectId"
      title="招采响应活动记录"
      :refresh-key="processRefreshKey"
    />
  </EnterpriseSurface>
</template>
