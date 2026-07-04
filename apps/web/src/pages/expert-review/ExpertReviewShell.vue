<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import ActivityRecordPanel from "../../components/ActivityRecordPanel.vue";
import { EnterpriseButton, EnterpriseSurface, FilterBar, PageHeader, PaginationBar, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
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
  <section class="eds-section">
    <PageHeader title="专家评审" eyebrow="评审管理" description="维护专家库，按项目状态抽取或指定专家，并生成评标记录。">
      <template #actions>
        <EnterpriseButton v-if="canMaintainExpertDirectory" @click="$emit('resetExpertForm')">新增专家</EnterpriseButton>
        <StatusTag :tone="canViewExpertReviewProgress ? 'success' : 'warning'">{{ selectedProject ? labelStatus(selectedProject.status) : "未选择项目" }}</StatusTag>
      </template>
    </PageHeader>

    <EnterpriseSurface title="评审概览" description="专家库、项目任务和评标报告的当前状态。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar>
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
