<script setup lang="ts">
import { RouterLink } from "vue-router";
import {
  EnterpriseSurface,
  FilterBar,
  RiskAlertPanel,
  StatusTag,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";

defineProps<{
  canMaintainDocuments: boolean;
  pendingCount: number;
  selectedProjectId: string;
  summaryItems: SummaryCardItem[];
  voidedCount: number;
}>();
</script>

<template>
  <header class="eds-page-header eds-business-context g-hotel-page-header">
    <div class="eds-business-context-main">
      <p class="eds-business-eyebrow">采购准备 / 文件治理</p>
      <h2>采购文件</h2>
      <p>管理招标文件、采购清单及合同范本草案，先完成内部编制、锁定和留痕，再进入公告与邀请。</p>
    </div>
    <div class="eds-business-context-aside">
      <span class="eds-meta">当前模式</span>
      <strong>{{ canMaintainDocuments ? "可维护" : "只读查看" }}</strong>
      <div class="eds-actions">
        <StatusTag v-if="pendingCount" tone="warning">待发布 {{ pendingCount }}</StatusTag>
        <StatusTag v-if="voidedCount" tone="error">已停用 {{ voidedCount }}</StatusTag>
        <RouterLink class="eds-action-link" :to="{ path: '/announcements-invitations', query: { projectId: selectedProjectId } }">
          公告与邀请 <span>→</span>
        </RouterLink>
      </div>
    </div>
  </header>

  <div class="eds-process-hero">
    <EnterpriseSurface title="文件总账" eyebrow="版式 B/C 组合" description="把项目范围、版本数量、锁定状态和待发布压力放到同一层，便于经办快速处理。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <RiskAlertPanel title="管理规则" description="只强调真正影响公告发布和审计追溯的边界。">
      <div class="eds-process-reference">
        <article class="eds-process-reference-item">
          <span>待发布版本</span>
          <strong>{{ pendingCount }}</strong>
        </article>
        <article class="eds-process-reference-item">
          <span>已停用版本</span>
          <strong>{{ voidedCount }}</strong>
        </article>
      </div>
      <ul class="eds-process-checklist">
        <li>
          <strong>先锁定，再公告</strong>
          <span>未锁定版本不能直接进入公告与邀请，避免供应商看到仍在修改中的文件。</span>
        </li>
        <li>
          <strong>修订要产生新版本</strong>
          <span>锁定后的采购文件如需改动，应通过修订版本继续留痕，不覆盖历史版本。</span>
        </li>
        <li>
          <strong>停用不等于删除</strong>
          <span>停用版本要保留痕迹，供审计追溯为何失效、由谁处理、何时停止使用。</span>
        </li>
      </ul>
    </RiskAlertPanel>
  </div>

  <FilterBar class="g-hotel-filter-bar">
    <label>
      搜索
      <input placeholder="搜索文件名称或项目..." />
    </label>
    <label>
      状态
      <select>
        <option>全部状态</option>
        <option>草稿</option>
        <option>待审核</option>
        <option>已审核</option>
      </select>
    </label>
  </FilterBar>
</template>
