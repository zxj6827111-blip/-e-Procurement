<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";

defineProps<{
  groupAwardProjects: Array<{ id: string; code: string; name: string }>;
  selectedApprovalDisplay: string;
  groupApprovalCount: number;
  canProcessSelectedAwardApproval: boolean;
}>();

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
const approvalOpinion = defineModel<string>("approvalOpinion", { required: true });
const rejectionOpinion = defineModel<string>("rejectionOpinion", { required: true });

const emit = defineEmits<{
  reloadProject: [];
  approve: [];
  reject: [];
}>();
</script>

<template>
  <EnterpriseSurface class="eds-approval-drawer g-hotel-compliance-card" title="定标合规审查" description="集团审批视角仅处理状态为“审批中”的定标单，先核查评审、报价和有效供应商条件。">
    <div class="eds-compliance-list">
      <article>
        <span class="eds-compliance-icon" aria-hidden="true">✓</span>
        <strong>专家评分偏离度正常</strong>
        <small>复核综合评分、评审意见和异常低分说明。</small>
      </article>
      <article>
        <span class="eds-compliance-icon" aria-hidden="true">✓</span>
        <strong>中标价未突破预算</strong>
        <small>核对推荐中标价、预算结余率和价格报告。</small>
      </article>
      <article>
        <span class="eds-compliance-icon" aria-hidden="true">✓</span>
        <strong>有效响应供应商满足要求</strong>
        <small>确认供应商资格、报价锁定和评审记录完整。</small>
      </article>
    </div>

    <div class="eds-form-section">
      <label>
        审批项目
        <select v-model="selectedProjectId" @change="emit('reloadProject')">
          <option v-for="project in groupAwardProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        审批单
        <input :value="selectedApprovalDisplay" readonly />
      </label>
      <label>
        定标意见
        <input v-model="approvalOpinion" />
      </label>
      <label>
        退回复核意见
        <input v-model="rejectionOpinion" />
      </label>
    </div>
    <p v-if="groupApprovalCount === 0" class="eds-meta">当前没有待集团确认的定标审批单。</p>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!canProcessSelectedAwardApproval" @click="emit('approve')">同意定标</EnterpriseButton>
      <EnterpriseButton :disabled="!canProcessSelectedAwardApproval" @click="emit('reject')">退回复核</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
