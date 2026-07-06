<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, RiskAlertPanel, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>业务通知 / 消息分发</p>
      <h2><span aria-hidden="true">信</span>消息中心</h2>
      <small>查看系统通知、业务提醒与待办消息。</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
      <RouterLink class="eds-action-link" to="/my-tasks">待办中心 <span>→</span></RouterLink>
    </div>
  </header>

  <div class="eds-process-hero">
    <EnterpriseSurface class="g-hotel-ledger-card" title="通知分发概览" eyebrow="列表与分发" description="按当前角色权限汇总未读、已读和业务类型消息，帮助用户先分流再处理。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <RiskAlertPanel title="处理规则" description="本页只负责通知分流和已读管理，不替代业务审批页本身。">
      <ul class="eds-process-checklist">
        <li>
          <strong>先分流，再进入业务页</strong>
          <span>消息中心负责指出“哪里有事”，真正的审批、录入和业务闭环仍应回到对应业务页面完成。</span>
        </li>
        <li>
          <strong>先确认范围，再批量已读</strong>
          <span>批量标记已读前应先确认当前筛选结果，避免把仍需关注的业务提醒一起沉底。</span>
        </li>
        <li>
          <strong>读状态必须服务于业务管理</strong>
          <span>已读只表示通知被处理，不表示对应业务已经办结，两者不能混淆。</span>
        </li>
      </ul>
    </RiskAlertPanel>
  </div>
</template>
