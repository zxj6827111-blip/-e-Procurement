<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface } from "../../components/base";
import type { RoleWorkbench } from "./role-workbench";

defineProps<{
  workbench: RoleWorkbench;
}>();
</script>

<template>
  <div class="eds-workbench-side">
    <EnterpriseSurface title="风险提醒">
      <div class="eds-risk-list">
        <div v-for="item in workbench.riskSignals" :key="item" class="eds-risk-list-item">
          <span class="eds-risk-dot" aria-hidden="true"></span>
          <span>{{ item }}</span>
        </div>
      </div>
    </EnterpriseSurface>

    <EnterpriseSurface title="常用操作">
      <div class="eds-action-list">
        <RouterLink
          v-for="action in workbench.primaryActions"
          :key="action.to + action.label"
          class="eds-action-link"
          :to="action.to"
        >
          {{ action.label }}
          <span aria-hidden="true">›</span>
        </RouterLink>
      </div>
    </EnterpriseSurface>
  </div>
</template>
