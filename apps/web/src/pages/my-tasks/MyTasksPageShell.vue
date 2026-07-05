<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface, RiskAlertPanel, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  loading: boolean;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <header class="eds-page-header eds-business-context">
    <div class="eds-business-context-main">
      <p class="eds-business-eyebrow">业务待办 / 批量处理</p>
      <h2>待办中心</h2>
      <p>集中处理当前岗位可办理的采购申请、供应商、评审、履约和结算事项，避免在多个业务页来回切换。</p>
    </div>
    <div class="eds-business-context-aside">
      <span class="eds-meta">当前模式</span>
      <strong>列表处理</strong>
      <div class="eds-actions">
        <StatusTag v-if="loading" tone="warning">加载中</StatusTag>
        <RouterLink class="eds-action-link" to="/messages">消息中心 <span>→</span></RouterLink>
      </div>
    </div>
  </header>

  <div class="eds-process-hero">
    <EnterpriseSurface title="待办处理概览" eyebrow="版式 B / 列表与处理" description="把可处理任务数量、状态分布和处理入口收成一层，不做空洞仪表盘。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <RiskAlertPanel title="处理规则" description="这里只保留会影响批量审批和任务闭环的关键边界。">
      <ul class="eds-process-checklist">
        <li>
          <strong>先看权限，再点处理</strong>
          <span>待办只展示当前角色可处理的任务，若处于只读状态，不应给出误导性的操作入口。</span>
        </li>
        <li>
          <strong>先看业务对象，再看动作</strong>
          <span>审批、完成任务和跳转业务页都要围绕同一业务主键，避免错办到相邻任务。</span>
        </li>
        <li>
          <strong>批量处理前先收敛筛选条件</strong>
          <span>状态、业务类型和时间范围会直接影响当前列表，不建议在全量混合列表里盲点处理。</span>
        </li>
      </ul>
    </RiskAlertPanel>
  </div>
</template>
