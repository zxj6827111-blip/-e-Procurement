<script setup lang="ts">
import { EnterpriseButton, FormSection, SubmitPanel } from "../../components/base";
import type { Project } from "./types";

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
const amount = defineModel<number>("amount", { required: true });
const taxRate = defineModel<number>("taxRate", { required: true });
const deliveryDays = defineModel<number>("deliveryDays", { required: true });
const taxNote = defineModel<string>("taxNote", { required: true });
const responseSummary = defineModel<string>("responseSummary", { required: true });
const serviceCommitment = defineModel<string>("serviceCommitment", { required: true });
const taxInclusive = defineModel<boolean>("taxInclusive", { required: true });

defineProps<{
  projects: Project[];
  responseFileName: string;
  emptyProjectHint: string;
}>();

const emit = defineEmits<{
  projectChange: [];
  fileChange: [event: Event];
  saveDraft: [];
}>();
</script>

<template>
  <FormSection title="保存报价草稿" description="填写金额、税率、交付周期和响应文件，先保存草稿再提交。">
    <label>
      项目
      <select v-model="selectedProjectId" @change="emit('projectChange')">
        <option v-if="!projects.length" value="">暂无可报价项目</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
      </select>
    </label>
    <label>
      报价金额
      <input v-model.number="amount" type="number" />
    </label>
    <label>
      税率
      <input v-model.number="taxRate" type="number" step="0.01" min="0" max="1" />
    </label>
    <label>
      交付周期（天）
      <input v-model.number="deliveryDays" type="number" min="1" />
    </label>
    <label>
      含税说明
      <input v-model="taxNote" />
    </label>
    <label>
      响应说明
      <input v-model="responseSummary" />
    </label>
    <label>
      服务承诺
      <input v-model="serviceCommitment" />
    </label>
    <label>
      响应文件
      <input type="file" @change="emit('fileChange', $event)" />
    </label>
    <label>
      含税报价
      <select v-model="taxInclusive">
        <option :value="true">是</option>
        <option :value="false">否</option>
      </select>
    </label>
    <p class="eds-meta">{{ responseFileName || "未选择文件" }}</p>
    <p v-if="emptyProjectHint" class="eds-meta">{{ emptyProjectHint }}</p>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!selectedProjectId" @click="emit('saveDraft')">保存草稿</EnterpriseButton>
    </SubmitPanel>
  </FormSection>
</template>
