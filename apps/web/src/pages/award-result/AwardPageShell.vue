<script setup lang="ts">
import { computed } from "vue";
import { EnterpriseSurface, EnterpriseTabs, StatusTag, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { AwardProjectOption } from "./types";

const props = defineProps<{
  isSupplierResultView: boolean;
  projectHasApprovedAward: boolean;
  canApproveAward: boolean;
  projects: AwardProjectOption[];
  groupAwardProjects: AwardProjectOption[];
  summaryItems: SummaryCardItem[];
}>();

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });

const emit = defineEmits<{
  reloadProject: [];
}>();

const projectOptions = computed(() => (props.canApproveAward && props.groupAwardProjects.length ? props.groupAwardProjects : props.projects));
const detailTabs = [
  { key: "details", label: "详情" },
  { key: "history", label: "定标历史" },
  { key: "attachments", label: "附件" },
  { key: "logs", label: "日志" }
];
</script>

<template>
  <header class="g-hotel-page-header">
    <div>
      <p>评审定标 / 结果通知</p>
      <h2><span aria-hidden="true">结</span>{{ isSupplierResultView ? "中标结果与后续工作" : "定标审批与结果通知" }}</h2>
      <small>{{ isSupplierResultView ? "查看采购方发送给本供应商的结果通知、合同确认和价格报告。" : "基于评标记录完成定标审批、结果通知、价格报告、合同和商品上架。" }}</small>
    </div>
    <div class="g-hotel-page-actions">
      <StatusTag v-if="projectHasApprovedAward" tone="success">定标已通过</StatusTag>
      <StatusTag v-else-if="canApproveAward" tone="warning">集团审批视角</StatusTag>
      <StatusTag v-else tone="warning">待定标</StatusTag>
    </div>
  </header>

  <EnterpriseSurface class="g-hotel-ledger-card" title="项目选择" description="定标和结果通知均以项目为边界。">
    <div class="eds-form-section">
      <label>
        项目
        <select v-model="selectedProjectId" @change="emit('reloadProject')">
          <option value="">{{ isSupplierResultView ? "请选择已通知项目" : "请选择采购项目" }}</option>
          <option v-for="project in projectOptions" :key="project.id" :value="project.id">
            {{ project.code }} / {{ project.name }}
          </option>
        </select>
      </label>
    </div>
  </EnterpriseSurface>

  <EnterpriseTabs class="g-hotel-project-tabs" :tabs="detailTabs" active-key="details" />

  <EnterpriseSurface class="g-hotel-ledger-card" :title="isSupplierResultView ? '我的结果概览' : '定标执行概览'" description="汇总当前项目的审批、通知、报告、合同和商品状态。">
    <SummaryCards :items="summaryItems" />
  </EnterpriseSurface>
</template>
