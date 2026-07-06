<script setup lang="ts">
import { ref } from "vue";
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  StatusTag,
  SubmitPanel,
  type DataTableColumn
} from "../../components/base";
import type { Assignment, Expert, ProjectOption, StatusTone } from "./types";

defineProps<{
  canMaintainExpertReview: boolean;
  canOperateExpertAssignment: boolean;
  reviewStageHint: string;
  projects: ProjectOption[];
  reviewScopeOptions: string[];
  assignableExperts: Expert[];
  replacementExperts: Expert[];
  assignments: Assignment[];
  assignmentColumns: DataTableColumn[];
  assignmentStatusLabels: Record<string, string>;
  projectLabel: (project: ProjectOption) => string;
  statusTone: (status: string) => StatusTone;
}>();

const emit = defineEmits<{
  projectChange: [];
  drawExpert: [];
  appointExpert: [];
  replaceExpert: [];
}>();

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
const drawReviewScopes = defineModel<string[]>("drawReviewScopes", { required: true });
const expertId = defineModel<string>("expertId", { required: true });
const reason = defineModel<string>("reason", { required: true });
const selectedAssignmentId = defineModel<string>("selectedAssignmentId", { required: true });
const replacementExpertId = defineModel<string>("replacementExpertId", { required: true });
const selectedReviewAssignment = ref<Assignment | null>(null);

function focusReviewAssignment(assignment: Assignment) {
  selectedAssignmentId.value = assignment.id;
  selectedReviewAssignment.value = null;
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card g-hotel-review-award-card" title="专家抽取与评审管理" :description="reviewStageHint">
    <p v-if="!canMaintainExpertReview" class="eds-meta">当前账号仅查看专家抽取与评审进度；抽取、指定和替换专家由采购经办操作。</p>

    <div class="eds-form-section">
      <label>
        项目
        <select v-model="selectedProjectId" @change="emit('projectChange')">
          <option v-if="!projects.length" value="">暂无可评审项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ projectLabel(project) }}</option>
        </select>
      </label>
      <label v-if="canMaintainExpertReview">
        抽取范围
        <select v-model="drawReviewScopes" multiple>
          <option v-for="scope in reviewScopeOptions" :key="scope" :value="scope">{{ scope }}</option>
        </select>
      </label>
      <label v-if="canMaintainExpertReview">
        指定专家
        <select v-model="expertId">
          <option v-for="expert in assignableExperts" :key="expert.id" :value="expert.id">{{ expert.name }} / {{ expert.category }} / {{ expert.active === false ? "停用" : expert.status }}</option>
        </select>
      </label>
      <label v-if="canMaintainExpertReview">抽取 / 指定理由<input v-model="reason" /></label>
    </div>
    <SubmitPanel v-if="canMaintainExpertReview">
      <EnterpriseButton :disabled="!selectedProjectId || !canOperateExpertAssignment" @click="emit('drawExpert')">
        抽取专家
      </EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedProjectId || !expertId || !canOperateExpertAssignment" @click="emit('appointExpert')">
        指定专家
      </EnterpriseButton>
    </SubmitPanel>

    <div v-if="canMaintainExpertReview" class="eds-form-section">
      <label>
        评审任务
        <select v-model="selectedAssignmentId">
          <option v-for="assignment in assignments" :key="assignment.id" :value="assignment.id">{{ assignment.id }} / {{ assignment.expertName || assignment.expertId }}</option>
        </select>
      </label>
      <label>
        替换专家
        <select v-model="replacementExpertId">
          <option v-for="expert in replacementExperts" :key="expert.id" :value="expert.id">{{ expert.name }} / {{ expert.active === false ? "停用" : expert.status }}</option>
        </select>
      </label>
    </div>
    <SubmitPanel v-if="canMaintainExpertReview">
      <EnterpriseButton :disabled="!selectedAssignmentId || !replacementExpertId || !canOperateExpertAssignment" @click="emit('replaceExpert')">
        替换专家
      </EnterpriseButton>
    </SubmitPanel>

    <DataTable :columns="assignmentColumns" :rows="assignments" row-key="id" empty-text="当前项目还没有专家评审任务">
      <template #expert="{ row }">{{ row.expertName || row.expertId }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ assignmentStatusLabels[row.status] ?? row.status }}</StatusTag>
      </template>
      <template #avoidance="{ row }">{{ row.avoidanceConfirmed ? "已确认" : "未确认" }}</template>
      <template #discipline="{ row }">{{ row.disciplineConfirmed ? "已确认" : "未确认" }}</template>
      <template #confidentiality="{ row }">{{ row.confidentialityConfirmed ? "已确认" : "未确认" }}</template>
      <template #actions="{ row }">
        <EnterpriseButton type="text" @click="selectedReviewAssignment = row">组织评审</EnterpriseButton>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedReviewAssignment" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="组织评审">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedReviewAssignment = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>组织评审：{{ selectedReviewAssignment.expertName || selectedReviewAssignment.expertId }}</h3>
        <button type="button" aria-label="关闭" @click="selectedReviewAssignment = null">x</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>评审任务：</span>{{ selectedReviewAssignment.id }}</p>
        <p><span>产生方式：</span>{{ selectedReviewAssignment.method }}</p>
        <p><span>当前状态：</span>{{ assignmentStatusLabels[selectedReviewAssignment.status] ?? selectedReviewAssignment.status }}</p>
        <p>
          <span>确认进度：</span>
          回避 {{ selectedReviewAssignment.avoidanceConfirmed ? "已确认" : "未确认" }}，纪律
          {{ selectedReviewAssignment.disciplineConfirmed ? "已确认" : "未确认" }}，保密
          {{ selectedReviewAssignment.confidentialityConfirmed ? "已确认" : "未确认" }}
        </p>
      </div>
      <footer>
        <EnterpriseButton @click="selectedReviewAssignment = null">取消</EnterpriseButton>
        <EnterpriseButton type="primary" @click="focusReviewAssignment(selectedReviewAssignment)">定位评审任务</EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
