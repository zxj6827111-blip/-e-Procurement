<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ActionCard, EnterpriseSurface, StatusTag } from "../../components/base";
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
      <ActionCard title="今日重点" description="岗位优先处理事项">
        <ul>
          <li v-for="item in workbench.todayFocus" :key="item">{{ item }}</li>
        </ul>
      </ActionCard>

      <ActionCard title="风险提醒" description="需要先确认的异常信号">
        <ul>
          <li v-for="item in workbench.riskSignals" :key="item">
            <StatusTag tone="warning">{{ item }}</StatusTag>
          </li>
        </ul>
      </ActionCard>

      <ActionCard title="可发起动作" description="当前岗位常用入口">
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
      </ActionCard>

      <ActionCard title="权限边界" description="不可跨越的岗位职责">
        <ul>
          <li v-for="item in workbench.deniedActions" :key="item">{{ item }}</li>
        </ul>
      </ActionCard>
    </div>
  </EnterpriseSurface>
</template>
