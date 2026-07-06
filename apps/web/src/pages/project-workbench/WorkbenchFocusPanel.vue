<script setup lang="ts">
import { RouterLink } from "vue-router";
import TaskInboxSummary from "../../components/TaskInboxSummary.vue";
import { EnterpriseSurface } from "../../components/base";
import type { NextAction } from "./types";

defineProps<{
  projectId: string;
  nextAction: NextAction | null;
}>();
</script>

<template>
  <div class="eds-responsive-grid">
    <TaskInboxSummary
      title="项目相关待办与消息"
      :business-types="['procurement_request', 'award_approval', 'settlement_bill', 'invoice', 'payment_request']"
      :project-id="projectId"
      compact
    />
    <EnterpriseSurface v-if="nextAction" class="eds-drawer-panel" title="审计跟踪与风险" :description="nextAction.title">
      <p>{{ nextAction.detail }}</p>
      <RouterLink v-if="nextAction.to" class="eds-button eds-button-text" :to="nextAction.to">去处理</RouterLink>
      <a v-else-if="nextAction.anchor" class="eds-button eds-button-text" :href="`#${nextAction.anchor}`">查看详情</a>
    </EnterpriseSurface>
  </div>
</template>
