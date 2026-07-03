<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, StatusTag } from "../../components/base";
import type { RoleWorkbench } from "./role-workbench";

defineProps<{
  workbench: RoleWorkbench;
}>();
</script>

<template>
  <EnterpriseSurface
    :title="workbench.heading"
    eyebrow="岗位工作台"
    :description="workbench.description"
  >
    <div class="eds-role-workbench-grid">
      <section class="eds-role-workbench-panel">
        <h4>今日重点</h4>
        <ul>
          <li v-for="item in workbench.todayFocus" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="eds-role-workbench-panel">
        <h4>风险提醒</h4>
        <ul>
          <li v-for="item in workbench.riskSignals" :key="item">
            <StatusTag tone="warning">{{ item }}</StatusTag>
          </li>
        </ul>
      </section>

      <section class="eds-role-workbench-panel">
        <h4>可发起动作</h4>
        <div class="eds-role-workbench-actions">
          <RouterLink
            v-for="action in workbench.primaryActions"
            :key="action.to + action.label"
            class="eds-button eds-button-text"
            :to="action.to"
          >
            {{ action.label }}
          </RouterLink>
        </div>
      </section>

      <section class="eds-role-workbench-panel">
        <h4>权限边界</h4>
        <ul>
          <li v-for="item in workbench.deniedActions" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </EnterpriseSurface>
</template>
