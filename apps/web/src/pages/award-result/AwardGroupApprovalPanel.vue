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
  <EnterpriseSurface title="集团定标审批" description="集团审批视角仅处理状态为“审批中”的定标单。">
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
        通过意见
        <input v-model="approvalOpinion" />
      </label>
      <label>
        驳回意见
        <input v-model="rejectionOpinion" />
      </label>
    </div>
    <p v-if="groupApprovalCount === 0" class="eds-meta">当前没有待集团确认的定标审批单。</p>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!canProcessSelectedAwardApproval" @click="emit('approve')">审批通过</EnterpriseButton>
      <EnterpriseButton :disabled="!canProcessSelectedAwardApproval" @click="emit('reject')">审批驳回</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
