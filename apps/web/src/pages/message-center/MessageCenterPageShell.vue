<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, PageHeader, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <PageHeader title="消息中心" eyebrow="业务通知" description="查看审批、任务和业务事件提醒，并按业务对象进入对应处理页面。">
    <template #actions>
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <RouterLink class="eds-button eds-button-text" to="/my-tasks">待办中心</RouterLink>
    </template>
  </PageHeader>

  <EnterpriseSurface title="通知到达情况" description="消息按当前登录角色和业务权限过滤。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
