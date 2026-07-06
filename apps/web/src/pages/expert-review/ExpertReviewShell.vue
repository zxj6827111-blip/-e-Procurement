<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { EnterpriseButton, EnterpriseSurface, FilterBar, PaginationBar, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { ProjectOption } from "./types";

defineProps<{
  canMaintainExpertDirectory: boolean;
  canViewExpertReviewProgress: boolean;
  selectedProject: ProjectOption | null;
  summaryItems: SummaryCardItem[];
  auditLogId: string;
  error: string;
  selectedProjectId: string;
  processRefreshKey: number;
}>();

defineEmits<{
  resetExpertForm: [];
}>();
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-review-page">
    <header class="g-hotel-page-header">
      <div>
        <p>评审管理 / 定标建议</p>
        <h2><span aria-hidden="true">评</span>评审定标</h2>
        <small>组织专家评审有效报价，形成评标记录和定标建议书。</small>
      </div>
      <div class="g-hotel-page-actions">
        <EnterpriseButton v-if="canMaintainExpertDirectory" @click="$emit('resetExpertForm')">新增专家</EnterpriseButton>
        <StatusTag :tone="canViewExpertReviewProgress ? 'success' : 'warning'">{{ selectedProject ? labelStatus(selectedProject.status) : "未选择项目" }}</StatusTag>
      </div>
    </header>

    <EnterpriseSurface class="g-hotel-ledger-card" title="评审定标概览" description="专家库、项目任务、有效报价和评标报告的当前状态。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar class="g-hotel-filter-bar">
      <label>
        评审范围
        <select value="current" disabled>
          <option value="current">当前项目与专家库</option>
        </select>
      </label>
    </FilterBar>

    <slot />
    <PaginationBar :total="summaryItems.reduce((sum, item) => sum + Number(item.value || 0), 0)" />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>

  <ActivityRecordPanel
    v-if="selectedProjectId"
    business-type="review_award"
    :business-id="selectedProjectId"
    title="评审定标活动记录"
    :refresh-key="processRefreshKey"
  />
</template>
