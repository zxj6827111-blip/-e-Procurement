<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { BidSummary, Project } from "./types";

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });

defineProps<{
  projects: Project[];
  summary: BidSummary;
  canMaintainBidControl: boolean;
}>();

const emit = defineEmits<{
  projectChange: [];
  earlyCutoff: [];
  lockBids: [];
}>();
</script>

<template>
  <EnterpriseSurface v-if="canMaintainBidControl" title="截标与锁定" description="先完成截标，再锁定报价进入比价或评审。">
    <div class="eds-form-section">
      <label>
        采购项目
        <select v-model="selectedProjectId" @change="emit('projectChange')">
          <option v-if="!projects.length" value="">暂无可监督项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        当前状态
        <input :value="summary.beforeDeadline ? '报价期内，需先截标再锁定报价' : '已截标，可锁定报价、生成比价和评审'" disabled />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton :disabled="!selectedProjectId" @click="emit('earlyCutoff')">提前截标</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedProjectId" @click="emit('lockBids')">锁定报价</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>

  <EnterpriseSurface v-else title="只读权限" description="当前账号仅能查看报价监督状态，不能执行截标、锁定或保密查看审批。" />
</template>
